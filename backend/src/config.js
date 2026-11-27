import path from "node:path";
export const config = {
  port: Number(process.env.PORT || 4000),
  databasePath:
    process.env.DATABASE_PATH || path.resolve("data/financetrack.sqlite"),
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
  production: process.env.NODE_ENV === "production",
  secureCookie: process.env.COOKIE_SECURE === "true",
  sessionMs: 7 * 24 * 60 * 60 * 1000,
};
