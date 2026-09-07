/* ============================================================
   /signup — shared chip / option definitions
   (imported by page.tsx, SignupClient.tsx and actions.ts)
   ============================================================ */

/** UI chip: label(表示) / pv(プレビューのまとめ表記 = 静的版 data-label) / cond(conditionsテーブルのキー) */
export type ChipDef = { label: string; pv: string; cond: string | null };

export const PROC_CHIPS: ChipDef[] = [
  { label: "レーザー切断", pv: "板金・レーザー", cond: "process:板金・プレス" },
  { label: "曲げ・ベンダー", pv: "板金・レーザー", cond: "process:板金・プレス" },
  { label: "TIG溶接", pv: "溶接", cond: "process:溶接" },
  { label: "組立", pv: "組立", cond: "process:組立" },
  { label: "切削・旋盤", pv: "切削", cond: "process:切削・機械加工" },
  { label: "プレス", pv: "プレス", cond: "process:板金・プレス" },
  { label: "表面処理", pv: "表面処理", cond: "process:表面処理・熱処理" },
  { label: "熱処理", pv: "熱処理", cond: "process:表面処理・熱処理" },
  { label: "検査・測定", pv: "検査", cond: "process:検査・測定" },
];

export const MAT_CHIPS: ChipDef[] = [
  { label: "ステンレス", pv: "ステンレス", cond: "material:ステンレス" },
  { label: "鉄・鋼", pv: "鉄・鋼", cond: "material:鉄・鋼" },
  { label: "アルミ", pv: "アルミ", cond: "material:アルミ" },
  { label: "銅・真鍮", pv: "銅・真鍮", cond: "material:銅・真鍮" },
  { label: "樹脂", pv: "樹脂", cond: "material:樹脂" },
  { label: "繊維・布", pv: "繊維・布", cond: "material:繊維・布" },
  { label: "木材", pv: "木材", cond: null },
  { label: "食品材料", pv: "食品材料", cond: null },
];

/** 保存済み condition → 初期表示で点灯させる工程チップ（静的版の初期状態を再現する代表チップ） */
export const PRIMARY_PROC_CHIPS: Record<string, string[]> = {
  "process:板金・プレス": ["レーザー切断", "曲げ・ベンダー"],
  "process:溶接": ["TIG溶接"],
  "process:組立": ["組立"],
  "process:切削・機械加工": ["切削・旋盤"],
  "process:表面処理・熱処理": ["表面処理"],
  "process:検査・測定": ["検査・測定"],
};

export const PRECISION_OPTIONS = ["±0.01mm", "±0.05mm", "±0.1mm", "±0.5mm"];
export const CERT_OPTIONS = ["ISO9001／ISO14001", "ISO9001", "ISO14001", "認証なし"];
export const AREA_OPTIONS = ["全国発送", "関東エリア", "関西エリア", "近隣エリアのみ"];
export const PRICE_OPTIONS = ["試作 1万円〜", "試作 3万円〜", "試作 5万円〜", "非公開"];

export const KANSAI_PREFS = ["大阪府", "兵庫県", "京都府", "滋賀県", "奈良県"];
export const KANTO_PREFS = ["東京都", "神奈川県", "埼玉県", "千葉県", "茨城県"];

/** 静的版 signup.js と同じ充足度: 36 + チップ数×4（12〜92%） */
export function meterPct(chipCount: number): number {
  return Math.max(12, Math.min(92, 36 + chipCount * 4));
}

/* ============================================================
   会社の基本情報（所在地・規模）
   ============================================================ */

export const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

/** 従業員規模（企業詳細・検索カードの「・」区切り表示にそのまま出る） */
export const EMPLOYEE_OPTIONS = ["1〜9名", "10〜29名", "30〜99名", "100名以上"];

/* ---------- 既存値 → セレクトの選択肢（保存時に「同じ区分か」を判定するのに使う） ---------- */

