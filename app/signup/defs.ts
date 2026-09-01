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
