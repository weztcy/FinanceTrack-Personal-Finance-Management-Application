import { z } from "zod";
import { date, ensure, id } from "./validation.js";
export const filtersSchema = z.object({
  startDate: date.optional(),
  endDate: date.optional(),
  accountId: id.optional(),
  categoryId: id.optional(),
  type: z.enum(["income", "expense", "transfer"]).optional(),
  search: z.string().trim().max(200).optional(),
  sort: z
    .enum(["date_desc", "date_asc", "amount_desc", "amount_asc"])
    .default("date_desc"),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export function transactionQuery(uid, raw) {
  const f = filtersSchema.parse(raw);
  ensure(
    !f.startDate || !f.endDate || f.startDate <= f.endDate,
    "Tanggal mulai harus sebelum atau sama dengan tanggal akhir.",
  );
  const where = [
      "t.user_id=?",
      "t.kind='transaction'",
      "json_extract(t.data,'$.status')='active'",
    ],
    params = [uid];
  for (const [key, op, value] of [
    ["date", ">=", f.startDate],
    ["date", "<=", f.endDate],
    ["categoryId", "=", f.categoryId],
    ["type", "=", f.type],
  ])
    if (value) {
      where.push(`json_extract(t.data,'$.${key}')${op}?`);
      params.push(value);
    }
  if (f.accountId) {
    where.push(
      "(json_extract(t.data,'$.accountId')=? OR json_extract(t.data,'$.fromAccountId')=? OR json_extract(t.data,'$.toAccountId')=?)",
    );
    params.push(f.accountId, f.accountId, f.accountId);
  }
  if (f.search) {
    where.push("instr(lower(json_extract(t.data,'$.description')),lower(?))>0");
    params.push(f.search);
  }
  return { f, where: where.join(" AND "), params };
}
export function reports(db, repo) {
  return {
    transactions(uid, raw, paginate = true) {
      const { f, where, params } = transactionQuery(uid, raw);
      const order = {
        date_desc: "json_extract(t.data,'$.date') DESC",
        date_asc: "json_extract(t.data,'$.date') ASC",
        amount_desc: "json_extract(t.data,'$.amountMinor') DESC",
        amount_asc: "json_extract(t.data,'$.amountMinor') ASC",
      }[f.sort];
      const { total } = db
        .prepare(`SELECT COUNT(*) total FROM records t WHERE ${where}`)
        .get(...params);
      const sql =
        `SELECT t.* FROM records t WHERE ${where} ORDER BY ${order},t.created_at DESC,t.id DESC` +
        (paginate ? " LIMIT ? OFFSET ?" : "");
      const values = paginate
        ? [...params, f.pageSize, (f.page - 1) * f.pageSize]
        : params;
      return {
        items: db
          .prepare(sql)
          .all(...values)
          .map(repo.decode),
        total,
        page: f.page,
        pageSize: f.pageSize,
        pages: Math.ceil(total / f.pageSize),
      };
    },
    summary(uid, raw) {
      const { where, params, f } = transactionQuery(uid, raw);
      const totals = db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN json_extract(t.data,'$.type')='income' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END),0) incomeMinor,
        COALESCE(SUM(CASE WHEN json_extract(t.data,'$.type')='expense' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END),0) expenseMinor,
        COALESCE(SUM(CASE WHEN json_extract(t.data,'$.type')='transfer' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END),0) transferMinor,COUNT(*) transactionCount
        FROM records t WHERE ${where}`,
        )
        .get(...params);
      const categories = db
        .prepare(
          `SELECT json_extract(t.data,'$.categoryId') categoryId,SUM(json_extract(t.data,'$.amountMinor')) amountMinor
        FROM records t WHERE ${where} AND json_extract(t.data,'$.type')='expense' GROUP BY categoryId ORDER BY amountMinor DESC`,
        )
        .all(...params);
      const trends = db
        .prepare(
          `SELECT substr(json_extract(t.data,'$.date'),1,7) month,
        SUM(CASE WHEN json_extract(t.data,'$.type')='income' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END) incomeMinor,
        SUM(CASE WHEN json_extract(t.data,'$.type')='expense' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END) expenseMinor
        FROM records t WHERE ${where} GROUP BY month ORDER BY month`,
        )
        .all(...params);
      const daily = db
        .prepare(
          `SELECT json_extract(t.data,'$.date') date,
        SUM(CASE WHEN json_extract(t.data,'$.type')='income' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END) incomeMinor,
        SUM(CASE WHEN json_extract(t.data,'$.type')='expense' THEN json_extract(t.data,'$.amountMinor') ELSE 0 END) expenseMinor
        FROM records t WHERE ${where} GROUP BY date ORDER BY date`,
        )
        .all(...params);
      return {
        ...totals,
        netMinor: totals.incomeMinor - totals.expenseMinor,
        categories,
        trends,
        daily,
        filters: f,
      };
    },
  };
}
