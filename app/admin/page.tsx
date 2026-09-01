import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { companyById, dashboardStats, inboxOf } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { articleSlugsOf, termRankMap, worksCountOf } from "@/lib/extra/admin";
import DashFx from "./DashFx";
import InboxCard, { type InboxItemData } from "./InboxCard";
import PeriodSelect from "./PeriodSelect";
import "@/css/admin-dashboard.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "企業管理ダッシュボード",
  description: "MONOTE 企業管理ダッシュボード。検索表示・閲覧・保存・相談の成果をひと目で確認できます。",
};

/* ---------- helpers ---------- */

const fmtDate = (d: Date) =>
  `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

const dbDate = (s: string | null | undefined) => (s ?? "").slice(0, 10).replaceAll("-", ".");

function pctDiff(cur: number, prev: number): string {
  if (!prev) return cur ? "＋100%" : "±0%";
  const pct = Math.round(((cur - prev) / prev) * 100);
  return pct >= 0 ? `＋${pct}%` : `−${Math.abs(pct)}%`;
}

function countDiff(cur: number, prev: number): string {
  const d = cur - prev;
  return d >= 0 ? `＋${d}件` : `−${Math.abs(d)}件`;
}

const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

/** "ステンレス×板金・プレス" → "ステンレス × 板金・プレス" (static表記に正規化) */
const displayTerm = (term: string) =>
  term.split(/[×✕]/).map((s) => s.trim()).filter(Boolean).join(" × ") || term;

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  estimate: "見積依頼",
  feasibility: "対応可否",
  technical: "技術相談",
  partner: "協力会社",
};

type InboxRow = {
  id: number;
  type: string;
  material: string;
  quantity: string;
  deadline: string;
  note: string;
  process: string;
  anonymous: number;
  contact_company: string;
  contact_name: string;
  created_at: string;
  recipient_status: "open" | "replied" | "declined";
};

function inquiryTitle(i: InboxRow): string {
  const label = INQUIRY_TYPE_LABEL[i.type] ?? "相談";
  const note = (i.note ?? "").trim();
  if ((i.type === "technical" || i.type === "partner") && note) {
    const t = truncate(note, 42);
    return t.startsWith(label) ? t : `${label}：${t}`;
  }
  const parts = [i.material, i.quantity, i.deadline].map((s) => (s ?? "").trim()).filter(Boolean);
  const body = parts.join(" / ") || truncate(note, 42) || (i.process ?? "").trim() || "詳細未記入";
  return `${label}：${body}`;
}

/* ---------- page ---------- */

export default async function AdminDashboardPage() {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) redirect("/login");
  const company = companyById(user.company_id);
  if (!company) redirect("/login");

  const stats = dashboardStats(company.id);
  const ranks = termRankMap(company.id, stats.terms.map((t) => t.term));
  const slugs = articleSlugsOf(company.id);
  const worksCount = worksCountOf(company.id);

  const inboxRows = inboxOf(company.id) as InboxRow[];
  const inboxItems: InboxItemData[] = inboxRows.map((i) => ({
    id: i.id,
    title: inquiryTitle(i),
    date: `${dbDate(i.created_at)}受信`,
    note: i.anonymous
      ? "匿名相談（社名は返信承諾後に開示）"
      : [i.contact_company, i.contact_name ? `${i.contact_name}様` : ""].filter(Boolean).join("／"),
    status: i.recipient_status,
  }));
  const openCount = inboxRows.filter((i) => i.recipient_status === "open").length;

  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 30);

  /* 改善サジェスト: 表示は多いのにクリックが伸びず相談ゼロの条件 */
  const suggest = stats.terms
    .filter((t) => t.inquiries === 0 && t.impressions >= 50 && t.clicks / Math.max(1, t.impressions) < 0.15)
    .sort((a, b) => b.impressions - a.impressions)[0];
  const suggestTokens = suggest ? suggest.term.split(/[×✕]/).map((s) => s.trim()).filter(Boolean) : [];
  const suggestFocus = suggestTokens[suggestTokens.length - 1] ?? "";

  /* 相談ソース横棒（幅は実数比、最大 40.3% = 静的版のスケール） */
  const srcRows = [
    { label: "検索結果から直接", n: stats.sources.search },
    { label: "記事を読んでから", n: stats.sources.article },
    { label: "比較表から（複数社同時）", n: stats.sources.compare },
  ];
  const srcTotal = srcRows.reduce((a, r) => a + r.n, 0);
  const srcMax = Math.max(...srcRows.map((r) => r.n), 1);

  /* 会社情報の充足度: 未入力項目を実データから判定 */
  const todos: Array<{ text: string; cta: string }> = [];
  if (!company.price_hint.trim()) todos.push({ text: "価格帯の目安が未入力", cta: "入力" });
  if (worksCount < 5) todos.push({ text: `実績が${worksCount}件（推奨5件以上）`, cta: "追加" });
  if (!company.equipment.trim()) todos.push({ text: "保有設備の型式が未記載", cta: "入力" });

  const kpis = [
    {
      label: "検索結果に表示された回数",
      value: stats.cur.impressions,
      comma: true,
      unit: "回",
      diff: pctDiff(stats.cur.impressions, stats.prev.impressions),
      note: "条件検索で候補に出た回数",
      blue: false,
    },
    {
      label: "記事・企業ページの閲覧",
      value: stats.cur.views,
      comma: false,
      unit: "回",
      diff: pctDiff(stats.cur.views, stats.prev.views),
      note: `うち検索経由 ${stats.searchShare}%`,
      blue: false,
    },
    {
      label: "保存・比較された数",
      value: stats.cur.saves,
      comma: false,
      unit: "件",
      diff: pctDiff(stats.cur.saves, stats.prev.saves),
      note: "検討候補に入った回数",
      blue: true,
    },
    {
      label: "相談・見積依頼",
      value: stats.cur.inquiries,
      comma: false,
      unit: "件",
      diff: countDiff(stats.cur.inquiries, stats.prev.inquiries),
      note: `未対応 ${openCount}件${company.response_days ? `／返信 平均${company.response_days}営業日` : ""}`,
      blue: true,
    },
  ];

  return (
    <div className="page-admin-dashboard">
      <Header variant="admin" adminActive="dashboard" />

      <main className="admin-main container-wide">
        {/* page head */}
        <div className="dash-head">
          <div className="dash-head__ttl">
            <h1>この1か月の成果</h1>
            <p className="dash-head__period">{fmtDate(from)}〜{fmtDate(now)}／前月比</p>
          </div>
          <div className="dash-head__actions">
            <PeriodSelect />
            <button className="btn btn--box btn--outline-thin dash-head__export" type="button">レポートを書き出す</button>
          </div>
        </div>

        {/* KPI cards */}
        <section className="kpi-row reveal" data-stagger aria-label="主要指標">
          {kpis.map((k) => (
            <div key={k.label} className={`kpi-card${k.blue ? " kpi-card--blue" : ""}`}>
              <p className="kpi-card__label">{k.label}</p>
              <div className="kpi-card__num">
                <em className="js-count" data-count={k.value} data-format={k.comma ? "comma" : undefined}>
                  {k.comma ? k.value.toLocaleString("en-US") : String(k.value)}
                </em>
                <span className="kpi-card__unit">{k.unit}</span>
                <span className="kpi-card__diff">{k.diff}</span>
              </div>
              <p className="kpi-card__note">{k.note}</p>
            </div>
          ))}
        </section>

        <div className="dash-grid">
          {/* main column */}
          <div className="dash-col dash-col--main">
            {/* search conditions */}
            <section className="dash-card reveal">
              <div className="dash-card__head">
                <h2 className="dash-card__ttl">あなたの会社が見つかった検索条件</h2>
                <p className="dash-card__note">相談につながった条件を上位に表示</p>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <colgroup>
                    <col />
                    <col className="col-num" /><col className="col-num" /><col className="col-num" /><col className="col-num" /><col className="col-num" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>検索条件</th>
                      <th>表示</th>
                      <th>クリック</th>
                      <th>保存</th>
                      <th>相談</th>
                      <th>順位</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.terms.map((t) => (
                      <tr key={t.term}>
                        <td>{truncate(displayTerm(t.term), 24)}</td>
                        <td>{t.impressions}</td>
                        <td>{t.clicks}</td>
                        <td>{t.saves}</td>
                        <td className={t.inquiries >= 2 ? "is-lead" : undefined}>{t.inquiries}</td>
                        <td>{ranks.get(t.term) ?? "—"}</td>
                      </tr>
                    ))}
                    {stats.terms.length === 0 ? (
                      <tr><td colSpan={6}>直近1か月の検索表示はまだありません。</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {suggest ? (
                <div className="dash-suggest">
                  <div className="dash-suggest__txt">
                    <p className="dash-suggest__lead">「{displayTerm(suggest.term)}」で表示はされているのに、クリックが伸びていません。</p>
                    <p className="dash-suggest__sub">実績・事例に{suggestFocus}の案件を１件追加すると改善が見込めます。</p>
                  </div>
                  <Link className="btn dash-btn-sm" href="/signup">実績を追加する</Link>
                </div>
              ) : null}
            </section>

            {/* popular articles */}
            <section className="dash-card reveal">
              <div className="dash-card__head">
                <h2 className="dash-card__ttl">よく読まれている記事</h2>
              </div>
              <div className="dash-table-wrap">
                <table className="dash-table">
                  <colgroup>
                    <col />
                    <col className="col-num" /><col className="col-num" /><col className="col-num" /><col className="col-num" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>記事</th>
                      <th>閲覧</th>
                      <th>保存</th>
                      <th>相談</th>
                      <th>公開日</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.articles.map((a: { id: number; title: string; published_at: string | null; views: number; saves: number; inquiries: number }) => (
                      <tr key={a.id}>
                        <td>
                          {slugs.get(a.id) ? (
                            <Link href={`/articles/${slugs.get(a.id)}`}>{truncate(a.title, 20)}</Link>
                          ) : (
                            truncate(a.title, 20)
                          )}
                        </td>
                        <td>{a.views}</td>
                        <td>{a.saves}</td>
                        <td className={a.inquiries >= 2 ? "is-lead" : undefined}>{a.inquiries}</td>
                        <td>{dbDate(a.published_at)}</td>
                      </tr>
                    ))}
                    {stats.articles.length === 0 ? (
                      <tr><td colSpan={5}>直近1か月に読まれた記事はまだありません。</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            {/* consult sources bar chart */}
            <section className="dash-card reveal">
              <div className="dash-card__head">
                <h2 className="dash-card__ttl">相談は、どこから来ているか</h2>
                <p className="dash-card__note">人口別の相談件数（直近1か月・計{srcTotal}件）</p>
              </div>
              <div className="dash-bars" id="dashBars">
                {srcRows.map((r) => (
                  <div key={r.label} className="bar-row">
                    <p className="bar-row__label">{r.label}</p>
                    <div className="bar-row__track">
                      <div
                        className="bar-row__bar"
                        style={{ "--bar-w": `${((r.n / srcMax) * 40.3).toFixed(2)}%` } as React.CSSProperties}
                      ></div>
                      <span className="bar-row__val">{r.n}件</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="dash-card__foot">記事経由の相談は、検索経由より見積成約率が高い傾向。どの記事が効いたかは上の表で確認できます。</p>
            </section>
          </div>

          {/* sidebar */}
          <aside className="dash-col dash-col--side">
            {/* inbox */}
            <InboxCard items={inboxItems} />

            {/* profile completeness */}
            <section className="dash-card reveal" id="company-info">
              <h2 className="dash-card__ttl dash-card__ttl--ink">会社情報の充足度</h2>
              <div className="meter">
                <div className="meter__track">
                  <div className="meter__fill" id="meterFill" style={{ "--meter-w": `${company.completeness}%` } as React.CSSProperties}></div>
                </div>
                <span className="meter__val">{company.completeness}%</span>
              </div>
              <p className="dash-card__foot meter-note">埋めるほど検索で見つかりやすくなります</p>
              {todos.length ? (
                <ul className="todo-list">
                  {todos.map((t) => (
                    <li key={t.text} className="todo-item">
                      <span>{t.text}</span>
                      <Link className="btn dash-btn-sm" href="/signup">{t.cta}</Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            {/* Phase2 */}
            <section className="dash-card dash-card--dashed reveal">
              <h2 className="phase2-ttl">Phase2（有料オプション）</h2>
              <ul className="phase2-list">
                <li>検索結果・特集での優先表示</li>
                <li>関心の高い読者へのレコメンド配信</li>
                <li>詳細な成果レポートと改善提案</li>
                <li>企画・取材・執筆の運用代行</li>
              </ul>
              <p className="dash-card__foot">この画面の実測値が、そのまま提案材料になる設計。</p>
            </section>
          </aside>
        </div>
      </main>

      <Footer />
      <DashFx />
    </div>
  );
}
