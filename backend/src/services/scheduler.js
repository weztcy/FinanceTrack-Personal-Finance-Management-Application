import { atomic } from "../db/database.js";
import { today, nextDate } from "./validation.js";
export function scheduler(db, repo, ledger) {
  function notify(uid, type, title, message, entityId, dedupeKey) {
    const user = db
      .prepare("SELECT preferences FROM users WHERE id=?")
      .get(uid);
    if (!user || !JSON.parse(user.preferences)[type]) return;
    const existing = db
      .prepare(
        "SELECT id FROM records WHERE user_id=? AND kind='notification' AND json_extract(data,'$.dedupeKey')=?",
      )
      .get(uid, dedupeKey);
    if (!existing)
      repo.create(uid, "notification", {
        type,
        title,
        message,
        relatedEntityId: entityId,
        dedupeKey,
        isRead: false,
      });
  }
  function reminders(uid, now = new Date()) {
    const user = db.prepare("SELECT timezone FROM users WHERE id=?").get(uid);
    if (!user) return;
    const day = today(user.timezone, now);
    for (const b of ledger.budgets(uid))
      if (b.percentage >= b.warningThreshold) {
        notify(
          uid,
          "budget",
          b.percentage >= 100
            ? "Anggaran terlampaui"
            : "Anggaran mendekati batas",
          `Penggunaan anggaran ${b.period} mencapai ${b.percentage.toFixed(0)}%.`,
          b.id,
          `budget:${b.id}:${b.percentage >= 100 ? "100" : "warning"}`,
        );
      }
    for (const bill of repo.list(uid, "bill"))
      if (!bill.paidTransactionId && !bill.isArchived) {
        const days = Math.round(
          (Date.parse(bill.dueDate) - Date.parse(day)) / 86400000,
        );
        if (days <= bill.reminderDays)
          notify(
            uid,
            "bill",
            days < 0
              ? "Tagihan terlambat"
              : days === 0
                ? "Tagihan jatuh tempo hari ini"
                : "Pengingat tagihan",
            `${bill.name} jatuh tempo ${bill.dueDate}.`,
            bill.id,
            `bill:${bill.id}:${days < 0 ? "overdue" : days === 0 ? "today" : "upcoming"}`,
          );
      }
  }
  function run(now = new Date(), onlyUser = null) {
    const users = onlyUser
      ? db.prepare("SELECT id,timezone FROM users WHERE id=?").all(onlyUser)
      : db.prepare("SELECT id,timezone FROM users").all();
    let count = 0;
    for (const user of users) {
      const day = today(user.timezone, now);
      for (const job of repo.list(user.id, "recurring")) {
        if (job.isPaused || job.isEnded) continue;
        let current = job.nextRunAt,
          iterations = 0;
        while (
          current <= day &&
          (!job.endDate || current <= job.endDate) &&
          iterations++ < 400
        ) {
          try {
            atomic(db, () => {
              const fresh = repo.get(user.id, "recurring", job.id);
              if (
                fresh.nextRunAt !== current ||
                fresh.isPaused ||
                fresh.isEnded
              )
                return;
              const occurrenceKey = `${job.id}:${current}`;
              if (
                !db
                  .prepare(
                    "SELECT id FROM records WHERE user_id=? AND kind='transaction' AND json_extract(data,'$.occurrenceKey')=?",
                  )
                  .get(user.id, occurrenceKey)
              ) {
                ledger.create(
                  user.id,
                  {
                    type: fresh.type,
                    amountMinor: fresh.amountMinor,
                    accountId: fresh.accountId,
                    categoryId: fresh.categoryId,
                    description: fresh.description,
                    date: current,
                    currency: fresh.currency,
                  },
                  "recurring",
                  { occurrenceKey, recurringId: job.id },
                );
                count++;
              }
              const next = nextDate(current, fresh.frequency, fresh.startDate);
              repo.update(user.id, "recurring", job.id, {
                nextRunAt: next,
                lastRunAt: current,
                lastError: null,
                isEnded: !!(fresh.endDate && next > fresh.endDate),
              });
            });
            current = nextDate(current, job.frequency, job.startDate);
          } catch (error) {
            atomic(db, () => {
              repo.update(user.id, "recurring", job.id, {
                lastError: error.status
                  ? error.message
                  : "Eksekusi gagal. Periksa konfigurasi jadwal.",
              });
              notify(
                user.id,
                "recurring",
                "Transaksi berulang gagal",
                "Jadwal tidak dapat diproses. Periksa rekening dan kategori, lalu lanjutkan kembali.",
                job.id,
                `recurring:${job.id}:${current}`,
              );
            });
            break;
          }
        }
      }
      atomic(db, () => reminders(user.id, now));
    }
    return { processed: count };
  }
  return { notify, reminders, run };
}
