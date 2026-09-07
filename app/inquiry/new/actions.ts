"use server";

import { revalidatePath } from "next/cache";
import { companyById, createInquiry } from "@/lib/repo";
import { currentUser, ensureSessionKey } from "@/lib/session";

export type InquiryPayload = {
  type: string;
  process: string;
  material: string;
  quantity: string;
  deadline: string;
  size: string;
  required_precision: string;
  budget: string;
  industry: string;
  note: string;
  attachments: string[];
  anonymous: boolean;
  no_forward: boolean;
  contact_company: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  source: string;
  recipientCompanyIds: number[];
};

export type SendResult = { ok: true; id: number } | { ok: false; errors: string[] };

/* 入力長の上限（DB肥大化・巨大レスポンス対策）。UI の想定を十分に上回る値にする。 */
const LIMITS: Record<string, number> = {
  type: 40, process: 200, material: 200, quantity: 120, deadline: 120, size: 200,
  required_precision: 120, budget: 120, industry: 120, note: 5000,
  contact_company: 120, contact_name: 80, contact_email: 254, contact_phone: 40, source: 40,
};
const cap = (v: unknown, key: string) => String(v ?? "").trim().slice(0, LIMITS[key] ?? 200);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* 連投・スパム抑止（1セッションあたりの短時間の送信数を制限） */
const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const sendLog = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (sendLog.get(key) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (hits.length >= RATE_LIMIT.max) {
    sendLog.set(key, hits);
    return true;
  }
  hits.push(now);
  sendLog.set(key, hits);
  if (sendLog.size > 5000) sendLog.clear(); // メモリ上限のガード
  return false;
}

/** required: 加工・工程／材質／数量・ロット／会社名／担当者名／メールアドレス */
function missingRequired(p: InquiryPayload): string[] {
  const errors: string[] = [];
  if (!p.process.trim()) errors.push("process");
  if (!p.material.trim()) errors.push("material");
  if (!p.quantity.trim()) errors.push("quantity");
  if (!p.contact_company.trim()) errors.push("contact_company");
  if (!p.contact_name.trim()) errors.push("contact_name");
  if (!p.contact_email.trim()) errors.push("contact_email");
  else if (!EMAIL_RE.test(p.contact_email.trim())) errors.push("contact_email_format");
  return errors;
}

function toNewInquiry(p: InquiryPayload, createdBy: number | null, status: "draft" | "sent", sessionId = "") {
  return {
    type: cap(p.type, "type") || "estimate",
    process: cap(p.process, "process"),
    material: cap(p.material, "material"),
    quantity: cap(p.quantity, "quantity"),
    deadline: cap(p.deadline, "deadline"),
    size: cap(p.size, "size"),
    required_precision: cap(p.required_precision, "required_precision"),
    budget: cap(p.budget, "budget"),
    industry: cap(p.industry, "industry"),
    note: cap(p.note, "note"),
    attachments: (p.attachments ?? []).slice(0, 20).map((s) => String(s).slice(0, 200)),
    anonymous: !!p.anonymous,
    no_forward: !!p.no_forward,
    contact_company: cap(p.contact_company, "contact_company"),
    contact_name: cap(p.contact_name, "contact_name"),
    contact_email: cap(p.contact_email, "contact_email"),
    contact_phone: cap(p.contact_phone, "contact_phone"),
    source: cap(p.source, "source") || "search",
    /* 実在する企業だけを送信先にする */
    recipientCompanyIds: [...new Set(p.recipientCompanyIds)]
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 10)
      .filter((n) => !!companyById(n)),
    createdBy,
    status,
    sessionId,
  };
}

/** 「N社に送信する」— real write; the recipients' /admin inboxes pick it up */
export async function sendInquiryAction(p: InquiryPayload): Promise<SendResult> {
  const errors = missingRequired(p);
  if (errors.length) return { ok: false, errors };
  const user = await currentUser();
  const sessionId = await ensureSessionKey();
  if (rateLimited(sessionId)) return { ok: false, errors: ["rate_limited"] };
  const payload = toNewInquiry(p, user?.id ?? null, "sent", sessionId);
  if (!payload.recipientCompanyIds.length) return { ok: false, errors: ["recipients"] };
  const id = createInquiry(payload);
  revalidatePath("/inquiry/new");
  revalidatePath("/admin");
  return { ok: true, id };
}

/** 「下書きとして保存」— drafts are saved as-is (validation applies to 送信 only) */
export async function saveDraftAction(p: InquiryPayload): Promise<{ ok: true; id: number }> {
  const user = await currentUser();
  const sessionId = await ensureSessionKey();
  if (rateLimited(sessionId + ":draft")) return { ok: true, id: 0 };
  const id = createInquiry(toNewInquiry(p, user?.id ?? null, "draft", sessionId));
  revalidatePath("/inquiry/new");
  return { ok: true, id };
}
