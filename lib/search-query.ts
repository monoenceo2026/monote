/* ============================================================
   自由文の検索キーワードを、MONOTE の構造化条件へ解決する。

   「SUS304の薄板を、小ロット・短納期で加工したい」のような文章や
   「ISO9001」「関西エリア」のような条件語を、conditions テーブルの
   行（加工・材質・ロット・納期・認証・エリア・精度）に対応づける。
   ============================================================ */

import { allConditions } from "./repo";

type Entry = { category: string; label: string; words: string[] };

/** 条件 → その条件を指す言い回し（正規化済みで前方一致ではなく部分一致で判定） */
const SYNONYMS: Entry[] = [
  // ---- 加工・工程 ----
  { category: "process", label: "板金・プレス", words: ["板金", "ばんきん", "プレス", "レーザー切断", "レーザー", "タレパン", "曲げ", "ベンダー", "抜き加工"] },
  { category: "process", label: "切削・機械加工", words: ["切削", "旋盤", "フライス", "マシニング", "機械加工", "削る", "穴あけ", "旋削"] },
  { category: "process", label: "溶接", words: ["溶接", "tig", "mig", "スポット溶接", "ロウ付け"] },
  { category: "process", label: "表面処理・熱処理", words: ["表面処理", "めっき", "メッキ", "アルマイト", "熱処理", "塗装", "研磨", "バフ", "陽極酸化"] },
  { category: "process", label: "鋳造・鍛造", words: ["鋳造", "鍛造", "ダイカスト", "鋳物"] },
  { category: "process", label: "樹脂成形", words: ["樹脂成形", "射出成形", "インジェクション", "成形"] },
  { category: "process", label: "組立", words: ["組立", "組み立て", "アッセンブリ", "ユニット組"] },
  { category: "process", label: "検査・測定", words: ["検査", "測定", "三次元測定", "全数検査", "抜取検査", "品質管理", "寸法検査"] },
  { category: "process", label: "繊維・染色", words: ["染色", "晒", "テキスタイル", "縫製"] },

  // ---- 材質 ----
  { category: "material", label: "ステンレス", words: ["ステンレス", "ステン", "sus", "sus304", "sus316", "sus430"] },
  { category: "material", label: "鉄・鋼", words: ["鉄", "鋼", "spcc", "sphc", "ss400", "炭素鋼", "鋼材"] },
  { category: "material", label: "アルミ", words: ["アルミ", "アルミニウム", "a5052", "a6063", "a2017"] },
  { category: "material", label: "銅・真鍮", words: ["真鍮", "黄銅", "c2801", "りん青銅", "銅材"] },
  { category: "material", label: "樹脂", words: ["樹脂", "プラスチック", "pps", "pom", "abs", "ナイロン", "peek"] },
  { category: "material", label: "繊維・布", words: ["繊維", "生地", "ポリエステル", "綿"] },

  // ---- ロット ----
  { category: "lot", label: "1個から（試作）", words: ["1個", "一個", "1個から", "試作", "単品", "1点", "ワンオフ", "プロトタイプ"] },
  { category: "lot", label: "小ロット（〜100個）", words: ["小ロット", "少量", "100個"] },
  { category: "lot", label: "〜1,000個", words: ["中ロット", "1000個", "1,000個"] },
  { category: "lot", label: "量産（1,000個以上）", words: ["量産", "大ロット", "大量生産", "継続生産"] },

  // ---- 納期 ----
  { category: "delivery", label: "短納期（7日以内）", words: ["短納期", "特急", "急ぎ", "即納", "7日", "1週間", "一週間", "最短", "スピード"] },

  // ---- 認証 ----
  { category: "cert", label: "ISO9001", words: ["iso9001", "iso-9001", "9001"] },
  { category: "cert", label: "ISO14001", words: ["iso14001", "iso-14001", "14001", "環境マネジメント"] },
  { category: "cert", label: "IATF16949", words: ["iatf", "iatf16949", "16949"] },

  // ---- エリア ----
  { category: "area", label: "関西", words: ["関西", "近畿", "大阪", "兵庫", "京都", "滋賀", "奈良", "神戸", "尼崎", "八尾", "東大阪", "堺市"] },
  { category: "area", label: "関東", words: ["関東", "東京", "神奈川", "埼玉", "千葉", "茨城", "横浜", "川崎"] },
  { category: "area", label: "全国対応", words: ["全国", "全国対応", "全国発送"] },

  // ---- 精度 ----
  { category: "precision", label: "高精度±0.01mm", words: ["高精度", "±0.01", "0.01mm", "ミクロン"] },
];

