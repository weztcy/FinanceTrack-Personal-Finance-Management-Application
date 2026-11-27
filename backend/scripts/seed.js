import request from "supertest";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { today, nextDate } from "../src/services/validation.js";
if (process.env.NODE_ENV === "production")
  throw new Error("Seed data hanya untuk pengembangan.");
const { app, db } = createApp({ rateLimitEnabled: false });
const email = process.env.SEED_EMAIL || "demo@financetrack.local";
if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) {
  db.close();
  throw new Error(
    "Email seed sudah ada. Gunakan SEED_EMAIL lain atau masuk ke akun tersebut.",
  );
}
const password =
  process.env.SEED_PASSWORD || "Ft" + randomBytes(12).toString("hex");
const agent = request.agent(app);
try {
  const r = await agent
    .post("/api/auth/register")
    .send({
      name: "Alex Pratama",
      email,
      password,
      currency: "IDR",
      timezone: "Asia/Jakarta",
    })
    .expect(201);
  const csrf = r.body.csrfToken;
  const create = async (path, body) => {
    const result = await agent
      .post("/api" + path)
      .set("X-CSRF-Token", csrf)
      .set("Idempotency-Key", randomUUID())
      .send(body);
    if (result.status >= 400) throw new Error(JSON.stringify(result.body));
    return result.body;
  };
  const day = today("Asia/Jakarta"),
    period = day.slice(0, 7),
    year = Number(day.slice(0, 4)),
    month = Number(day.slice(5, 7)),
    currentDay = Number(day.slice(8));
  const opening = new Date(Date.UTC(year, month - 7, 1))
    .toISOString()
    .slice(0, 10);
  const bank = await create("/accounts", {
    name: "BCA · Rekening utama",
    type: "bank",
    openingBalance: 3500000,
    openingBalanceDate: opening,
    description: "Rekening pemasukan dan kebutuhan harian",
  });
  const wallet = await create("/accounts", {
    name: "GoPay",
    type: "ewallet",
    openingBalance: 750000,
    openingBalanceDate: opening,
  });
  const cash = await create("/accounts", {
    name: "Dompet tunai",
    type: "cash",
    openingBalance: 500000,
    openingBalanceDate: opening,
  });
  const cats = (await agent.get("/api/categories")).body;
  const cat = (name) => cats.find((c) => c.name === name).id;
  for (let offset = 5; offset >= 0; offset--) {
    const start = new Date(Date.UTC(year, month - 1 - offset, 1))
      .toISOString()
      .slice(0, 7);
    await create("/transactions", {
      type: "income",
      amount: 8500000 + (5 - offset) * 250000,
      date: start + "-01",
      accountId: bank.id,
      categoryId: cat("Gaji"),
      description: "Gaji bulanan",
    });
    for (const [d, amount, category, description, accountId] of [
      [2, 1600000, "Tempat tinggal", "Sewa apartemen", bank.id],
      [3, 375000, "Belanja", "Kebutuhan bulanan", bank.id],
      [4, 185000, "Makanan", "Belanja mingguan", wallet.id],
      [5, 85000, "Transportasi", "Perjalanan kerja", wallet.id],
      [6, 145000, "Hiburan", "Akhir pekan bersama teman", cash.id],
      [7, 270000, "Makanan", "Bahan masakan", bank.id],
      [8, 450000, "Rumah tangga", "Perlengkapan rumah", bank.id],
      [9, 125000, "Makanan", "Makan siang & kopi", wallet.id],
    ]) {
      if (offset === 0 && d > currentDay) continue;
      await create("/transactions", {
        type: "expense",
        amount: amount + offset * 12000,
        date: start + "-" + String(d).padStart(2, "0"),
        accountId,
        categoryId: cat(category),
        description,
      });
    }
  }
  await create("/transfers", {
    amount: 500000,
    date: period + "-02",
    fromAccountId: bank.id,
    toAccountId: wallet.id,
    description: "Isi saldo GoPay",
  });
  for (const [category, limit] of [
    ["Makanan", 700000],
    ["Belanja", 450000],
    ["Transportasi", 300000],
  ])
    await create("/budgets", {
      categoryId: cat(category),
      period,
      limitAmount: limit,
      warningThreshold: 80,
    });
  const goal1 = await create("/goals", {
    name: "Dana darurat",
    targetAmount: 20000000,
    targetDate: `${year + 1}-06-30`,
    accountId: bank.id,
  });
  await create("/goals/" + goal1.id + "/contributions", {
    amount: 8200000,
    date: day,
    note: "Alokasi progres dana darurat",
  });
  const goal2 = await create("/goals", {
    name: "Perjalanan ke Jepang",
    targetAmount: 15000000,
    targetDate: `${year + 1}-12-01`,
  });
  await create("/goals/" + goal2.id + "/contributions", {
    amount: 4750000,
    date: day,
    note: "Catatan tabungan perjalanan",
  });
  await create("/bills", {
    name: "Internet rumah",
    amount: 350000,
    dueDate: nextDate(day, "daily"),
    frequency: "monthly",
    categoryId: cat("Rumah tangga"),
    reminderDays: 3,
  });
  const nextWeek = nextDate(day, "weekly");
  await create("/bills", {
    name: "Listrik",
    amount: 275000,
    dueDate: nextWeek,
    frequency: "monthly",
    categoryId: cat("Rumah tangga"),
    reminderDays: 7,
  });
  await create("/recurring", {
    type: "income",
    amount: 9750000,
    accountId: bank.id,
    categoryId: cat("Gaji"),
    description: "Gaji bulanan",
    frequency: "monthly",
    startDate: nextDate(period + "-01", "monthly"),
  });
  await agent
    .post("/api/auth/logout")
    .set("X-CSRF-Token", csrf)
    .send({})
    .expect(200);
  console.log(
    `Data contoh berhasil dibuat.\nEmail: ${email}\nPassword: ${password}\nIni akun pengembangan berisi data fiktif. Jangan gunakan di produksi.`,
  );
} finally {
  db.close();
}
