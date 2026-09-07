"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  companyById,
  createCompany,
  updateCompanyConditions,
  updateCompanyProfile,
  type Company,
} from "@/lib/repo";
import { currentUser, ensureSessionKey, loginAs } from "@/lib/session";
import { conditionIdByKey, createCompanyUser, worksCount } from "@/lib/extra/signup";

const SIGNUP_MAX = 3;
const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const signupLog = new Map<string, number[]>();
import {
  EMPLOYEE_OPTIONS,
  KANSAI_PREFS,
  KANTO_PREFS,
  MAT_CHIPS,
  PREFECTURES,
  PROC_CHIPS,
  precisionOption,
  priceOption,
  profileScore,
} from "./defs";

export type SignupPayload = {
  companyName: string;
  prefecture: string; // "大阪府"（新規は必須）
  city: string; // "八尾市"
  employees: string; // "30〜99名"
  founded: string; // "1968"
  processChips: string[]; // on になっているチップの label
  materialChips: string[];
  lotMin: string; // "1"
  lotMax: string; // "2,000"
  precision: string; // "±0.05mm"
  size: string;
  deadline: string; // "5〜10日"
  express: boolean;
  cert: string; // "ISO9001／ISO14001"
  areaSel: string; // "全国発送"
  price: string; // "試作 3万円〜"
  hours: string;
  hard: string;
  intent: "next" | "later";
};

export type SignupError =
  | "rate_limited"
  | "name_required"
  | "prefecture_required"
  | "prefecture_invalid";
export type SignupResult = { ok: false; error: SignupError };

const toInt = (s: string): number | null => {
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
};

/** 入力が空なら既存値を残す（無編集の再保存でプロフィールを痩せさせない） */
const keep = (input: string, existing: string | undefined): string => {
  const v = input.trim();
  return v !== "" ? v : (existing ?? "");
};

