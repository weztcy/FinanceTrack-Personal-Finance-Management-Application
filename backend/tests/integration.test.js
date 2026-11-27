import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { nextDate } from "../src/services/validation.js";
import { hash } from "../src/middleware/security.js";
import { backup } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase } from "../src/db/database.js";
const system = createApp({ databasePath: ":memory:", rateLimitEnabled: false }),
  { app, db, repo, scheduled } = system;
let alice,
  bob,
  aliceCsrf,
  bobCsrf,
  uid,
  account,
  otherAccount,
  incomeCat,
  expenseCat,
  bobAccount;
const key = () => randomUUID();
const auth = (agent, csrf, method, url, body = {}, idem = key()) =>
  agent[method](url)
    .set("X-CSRF-Token", csrf)
    .set("Idempotency-Key", idem)
    .send(body);
const post = (url, body, idem) =>
  auth(alice, aliceCsrf, "post", "/api" + url, body, idem);
const patch = (url, body) =>
  auth(alice, aliceCsrf, "patch", "/api" + url, body);
const balance = async (id) =>
  (await alice.get("/api/accounts")).body.find((a) => a.id === id).balance;
before(async () => {
  alice = request.agent(app);
  bob = request.agent(app);
  const a = await alice
    .post("/api/auth/register")
    .send({
      name: "Alice",
      email: "alice@example.test",
      password: "StrongPassword123",
    })
    .expect(201);
  aliceCsrf = a.body.csrfToken;
  uid = a.body.user.id;
  const b = await bob
    .post("/api/auth/register")
    .send({
      name: "Bob",
      email: "bob@example.test",
      password: "StrongPassword456",
    })
    .expect(201);
  bobCsrf = b.body.csrfToken;
  account = (
    await post("/accounts", {
      name: "Bank",
      type: "bank",
      openingBalance: "1000.25",
      openingBalanceDate: "2026-01-01",
    }).expect(201)
  ).body;
  otherAccount = (
    await post("/accounts", {
      name: "Cash",
      type: "cash",
      openingBalance: "0",
      openingBalanceDate: "2026-01-01",
    }).expect(201)
  ).body;
  bobAccount = (
    await auth(bob, bobCsrf, "post", "/api/accounts", {
      name: "Bob bank",
      type: "bank",
      openingBalance: "10",
      openingBalanceDate: "2026-01-01",
    }).expect(201)
  ).body;
  const cats = (await alice.get("/api/categories")).body;
  incomeCat = cats.find((c) => c.type === "income");
  expenseCat = cats.find((c) => c.type === "expense");
});
after(() => db.close());
test("private endpoints require authentication and mutation requires CSRF", async () => {
  await request(app).get("/api/accounts").expect(401);
  await alice.post("/api/accounts").send({}).expect(403);
  await alice
    .post("/api/accounts")
    .set("X-CSRF-Token", aliceCsrf)
    .set("Origin", "https://attacker.test")
    .send({})
    .expect(403);
  assert.equal(
    db
      .prepare("SELECT password_hash FROM users WHERE id=?")
      .get(uid)
      .password_hash.startsWith("$2"),
    true,
  );
});
test("input rejects invalid dates, unsafe amounts, category mismatch, same-account transfers and missing idempotency", async () => {
  const base = {
    type: "expense",
    amount: "10",
    date: "2026-11-05",
    accountId: account.id,
    categoryId: expenseCat.id,
  };
  for (const amount of ["0", "-1", "1.001", 1.001, "Infinity", 1e20])
    await post("/transactions", { ...base, amount }).expect(422);
  await post("/transactions", { ...base, date: "2026-02-30" }).expect(422);
  await post("/transactions", { ...base, date: "2025-12-31" }).expect(400);
  await post("/transactions", { ...base, categoryId: incomeCat.id }).expect(
    400,
  );
  await post("/transfers", {
    amount: "10",
    date: base.date,
    fromAccountId: account.id,
    toAccountId: account.id,
  }).expect(400);
  await alice
    .post("/api/transactions")
    .set("X-CSRF-Token", aliceCsrf)
    .send(base)
    .expect(400);
  await patch("/accounts/" + account.id, { openingBalance: 500 }).expect(422);
});
test("income, expense, transfer, edit and void keep balances and cash flow consistent", async () => {
  const before = await balance(account.id);
  const income = (
    await post("/transactions", {
      type: "income",
      amount: "500.10",
      date: "2026-11-01",
      accountId: account.id,
      categoryId: incomeCat.id,
      description: "Salary",
    }).expect(201)
  ).body;
  const expense = (
    await post("/transactions", {
      type: "expense",
      amount: "100.05",
      date: "2026-11-02",
      accountId: account.id,
      categoryId: expenseCat.id,
    }).expect(201)
  ).body;
  const transfer = (
    await post("/transfers", {
      amount: "200",
      date: "2026-11-03",
      fromAccountId: account.id,
      toAccountId: otherAccount.id,
    }).expect(201)
  ).body;
  assert.equal(await balance(account.id), before + 500.1 - 100.05 - 200);
  assert.equal(await balance(otherAccount.id), 200);
  const report = (
    await alice.get(
      "/api/reports/summary?startDate=2026-11-01&endDate=2026-11-03",
    )
  ).body;
  assert.equal(report.income, 500.1);
  assert.equal(report.expense, 100.05);
  assert.equal(report.transfer, 200);
  assert.equal(report.net, 400.05);
  await patch("/transactions/" + transfer.id, { amount: "125.50" }).expect(200);
  assert.equal(await balance(otherAccount.id), 125.5);
  await post("/transactions/" + transfer.id + "/void", {}).expect(200);
  assert.equal(await balance(otherAccount.id), 0);
  await patch("/transactions/" + expense.id, { amount: "50.05" }).expect(200);
  await post("/transactions/" + expense.id + "/void", {}).expect(200);
  assert.equal(await balance(account.id), before + 500.1);
  const detail = (await alice.get("/api/transactions/" + expense.id)).body;
  assert.equal(detail.history.length, 3);
  assert.equal(detail.status, "void");
  await post("/transactions/" + income.id + "/void", {}).expect(200);
});
test("transaction type changes remove obsolete transfer fields", async () => {
  const tx = (
    await post("/transactions", {
      type: "expense",
      amount: 5,
      date: "2026-11-04",
      accountId: account.id,
      categoryId: expenseCat.id,
    }).expect(201)
  ).body;
  await patch("/transactions/" + tx.id, {
    type: "transfer",
    fromAccountId: account.id,
    toAccountId: otherAccount.id,
  }).expect(200);
  assert.equal(await balance(otherAccount.id), 5);
  await patch("/transactions/" + tx.id, {
    type: "income",
    accountId: account.id,
    categoryId: incomeCat.id,
  }).expect(200);
  assert.equal(await balance(otherAccount.id), 0);
  await post("/transactions/" + tx.id + "/void", {}).expect(200);
});
test("idempotency serializes repeated and concurrent creates and rejects changed payload", async () => {
  const body = {
      type: "expense",
      amount: "7.25",
      date: "2026-11-05",
      accountId: account.id,
      categoryId: expenseCat.id,
    },
    k = key(),
    before = await balance(account.id);
  const results = await Promise.all([
    post("/transactions", body, k),
    post("/transactions", body, k),
    post("/transactions", body, k),
  ]);
  assert.ok(results.every((r) => r.status === 201));
  assert.ok(results.every((r) => r.body.id === results[0].body.id));
  assert.equal(await balance(account.id), before - 7.25);
  await post("/transactions", { ...body, amount: "8" }, k).expect(409);
  await post("/transactions/" + results[0].body.id + "/void", {}).expect(200);
});
test("all resources enforce owner-scoped reads/writes and foreign references", async () => {
  await bob.get("/api/accounts/" + account.id).expect(404);
  await auth(bob, bobCsrf, "patch", "/api/accounts/" + account.id, {
    name: "stolen",
  }).expect(404);
  await post("/transactions", {
    type: "expense",
    amount: 10,
    date: "2026-11-05",
    accountId: bobAccount.id,
    categoryId: expenseCat.id,
  }).expect(404);
  await post("/transfers", {
    amount: 10,
    date: "2026-11-05",
    fromAccountId: account.id,
    toAccountId: bobAccount.id,
  }).expect(404);
  const kinds = {
    budget: "budgets",
    goal: "goals",
    bill: "bills",
    recurring: "recurring",
    transaction: "transactions",
  };
  for (const [kind, url] of Object.entries(kinds)) {
    const entity = repo.create(uid, kind, {
      name: "Private",
      amountMinor: 100,
      date: "2026-11-04",
      status: "active",
    });
    await auth(
      bob,
      bobCsrf,
      "patch",
      "/api/" + url + "/" + entity.id,
      {},
    ).expect(404);
    if (kind === "goal")
      await bob.get("/api/goals/" + entity.id + "/contributions").expect(404);
    repo.remove(uid, kind, entity.id);
  }
  assert.equal(
    (await bob.get("/api/reports/summary")).body.transactionCount,
    0,
  );
});
test("budgets enforce unique category/month, recalculate after edits/void, and deduplicate threshold alerts", async () => {
  const body = {
    categoryId: expenseCat.id,
    period: "2026-11",
    limitAmount: "100",
    warningThreshold: 80,
  };
  const budget = (await post("/budgets", body).expect(201)).body;
  await post("/budgets", body).expect(409);
  const tx = (
    await post("/transactions", {
      type: "expense",
      amount: 85,
      date: "2026-11-05",
      accountId: account.id,
      categoryId: expenseCat.id,
    }).expect(201)
  ).body;
  let b = (await alice.get("/api/budgets")).body.find(
    (b) => b.id === budget.id,
  );
  assert.equal(b.spent, 85);
  assert.equal(b.status, "warning");
  await patch("/transactions/" + tx.id, { amount: 101 }).expect(200);
  b = (await alice.get("/api/budgets")).body.find((b) => b.id === budget.id);
  assert.equal(b.remaining, -1);
  assert.equal(b.status, "exceeded");
  await alice.get("/api/notifications");
  await alice.get("/api/notifications");
  const ns = (await alice.get("/api/notifications")).body.filter(
    (n) => n.relatedEntityId === budget.id,
  );
  assert.equal(ns.length, 2);
  await post("/transactions/" + tx.id + "/void", {}).expect(200);
  b = (await alice.get("/api/budgets")).body.find((b) => b.id === budget.id);
  assert.equal(b.spent, 0);
});
test("filtering, sort, pagination and date validation apply consistently to exports", async () => {
  const ids = [];
  for (let i = 1; i <= 3; i++)
    ids.push(
      (
        await post("/transactions", {
          type: "income",
          amount: i,
          date: "2026-10-0" + i,
          accountId: account.id,
          categoryId: incomeCat.id,
          description: "Filter-only " + i,
        }).expect(201)
      ).body.id,
    );
  const q =
    "startDate=2026-10-01&endDate=2026-10-03&type=income&search=Filter-only&sort=amount_desc&pageSize=2";
  const r = (await alice.get("/api/transactions?" + q)).body;
  assert.equal(r.total, 3);
  assert.equal(r.items.length, 2);
  assert.equal(r.items[0].amount, 3);
  const csv = await alice.get("/api/reports/export.csv?" + q).expect(200);
  assert.equal(csv.text.split("\r\n").length, 4);
  assert.ok(csv.text.includes("Filter-only 1"));
  const pdf = await alice.get("/api/reports/export.pdf?" + q).expect(200);
  assert.equal(pdf.body.subarray(0, 4).toString(), "%PDF");
  await alice
    .get("/api/transactions?startDate=2026-12-01&endDate=2026-01-01")
    .expect(400);
  await alice.get("/api/transactions?pageSize=1000").expect(422);
  await alice.get("/api/transactions?sort=arbitrary").expect(422);
  for (const id of ids)
    await post("/transactions/" + id + "/void", {}).expect(200);
});
test("dashboard comparison follows the selected historical period", async () => {
  for (const endpoint of ["summary", "trends"]) {
    const { body } = await alice
      .get(`/api/dashboard/${endpoint}`)
      .query({ startDate: "2025-04-01", endDate: "2025-04-30" })
      .expect(200);
    assert.equal(body.transactionCount, 0);
    assert.deepEqual(body.comparison, []);
  }
});

