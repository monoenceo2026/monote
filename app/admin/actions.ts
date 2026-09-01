"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setInquiryStatus } from "@/lib/repo";
import { currentUser } from "@/lib/session";

/** 受信箱: 返信する(replied) / 対応できない(declined) — real write, scoped to the logged-in company */
export async function setInquiryStatusAction(inquiryId: number, status: "replied" | "declined") {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) redirect("/login");
  setInquiryStatus(user.company_id, inquiryId, status);
  revalidatePath("/admin");
}
