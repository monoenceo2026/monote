import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema";
import { runSeed } from "./seed";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const dir = path.join(process.cwd(), "data");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "monote.db");
  const fresh = !fs.existsSync(file);
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA);
  const seeded = _db.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number };
  if (fresh || seeded.n === 0) runSeed(_db);
  return _db;
}
