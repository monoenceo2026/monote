import { cookies } from "next/headers";
import { db } from "./db";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "buyer" | "company";
  company_id: number | null;
};

const USER_COOKIE = "monote_user";
const ANON_COOKIE = "monote_sid";

/** current logged-in user, or null */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(USER_COOKIE)?.value;
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isFinite(id)) return null;
  const row = db().prepare("SELECT id, name, email, role, company_id FROM users WHERE id = ?").get(id) as SessionUser | undefined;
  return row ?? null;
}

/**
 * Stable id used to key saves / compare lists.
 * Logged-in users get "user-<id>" (the seed pre-fills user-1 for 田中様);
 * anonymous visitors get a random sid cookie when one was set by middleware/actions.
 */
export async function sessionKey(): Promise<string> {
  const jar = await cookies();
  const user = await currentUser();
  if (user) return `user-${user.id}`;
  const sid = jar.get(ANON_COOKIE)?.value;
  return sid ? `anon-${sid}` : "anon-guest";
}

/** for server actions: ensure an anonymous sid cookie exists (call before writes) */
export async function ensureSessionKey(): Promise<string> {
  const jar = await cookies();
  const user = await currentUser();
  if (user) return `user-${user.id}`;
  let sid = jar.get(ANON_COOKIE)?.value;
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 12);
    jar.set(ANON_COOKIE, sid, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  }
  return `anon-${sid}`;
}

export async function loginAs(userId: number) {
  const jar = await cookies();
  jar.set(USER_COOKIE, String(userId), { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
}

export async function logout() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
}
