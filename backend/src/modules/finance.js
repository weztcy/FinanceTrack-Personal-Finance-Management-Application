import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { atomic } from "../db/database.js";
import { idempotent } from "../middleware/security.js";
import {
  ensure,
  text,
  note,
  id,
  money,
  openingMoney,
  date,
  period,
  frequency,
  nextDate,
  publicData,
  today,
} from "../services/validation.js";
import { transactionSchema } from "../services/ledger.js";

const accountSchema = z.object({
  name: text,
  type: z.enum(["cash", "bank", "ewallet", "other"]),
  openingBalance: openingMoney,
  openingBalanceDate: date,
  description: note,
});
const categorySchema = z.object({
  name: text,
  type: z.enum(["income", "expense"]),
  color: z
    .string()
    .regex(/^#[a-fA-F0-9]{6}$/)
    .default("#478673"),
});
const budgetSchema = z.object({
  categoryId: id,
  period,
  limitAmount: money,
  warningThreshold: z.coerce.number().min(1).max(99).default(80),
});
const recurringSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: money,
  accountId: id,
  categoryId: id,
  description: note,
  startDate: date,
  endDate: date.nullable().optional(),
  frequency,
});
const goalSchema = z.object({
  name: text,
  targetAmount: money,
  targetDate: date.nullable().optional(),
  accountId: id.nullable().optional(),
  status: z
    .enum(["active", "paused", "completed", "archived"])
    .default("active"),
});
const billSchema = z.object({
  name: text,
  amount: money,
  dueDate: date,
  frequency: z
    .enum(["once", "daily", "weekly", "monthly", "yearly"])
    .default("once"),
  categoryId: id,
  reminderDays: z.coerce.number().int().min(0).max(30).default(3),
  note,
});
const contributionSchema = z.object({ amount: money, date, note });
function amounts(data) {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) =>
      ["amount", "openingBalance", "limitAmount", "targetAmount"].includes(k)
        ? [k + "Minor", v]
        : [k, v],
    ),
  );
}

