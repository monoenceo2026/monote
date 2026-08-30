"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureSessionKey, loginAs, logout } from "@/lib/session";
import * as repo from "@/lib/repo";

/* ---------- saves / compare (shared across pages) ---------- */

export async function toggleSaveAction(kind: "company" | "article", targetId: number, path = "/") {
  const key = await ensureSessionKey();
  const saved = repo.toggleSave(key, kind, targetId);
  revalidatePath(path);
  return { saved };
}

export async function addCompareAction(companyId: number, path = "/") {
  const key = await ensureSessionKey();
  const res = repo.addCompare(key, companyId);
  revalidatePath(path);
  return res;
}

export async function removeCompareAction(companyId: number, path = "/") {
  const key = await ensureSessionKey();
  repo.removeCompare(key, companyId);
  revalidatePath(path);
}

export async function setCompareMemoAction(companyId: number, memo: string) {
  const key = await ensureSessionKey();
  repo.setCompareMemo(key, companyId, memo);
}

/* ---------- auth ---------- */

export async function loginAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  await loginAs(userId);
  redirect(userId === 2 ? "/admin" : "/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
