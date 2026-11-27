import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { z } from "zod";
import { config } from "../config.js";
import { atomic } from "../db/database.js";
import {
  authenticate,
  cookieName,
  cookieOptions,
  hash,
  token,
  userProfile,
} from "../middleware/security.js";
import {
  ensure,
  password,
  text,
  currency,
  timezone,
} from "../services/validation.js";

const defaults = {
  income: ["Gaji", "Bisnis", "Hadiah", "Investasi", "Pemasukan lainnya"],
  expense: [
    "Makanan",
    "Transportasi",
    "Pendidikan",
    "Hiburan",
    "Kesehatan",
    "Tempat tinggal",
    "Belanja",
    "Rumah tangga",
  ],
};
const colors = [
  "#478673",
  "#daae61",
  "#8188c7",
  "#c38094",
  "#6a9fb3",
  "#b79c73",
  "#779d71",
  "#aa886f",
];
function createSession(db, user, res) {
  const raw = token(),
    csrf = token(),
    expires = new Date(Date.now() + config.sessionMs).toISOString();
  db.prepare("DELETE FROM sessions WHERE expires_at<?").run(
    new Date().toISOString(),
  );
  db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
    hash(raw),
    user.id,
    csrf,
    expires,
  );
  res.cookie(cookieName, raw, cookieOptions);
  return { user: userProfile(user), csrfToken: csrf };
}
export function authRoutes(db, repo, authLimiter) {
  const router = Router();
  router.post("/auth/register", authLimiter, async (req, res) => {
    const data = z
      .object({
        name: text,
        email: z
          .email()
          .max(254)
          .transform((v) => v.toLowerCase()),
        password,
        currency: currency.default("IDR"),
        timezone: timezone.default("Asia/Jakarta"),
      })
      .parse(req.body);
    ensure(
      !db.prepare("SELECT id FROM users WHERE email=?").get(data.email),
      "Email sudah digunakan.",
      409,
    );
    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = atomic(db, () => {
      const uid = randomUUID(),
        now = new Date().toISOString();
      db.prepare(
        "INSERT INTO users(id,email,password_hash,name,currency,timezone,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",
      ).run(
        uid,
        data.email,
        passwordHash,
        data.name,
        data.currency,
        data.timezone,
        now,
        now,
      );
      for (const [type, names] of Object.entries(defaults))
        names.forEach((name, i) =>
          repo.create(uid, "category", {
            name,
            type,
            color: colors[i % colors.length],
            isArchived: false,
          }),
        );
      return db.prepare("SELECT * FROM users WHERE id=?").get(uid);
    });
    res.status(201).json(createSession(db, user, res));
  });
  router.post("/auth/login", authLimiter, async (req, res) => {
    const data = z
      .object({ email: z.email().max(254), password: z.string().max(100) })
      .parse(req.body);
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(data.email);
    const valid = await bcrypt.compare(
      data.password,
      user?.password_hash ||
        "$2b$12$7EqJtq98hPqEX7fNZaFWoO5wFfBvMGA5dpCPvCJDZ7xqLH0vxZ6a6",
    );
    ensure(user && valid, "Email atau kata sandi salah.", 401);
    res.json(createSession(db, user, res));
  });
  router.post("/auth/forgot-password", authLimiter, async (req, res) => {
    const { email } = z.object({ email: z.email().max(254) }).parse(req.body);
    const user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
    if (user) {
      const raw = token();
      atomic(db, () => {
        db.prepare(
          "DELETE FROM password_resets WHERE user_id=? OR expires_at<?",
        ).run(user.id, new Date().toISOString());
        db.prepare("INSERT INTO password_resets VALUES(?,?,?)").run(
          hash(raw),
          user.id,
          new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        );
      });
      const link = config.origin + "/reset-password?token=" + raw;
      const message = {
        from:
          process.env.SMTP_FROM || "FinanceTrack <noreply@financetrack.local>",
        to: user.email,
        subject: "Atur ulang kata sandi FinanceTrack",
        text: `Buka tautan berikut dalam 30 menit. Tautan hanya dapat digunakan sekali.\n${link}\nAbaikan email ini jika Anda tidak meminta pemulihan.`,
      };
      try {
        if (process.env.SMTP_HOST) {
          await nodemailer
            .createTransport({
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT || 1025),
              secure: process.env.SMTP_SECURE === "true",
              connectionTimeout: 5000,
              auth: process.env.SMTP_USER
                ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                  }
                : undefined,
            })
            .sendMail(message);
        } else if (!config.production) {
          const dir = path.resolve(path.dirname(config.databasePath), "outbox");
          await mkdir(dir, { recursive: true });
          await writeFile(
            path.join(dir, randomUUID() + ".eml"),
            `To: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
            { mode: 0o600 },
          );
        }
      } catch {
        console.error(
          "Pengiriman email pemulihan gagal; periksa konfigurasi SMTP.",
        );
      }
    }
    res.json({
      message:
        "Jika email terdaftar, petunjuk pemulihan akan dikirim. Tautan berlaku 30 menit.",
    });
  });
  router.post("/auth/reset-password", authLimiter, async (req, res) => {
    const data = z
      .object({ token: z.string().length(64), password })
      .parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);
    atomic(db, () => {
      const reset = db
        .prepare(
          "SELECT * FROM password_resets WHERE token_hash=? AND expires_at>?",
        )
        .get(hash(data.token), new Date().toISOString());
      ensure(reset, "Tautan pemulihan tidak valid atau kedaluwarsa.");
      db.prepare(
        "UPDATE users SET password_hash=?,updated_at=? WHERE id=?",
      ).run(passwordHash, new Date().toISOString(), reset.user_id);
      db.prepare("DELETE FROM password_resets WHERE user_id=?").run(
        reset.user_id,
      );
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(reset.user_id);
    });
    res.json({ message: "Kata sandi diperbarui. Silakan masuk kembali." });
  });
  router.use(
    ["/profile", "/auth/logout", "/auth/change-password"],
    authenticate(db),
  );
  router.get("/profile", (req, res) =>
    res.json({ user: userProfile(req.user), csrfToken: req.user.csrf }),
  );
  router.post("/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(req.sessionHash);
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    res.json({ message: "Berhasil keluar." });
  });
  router.patch("/profile", (req, res) => {
    const data = z
      .object({
        name: text.optional(),
        currency: currency.optional(),
        timezone: timezone.optional(),
        theme: z.enum(["light", "dark", "system"]).optional(),
        notificationPreferences: z
          .object({
            budget: z.boolean(),
            bill: z.boolean(),
            recurring: z.boolean(),
          })
          .optional(),
      })
      .strict()
      .parse(req.body);
    if (data.currency && data.currency !== req.user.currency)
      ensure(
        !db
          .prepare(
            "SELECT 1 FROM records WHERE user_id=? AND kind IN ('account','transaction','budget','goal','bill','recurring') LIMIT 1",
          )
          .get(req.user.id),
        "Mata uang tidak dapat diubah setelah data keuangan dibuat. Nominal lama tidak dikonversi.",
        409,
      );
    const merged = { ...req.user, ...data };
    db.prepare(
      "UPDATE users SET name=?,currency=?,timezone=?,theme=?,preferences=?,updated_at=? WHERE id=?",
    ).run(
      merged.name,
      merged.currency,
      merged.timezone,
      merged.theme,
      JSON.stringify(
        data.notificationPreferences || JSON.parse(req.user.preferences),
      ),
      new Date().toISOString(),
      req.user.id,
    );
    res.json({
      user: userProfile(
        db.prepare("SELECT * FROM users WHERE id=?").get(req.user.id),
      ),
    });
  });
  router.post("/auth/change-password", authLimiter, async (req, res) => {
    const data = z
      .object({ currentPassword: z.string().max(100), password })
      .parse(req.body);
    ensure(
      await bcrypt.compare(data.currentPassword, req.user.password_hash),
      "Kata sandi saat ini salah.",
      403,
    );
    const passwordHash = await bcrypt.hash(data.password, 12);
    atomic(db, () => {
      db.prepare(
        "UPDATE users SET password_hash=?,updated_at=? WHERE id=?",
      ).run(passwordHash, new Date().toISOString(), req.user.id);
      db.prepare("DELETE FROM sessions WHERE user_id=? AND token_hash<>?").run(
        req.user.id,
        req.sessionHash,
      );
    });
    res.json({
      message: "Kata sandi diperbarui. Sesi perangkat lain telah diakhiri.",
    });
  });
  router.delete("/profile", authLimiter, async (req, res) => {
    const data = z
      .object({
        password: z.string().max(100),
        confirmation: z.literal("HAPUS AKUN"),
      })
      .parse(req.body);
    ensure(
      await bcrypt.compare(data.password, req.user.password_hash),
      "Kata sandi salah.",
      403,
    );
    atomic(db, () =>
      db.prepare("DELETE FROM users WHERE id=?").run(req.user.id),
    );
    res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
    res.json({ message: "Akun dan seluruh data keuangan telah dihapus." });
  });
  return router;
}
