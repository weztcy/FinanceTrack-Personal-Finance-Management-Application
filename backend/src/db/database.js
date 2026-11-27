import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function openDatabase(filename) {
  if (filename !== ":memory:")
    mkdirSync(path.dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,
      name TEXT NOT NULL, currency TEXT NOT NULL, timezone TEXT NOT NULL, theme TEXT NOT NULL DEFAULT 'light',
      preferences TEXT NOT NULL DEFAULT '{"budget":true,"bill":true,"recurring":true}',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, expires_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS password_resets (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_owner_kind ON records(user_id, kind);
    CREATE INDEX IF NOT EXISTS transactions_date ON records(user_id, kind, json_extract(data,'$.date'));
    CREATE INDEX IF NOT EXISTS transactions_category ON records(user_id, kind, json_extract(data,'$.categoryId'), json_extract(data,'$.date'));
    CREATE INDEX IF NOT EXISTS transactions_account ON records(user_id, kind, json_extract(data,'$.accountId'), json_extract(data,'$.date'));
    CREATE UNIQUE INDEX IF NOT EXISTS budget_period ON records(user_id,json_extract(data,'$.categoryId'),json_extract(data,'$.period')) WHERE kind='budget';
    CREATE UNIQUE INDEX IF NOT EXISTS notification_key ON records(user_id,json_extract(data,'$.dedupeKey')) WHERE kind='notification';
    CREATE UNIQUE INDEX IF NOT EXISTS recurring_occurrence ON records(user_id,json_extract(data,'$.occurrenceKey')) WHERE kind='transaction' AND json_extract(data,'$.occurrenceKey') IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS bill_payment ON records(user_id,json_extract(data,'$.paidTransactionId')) WHERE kind='bill' AND json_extract(data,'$.paidTransactionId') IS NOT NULL;
    CREATE TABLE IF NOT EXISTS idempotency (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, key TEXT NOT NULL, scope TEXT NOT NULL,
      fingerprint TEXT NOT NULL, response TEXT NOT NULL, PRIMARY KEY(user_id,key,scope));
    CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    INSERT OR IGNORE INTO schema_migrations VALUES(1,datetime('now'));
  `);
  return db;
}

export function atomic(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const value = fn();
    db.exec("COMMIT");
    return value;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function repository(db) {
  const decode = (r) =>
    r
      ? {
          id: r.id,
          ...JSON.parse(r.data),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }
      : null;
  return {
    list(userId, kind) {
      return db
        .prepare(
          "SELECT * FROM records WHERE user_id=? AND kind=? ORDER BY created_at DESC,id DESC",
        )
        .all(userId, kind)
        .map(decode);
    },
    get(userId, kind, id) {
      return decode(
        db
          .prepare("SELECT * FROM records WHERE user_id=? AND kind=? AND id=?")
          .get(userId, kind, id),
      );
    },
    create(userId, kind, data, id = randomUUID()) {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO records VALUES(?,?,?,?,?,?)").run(
        id,
        userId,
        kind,
        JSON.stringify(data),
        now,
        now,
      );
      return this.get(userId, kind, id);
    },
    update(userId, kind, id, changes) {
      const old = this.get(userId, kind, id);
      if (!old) return null;
      const {
        createdAt,
        updatedAt,
        id: ignored,
        ...data
      } = { ...old, ...changes };
      db.prepare(
        "UPDATE records SET data=?,updated_at=? WHERE id=? AND user_id=? AND kind=?",
      ).run(JSON.stringify(data), new Date().toISOString(), id, userId, kind);
      return this.get(userId, kind, id);
    },
    remove(userId, kind, id) {
      db.prepare("DELETE FROM records WHERE user_id=? AND kind=? AND id=?").run(
        userId,
        kind,
        id,
      );
    },
    audit(userId, kind, id, action) {
      this.create(userId, "audit", { entityType: kind, entityId: id, action });
    },
    decode,
  };
}
