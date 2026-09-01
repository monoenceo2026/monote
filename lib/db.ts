import Database from "better-sqlite3";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SCHEMA } from "./schema";
import { runSeed } from "./seed";

let _db: Database.Database | null = null;

/**
 * Pick a writable location for the SQLite file.
 * Serverless platforms (Vercel, Lambda, …) deploy the app bundle read-only —
 * there only /tmp is writable, so we fall back to it and re-seed per instance.
 */
function resolveDbFile(): string {
  const candidates = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? [path.join(os.tmpdir(), "monote-data")]
    : [path.join(process.cwd(), "data"), path.join(os.tmpdir(), "monote-data")];
  for (const dir of candidates) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, ".write-probe");
      fs.writeFileSync(probe, "1");
      fs.unlinkSync(probe);
      return path.join(dir, "monote.db");
    } catch {
      continue;
    }
  }
  throw new Error("MONOTE: no writable directory found for the SQLite database");
}

export function db(): Database.Database {
  if (_db) return _db;
  const file = resolveDbFile();
  _db = new Database(file);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  _db.exec(SCHEMA);
  const seeded = _db.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number };
  if (seeded.n === 0) runSeed(_db);
  return _db;
}
