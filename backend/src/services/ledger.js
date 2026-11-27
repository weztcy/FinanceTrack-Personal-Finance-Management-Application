import { z } from "zod";
import { ensure, id, date, money, note } from "./validation.js";
export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: money,
    date,
    description: note,
    accountId: id.optional(),
    categoryId: id.optional(),
    fromAccountId: id.optional(),
    toAccountId: id.optional(),
  })
  .strict();
export function ledger(db, repo) {
  return {
    owned(uid, kind, recordId, active = false) {
      const value = repo.get(uid, kind, recordId);
      ensure(value, "Data tidak ditemukan.", 404);
      if (active)
        ensure(
          !value.isArchived,
          "Rekening atau kategori telah diarsipkan.",
          409,
        );
      return value;
    },
    validate(uid, data) {
      if (data.type === "transfer") {
        ensure(
          data.fromAccountId &&
            data.toAccountId &&
            data.fromAccountId !== data.toAccountId,
          "Pilih dua rekening yang berbeda.",
        );
        ensure(
          !data.categoryId && !data.accountId,
          "Transfer tidak memakai kategori atau accountId.",
        );
        for (const accountId of [data.fromAccountId, data.toAccountId]) {
          const account = this.owned(uid, "account", accountId, true);
          ensure(
            data.date >= account.openingBalanceDate,
            "Tanggal transaksi mendahului tanggal saldo awal rekening.",
          );
        }
      } else {
        ensure(
          data.accountId && data.categoryId,
          "Rekening dan kategori wajib dipilih.",
        );
        ensure(
          !data.fromAccountId && !data.toAccountId,
          "Rekening transfer tidak sesuai jenis transaksi.",
        );
        const account = this.owned(uid, "account", data.accountId, true);
        const category = this.owned(uid, "category", data.categoryId, true);
        ensure(
          category.type === data.type,
          "Jenis kategori tidak sesuai transaksi.",
        );
        ensure(
          data.date >= account.openingBalanceDate,
          "Tanggal transaksi mendahului tanggal saldo awal rekening.",
        );
      }
    },
    create(uid, data, source = "manual", extra = {}) {
      this.validate(uid, data);
      const value = repo.create(uid, "transaction", {
        ...data,
        source,
        status: "active",
        ...extra,
      });
      repo.audit(uid, "transaction", value.id, "create");
      return value;
    },
    accounts(uid) {
      return db
        .prepare(
          `SELECT a.*, COALESCE((SELECT SUM(CASE
        WHEN json_extract(t.data,'$.type')='income' AND json_extract(t.data,'$.accountId')=a.id THEN json_extract(t.data,'$.amountMinor')
        WHEN json_extract(t.data,'$.type')='expense' AND json_extract(t.data,'$.accountId')=a.id THEN -json_extract(t.data,'$.amountMinor')
        WHEN json_extract(t.data,'$.type')='transfer' AND json_extract(t.data,'$.toAccountId')=a.id THEN json_extract(t.data,'$.amountMinor')
        WHEN json_extract(t.data,'$.type')='transfer' AND json_extract(t.data,'$.fromAccountId')=a.id THEN -json_extract(t.data,'$.amountMinor') ELSE 0 END)
        FROM records t WHERE t.user_id=a.user_id AND t.kind='transaction' AND json_extract(t.data,'$.status')='active'),0) AS delta
        FROM records a WHERE a.user_id=? AND a.kind='account' ORDER BY a.created_at,a.id`,
        )
        .all(uid)
        .map((r) => {
          const a = repo.decode(r);
          return { ...a, balanceMinor: a.openingBalanceMinor + r.delta };
        });
    },
    budgets(uid) {
      return db
        .prepare(
          `SELECT b.*,COALESCE((SELECT SUM(json_extract(t.data,'$.amountMinor')) FROM records t
        WHERE t.user_id=b.user_id AND t.kind='transaction' AND json_extract(t.data,'$.status')='active'
        AND json_extract(t.data,'$.type')='expense' AND json_extract(t.data,'$.categoryId')=json_extract(b.data,'$.categoryId')
        AND substr(json_extract(t.data,'$.date'),1,7)=json_extract(b.data,'$.period')),0) AS spent
        FROM records b WHERE b.user_id=? AND b.kind='budget' ORDER BY json_extract(b.data,'$.period') DESC`,
        )
        .all(uid)
        .map((r) => {
          const b = repo.decode(r),
            percentage = (r.spent / b.limitAmountMinor) * 100;
          return {
            ...b,
            spentMinor: r.spent,
            remainingMinor: b.limitAmountMinor - r.spent,
            percentage,
            status:
              percentage >= 100
                ? "exceeded"
                : percentage >= b.warningThreshold
                  ? "warning"
                  : "safe",
          };
        });
    },
    goal(uid, goal) {
      const { total } = db
        .prepare(
          `SELECT COALESCE(SUM(json_extract(data,'$.amountMinor')),0) total FROM records WHERE user_id=? AND kind='contribution' AND json_extract(data,'$.goalId')=? AND json_extract(data,'$.status')='active'`,
        )
        .get(uid, goal.id);
      return {
        ...goal,
        currentAmountMinor: total,
        remainingMinor: Math.max(0, goal.targetAmountMinor - total),
        percentage: (total / goal.targetAmountMinor) * 100,
        isAchieved: total >= goal.targetAmountMinor,
      };
    },
  };
}