export function financeRoutes(db, repo, ledger, report, scheduled) {
  const router = Router();
  const send = (res, data) => res.json(publicData(data));
  function mutate(req, res, fn, idem = false, status = 200) {
    const result = atomic(db, () => {
      const data = idem ? idempotent(db, req, fn) : fn();
      scheduled.reminders(req.user.id);
      return data;
    });
    res.status(status).json(publicData(result));
  }
  const own = (req, kind, recordId, active = false) =>
    ledger.owned(req.user.id, kind, recordId, active);
  const audit = (req, kind, value, action) => {
    repo.audit(req.user.id, kind, value.id, action);
    return value;
  };
  function validateCategory(req, categoryId, type) {
    const cat = own(req, "category", categoryId, true);
    ensure(cat.type === type, "Jenis kategori tidak sesuai.");
  }

  router.get("/accounts", (req, res) =>
    send(res, ledger.accounts(req.user.id)),
  );
  router.post("/accounts", (req, res) => {
    const data = amounts(accountSchema.strict().parse(req.body));
    mutate(
      req,
      res,
      () =>
        audit(
          req,
          "account",
          repo.create(req.user.id, "account", {
            ...data,
            currency: req.user.currency,
            isArchived: false,
          }),
          "create",
        ),
      true,
      201,
    );
  });
  router.get("/accounts/:id", (req, res) => {
    own(req, "account", req.params.id);
    send(
      res,
      ledger.accounts(req.user.id).find((a) => a.id === req.params.id),
    );
  });
  router.patch("/accounts/:id", (req, res) => {
    const data = accountSchema
      .omit({ openingBalance: true, openingBalanceDate: true })
      .partial()
      .strict()
      .parse(req.body);
    mutate(req, res, () => {
      own(req, "account", req.params.id);
      return audit(
        req,
        "account",
        repo.update(req.user.id, "account", req.params.id, data),
        "update",
      );
    });
  });
  router.post("/accounts/:id/archive", (req, res) =>
    mutate(req, res, () => {
      own(req, "account", req.params.id);
      return audit(
        req,
        "account",
        repo.update(req.user.id, "account", req.params.id, {
          isArchived: true,
        }),
        "archive",
      );
    }),
  );
  router.get("/categories", (req, res) =>
    send(res, repo.list(req.user.id, "category")),
  );
  router.post("/categories", (req, res) => {
    const data = categorySchema.strict().parse(req.body);
    mutate(
      req,
      res,
      () =>
        repo.create(req.user.id, "category", { ...data, isArchived: false }),
      true,
      201,
    );
  });
  router.patch("/categories/:id", (req, res) => {
    const data = categorySchema.partial().strict().parse(req.body);
    mutate(req, res, () => {
      const old = own(req, "category", req.params.id);
      if (data.type && data.type !== old.type)
        ensure(
          !db
            .prepare(
              "SELECT 1 FROM records WHERE user_id=? AND kind IN ('transaction','budget','bill','recurring') AND json_extract(data,'$.categoryId')=? LIMIT 1",
            )
            .get(req.user.id, old.id),
          "Tipe kategori yang sudah dipakai tidak dapat diubah.",
          409,
        );
      return repo.update(req.user.id, "category", old.id, data);
    });
  });
  router.delete("/categories/:id", (req, res) =>
    mutate(req, res, () => {
      own(req, "category", req.params.id);
      return repo.update(req.user.id, "category", req.params.id, {
        isArchived: true,
      });
    }),
  );
  router.get("/transactions", (req, res) =>
    send(res, report.transactions(req.user.id, req.query)),
  );
  router.post(["/transactions", "/transfers"], (req, res) => {
    const raw =
      req.path === "/transfers" ? { ...req.body, type: "transfer" } : req.body;
    const data = amounts(transactionSchema.parse(raw));
    mutate(
      req,
      res,
      () =>
        ledger.create(req.user.id, { ...data, currency: req.user.currency }),
      true,
      201,
    );
  });
  router.get("/transactions/:id", (req, res) => {
    const tx = own(req, "transaction", req.params.id);
    const history = db
      .prepare(
        "SELECT * FROM records WHERE user_id=? AND kind='audit' AND json_extract(data,'$.entityId')=? ORDER BY created_at DESC",
      )
      .all(req.user.id, tx.id)
      .map(repo.decode);
    send(res, { ...tx, history });
  });
  router.patch("/transactions/:id", (req, res) => {
    const changes = amounts(transactionSchema.partial().parse(req.body));
    mutate(req, res, () => {
      const old = own(req, "transaction", req.params.id);
      ensure(old.status === "active", "Transaksi sudah dibatalkan.", 409);
      const merged = { ...old, ...changes };
      if (merged.type === "transfer") {
        changes.accountId = null;
        changes.categoryId = null;
        merged.accountId = null;
        merged.categoryId = null;
      } else {
        changes.fromAccountId = null;
        changes.toAccountId = null;
        merged.fromAccountId = null;
        merged.toAccountId = null;
      }
      ledger.validate(req.user.id, merged);
      const linked = db
        .prepare(
          "SELECT id,data FROM records WHERE user_id=? AND kind='bill' AND json_extract(data,'$.paidTransactionId')=?",
        )
        .get(req.user.id, old.id);
      if (linked) {
        const bill = JSON.parse(linked.data);
        ensure(
          merged.type === "expense" &&
            merged.categoryId === bill.categoryId &&
            merged.amountMinor === bill.amountMinor,
          "Transaksi pembayaran harus tetap sesuai nominal dan kategori tagihan.",
          409,
        );
      }
      return audit(
        req,
        "transaction",
        repo.update(req.user.id, "transaction", old.id, changes),
        "update",
      );
    });
  });
  router.post("/transactions/:id/void", (req, res) =>
    mutate(req, res, () => {
      const tx = own(req, "transaction", req.params.id);
      const linked = db
        .prepare(
          "SELECT id FROM records WHERE user_id=? AND kind='bill' AND json_extract(data,'$.paidTransactionId')=?",
        )
        .get(req.user.id, tx.id);
      if (linked)
        repo.update(req.user.id, "bill", linked.id, {
          paidTransactionId: null,
          paidAt: null,
        });
      return audit(
        req,
        "transaction",
        repo.update(req.user.id, "transaction", tx.id, { status: "void" }),
        "void",
      );
    }),
  );

  router.get("/budgets", (req, res) => send(res, ledger.budgets(req.user.id)));
  router.post("/budgets", (req, res) => {
    const data = amounts(budgetSchema.strict().parse(req.body));
    validateCategory(req, data.categoryId, "expense");
    mutate(req, res, () => repo.create(req.user.id, "budget", data), true, 201);
  });
  router.patch("/budgets/:id", (req, res) => {
    const changes = amounts(budgetSchema.partial().strict().parse(req.body));
    mutate(req, res, () => {
      const old = own(req, "budget", req.params.id);
      validateCategory(req, changes.categoryId || old.categoryId, "expense");
      return repo.update(req.user.id, "budget", old.id, changes);
    });
  });
  router.delete("/budgets/:id", (req, res) =>
    mutate(req, res, () => {
      own(req, "budget", req.params.id);
      repo.remove(req.user.id, "budget", req.params.id);
      return { message: "Anggaran dihapus." };
    }),
  );

  router.get("/recurring", (req, res) =>
    send(res, repo.list(req.user.id, "recurring")),
  );
  router.post("/recurring", (req, res) => {
    const data = amounts(recurringSchema.strict().parse(req.body));
    ledger.validate(req.user.id, { ...data, date: data.startDate });
    ensure(
      !data.endDate || data.endDate >= data.startDate,
      "Tanggal akhir mendahului tanggal mulai.",
    );
    mutate(
      req,
      res,
      () =>
        repo.create(req.user.id, "recurring", {
          ...data,
          currency: req.user.currency,
          nextRunAt: data.startDate,
          isPaused: false,
          isEnded: false,
          lastError: null,
        }),
      true,
      201,
    );
  });
  router.patch("/recurring/:id", (req, res) => {
    const changes = amounts(
      recurringSchema
        .partial()
        .extend({
          isPaused: z.boolean().optional(),
          isEnded: z.boolean().optional(),
        })
        .strict()
        .parse(req.body),
    );
    mutate(req, res, () => {
      const old = own(req, "recurring", req.params.id),
        merged = { ...old, ...changes };
      ensure(
        !old.isEnded || changes.isEnded !== false,
        "Jadwal yang diakhiri tidak dapat diaktifkan kembali.",
      );
      ensure(
        !merged.endDate || merged.endDate >= merged.startDate,
        "Tanggal akhir mendahului tanggal mulai.",
      );
      // Pausing/ending must remain possible even if referenced account has been archived.
      if (!(changes.isPaused === true || changes.isEnded === true))
        ledger.validate(req.user.id, { ...merged, date: merged.startDate });
      if (changes.startDate || changes.frequency) {
        ensure(
          !old.lastRunAt || merged.startDate > old.lastRunAt,
          "Tanggal mulai baru harus setelah eksekusi terakhir.",
        );
        changes.nextRunAt = merged.startDate;
      }
      return repo.update(req.user.id, "recurring", old.id, {
        ...changes,
        lastError: null,
      });
    });
  });
  router.post("/recurring/process", (req, res) =>
    send(res, scheduled.run(new Date(), req.user.id)),
  );

  router.get("/goals", (req, res) =>
    send(
      res,
      repo.list(req.user.id, "goal").map((g) => ledger.goal(req.user.id, g)),
    ),
  );
  router.post("/goals", (req, res) => {
    const data = amounts(goalSchema.strict().parse(req.body));
    if (data.accountId) own(req, "account", data.accountId, true);
    mutate(req, res, () => repo.create(req.user.id, "goal", data), true, 201);
  });
  router.patch("/goals/:id", (req, res) => {
    const data = amounts(goalSchema.partial().strict().parse(req.body));
    mutate(req, res, () => {
      own(req, "goal", req.params.id);
      if (data.accountId) own(req, "account", data.accountId, true);
      return repo.update(req.user.id, "goal", req.params.id, data);
    });
  });
  router.get("/goals/:id/contributions", (req, res) => {
    own(req, "goal", req.params.id);
    send(
      res,
      repo
        .list(req.user.id, "contribution")
        .filter((c) => c.goalId === req.params.id),
    );
  });
  router.post("/goals/:id/contributions", (req, res) => {
    const data = amounts(contributionSchema.strict().parse(req.body));
    mutate(
      req,
      res,
      () => {
        const goal = own(req, "goal", req.params.id);
        ensure(goal.status === "active", "Target tidak aktif.", 409);
        return repo.create(req.user.id, "contribution", {
          ...data,
          goalId: goal.id,
          status: "active",
          mode: "progress-only",
        });
      },
      true,
      201,
    );
  });
  router.patch("/goals/:id/contributions/:contributionId", (req, res) => {
    const data = amounts(contributionSchema.partial().strict().parse(req.body));
    mutate(req, res, () => {
      own(req, "goal", req.params.id);
      const c = own(req, "contribution", req.params.contributionId);
      ensure(c.goalId === req.params.id, "Data tidak ditemukan.", 404);
      ensure(c.status === "active", "Kontribusi sudah dibatalkan.", 409);
      return repo.update(req.user.id, "contribution", c.id, data);
    });
  });
  router.post("/goals/:id/contributions/:contributionId/void", (req, res) =>
    mutate(req, res, () => {
      own(req, "goal", req.params.id);
      const c = own(req, "contribution", req.params.contributionId);
      ensure(c.goalId === req.params.id, "Data tidak ditemukan.", 404);
      return repo.update(req.user.id, "contribution", c.id, { status: "void" });
    }),
  );

  router.get("/bills", (req, res) => {
    const day = today(req.user.timezone);
    send(
      res,
      repo
        .list(req.user.id, "bill")
        .map((b) => ({
          ...b,
          status: b.paidTransactionId
            ? "paid"
            : b.dueDate < day
              ? "overdue"
              : b.dueDate === day
                ? "due"
                : "upcoming",
        })),
    );
  });
  router.post("/bills", (req, res) => {
    const data = amounts(billSchema.strict().parse(req.body));
    validateCategory(req, data.categoryId, "expense");
    mutate(
      req,
      res,
      () =>
        repo.create(req.user.id, "bill", {
          ...data,
          anchorDate: data.dueDate,
          isArchived: false,
          paidTransactionId: null,
        }),
      true,
      201,
    );
  });
  router.patch("/bills/:id", (req, res) => {
    const data = amounts(
      billSchema
        .partial()
        .extend({ isArchived: z.boolean().optional() })
        .strict()
        .parse(req.body),
    );
    mutate(req, res, () => {
      const old = own(req, "bill", req.params.id);
      ensure(
        !old.paidTransactionId,
        "Tagihan dibayar tidak dapat diubah.",
        409,
      );
      validateCategory(req, data.categoryId || old.categoryId, "expense");
      return repo.update(req.user.id, "bill", old.id, {
        ...data,
        ...(data.dueDate ? { anchorDate: data.dueDate } : {}),
      });
    });
  });
  router.post("/bills/:id/pay", (req, res) => {
    const data = z
      .object({
        accountId: id.optional(),
        transactionId: id.optional(),
        date: date.optional(),
      })
      .strict()
      .parse(req.body);
    mutate(
      req,
      res,
      () => {
        const bill = own(req, "bill", req.params.id);
        if (bill.paidTransactionId) return bill;
        ensure(!bill.isArchived, "Tagihan telah diarsipkan.", 409);
        let tx;
        if (data.transactionId) {
          tx = own(req, "transaction", data.transactionId);
          ensure(
            tx.status === "active" &&
              tx.type === "expense" &&
              tx.amountMinor === bill.amountMinor &&
              tx.categoryId === bill.categoryId,
            "Transaksi harus pengeluaran aktif dengan nominal dan kategori yang sama.",
          );
          ensure(
            !db
              .prepare(
                "SELECT id FROM records WHERE user_id=? AND kind='bill' AND json_extract(data,'$.paidTransactionId')=?",
              )
              .get(req.user.id, tx.id),
            "Transaksi sudah terhubung dengan tagihan lain.",
            409,
          );
        } else {
          ensure(data.accountId, "Pilih rekening pembayaran.");
          tx = ledger.create(
            req.user.id,
            {
              type: "expense",
              accountId: data.accountId,
              categoryId: bill.categoryId,
              amountMinor: bill.amountMinor,
              date: data.date || today(req.user.timezone),
              description: bill.name,
              currency: req.user.currency,
            },
            "bill",
            { billId: bill.id },
          );
        }
        const updated = repo.update(req.user.id, "bill", bill.id, {
          paidTransactionId: tx.id,
          paidAt: new Date().toISOString(),
        });
        if (
          bill.frequency !== "once" &&
          !db
            .prepare(
              "SELECT id FROM records WHERE user_id=? AND kind='bill' AND json_extract(data,'$.parentBillId')=?",
            )
            .get(req.user.id, bill.id)
        ) {
          const { id: ignored, createdAt, updatedAt, paidAt, ...base } = bill;
          repo.create(req.user.id, "bill", {
            ...base,
            dueDate: nextDate(bill.dueDate, bill.frequency, bill.anchorDate),
            paidTransactionId: null,
            parentBillId: bill.id,
          });
        }
        return audit(req, "bill", updated, "pay");
      },
      true,
    );
  });
  router.get("/notifications", (req, res) => {
    atomic(db, () => scheduled.reminders(req.user.id));
    send(res, repo.list(req.user.id, "notification"));
  });
  router.patch("/notifications/:id/read", (req, res) =>
    mutate(req, res, () => {
      own(req, "notification", req.params.id);
      return repo.update(req.user.id, "notification", req.params.id, {
        isRead: true,
      });
    }),
  );
  router.post("/notifications/read-all", (req, res) =>
    mutate(req, res, () => {
      for (const n of repo.list(req.user.id, "notification"))
        if (!n.isRead)
          repo.update(req.user.id, "notification", n.id, { isRead: true });
      return { message: "Semua notifikasi dibaca." };
    }),
  );
  router.get(["/dashboard/summary", "/dashboard/trends"], (req, res) => {
    const day = today(req.user.timezone),
      start = day.slice(0, 7) + "-01";
    const raw = { startDate: start, endDate: day, ...req.query };
    const accounts = ledger.accounts(req.user.id);
    const comparisonStart = new Date(raw.endDate + "T12:00:00Z");
    comparisonStart.setUTCDate(1);
    comparisonStart.setUTCMonth(comparisonStart.getUTCMonth() - 5);
    send(res, {
      ...report.summary(req.user.id, raw),
      accounts,
      totalBalanceMinor: accounts
        .filter((a) => !a.isArchived)
        .reduce((s, a) => s + a.balanceMinor, 0),
      budgets: ledger
        .budgets(req.user.id)
        .filter((b) => b.period === raw.startDate.slice(0, 7)),
      goals: repo
        .list(req.user.id, "goal")
        .map((g) => ledger.goal(req.user.id, g)),
      bills: repo
        .list(req.user.id, "bill")
        .filter((b) => !b.paidTransactionId && !b.isArchived)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 4),
      recent: report.transactions(req.user.id, { ...raw, page: 1, pageSize: 5 })
        .items,
      comparison: report.summary(req.user.id, {
        ...req.query,
        startDate: comparisonStart.toISOString().slice(0, 10),
        endDate: raw.endDate,
      }).trends,
    });
  });
  router.get("/reports/summary", (req, res) =>
    send(res, {
      ...report.summary(req.user.id, req.query),
      transactions: report.transactions(req.user.id, req.query),
    }),
  );
  router.get("/reports/export.csv", (req, res) => {
    const rows = report.transactions(req.user.id, req.query, false).items;
    const categories = new Map(
        repo.list(req.user.id, "category").map((c) => [c.id, c.name]),
      ),
      accounts = new Map(
        repo.list(req.user.id, "account").map((a) => [a.id, a.name]),
      );
    const csv = (v) =>
      '"' +
      String(v ?? "")
        .replace(/^(\s*[=+@\-]|[\t\r])/, "'$&")
        .replaceAll('"', '""') +
      '"';
    res
      .attachment("financetrack-transactions.csv")
      .type("text/csv; charset=utf-8");
    res.send(
      "\uFEFF" +
        [
          [
            "Tanggal",
            "Jenis",
            "Deskripsi",
            "Kategori",
            "Rekening",
            "Tujuan",
            "Nominal",
            "Mata uang",
          ],
          ...rows.map((t) => [
            t.date,
            t.type,
            t.description,
            categories.get(t.categoryId) || "",
            accounts.get(t.accountId || t.fromAccountId) || "",
            accounts.get(t.toAccountId) || "",
            (t.amountMinor / 100).toFixed(2),
            t.currency,
          ]),
        ]
          .map((row) => row.map(csv).join(","))
          .join("\r\n"),
    );
  });
  router.get("/reports/export.pdf", (req, res) => {
    const summary = report.summary(req.user.id, req.query),
      rows = report.transactions(req.user.id, req.query, false).items;
    const accounts = new Map(
        repo.list(req.user.id, "account").map((a) => [a.id, a.name]),
      ),
      categories = new Map(
        repo.list(req.user.id, "category").map((a) => [a.id, a.name]),
      );
    const money = (v) =>
      `${req.user.currency} ${(v / 100).toLocaleString("id-ID", { minimumFractionDigits: 2 })}`;
    const clean = (s) =>
      String(s || "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
    const doc = new PDFDocument({ size: "A4", margin: 44, bufferPages: true });
    doc.font(
      fileURLToPath(
        new URL("../../assets/fonts/NotoSans.ttf", import.meta.url),
      ),
    );
    res.attachment("financetrack-report.pdf").type("application/pdf");
    doc.pipe(res);
    doc.fontSize(24).fillColor("#174f44").text("FinanceTrack");
    doc.fontSize(11).fillColor("#444444").text("Laporan keuangan pribadi");
    doc.moveDown();
    doc.text(`Pemilik: ${clean(req.user.name)}`);
    doc.text(
      `Periode: ${req.query.startDate || "Semua tanggal"} - ${req.query.endDate || "Semua tanggal"}`,
    );
    doc.text(
      `Dibuat: ${new Date().toLocaleString("id-ID", { timeZone: req.user.timezone })} (${req.user.timezone})`,
    );
    doc.text(
      `Filter: jenis=${req.query.type || "semua"}; rekening=${clean(accounts.get(req.query.accountId) || "semua")}; kategori=${clean(categories.get(req.query.categoryId) || "semua")}${req.query.search ? "; deskripsi=" + clean(req.query.search) : ""}`,
    );
    doc
      .moveDown()
      .text(
        `Pemasukan: ${money(summary.incomeMinor)}    Pengeluaran: ${money(summary.expenseMinor)}`,
      );
    doc.text(
      `Arus kas bersih: ${money(summary.netMinor)}    Transfer: ${money(summary.transferMinor)}`,
    );
    doc.moveDown();
    doc.on("pageAdded", () => {
      doc
        .fontSize(11)
        .fillColor("#174f44")
        .text("FinanceTrack | Rincian transaksi", 44, 35);
      doc.moveDown();
    });
    for (const t of rows) {
      if (doc.y > 700) doc.addPage();
      const y = doc.y;
      doc
        .fontSize(10)
        .fillColor("#174f44")
        .text(`${t.date}  |  ${t.type}  |  ${money(t.amountMinor)}`, 44, y, {
          width: 507,
        });
      doc
        .fillColor("#444444")
        .text(clean(t.description || "-"), { width: 507 });
      doc
        .fontSize(9)
        .text(
          clean(
            `${categories.get(t.categoryId) || "Transfer"}  |  ${accounts.get(t.accountId || t.fromAccountId) || ""}${t.toAccountId ? " -> " + accounts.get(t.toAccountId) : ""}  |  ${t.source}`,
          ),
          { width: 507 },
        );
      doc.moveDown(0.7);
    }
    const range = doc.bufferedPageRange();
    for (let p = range.start; p < range.start + range.count; p++) {
      doc.switchToPage(p);
      doc
        .fontSize(8)
        .text(`FinanceTrack | ${p + 1} / ${range.count}`, 44, 790, {
          lineBreak: false,
        });
    }
    doc.end();
  });
  return router;
}