test("archived accounts stay in history, cannot take new transactions, and currency is locked", async () => {
  const a = (
    await post("/accounts", {
      name: "Archive",
      type: "cash",
      openingBalance: 0,
      openingBalanceDate: "2026-01-01",
    }).expect(201)
  ).body;
  const tx = (
    await post("/transactions", {
      type: "income",
      amount: 1,
      date: "2026-11-01",
      accountId: a.id,
      categoryId: incomeCat.id,
    }).expect(201)
  ).body;
  await post("/accounts/" + a.id + "/archive", {}).expect(200);
  await post("/transactions", {
    type: "income",
    amount: 1,
    date: "2026-11-01",
    accountId: a.id,
    categoryId: incomeCat.id,
  }).expect(409);
  assert.equal(
    (await alice.get("/api/transactions/" + tx.id)).body.accountId,
    a.id,
  );
  await patch("/profile", { currency: "USD" }).expect(409);
  await patch("/profile", { timezone: "Not/AZone" }).expect(422);
  await post("/transactions/" + tx.id + "/void", {}).expect(200);
});
test("recurring catches up once per occurrence, pauses, ends, and respects month-end anchors", async () => {
  const job = (
    await post("/recurring", {
      type: "income",
      amount: 20,
      accountId: account.id,
      categoryId: incomeCat.id,
      startDate: "2026-01-31",
      endDate: "2026-03-31",
      frequency: "monthly",
      description: "Recurring test",
    }).expect(201)
  ).body;
  scheduled.run(new Date("2026-03-31T23:00:00Z"), uid);
  scheduled.run(new Date("2026-03-31T23:00:00Z"), uid);
  const txs = repo
    .list(uid, "transaction")
    .filter((t) => t.recurringId === job.id);
  assert.deepEqual(txs.map((t) => t.date).sort(), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
  ]);
  assert.equal(repo.get(uid, "recurring", job.id).isEnded, true);
  assert.equal(nextDate("2028-02-29", "yearly", "2028-02-29"), "2029-02-28");
  assert.equal(nextDate("2031-02-28", "yearly", "2028-02-29"), "2032-02-29");
  const paused = (
    await post("/recurring", {
      type: "expense",
      amount: 1,
      accountId: account.id,
      categoryId: expenseCat.id,
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      frequency: "daily",
    }).expect(201)
  ).body;
  await patch("/recurring/" + paused.id, { isPaused: true }).expect(200);
  scheduled.run(new Date("2026-11-05T00:00:00Z"), uid);
  assert.equal(
    repo.list(uid, "transaction").filter((t) => t.recurringId === paused.id)
      .length,
    0,
  );
  await patch("/recurring/" + paused.id, { isPaused: false }).expect(200);
  scheduled.run(new Date("2026-11-05T00:00:00Z"), uid);
  assert.equal(
    repo.list(uid, "transaction").filter((t) => t.recurringId === paused.id)
      .length,
    3,
  );
});
test("failed recurring rolls back without a partial transaction and deduplicates failure notification", async () => {
  const a = (
    await post("/accounts", {
      name: "Fail schedule",
      type: "cash",
      openingBalance: 0,
      openingBalanceDate: "2026-01-01",
    }).expect(201)
  ).body;
  const job = (
    await post("/recurring", {
      type: "expense",
      amount: 1,
      accountId: a.id,
      categoryId: expenseCat.id,
      startDate: "2026-11-01",
      frequency: "monthly",
    }).expect(201)
  ).body;
  await post("/accounts/" + a.id + "/archive", {}).expect(200);
  scheduled.run(new Date("2026-11-02T00:00:00Z"), uid);
  scheduled.run(new Date("2026-11-02T00:00:00Z"), uid);
  assert.equal(
    repo.list(uid, "transaction").filter((t) => t.recurringId === job.id)
      .length,
    0,
  );
  assert.ok(repo.get(uid, "recurring", job.id).lastError);
  assert.equal(
    repo.list(uid, "notification").filter((n) => n.relatedEntityId === job.id)
      .length,
    1,
  );
  await patch("/recurring/" + job.id, { isEnded: true }).expect(200);
});
test("savings contributions edit/void progress without altering ledger or cash flow", async () => {
  const goal = (
      await post("/goals", {
        name: "Emergency",
        targetAmount: 100,
        accountId: account.id,
      }).expect(201)
    ).body,
    before = await balance(account.id);
  const k = key(),
    body = { amount: 60, date: "2026-11-05", note: "Progress allocation" };
  const c = (
    await post("/goals/" + goal.id + "/contributions", body, k).expect(201)
  ).body;
  await post("/goals/" + goal.id + "/contributions", body, k).expect(201);
  let g = (await alice.get("/api/goals")).body.find((g) => g.id === goal.id);
  assert.equal(g.currentAmount, 60);
  assert.equal(await balance(account.id), before);
  await patch("/goals/" + goal.id + "/contributions/" + c.id, {
    amount: 110,
  }).expect(200);
  g = (await alice.get("/api/goals")).body.find((g) => g.id === goal.id);
  assert.equal(g.isAchieved, true);
  await post(
    "/goals/" + goal.id + "/contributions/" + c.id + "/void",
    {},
  ).expect(200);
  g = (await alice.get("/api/goals")).body.find((g) => g.id === goal.id);
  assert.equal(g.currentAmount, 0);
  await auth(
    bob,
    bobCsrf,
    "patch",
    "/api/goals/" + goal.id + "/contributions/" + c.id,
    { amount: 1 },
  ).expect(404);
});
test("bill payments are idempotent, support existing transactions, and create one next period even after void/re-pay", async () => {
  const bill = (
    await post("/bills", {
      name: "Internet",
      amount: 50,
      categoryId: expenseCat.id,
      dueDate: "2026-01-31",
      frequency: "monthly",
      reminderDays: 3,
    }).expect(201)
  ).body;
  const body = { accountId: account.id, date: "2026-01-31" },
    k = key(),
    before = await balance(account.id);
  const paid = (await post("/bills/" + bill.id + "/pay", body, k).expect(200))
    .body;
  await post("/bills/" + bill.id + "/pay", body, k).expect(200);
  await post("/bills/" + bill.id + "/pay", body).expect(200);
  assert.equal(await balance(account.id), before - 50);
  let next = repo.list(uid, "bill").filter((b) => b.parentBillId === bill.id);
  assert.equal(next.length, 1);
  assert.equal(next[0].dueDate, "2026-02-28");
  await post("/transactions/" + paid.paidTransactionId + "/void", {}).expect(
    200,
  );
  assert.equal(repo.get(uid, "bill", bill.id).paidTransactionId, null);
  assert.equal(await balance(account.id), before);
  await post("/bills/" + bill.id + "/pay", body).expect(200);
  assert.equal(
    repo.list(uid, "bill").filter((b) => b.parentBillId === bill.id).length,
    1,
  );
  const existing = (
    await post("/transactions", {
      type: "expense",
      amount: 50,
      date: "2026-02-28",
      accountId: account.id,
      categoryId: expenseCat.id,
    }).expect(201)
  ).body;
  const afterExisting = await balance(account.id);
  await post("/bills/" + next[0].id + "/pay", {
    transactionId: existing.id,
  }).expect(200);
  assert.equal(await balance(account.id), afterExisting);
  const third = repo
    .list(uid, "bill")
    .find((b) => b.parentBillId === next[0].id);
  await post("/bills/" + third.id + "/pay", {
    transactionId: existing.id,
  }).expect(409);
  const fourth = (
    await post("/bills", {
      name: "Foreign tx",
      amount: 1,
      categoryId: expenseCat.id,
      dueDate: "2026-11-05",
    }).expect(201)
  ).body;
  await auth(bob, bobCsrf, "post", "/api/bills/" + fourth.id + "/pay", {
    transactionId: existing.id,
  }).expect(404);
});
test("notifications preferences and read state do not change financial transactions", async () => {
  const before = repo.list(uid, "transaction").length;
  await patch("/profile", {
    notificationPreferences: { budget: false, bill: false, recurring: false },
  }).expect(200);
  const bill = (
    await post("/bills", {
      name: "Silent reminder",
      amount: 1,
      categoryId: expenseCat.id,
      dueDate: "2026-01-01",
    }).expect(201)
  ).body;
  await alice.get("/api/notifications");
  assert.equal(
    repo.list(uid, "notification").some((n) => n.relatedEntityId === bill.id),
    false,
  );
  const n = repo.list(uid, "notification")[0];
  await patch("/notifications/" + n.id + "/read", {}).expect(200);
  assert.equal(repo.get(uid, "notification", n.id).isRead, true);
  await auth(
    bob,
    bobCsrf,
    "patch",
    "/api/notifications/" + n.id + "/read",
    {},
  ).expect(404);
  assert.equal(repo.list(uid, "transaction").length, before);
});
test("database backup restores persistent records with integrity intact", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "financetrack-test-"));
  let restored;
  try {
    const filename = path.join(dir, "restore.sqlite");
    await backup(db, filename);
    restored = openDatabase(filename);
    assert.equal(
      restored.prepare("PRAGMA integrity_check").get().integrity_check,
      "ok",
    );
    assert.equal(
      restored.prepare("SELECT COUNT(*) n FROM records").get().n,
      db.prepare("SELECT COUNT(*) n FROM records").get().n,
    );
    assert.equal(restored.prepare("PRAGMA foreign_key_check").all().length, 0);
  } finally {
    restored?.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("password resets are single-use, expire, invalidate sessions and do not enumerate emails", async () => {
  const a = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "missing@example.test" })
    .expect(200);
  const b = await request(app)
    .post("/api/auth/forgot-password")
    .send({ email: "alice@example.test" })
    .expect(200);
  assert.equal(a.body.message, b.body.message);
  db.prepare("DELETE FROM password_resets WHERE user_id=?").run(uid);
  const raw = "a".repeat(64);
  db.prepare("INSERT INTO password_resets VALUES(?,?,?)").run(
    hash(raw),
    uid,
    new Date(Date.now() + 60000).toISOString(),
  );
  await request(app)
    .post("/api/auth/reset-password")
    .send({ token: raw, password: "NewPassword12345" })
    .expect(200);
  await request(app)
    .post("/api/auth/reset-password")
    .send({ token: raw, password: "OtherPassword12345" })
    .expect(400);
  await alice.get("/api/profile").expect(401);
  const expired = "b".repeat(64);
  db.prepare("INSERT INTO password_resets VALUES(?,?,?)").run(
    hash(expired),
    uid,
    "2000-01-01T00:00:00Z",
  );
  await request(app)
    .post("/api/auth/reset-password")
    .send({ token: expired, password: "OtherPassword12345" })
    .expect(400);
  const login = await alice
    .post("/api/auth/login")
    .send({ email: "alice@example.test", password: "NewPassword12345" })
    .expect(200);
  aliceCsrf = login.body.csrfToken;
  await post("/auth/logout", {}).expect(200);
  await alice.get("/api/profile").expect(401);
});
test("account deletion requires password and confirmation then cascades all owned data", async () => {
  await auth(bob, bobCsrf, "delete", "/api/profile", {
    password: "wrong",
    confirmation: "HAPUS AKUN",
  }).expect(403);
  const bobId = (await bob.get("/api/profile")).body.user.id;
  await auth(bob, bobCsrf, "delete", "/api/profile", {
    password: "StrongPassword456",
    confirmation: "HAPUS AKUN",
  }).expect(200);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM records WHERE user_id=?").get(bobId).n,
    0,
  );
  await bob.get("/api/accounts").expect(401);
});
test("authentication endpoint is rate limited", async () => {
  const isolated = createApp({ databasePath: ":memory:" });
  try {
    for (let i = 0; i < 20; i++)
      await request(isolated.app)
        .post("/api/auth/login")
        .send({ email: "invalid" })
        .expect(422);
    await request(isolated.app)
      .post("/api/auth/login")
      .send({ email: "invalid" })
      .expect(429);
  } finally {
    isolated.db.close();
  }
});
