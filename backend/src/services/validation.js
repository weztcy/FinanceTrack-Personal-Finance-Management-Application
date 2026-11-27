import { z } from "zod";
export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function ensure(condition, message, status = 400) {
  if (!condition) throw new AppError(status, message);
}
export const text = z.string().trim().min(1).max(120);
export const note = z.string().trim().max(1000).default("");
export const id = z.string().uuid();
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Tanggal tidak valid",
  );
export const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const twoDecimals = z
  .number()
  .finite()
  .refine(
    (v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001,
    "Nominal maksimal dua angka desimal",
  );
export const money = z
  .union([twoDecimals, z.string().regex(/^\d+(\.\d{1,2})?$/)])
  .transform((v) => Math.round(Number(v) * 100))
  .pipe(z.number().int().positive().max(1_000_000_000_000));
export const openingMoney = z
  .union([twoDecimals, z.string().regex(/^-?\d+(\.\d{1,2})?$/)])
  .transform((v) => Math.round(Number(v) * 100))
  .pipe(z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000));
export const currency = z.enum(["IDR", "USD", "EUR", "SGD", "MYR"]);
export const timezone = z
  .string()
  .max(80)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Zona waktu tidak valid");
export const password = z
  .string()
  .min(10)
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Kata sandi maksimal 72 byte UTF-8",
  )
  .refine(
    (v) => /[a-zA-Z]/.test(v) && /\d/.test(v),
    "Kata sandi minimal 10 karakter, berisi huruf dan angka",
  );
export const frequency = z.enum(["daily", "weekly", "monthly", "yearly"]);
export function parse(schema, data) {
  return schema.parse(data);
}
export function today(timezone = "Asia/Jakarta", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function nextDate(current, frequency, anchor = current) {
  const d = new Date(current + "T12:00:00Z"),
    a = new Date(anchor + "T12:00:00Z");
  if (frequency === "daily") d.setUTCDate(d.getUTCDate() + 1);
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  if (frequency === "monthly" || frequency === "yearly") {
    const month =
      frequency === "monthly" ? d.getUTCMonth() + 1 : a.getUTCMonth();
    const year = d.getUTCFullYear() + (frequency === "yearly" ? 1 : 0);
    const end = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    d.setUTCDate(1);
    d.setUTCFullYear(year);
    d.setUTCMonth(month);
    d.setUTCDate(Math.min(a.getUTCDate(), end));
  }
  return d.toISOString().slice(0, 10);
}
export function publicData(value) {
  if (Array.isArray(value)) return value.map(publicData);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) =>
        k.endsWith("Minor") ? [k.slice(0, -5), v / 100] : [k, publicData(v)],
      ),
    );
  return value;
}
