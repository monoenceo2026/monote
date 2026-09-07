"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ensureSessionKey, loginAs, logout } from "@/lib/session";
import * as repo from "@/lib/repo";

/** 再検証してよいパスは固定（クライアントから任意のパスを渡させない） */
const REVALIDATABLE = new Set([
  "/",
  "/search",
  "/articles",
  "/my/compare",
  "/inquiry/new",
  "/admin",
]);

function revalidate(path: string) {
  if (REVALIDATABLE.has(path)) revalidatePath(path);
  else if (path.startsWith("/companies/") || path.startsWith("/articles/")) revalidatePath(path);
}

/* ---------- saves / compare (shared across pages) ---------- */

export async function toggleSaveAction(kind: "company" | "article", targetId: number, path = "/") {
  if (kind !== "company" && kind !== "article") return { saved: false };
  if (!Number.isInteger(targetId) || targetId <= 0) return { saved: false };
  const key = await ensureSessionKey();
  const saved = repo.toggleSave(key, kind, targetId);
  revalidate(path);
  return { saved };
}

export async function addCompareAction(companyId: number, path = "/") {
  if (!Number.isInteger(companyId) || companyId <= 0) return { ok: false, reason: "invalid" };
  const key = await ensureSessionKey();
  const res = repo.addCompare(key, companyId);
  revalidate(path);
  return res;
}

export async function removeCompareAction(companyId: number, path = "/") {
  if (!Number.isInteger(companyId) || companyId <= 0) return;
  const key = await ensureSessionKey();
  repo.removeCompare(key, companyId);
  revalidate(path);
}

const MEMO_MAX = 500;

export async function setCompareMemoAction(companyId: number, memo: string) {
  if (!Number.isInteger(companyId) || companyId <= 0) return;
  const key = await ensureSessionKey();
  repo.setCompareMemo(key, companyId, String(memo ?? "").slice(0, MEMO_MAX));
}

/* ---------- auth ----------
   β版のデモアカウント切替。任意のユーザーIDでセッションを発行できないよう
   許可リストで固定する（本番の会員認証は別途実装する前提）。 */

const DEMO_USER_IDS = new Set([1, 2]);

export async function loginAction(formData: FormData) {
  const userId = Number(formData.get("userId"));
  if (!DEMO_USER_IDS.has(userId)) redirect("/login?error=1");
  await loginAs(userId);
  redirect(userId === 2 ? "/admin" : "/");
}

export async function logoutAction() {
  await logout();
  redirect("/");
}