/** 保存済み price_hint → PRICE_OPTIONS のどれか（「試作 3万円〜／量産は…」→「試作 3万円〜」） */
export function priceOption(priceHint: string): string {
  if (priceHint.includes("非公開")) return "非公開";
  if (priceHint.includes("1万")) return "試作 1万円〜";
  if (priceHint.includes("5万")) return "試作 5万円〜";
  return PRICE_OPTIONS[1];
}

/** 保存済み precision_mm → PRECISION_OPTIONS のどれか（一致しなければ null＝選択肢で表せない値） */
export function precisionOption(mm: number | null | undefined): string | null {
  if (mm == null) return null;
  const s = `±${mm}mm`;
  return PRECISION_OPTIONS.includes(s) ? s : null;
}

/** 保存済み area → AREA_OPTIONS のどれか */
export function areaOption(area: string): string {
  if (area.includes("全国")) return "全国発送";
  if (area.includes("関東")) return "関東エリア";
  if (area.includes("関西")) return "関西エリア";
  return AREA_OPTIONS[3];
}

/** 保存済み delivery_min/max → 「5〜10日」 */
export function deadlineText(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null) return "";
  return max != null && max !== min ? `${min}〜${max}日` : `${min}日`;
}

/* ============================================================
   入力の充足度（100点満点）
   静的版の「36 + チップ数×4」はチップしか見ないため、
   設備や実績が埋まっている既存企業を再保存すると値が下がっていた。
   実際に埋まっている項目を全部数える算出に置き換える。
   ============================================================ */

export type ProfileScoreInput = {
  name: string;
  prefecture: string;
  city: string;
  employees: string;
  founded: number | null;
  processConds: number; // conditions(process) の件数
  materialConds: number; // conditions(material) の件数
  lotMin: number | null;
  lotMax: number | null;
  precisionMm: number | null;
  sizeNote: string;
  deliveryMin: number | null;
  cert: string; // "ISO9001／ISO14001" | "認証なし" など
  area: string;
  priceHint: string;
  contactHours: string;
  hardConditions: string;
  equipment: string;
  description: string;
  works: number; // 実績・事例の件数（推奨5件）
};

const filled = (s: string | null | undefined) => !!(s && s.trim());
/** 1件で半分、3件以上で満点 */
const chipScore = (n: number, full: number) => (n <= 0 ? 0 : Math.round((full * Math.min(n, 3)) / 3));

/** 0〜100。入力済みの項目だけを足し上げる（チップ／価格／設備／実績／サイズ／納期／認証など） */
export function profileScore(i: ProfileScoreInput): number {
  let s = 0;
  /* 基本情報 17 */
  if (filled(i.name)) s += 4;
  if (filled(i.prefecture)) s += 5;
  if (filled(i.city)) s += 3;
  if (filled(i.employees)) s += 3;
  if (i.founded != null) s += 2;
  /* 対応条件チップ 24 */
  s += chipScore(i.processConds, 12);
  s += chipScore(i.materialConds, 12);
  /* 条件の数値・テキスト 29 */
  if (i.lotMin != null) s += 3;
  if (i.lotMax != null) s += 3;
  if (i.precisionMm != null) s += 5;
  if (filled(i.sizeNote)) s += 5;
  if (i.deliveryMin != null) s += 6;
  if (filled(i.cert) && !i.cert.includes("なし")) s += 4;
  if (filled(i.area)) s += 3;
  /* 価格・連絡 11 */
  if (filled(i.priceHint) && !i.priceHint.includes("非公開")) s += 4;
  if (filled(i.contactHours)) s += 3;
  if (filled(i.hardConditions)) s += 4;
  /* 深掘り（このフォームの外＝ダッシュボードで埋める項目）19 */
  if (filled(i.equipment)) s += 5;
  if (filled(i.description)) s += 5;
  s += Math.round((9 * Math.min(i.works, 5)) / 5);
  return Math.max(0, Math.min(100, s));
}