/** 「次へ」/「あとで入力して先に進む」— 会社の作成/更新 + conditions 反映 + 新規は company ユーザー作成&ログイン */
export async function submitSignupAction(p: SignupPayload): Promise<SignupResult | void> {
  const name = p.companyName.trim();
  if (!name) return { ok: false, error: "name_required" };

  const user = await currentUser();
  const isNew = !(user?.role === "company" && user.company_id);
  const existing: Company | null = isNew ? null : (companyById(user!.company_id!) ?? null);

  /* ---- 所在地（検索カード・企業詳細の「○○県○○市」になる） ---- */
  const prefecture = keep(p.prefecture, existing?.prefecture);
  if (!prefecture) return { ok: false, error: "prefecture_required" };
  if (!PREFECTURES.includes(prefecture)) return { ok: false, error: "prefecture_invalid" };
  const city = keep(p.city, existing?.city);
  const employeesIn = p.employees.trim();
  const employees = EMPLOYEE_OPTIONS.includes(employeesIn) ? employeesIn : (existing?.employees ?? "");
  const foundedIn = toInt(p.founded);
  const thisYear = new Date().getFullYear();
  const founded =
    foundedIn != null && foundedIn >= 1800 && foundedIn <= thisYear ? foundedIn : (existing?.founded ?? null);

  /* 企業登録の連投抑止（1セッションから短時間に大量の企業を作らせない） */
  if (isNew) {
    const sid = await ensureSessionKey();
    const now = Date.now();
    const hits = (signupLog.get(sid) ?? []).filter((t) => now - t < SIGNUP_WINDOW_MS);
    if (hits.length >= SIGNUP_MAX) return { ok: false, error: "rate_limited" };
    hits.push(now);
    signupLog.set(sid, hits);
    if (signupLog.size > 2000) signupLog.clear();
  }

  /* ---- 数値・文字列のパース（未入力なら既存値を維持する） ---- */
  const lotMin = toInt(p.lotMin) ?? existing?.lot_min ?? 1;
  const lotMax = toInt(p.lotMax) ?? existing?.lot_max ?? 1000;
  /* セレクトは既存値を丸めた表示なので、区分が同じなら既存の原文（例 ±0.02mm）を残す */
  const precisionMm =
    existing && precisionOption(existing.precision_mm) === p.precision
      ? existing.precision_mm
      : (() => {
          const m = p.precision.match(/([0-9]*\.?[0-9]+)/);
          return m ? parseFloat(m[1]) : (existing?.precision_mm ?? null);
        })();
  const deadlineText = p.deadline.trim();
  const dd = (deadlineText.match(/[0-9]+/g) ?? []).map(Number);
  const deliveryMin = dd.length ? dd[0] : (existing?.delivery_min ?? null);
  const deliveryMax = dd.length > 1 ? dd[1] : dd.length ? dd[0] : (existing?.delivery_max ?? null);
  /* 価格も同じ区分なら原文維持（「試作 3万円〜／量産は図面ベースで個別見積」を切り詰めない） */
  const priceHint =
    existing && priceOption(existing.price_hint) === p.price ? existing.price_hint : p.price;
  const sizeNote = keep(p.size, existing?.size_note);
  const contactHours = keep(p.hours, existing?.contact_hours);
  const hardConditions = keep(p.hard, existing?.hard_conditions);

  /* ---- 会社の作成 or 自社の特定 ---- */
  let companyId: number;
  let slug = "";
  if (isNew) {
    slug = `co-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    companyId = createCompany({ slug, name, prefecture, city });
  } else {
    companyId = existing!.id;
  }

  /* ---- conditions へ反映（チップ + 数値からの導出） ---- */
  const keys = new Set<string>();
  for (const c of PROC_CHIPS) if (c.cond && p.processChips.includes(c.label)) keys.add(c.cond);
  for (const c of MAT_CHIPS) if (c.cond && p.materialChips.includes(c.label)) keys.add(c.cond);
  if (lotMin <= 1) keys.add("lot:1個から（試作）");
  if (lotMin <= 100) keys.add("lot:小ロット（〜100個）");
  if (lotMax > 100) keys.add("lot:〜1,000個");
  if (lotMax >= 5000) keys.add("lot:量産（1,000個以上）");
  if (deliveryMin != null && deliveryMin <= 7) keys.add("delivery:短納期（7日以内）");
  if (p.cert.includes("ISO9001")) keys.add("cert:ISO9001");
  if (p.cert.includes("ISO14001")) keys.add("cert:ISO14001");
  if (precisionMm != null && precisionMm <= 0.01) keys.add("precision:高精度±0.01mm");
  if (p.areaSel.includes("全国")) keys.add("area:全国対応");
  if (p.areaSel.includes("関東")) keys.add("area:関東");
  if (p.areaSel.includes("関西")) keys.add("area:関西");
  if (KANSAI_PREFS.includes(prefecture)) keys.add("area:関西");
  if (KANTO_PREFS.includes(prefecture)) keys.add("area:関東");

  const area = `${p.areaSel}${deadlineText ? `／標準 ${deadlineText}` : ""}${p.express ? "／特急 応相談" : ""}`;

  /* ---- 充足度: いま埋まっている項目だけから決まる決定的な値。
     同じ内容で再保存しても変わらず（元の劣化バグの原因はここ）、
     条件を外して薄くなった場合は正しく下がる ---- */
  const works = isNew ? 0 : worksCount(companyId);
  const afterScore = profileScore({
    name,
    prefecture,
    city,
    employees,
    founded,
    processConds: [...keys].filter((k) => k.startsWith("process:")).length,
    materialConds: [...keys].filter((k) => k.startsWith("material:")).length,
    lotMin,
    lotMax,
    precisionMm,
    sizeNote,
    deliveryMin,
    cert: p.cert,
    area,
    priceHint,
    contactHours,
    hardConditions,
    equipment: existing?.equipment ?? "",
    description: existing?.description ?? "",
    works,
  });
  const completeness = afterScore;

  /* ---- companies フィールドへ反映 ---- */
  const fields: Partial<Company> = {
    name,
    prefecture,
    city,
    employees,
    founded,
    lot_min: lotMin,
    lot_max: lotMax,
    precision_mm: precisionMm,
    delivery_min: deliveryMin,
    delivery_max: deliveryMax,
    size_note: sizeNote,
    area,
    price_hint: priceHint,
    contact_hours: contactHours,
    hard_conditions: hardConditions,
    completeness,
  };
  updateCompanyProfile(companyId, fields);

  const idMap = conditionIdByKey();
  const conditionIds = [...keys]
    .map((k) => idMap.get(k))
    .filter((n): n is number => n != null);
  updateCompanyConditions(companyId, conditionIds);

  /* ---- 新規は company ユーザーを作ってログイン ---- */
  if (isNew) {
    const userId = createCompanyUser(`owner-${slug}@example.jp`, name, companyId);
    await loginAs(userId);
  }

  revalidatePath("/signup");
  revalidatePath("/search");
  revalidatePath("/admin");

  redirect(p.intent === "later" ? "/admin/articles/new" : "/signup?done=1");
}
