import { db } from "@/lib/db";

/* extra queries for /inquiry/new (repo.ts is read-only for page agents) */

export type SentInquiry = {
  id: number;
  status: string;
  created_at: string;
  recipients: Array<{ id: number; name: string }>;
};

/**
 * inquiry + its recipient companies, for the ?sent=<id> success screen.
 * 他人の相談IDを URL に入れて覗けないよう、送信者本人のものだけ返す
 * （ログイン中は created_by、未ログインの送信はその場のセッションが持つ id のみ）。
 */
export function inquiryWithRecipients(id: number, viewer: { userId?: number | null; sessionId?: string } = {}): SentInquiry | null {
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = db()
    .prepare("SELECT id, status, created_at, created_by, session_id FROM inquiries WHERE id = ?")
    .get(id) as { id: number; status: string; created_at: string; created_by: number | null; session_id: string } | undefined;
  if (!row) return null;
  const byUser = row.created_by != null && viewer.userId != null && row.created_by === viewer.userId;
  const bySession = !!row.session_id && !!viewer.sessionId && row.session_id === viewer.sessionId;
  if (!byUser && !bySession) return null;
  const recipients = db()
    .prepare(
      `SELECT c.id, c.name FROM inquiry_recipients r JOIN companies c ON c.id = r.company_id
       WHERE r.inquiry_id = ? ORDER BY c.id`
    )
    .all(id) as Array<{ id: number; name: string }>;
  return { ...row, recipients };
}
