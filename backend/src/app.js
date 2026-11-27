import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { existsSync } from "node:fs";
import { ZodError } from "zod";
import { openDatabase, repository } from "./db/database.js";
import { config } from "./config.js";
import { authenticate, originGuard } from "./middleware/security.js";
import { authRoutes } from "./modules/auth.js";
import { financeRoutes } from "./modules/finance.js";
import { ledger as createLedger } from "./services/ledger.js";
import { reports } from "./services/reports.js";
import { scheduler } from "./services/scheduler.js";
export function createApp({
  databasePath = config.databasePath,
  rateLimitEnabled = true,
} = {}) {
  const db = openDatabase(databasePath),
    repo = repository(db),
    ledger = createLedger(db, repo),
    report = reports(db, repo),
    scheduled = scheduler(db, repo, ledger);
  const app = express();
  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  app.use(
    helmet({
      strictTransportSecurity: config.secureCookie ? undefined : false,
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(cookieParser());
  app.use("/api", originGuard);
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skip: () => !rateLimitEnabled,
    message: { message: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
  });
  app.get("/api/health", (req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok", service: "FinanceTrack API" });
  });
  app.use("/api", authRoutes(db, repo, authLimiter));
  app.use(
    "/api",
    authenticate(db),
    financeRoutes(db, repo, ledger, report, scheduled),
  );
  app.use("/api", (req, res) =>
    res.status(404).json({ message: "Endpoint tidak ditemukan." }),
  );
  const frontend = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../frontend/dist",
  );
  if (existsSync(frontend)) {
    app.use(express.static(frontend));
    app.get("/{*path}", (req, res) =>
      res.sendFile(path.join(frontend, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ZodError)
      return res
        .status(422)
        .json({
          message: "Periksa isian formulir.",
          errors: error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
    if (error.status)
      return res
        .status(error.status)
        .json({
          message:
            error.status === 413
              ? "Ukuran permintaan terlalu besar."
              : error.message,
        });
    if (String(error.message).includes("UNIQUE constraint"))
      return res
        .status(409)
        .json({
          message:
            "Data sudah ada. Kategori anggaran hanya boleh satu per periode, dan pembayaran tidak boleh diduplikasi.",
        });
    console.error("Request failed:", error.name);
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server. Silakan coba lagi." });
  });
  return { app, db, repo, ledger, report, scheduled };
}
