import { db } from "@/lib/db";

/* extra queries for /inquiry/new (repo.ts is read-only for page agents) */

export type SentInquiry = {
  id: number;
  status: string;
  created_at: string;
  recipients: Array<{ id: number; name: string }>;
};

/** inquiry + its recipient companies, for the ?sent=<id> success screen */
export function inquiryWithRecipients(id: number): SentInquiry | null {
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = db()
    .prepare("SELECT id, status, created_at FROM inquiries WHERE id = ?")
    .get(id) as { id: number; status: string; created_at: string } | undefined;
  if (!row) return null;
  const recipients = db()
    .prepare(
      `SELECT c.id, c.name FROM inquiry_recipients r JOIN companies c ON c.id = r.company_id
       WHERE r.inquiry_id = ? ORDER BY c.id`
    )
    .all(id) as Array<{ id: number; name: string }>;
  return { ...row, recipients };
}
