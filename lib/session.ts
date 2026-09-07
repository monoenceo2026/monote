import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
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
const MAX_AGE_USER = 60 * 60 * 24 * 30;
const MAX_AGE_ANON = 60 * 60 * 24 * 90;
const isProd = process.env.NODE_ENV === "production";

/**
 * Cookie 署名鍵。本番では MONOTE_SESSION_SECRET を必ず設定する
 * （未設定だと起動ごとに変わる鍵になり、既存セッションは無効化される）。
 */
const SECRET =
  process.env.MONOTE_SESSION_SECRET ||
  (isProd ? "" : "monote-dev-secret-do-not-use-in-production") ||
  randomUUID();

const sign = (value: string) => createHmac("sha256", SECRET).update(value).digest("base64url");

function seal(value: string) {
  return `${value}.${sign(value)}`;
}

/** 署名を検証して値を取り出す（改ざん・偽造された Cookie は null） */
function unseal(raw: string | undefined): string | null {
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  if (i <= 0) return null;
  const value = raw.slice(0, i);
  const mac = raw.slice(i + 1);
  const expected = sign(value);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: isProd,
  path: "/",
  maxAge,
});

/** current logged-in user, or null */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const value = unseal(jar.get(USER_COOKIE)?.value);
  if (!value || !/^\d+$/.test(value)) return null;
  const row = db()
    .prepare("SELECT id, name, email, role, company_id FROM users WHERE id = ?")
    .get(Number(value)) as SessionUser | undefined;
  return row ?? null;
}

/**
 * Stable id used to key saves / compare lists.
 * Logged-in users get "user-<id>"; anonymous visitors get a signed random sid.
 */
export async function sessionKey(): Promise<string> {
  const jar = await cookies();
  const user = await currentUser();
  if (user) return `user-${user.id}`;
  const sid = unseal(jar.get(ANON_COOKIE)?.value);
  return sid ? `anon-${sid}` : "anon-guest";
}

/** for server actions: ensure an anonymous sid cookie exists (call before writes) */
export async function ensureSessionKey(): Promise<string> {
  const jar = await cookies();
  const user = await currentUser();
  if (user) return `user-${user.id}`;
  let sid = unseal(jar.get(ANON_COOKIE)?.value);
  if (!sid) {
    sid = randomUUID(); // CSPRNG（Math.random は予測可能なので使わない）
    jar.set(ANON_COOKIE, seal(sid), cookieOpts(MAX_AGE_ANON));
  }
  return `anon-${sid}`;
}

export async function loginAs(userId: number) {
  const jar = await cookies();
  jar.set(USER_COOKIE, seal(String(userId)), cookieOpts(MAX_AGE_USER));
}

export async function logout() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
}
