import { db } from "@/lib/db";

/* extra queries for /search (repo.ts is read-only for page agents) */

/** MONOTE経由の相談 count per company (all recorded inquiry events) */
export function inquiryEventCounts(companyIds: number[]): Map<number, number> {
  if (!companyIds.length) return new Map();
  const rows = db()
    .prepare(
      `SELECT company_id, COUNT(*) AS n FROM events
       WHERE type = 'inquiry' AND company_id IN (${companyIds.map(() => "?").join(",")})
       GROUP BY company_id`
    )
    .all(...companyIds) as Array<{ company_id: number; n: number }>;
  return new Map(rows.map((r) => [r.company_id, r.n]));
}
