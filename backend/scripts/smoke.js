// Real HTTP integration through nginx + API + SQLite + local Mailpit.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
const origin = process.env.SMOKE_ORIGIN || "http://localhost:8080";
const email = `qa-${randomUUID()}@example.test`,
  password = "Ft" + randomBytes(16).toString("hex");
let cookie = "",
  csrf = "",
  created = false;
async function call(
  path,
  { method = "GET", body, expected = 200, raw = false } = {},
) {
  const response = await fetch(origin + "/api" + path, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET"
        ? {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrf,
            "Idempotency-Key": randomUUID(),
            Origin: origin,
          }
        : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.headers.get("set-cookie"))
    cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: expected ${expected}, got ${response.status}`,
  );
  if (raw) return response;
  const data = await response.json();
  if (data.csrfToken) csrf = data.csrfToken;
  return data;
}
try {
  assert.equal((await call("/health")).status, "ok");
  const page = await fetch(origin + "/transactions");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id="root"/);
  await call("/auth/register", {
    method: "POST",
    body: { name: "Disposable Compose QA", email, password },
    expected: 201,
  });
  created = true;
  const a = await call("/accounts", {
    method: "POST",
    body: {
      name: "QA account",
      type: "bank",
      openingBalance: "1000",
      openingBalanceDate: "2026-01-01",
    },
    expected: 201,
  });
  const cats = await call("/categories"),
    cat = cats.find((c) => c.type === "expense");
  await call("/transactions", {
    method: "POST",
    body: {
      type: "expense",
      amount: "25.50",
      date: "2026-11-10",
      description: "Compose integration",
      accountId: a.id,
      categoryId: cat.id,
    },
    expected: 201,
  });
  assert.equal((await call("/accounts"))[0].balance, 974.5);
  const report = await call("/reports/summary?type=expense");
  assert.equal(report.expense, 25.5);
  const csv = await call("/reports/export.csv?type=expense", { raw: true });
  assert.match(await csv.text(), /Compose integration/);
  const pdf = await call("/reports/export.pdf?type=expense", { raw: true });
  assert.equal(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 4)
      .toString(),
    "%PDF",
  );
  if (process.env.SMOKE_MAILPIT !== "false") {
    await call("/auth/forgot-password", { method: "POST", body: { email } });
    const inbox = await (
      await fetch(
        (process.env.MAILPIT_ORIGIN || "http://localhost:8025") +
          "/api/v1/messages",
      )
    ).json();
    assert.ok(
      inbox.messages.some((m) => m.To?.some((t) => t.Address === email)),
      "Password reset email not received by local Mailpit",
    );
  }
  console.log(
    "PASS: HTTP health, SPA routing, register, authenticated writes, exact balances, report filters, CSV, PDF, SMTP/Mailpit.",
  );
} finally {
  if (created) {
    await call("/profile", {
      method: "DELETE",
      body: { password, confirmation: "HAPUS AKUN" },
    });
    await call("/profile", { expected: 401 });
    console.log(
      "PASS: disposable QA account removed and sessions invalidated.",
    );
  }
}
