import { db } from "@/lib/db";

/* extra queries for /companies/[slug] (W-03 企業詳細) */

/**
 * 公開ページに出す「MONOTE経由の相談」件数。
 * events の inquiry 行ではなく実際に届いた相談（inquiry_recipients）を数える。
 * events 側はシードの都合で実件数とずれ、企業管理の受信箱と食い違っていた。
 */
export function inquiryCountOf(companyId: number): number {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM inquiry_recipients r
       JOIN inquiries i ON i.id = r.inquiry_id
       WHERE r.company_id = ? AND i.status = 'sent'`
    )
    .get(companyId) as { n: number };
  return row.n;
}
