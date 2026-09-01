import { db } from "@/lib/db";

/* extra queries for /companies/[slug] (W-03 企業詳細) */

/** total number of MONOTE経由の相談 (inquiry events) for a company */
export function inquiryCountOf(companyId: number): number {
  const row = db()
    .prepare("SELECT COUNT(*) AS n FROM events WHERE company_id = ? AND type = 'inquiry'")
    .get(companyId) as { n: number };
  return row.n;
}
