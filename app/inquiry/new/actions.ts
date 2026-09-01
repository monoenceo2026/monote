"use server";

import { revalidatePath } from "next/cache";
import { createInquiry } from "@/lib/repo";
import { currentUser } from "@/lib/session";

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

/** required: 加工・工程／材質／数量・ロット／会社名／担当者名／メールアドレス */
function missingRequired(p: InquiryPayload): string[] {
  const errors: string[] = [];
  if (!p.process.trim()) errors.push("process");
  if (!p.material.trim()) errors.push("material");
  if (!p.quantity.trim()) errors.push("quantity");
  if (!p.contact_company.trim()) errors.push("contact_company");
  if (!p.contact_name.trim()) errors.push("contact_name");
  if (!p.contact_email.trim()) errors.push("contact_email");
  return errors;
}

function toNewInquiry(p: InquiryPayload, createdBy: number | null, status: "draft" | "sent") {
  return {
    type: p.type,
    process: p.process.trim(),
    material: p.material.trim(),
    quantity: p.quantity.trim(),
    deadline: p.deadline.trim(),
    size: p.size.trim(),
    required_precision: p.required_precision.trim(),
    budget: p.budget.trim(),
    industry: p.industry.trim(),
    note: p.note.trim(),
    attachments: (p.attachments ?? []).slice(0, 20).map((s) => String(s).slice(0, 200)),
    anonymous: p.anonymous,
    no_forward: p.no_forward,
    contact_company: p.contact_company.trim(),
    contact_name: p.contact_name.trim(),
    contact_email: p.contact_email.trim(),
    contact_phone: p.contact_phone.trim(),
    source: p.source || "search",
    recipientCompanyIds: [...new Set(p.recipientCompanyIds)].filter((n) => Number.isFinite(n) && n > 0),
    createdBy,
    status,
  };
}

/** 「N社に送信する」— real write; the recipients' /admin inboxes pick it up */
export async function sendInquiryAction(p: InquiryPayload): Promise<SendResult> {
  const errors = missingRequired(p);
  if (errors.length) return { ok: false, errors };
  if (!p.recipientCompanyIds.length) return { ok: false, errors: ["recipients"] };
  const user = await currentUser();
  const id = createInquiry(toNewInquiry(p, user?.id ?? null, "sent"));
  revalidatePath("/inquiry/new");
  revalidatePath("/admin");
  return { ok: true, id };
}

/** 「下書きとして保存」— drafts are saved as-is (validation applies to 送信 only) */
export async function saveDraftAction(p: InquiryPayload): Promise<{ ok: true; id: number }> {
  const user = await currentUser();
  const id = createInquiry(toNewInquiry(p, user?.id ?? null, "draft"));
  revalidatePath("/inquiry/new");
  return { ok: true, id };
}
