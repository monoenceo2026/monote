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
import { currentUser, loginAs } from "@/lib/session";
import { conditionIdByKey, createCompanyUser } from "@/lib/extra/signup";
import { KANSAI_PREFS, KANTO_PREFS, MAT_CHIPS, PROC_CHIPS, meterPct } from "./defs";

export type SignupPayload = {
  companyName: string;
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

const toInt = (s: string): number | null => {
  const digits = s.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
};

/** 「次へ」/「あとで入力して先に進む」— 会社の作成/更新 + conditions 反映 + 新規は company ユーザー作成&ログイン */
export async function submitSignupAction(p: SignupPayload) {
  const name = p.companyName.trim();
  if (!name) redirect("/signup");

  const user = await currentUser();
  const isNew = !(user?.role === "company" && user.company_id);

  /* ---- 数値・文字列のパース（チップ→conditions、数値→companiesフィールド の元） ---- */
  const lotMin = toInt(p.lotMin);
  const lotMax = toInt(p.lotMax);
  const precisionMm = (() => {
    const m = p.precision.match(/([0-9]*\.?[0-9]+)/);
    return m ? parseFloat(m[1]) : null;
  })();
  const dd = (p.deadline.match(/[0-9]+/g) ?? []).map(Number);
  const deliveryMin = dd.length ? dd[0] : null;
  const deliveryMax = dd.length > 1 ? dd[1] : deliveryMin;

  /* ---- 会社の作成 or 自社の特定 ---- */
  let companyId: number;
  let slug = "";
  if (isNew) {
    slug = `co-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    companyId = createCompany({ slug, name, prefecture: "" });
  } else {
    companyId = user!.company_id!;
  }

  /* ---- companies フィールドへ反映 ---- */
  const deadlineText = p.deadline.trim();
  const fields: Partial<Company> = {
    name,
    lot_min: lotMin ?? 1,
    lot_max: lotMax ?? 1000,
    precision_mm: precisionMm,
    delivery_min: deliveryMin,
    delivery_max: deliveryMax,
    size_note: p.size.trim(),
    area: `${p.areaSel}${deadlineText ? `／標準 ${deadlineText}` : ""}${p.express ? "／特急 応相談" : ""}`,
    price_hint: p.price,
    contact_hours: p.hours.trim(),
    hard_conditions: p.hard.trim(),
    completeness: meterPct(p.processChips.length + p.materialChips.length),
  };
  updateCompanyProfile(companyId, fields);

  /* ---- conditions へ反映（チップ + 数値からの導出） ---- */
  const keys = new Set<string>();
  for (const c of PROC_CHIPS) if (c.cond && p.processChips.includes(c.label)) keys.add(c.cond);
  for (const c of MAT_CHIPS) if (c.cond && p.materialChips.includes(c.label)) keys.add(c.cond);
  if (lotMin != null && lotMin <= 1) keys.add("lot:1個から（試作）");
  if (lotMin != null && lotMin <= 100) keys.add("lot:小ロット（〜100個）");
  if (lotMax != null && lotMax > 100) keys.add("lot:〜1,000個");
  if (lotMax != null && lotMax >= 5000) keys.add("lot:量産（1,000個以上）");
  if (deliveryMin != null && deliveryMin <= 7) keys.add("delivery:短納期（7日以内）");
  if (p.cert.includes("ISO9001")) keys.add("cert:ISO9001");
  if (p.cert.includes("ISO14001")) keys.add("cert:ISO14001");
  if (precisionMm != null && precisionMm <= 0.01) keys.add("precision:高精度±0.01mm");
  if (p.areaSel.includes("全国")) keys.add("area:全国対応");
  if (p.areaSel.includes("関東")) keys.add("area:関東");
  if (p.areaSel.includes("関西")) keys.add("area:関西");
  const comp = companyById(companyId);
  if (comp?.prefecture) {
    if (KANSAI_PREFS.includes(comp.prefecture)) keys.add("area:関西");
    if (KANTO_PREFS.includes(comp.prefecture)) keys.add("area:関東");
  }
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
