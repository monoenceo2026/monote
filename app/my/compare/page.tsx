import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { currentUser, sessionKey } from "@/lib/session";
import {
  companyArticles,
  compareList,
  conditionsOfCompany,
  inquiryHistoryOf,
  savedArticles,
  savedCompanies,
  type Company,
} from "@/lib/repo";
import { CompareTabs, MaskToggle, MemoCell, RemoveButton } from "./parts";
import "@/css/compare.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "保存・比較",
  description: "保存した企業を並べて比較し、条件の合う会社にまとめて相談できます。",
};

/* 比較の基準にしている検索条件（チップ表示） */
const BASE_CHIPS = ["SUS304", "板金・レーザー", "1〜50個", "7日以内"];

/* チップに対応する条件（一致数の分母）。「1〜50個」は 1個から＋小ロット の2条件にまたがる */
const CRITERIA: Array<{ name: string; key: string }> = [
  { name: "材質", key: "material:ステンレス" },
  { name: "加工", key: "process:板金・プレス" },
  { name: "ロット", key: "lot:1個から（試作）" },
  { name: "ロット", key: "lot:小ロット（〜100個）" },
  { name: "納期", key: "delivery:短納期（7日以内）" },
];

type CmpItem = {
  c: Company & { memo: string };
  match: number;
  matchLabel: string;
  materials: string[];
  certCount: number;
  articleCount: number;
};

const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).replaceAll("-", ".") : "—");

const lotText = (c: Company) => `${c.lot_min.toLocaleString("ja-JP")}〜${c.lot_max.toLocaleString("ja-JP")}個`;
const precisionText = (c: Company) => (c.precision_mm != null ? `±${c.precision_mm}mm` : "—");
const deliveryText = (c: Company) => {
  if (c.delivery_min == null) return "—";
  const range = c.delivery_max != null ? `${c.delivery_min}〜${c.delivery_max}日` : `${c.delivery_min}日〜`;
  return range + (c.area.includes("特急") ? "（特急応相談）" : "");
};
const areaText = (c: Company) => {
  const parts = c.area.split("／").filter((s) => s && !/特急|標準|日/.test(s));
  return parts.length ? parts.join("／") : c.area || "—";
};
const priceText = (c: Company) => (c.price_hint ? c.price_hint.split("／")[0] : "非公開");
const responseText = (c: Company) => (c.response_days != null ? `平均 ${c.response_days}営業日` : "実績なし");

/** true for every item that attains the best value (null = 実績なし → never best) */
function bestFlags(
  items: CmpItem[],
  val: (it: CmpItem) => number | null,
  dir: "max" | "min",
  requirePositive = false
): boolean[] {
  const vals = items.map(val);
  const nums = vals.filter((v): v is number => v != null);
  if (!nums.length) return items.map(() => false);
  const best = dir === "max" ? Math.max(...nums) : Math.min(...nums);
  if (requirePositive && best <= 0) return items.map(() => false);
  return vals.map((v) => v != null && v === best);
}

type HistoryRow = {
  id: number;
  type: string;
  process: string;
  material: string;
  quantity: string;
  source: string;
  created_at: string;
};

const HISTORY_TYPE: Record<string, string> = { estimate: "見積相談", technical: "技術相談" };

