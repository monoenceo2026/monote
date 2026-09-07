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

/* ---------------- drafts（「下書きとして保存」用） ----------------
   下書きは「押すたびに新しい行」ではなく、同一セッション（ログイン中は同一ユーザー）の
   直近の下書きを上書きする運用にする。repo.ts は読み取り専用なので更新系はここに置く。 */

export type DraftFields = {
  type: string; process: string; material: string; quantity: string; deadline: string;
  size: string; required_precision: string; budget: string; industry: string; note: string;
  attachments: string[]; anonymous: boolean; no_forward: boolean;
  contact_company: string; contact_name: string; contact_email: string; contact_phone: string;
  source: string;
};

export type DraftInquiry = DraftFields & {
  id: number;
  created_at: string;
  recipientCompanyIds: number[];
};

export type Viewer = { userId?: number | null; sessionId?: string };

/** その相談を「自分のもの」として扱ってよいか（送信者本人＝ログインユーザー or 送信したセッション） */
function ownedBy(row: { created_by: number | null; session_id: string }, viewer: Viewer): boolean {
  const byUser = row.created_by != null && viewer.userId != null && row.created_by === viewer.userId;
  const bySession = !!row.session_id && !!viewer.sessionId && row.session_id === viewer.sessionId;
  return byUser || bySession;
}

/** 同一セッション/ユーザーの直近の下書き（既定で24時間以内）。無ければ null */
export function latestDraftId(viewer: Viewer, withinHours = 24): number | null {
  const row = db()
    .prepare(
      `SELECT id FROM inquiries
       WHERE status = 'draft'
         AND (( ? IS NOT NULL AND created_by = ?) OR (? != '' AND session_id = ?))
         AND created_at >= datetime('now', ?)
       ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get(
      viewer.userId ?? null, viewer.userId ?? null,
      viewer.sessionId ?? "", viewer.sessionId ?? "",
      `-${Math.max(1, Math.floor(withinHours))} hours`
    ) as { id: number } | undefined;
  return row?.id ?? null;
}

/** 下書きを読み出してフォームに復元する（本人のものだけ） */
export function draftForEditing(id: number, viewer: Viewer): DraftInquiry | null {
  if (!Number.isFinite(id) || id <= 0) return null;
  const row = db().prepare("SELECT * FROM inquiries WHERE id = ? AND status = 'draft'").get(id) as
    | (Record<string, unknown> & { id: number; created_by: number | null; session_id: string; created_at: string })
    | undefined;
  if (!row || !ownedBy(row, viewer)) return null;
  const str = (k: string) => String(row[k] ?? "");
  let attachments: string[] = [];
  try {
    const parsed = JSON.parse(str("attachments") || "[]");
    if (Array.isArray(parsed)) attachments = parsed.map((s) => String(s));
  } catch {
    attachments = [];
  }
  const recipientCompanyIds = (
    db().prepare("SELECT company_id FROM inquiry_recipients WHERE inquiry_id = ? ORDER BY company_id").all(id) as Array<{ company_id: number }>
  ).map((r) => r.company_id);
  return {
    id: row.id,
    created_at: row.created_at,
    type: str("type"), process: str("process"), material: str("material"), quantity: str("quantity"),
    deadline: str("deadline"), size: str("size"), required_precision: str("required_precision"),
    budget: str("budget"), industry: str("industry"), note: str("note"),
    attachments,
    anonymous: !!row.anonymous, no_forward: !!row.no_forward,
    contact_company: str("contact_company"), contact_name: str("contact_name"),
    contact_email: str("contact_email"), contact_phone: str("contact_phone"),
    source: str("source"),
    recipientCompanyIds,
  };
}

/**
 * 既存の下書きを上書き保存する（本人のもの・status='draft' のときだけ）。
 * 送信先の入れ替えも含めて1トランザクション。created_at は「最終保存日時」として更新する。
 * @returns 上書きできたら true
 */
export function updateDraft(
  id: number,
  viewer: Viewer,
  fields: DraftFields & { recipientCompanyIds: number[] }
): boolean {
  const d = db();
  const row = d.prepare("SELECT id, status, created_by, session_id FROM inquiries WHERE id = ?").get(id) as
    | { id: number; status: string; created_by: number | null; session_id: string }
    | undefined;
  if (!row || row.status !== "draft" || !ownedBy(row, viewer)) return false;
  const tx = d.transaction(() => {
    d.prepare(
      `UPDATE inquiries SET type=?, process=?, material=?, quantity=?, deadline=?, size=?, required_precision=?,
        budget=?, industry=?, note=?, attachments=?, anonymous=?, no_forward=?,
        contact_company=?, contact_name=?, contact_email=?, contact_phone=?, source=?, created_at=datetime('now')
       WHERE id = ? AND status = 'draft'`
    ).run(
      fields.type, fields.process, fields.material, fields.quantity, fields.deadline, fields.size,
      fields.required_precision, fields.budget, fields.industry, fields.note,
      JSON.stringify(fields.attachments ?? []), fields.anonymous ? 1 : 0, fields.no_forward ? 1 : 0,
      fields.contact_company, fields.contact_name, fields.contact_email, fields.contact_phone,
      fields.source, id
    );
    d.prepare("DELETE FROM inquiry_recipients WHERE inquiry_id = ?").run(id);
    const ins = d.prepare("INSERT OR IGNORE INTO inquiry_recipients (inquiry_id, company_id) VALUES (?,?)");
    const exists = d.prepare("SELECT 1 FROM companies WHERE id = ?");
    for (const cid of fields.recipientCompanyIds) if (exists.get(cid)) ins.run(id, cid);
  });
  tx();
  return true;
}
