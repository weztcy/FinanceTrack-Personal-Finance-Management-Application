import { backup } from "node:sqlite";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { config } from "../src/config.js";
import { openDatabase } from "../src/db/database.js";
const target = path.resolve(
  process.argv[2] ||
    `backups/financetrack-${new Date().toISOString().replaceAll(":", "-")}.sqlite`,
);
await mkdir(path.dirname(target), { recursive: true });
const db = openDatabase(config.databasePath);
await backup(db, target);
db.close();
console.log(`Backup: ${target}`);