export default async function ComparePage() {
  const user = await currentUser();
  const key = await sessionKey();

  const list = compareList(key);
  const companies = savedCompanies(key);
  const articles = savedArticles(key);
  const history: HistoryRow[] = user ? (inquiryHistoryOf(user.id) as HistoryRow[]) : [];

  /* ---------- 比較テーブルの実データ + 優位セル計算 ---------- */
  const items: CmpItem[] = list.map((c) => {
    const conds = conditionsOfCompany(c.id);
    const keys = new Set(conds.map((x) => `${x.category}:${x.label}`));
    const match = CRITERIA.filter((cr) => keys.has(cr.key)).length;
    const missing = [...new Set(CRITERIA.filter((cr) => !keys.has(cr.key)).map((cr) => cr.name))];
    const matchLabel =
      missing.length === 0 ? "すべて対応" : missing.length === 1 ? `${missing[0]}のみ不一致` : `${missing.join("・")}が不一致`;
    return {
      c,
      match,
      matchLabel,
      materials: conds.filter((x) => x.category === "material").map((x) => x.label),
      certCount: conds.filter((x) => x.category === "cert").length,
      articleCount: companyArticles(c.id).length,
    };
  });

  const advMatch = bestFlags(items, (it) => it.match, "max", true);
  const advLot = bestFlags(items, (it) => it.c.lot_max - it.c.lot_min, "max");
  const advPrecision = bestFlags(items, (it) => it.c.precision_mm, "min");
  const advCert = bestFlags(items, (it) => it.certCount, "max", true);
  const advDelivery = bestFlags(items, (it) => it.c.delivery_min, "min");
  const advResponse = bestFlags(items, (it) => it.c.response_days, "min");
  /* 記事数最多、同数なら更新が新しい方 */
  const mostArticles = bestFlags(items, (it) => it.articleCount, "max", true);
  const latestUpdated = items
    .filter((_, i) => mostArticles[i])
    .map((it) => it.c.updated_at)
    .sort()
    .pop();
  const advFresh = items.map((it, i) => mostArticles[i] && it.c.updated_at === latestUpdated);

  const rows: Array<{ label: string; text: (it: CmpItem) => string; adv?: boolean[] }> = [
    { label: "条件の一致", text: (it) => `${it.match} / ${CRITERIA.length}　${it.matchLabel}`, adv: advMatch },
    { label: "加工・工程", text: (it) => it.c.specialty_process_sub || it.c.specialty_process || "—" },
    { label: "対応材質", text: (it) => (it.materials.length ? it.materials.join("／") : "—") },
    { label: "対応ロット", text: (it) => lotText(it.c), adv: advLot },
    { label: "加工精度", text: (it) => precisionText(it.c), adv: advPrecision },
    { label: "対応サイズ", text: (it) => it.c.size_note || "—" },
    { label: "品質・認証", text: (it) => it.c.specialty_quality || "—", adv: advCert },
    { label: "標準納期", text: (it) => deliveryText(it.c), adv: advDelivery },
    { label: "エリア", text: (it) => areaText(it.c) },
    { label: "価格帯の目安", text: (it) => priceText(it.c) },
    { label: "返信の速さ", text: (it) => responseText(it.c), adv: advResponse },
    { label: "実績業種", text: (it) => it.c.industries || "—" },
    { label: "記事・情報の鮮度", text: (it) => `記事 ${it.articleCount}本／更新 ${fmtDate(it.c.updated_at)}`, adv: advFresh },
  ];

  const allIds = items.map((it) => it.c.id).join(",");

  /* ---------- panels ---------- */

  const panelCompare = (
    <>
      <div className="cond-row">
        <div className="cond-row__left">
          <p className="cond-row__label">比較の基準にしている検索条件</p>
          <div className="cond-row__chips">
            {BASE_CHIPS.map((chip) => (
              <span key={chip} className="cond-chip">{chip}</span>
            ))}
          </div>
        </div>
        <Link className="c-btn" href="/search">条件を変更</Link>
      </div>

      {items.length > 0 ? (
        <div className="cmp-scroll reveal" id="cmpScroll">
          <table className="cmp-table" id="cmpTable">
            <colgroup>
              <col className="col-label" />
              {items.map((it, i) => (
                <col key={it.c.id} data-col={i + 1} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="cmp-table__corner" scope="col">比較項目</th>
                {items.map((it, i) => (
                  <th key={it.c.id} className="cmp-co" scope="col" data-col={i + 1}>
                    <div className="cmp-co__row">
                      <span className="ph-thumb cmp-co__logo" aria-hidden="true"></span>
                      <span className="cmp-co__name">{it.c.name}</span>
                      {it.c.verified ? <span className="cmp-co__badge">確認済み</span> : null}
                    </div>
                    <p className="cmp-co__meta">{it.c.prefecture}{it.c.city}・{it.c.employees}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">{row.label}</th>
                  {items.map((it, i) => (
                    <td key={it.c.id} className={row.adv?.[i] ? "is-adv" : undefined} data-col={i + 1}>
                      {row.text(it)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="cmp-table__memo">
                <th scope="row">メモ</th>
                {items.map((it, i) => (
                  <MemoCell key={it.c.id} companyId={it.c.id} col={i + 1} memo={it.c.memo} companyName={it.c.name} />
                ))}
              </tr>
              <tr className="cmp-table__actions">
                <th></th>
                {items.map((it, i) => (
                  <td key={it.c.id} data-col={i + 1}>
                    <Link className="cmp-consult" href={`/inquiry/new?companies=${it.c.id}`}>相談する</Link>
                    <RemoveButton companyId={it.c.id} col={i + 1} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="cmp-empty" id="cmpEmpty">比較中の企業はありません。検索結果から企業を追加してください。</p>
      )}

      {items.length > 0 ? (
        <section className="bulk reveal" id="bulkBox">
          <div className="bulk__txt">
            <h2 className="bulk__ttl"><span data-cmp-count>{items.length}</span>社にまとめて相談する</h2>
            <p className="bulk__desc">同じ条件・同じ図面で一度に送れます。各社の返信はマイページに集約されます。</p>
          </div>
          <div className="bulk__btns">
            <MaskToggle />
            <Link className="bulk__go" href={`/inquiry/new?companies=${allIds}&source=compare`}>まとめて相談する</Link>
          </div>
        </section>
      ) : null}
    </>
  );

  const panelCompanies =
    companies.length > 0 ? (
      <div className="cmp-panel">
        <div className="saved__grid">
          {companies.map((c) => (
            <Link key={c.id} className="saved-card" href={`/companies/${c.slug}`}>
              <div className="saved-card__tags">
                <span className="tag" style={{ fontWeight: 400 }}>{c.prefecture}</span>
                {c.verified ? <span className="tag tag--blue" style={{ fontWeight: 400 }}>確認済み</span> : null}
              </div>
              <h3>{c.name}</h3>
              <p>{c.prefecture}{c.city}・{c.employees}</p>
            </Link>
          ))}
        </div>
      </div>
    ) : (
      <p className="cmp-empty">保存した企業はまだありません。検索結果から保存できます。</p>
    );

  const panelHistory = !user ? (
    <p className="cmp-empty">相談の履歴はありません。<Link href="/login">ログイン</Link>すると、送信した相談の履歴を確認できます。</p>
  ) : history.length > 0 ? (
    <div className="cmp-panel">
      <div className="saved__grid">
        {history.map((h) => (
          <div key={h.id} className="saved-card">
            <div className="saved-card__tags">
              <span className="tag" style={{ fontWeight: 400 }}>{HISTORY_TYPE[h.type] ?? "相談"}</span>
            </div>
            <h3>{[h.process, h.material, h.quantity].filter(Boolean).join("／") || "相談"}</h3>
            <p>送信 {fmtDate(h.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <p className="cmp-empty">相談の履歴はまだありません。</p>
  );

  return (
    <>
      <Header variant="sub" />

      <main className="container-wide cmp-main">
        <div className="page-head">
          <h1 className="page-head__ttl">保存・比較</h1>
          <div className="page-head__actions">
            <Link className="c-btn" href="/search">検索条件から追加</Link>
            <button className="c-btn" type="button" disabled>比較表を書き出す（Phase2）</button>
          </div>
        </div>

        <CompareTabs
          nCompare={items.length}
          nCompanies={companies.length}
          nArticles={articles.length}
          nHistory={history.length}
          panelCompare={panelCompare}
          panelCompanies={panelCompanies}
          panelHistory={panelHistory}
        />

        <section className="saved reveal" id="savedArticles">
          <div className="sec-ttl">
            <h2>保存した記事</h2>
            <p className="note">{articles.length}</p>
          </div>
          {articles.length > 0 ? (
            <div className="saved__grid" data-stagger="0.07">
              {articles.map((a) => (
                <Link key={a.id} className="saved-card reveal" href={`/articles/${a.slug}`}>
                  <div className="saved-card__tags">
                    {a.tag1 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag1}</span> : null}
                    {a.tag2 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag2}</span> : null}
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.company_name}・保存 {fmtDate(a.saved_at)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="cmp-empty">保存した記事はまだありません。</p>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
