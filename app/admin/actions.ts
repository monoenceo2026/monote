"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { companyById, setInquiryStatus } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { addWork, deleteWork } from "@/lib/extra/admin";

/** 受信箱: 返信する(replied) / 対応できない(declined) — real write, scoped to the logged-in company */
export async function setInquiryStatusAction(inquiryId: number, status: "replied" | "declined") {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) redirect("/login");
  setInquiryStatus(user.company_id, inquiryId, status);
  revalidatePath("/admin");
}

export type WorkActionResult = { ok: true } | { ok: false; error: "auth" | "empty" };

/** 実績（works）を1件追加 — 企業ページの「実績・事例」に反映される */
export async function addWorkAction(title: string, spec: string): Promise<WorkActionResult> {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) return { ok: false, error: "auth" };
  const id = addWork(user.company_id, String(title ?? ""), String(spec ?? ""));
  if (!id) return { ok: false, error: "empty" };
  revalidateAfterWorkChange(user.company_id);
  return { ok: true };
}

/** 実績を1件削除（自社のものだけ） */
export async function deleteWorkAction(workId: number): Promise<WorkActionResult> {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) return { ok: false, error: "auth" };
  deleteWork(user.company_id, Number(workId));
  revalidateAfterWorkChange(user.company_id);
  return { ok: true };
}

function revalidateAfterWorkChange(companyId: number) {
  revalidatePath("/admin");
  const company = companyById(companyId);
  if (company) revalidatePath(`/companies/${company.slug}`);
}