/** 解決後に残った文字列から落とす助詞・汎用語（キーワード検索のノイズ源） */
const NOISE = [
  "加工したい", "加工できる", "対応したい", "探したい", "お願いしたい", "相談したい",
  "加工", "対応", "製作", "製造", "依頼", "見積", "相談", "会社", "企業", "メーカー", "工場",
  "エリア", "地域", "向け", "用の", "業界", "部品", "案件", "その他",
  "したい", "できる", "ください", "お願い", "可能", "など", "ほしい", "教えて",
  "の", "を", "に", "は", "が", "と", "で", "や", "も", "へ", "から", "まで", "より", "ば",
  "、", "。", "・", "，", "．", "（", "）", "(", ")", "「", "」", "･", "／", "/", "-", "ー", "〜", "~", "＋", "+",
];

const norm = (s: string) =>
  s.normalize("NFKC").toLowerCase().replace(/[\s　]+/g, "").replace(/[＋+]/g, "+");

export type ParsedQuery = {
  /** 文章から解決できた条件ID（カテゴリ内は OR、カテゴリ間は AND で使う） */
  conditionIds: number[];
  /** 解決に使われた条件ラベル（記事検索のキーワードにも流用） */
  matchedLabels: string[];
  /** 条件に解決できず残ったキーワード（2文字以上のときだけ全文検索に使う） */
  keyword: string;
};

/**
 * 自由文を条件へ解決する。条件が1つも取れないときは keyword に元の文字列を残し、
 * 呼び出し側が従来どおりの全文検索にフォールバックできるようにする。
 */
export function parseQuery(q: string): ParsedQuery {
  const raw = q.trim();
  if (!raw) return { conditionIds: [], matchedLabels: [], keyword: "" };

  const conds = allConditions();
  const idOf = new Map(conds.map((c) => [`${c.category}:${c.label}`, c.id]));
  const n = norm(raw);

  const conditionIds: number[] = [];
  const matchedLabels: string[] = [];
  const hitWords: string[] = [];

  for (const e of SYNONYMS) {
    const hit = e.words.find((w) => n.includes(norm(w)));
    if (!hit) continue;
    const id = idOf.get(`${e.category}:${e.label}`);
    if (id === undefined || conditionIds.includes(id)) continue;
    conditionIds.push(id);
    matchedLabels.push(e.label);
    for (const w of e.words) if (n.includes(norm(w))) hitWords.push(w);
  }

  /* 条件に使った語とノイズ語を削って、残りをキーワードとして扱う */
  let rest = raw;
  for (const w of [...hitWords].sort((a, b) => b.length - a.length)) {
    rest = rest.split(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")).join(" ");
  }
  for (const w of [...NOISE].sort((a, b) => b.length - a.length)) {
    rest = rest.split(w).join(" ");
  }
  rest = rest.replace(/[\s　]+/g, " ").trim();

  const keyword = conditionIds.length ? (rest.length >= 2 ? rest : "") : raw;
  return { conditionIds, matchedLabels, keyword };
}

/** 記事タブ用の検索語（条件ラベル＋残りキーワード） */
export function articleTerms(p: ParsedQuery): string[] {
  const terms = [...p.matchedLabels.map((l) => l.replace(/（.*?）/g, "").trim()), p.keyword]
    .map((s) => s.trim())
    .filter((s) => s.length >= 2);
  return [...new Set(terms)];
}
