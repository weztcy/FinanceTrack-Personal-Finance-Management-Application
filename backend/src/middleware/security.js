import { createHash, randomBytes } from "node:crypto";
import { AppError, ensure } from "../services/validation.js";
import { config } from "../config.js";
export const hash = (value) => createHash("sha256").update(value).digest("hex");
export const token = () => randomBytes(32).toString("hex");
export const cookieName = "ft_session";
export const cookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  secure: config.secureCookie,
  path: "/",
  maxAge: config.sessionMs,
};
export function authenticate(db) {
  return (req, res, next) => {
    const raw = req.cookies[cookieName];
    const s =
      raw &&
      db
        .prepare(
          "SELECT s.*,u.* FROM sessions s JOIN users u ON s.user_id=u.id WHERE token_hash=? AND expires_at>?",
        )
        .get(hash(raw), new Date().toISOString());
    if (!s) return next(new AppError(401, "Silakan masuk untuk melanjutkan."));
    req.user = s;
    req.sessionHash = hash(raw);
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("X-CSRF-Token") !== s.csrf
    )
      return next(
        new AppError(403, "Sesi form tidak valid. Muat ulang halaman."),
      );
    next();
  };
}
export function originGuard(req, res, next) {
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.get("Origin");
    let localAlias = false;
    if (origin && !config.production) {
      try {
        const expected = new URL(config.origin),
          actual = new URL(origin);
        localAlias =
          ["localhost", "127.0.0.1"].includes(expected.hostname) &&
          ["localhost", "127.0.0.1"].includes(actual.hostname) &&
          expected.port === actual.port &&
          expected.protocol === actual.protocol;
      } catch {}
    }
    if (origin && origin !== config.origin && !localAlias)
      return next(new AppError(403, "Origin tidak diizinkan."));
    if (!req.is("application/json"))
      return next(new AppError(415, "Gunakan application/json."));
  }
  next();
}
export function idempotent(db, req, fn) {
  const key = req.get("Idempotency-Key");
  ensure(
    key && /^[\w-]{8,100}$/.test(key),
    "Idempotency-Key wajib diisi (8–100 karakter).",
  );
  const scope = req.method + ":" + req.path;
  const fingerprint = hash(JSON.stringify(req.body));
  const existing = db
    .prepare("SELECT * FROM idempotency WHERE user_id=? AND key=? AND scope=?")
    .get(req.user.id, key, scope);
  if (existing) {
    ensure(
      existing.fingerprint === fingerprint,
      "Kunci request sudah digunakan dengan data berbeda.",
      409,
    );
    return JSON.parse(existing.response);
  }
  const result = fn();
  db.prepare("INSERT INTO idempotency VALUES(?,?,?,?,?)").run(
    req.user.id,
    key,
    scope,
    fingerprint,
    JSON.stringify(result),
  );
  return result;
}
export function userProfile(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    timezone: user.timezone,
    theme: user.theme,
    notificationPreferences: JSON.parse(user.preferences),
    createdAt: user.created_at,
  };
}
