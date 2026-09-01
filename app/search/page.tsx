import Link from "next/link";
import type { Metadata } from "next";
import Footer from "@/components/Footer";
import { currentUser, sessionKey } from "@/lib/session";
import { logoutAction } from "@/app/actions";
import {
  allConditions,
  compareList,
  companyArticles,
  companyPhotos,
  conditionCounts,
  conditionsOfCompany,
  recordImpressions,
  savedCompanies,
  savedIds,
  searchArticles,
  searchCompanies,
  type Company,
  type Condition,
} from "@/lib/repo";
import { inquiryEventCounts } from "@/lib/extra/search";
import {
  Collapsible,
  CompareBar,
  CompareButton,
  CondCheckbox,
  CondChip,
  FMore,
  NavButton,
  Results,
  RevealOnParams,
  SaveButton,
} from "./parts";
import "@/css/search.css";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<string, string> = {
  process: "加工",
  material: "材質",
  lot: "ロット",
  delivery: "納期",
  cert: "認証",
  area: "エリア",
  precision: "精度",
};
const CAT_ORDER = ["material", "process", "lot", "delivery", "cert", "area", "precision"];
const DEFAULT_CONDS: Array<[string, string]> = [
  ["material", "ステンレス"],
  ["process", "板金・プレス"],
  ["lot", "1個から（試作）"],
  ["delivery", "短納期（7日以内）"],
];
const PER_PAGE = 10;

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v.join(",") : v);

function shortLabel(c: Condition): string {
  if (c.category === "delivery") {
    const m = c.label.match(/（(.+)）/);
    if (m) return m[1];
  }
  return c.label;
}

const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).replaceAll("-", ".") : "");

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const q = (one((await searchParams).q) ?? "").trim();
  return { title: q ? `検索結果：${q}` : "検索結果" };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim();
  const condParam = one(sp.cond);

  const conds = allConditions();
  const byId = new Map(conds.map((c) => [c.id, c]));

  /* 適用条件: cond= が明示されていればそれ、q も cond も無ければ Figma デモ状態の4条件 */
  let conditionIds: number[];
  if (condParam !== undefined) {
    conditionIds = [...new Set(condParam.split(",").map((s) => parseInt(s, 10)).filter((n) => byId.has(n)))];
  } else if (!q) {
    conditionIds = DEFAULT_CONDS.map(([cat, label]) => conds.find((c) => c.category === cat && c.label === label)?.id)
      .filter((n): n is number => typeof n === "number");
  } else {
    conditionIds = [];
  }

  const sortParam = one(sp.sort);
  const sort: "match" | "updated" | "response" =
    sortParam === "updated" ? "updated" : sortParam === "response" ? "response" : "match";
  const tab: "companies" | "articles" = one(sp.tab) === "articles" ? "articles" : "companies";

  const filters = {
    q: q || undefined,
    conditionIds,
    sort: (sort === "updated" ? "updated" : "match") as "match" | "updated",
  };
  let companies = searchCompanies(filters);
  if (sort === "response") {
    companies = [...companies].sort((a, b) => (a.response_days ?? 99) - (b.response_days ?? 99));
  }
  const articles = searchArticles(filters);
  const counts = conditionCounts(filters);

  const total = companies.length;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const page = Math.min(Math.max(1, parseInt(one(sp.page) ?? "1", 10) || 1), pageCount);
  const pageCompanies = companies.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  /* 適用中の条件（カテゴリ順に整列） */
  const applied = conditionIds
    .map((id) => byId.get(id)!)
    .sort((a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category) || a.id - b.id);
  const condWithout = (id: number) => conditionIds.filter((c) => c !== id).join(",");

  /* 緩和サジェスト: delivery 条件を外した場合の件数 */
  const deliveryCond = applied.find((c) => c.category === "delivery");
  const suggest = deliveryCond
    ? {
        cond: deliveryCond,
        count: searchCompanies({ ...filters, conditionIds: conditionIds.filter((id) => byId.get(id)!.category !== "delivery") }).length,
        condAfter: conditionIds.filter((id) => byId.get(id)!.category !== "delivery").join(","),
      }
    : null;

  /* セッション由来（保存・比較・ログイン） */
  const user = await currentUser();
  const key = await sessionKey();
  const nSavedCompanies = savedCompanies(key).length;
  const savedSet = new Set(savedIds(key, "company"));
  const cmpItems = compareList(key).map((c) => ({ id: c.id, name: c.name }));
  const cmpIds = new Set(cmpItems.map((c) => c.id));

  /* インプレッション計測（1ページ目のみ） */
  if (page === 1 && pageCompanies.length) {
    const term = applied.map((c) => c.label).join("×") || q;
    recordImpressions(pageCompanies.map((c) => c.id), term);
  }

  /* カード用データ */
  const inqCounts = inquiryEventCounts(pageCompanies.map((c) => c.id));
  const cards = pageCompanies.map((c) => {
    const own = conditionsOfCompany(c.id);
    const ownIds = new Set(own.map((o) => o.id));
    const matched = applied.filter((a) => ownIds.has(a.id));
    const arts = companyArticles(c.id);
    return {
      c,
      matched,
      certs: own.filter((o) => o.category === "cert"),
      photos: companyPhotos(c.id),
      firstArticle: arts[0] ?? null,
      moreArticles: Math.max(0, arts.length - 1),
      inq: inqCounts.get(c.id) ?? 0,
    };
  });

  /* サイドバー */
  const group = (cat: string) => conds.filter((c) => c.category === cat);
  const condToggled = (id: number) =>
    (conditionIds.includes(id) ? conditionIds.filter((c) => c !== id) : [...conditionIds, id]).join(",");
  const ckLabel = (c: Condition, withCount: boolean) =>
    withCount ? `${c.label}（${counts.get(c.id) ?? 0}）` : c.label;
  const renderCk = (c: Condition, withCount: boolean) => (
    <CondCheckbox key={c.id} checked={conditionIds.includes(c.id)} condAfter={condToggled(c.id)}>
      {ckLabel(c, withCount)}
    </CondCheckbox>
  );
  const processConds = group("process");
  const processVisible = processConds.slice(0, 4);
  const processMore = processConds.slice(4);

  /* チップ表示（カード内） */
  const cardChip = (c: Company, cond: Condition): string => {
    if (cond.category === "delivery" && c.delivery_min) return `最短${c.delivery_min}日`;
    return cond.label;
  };

  const pagerPages = Array.from({ length: pageCount }, (_, i) => i + 1);
  const urlWith = (over: { page?: number }) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("cond", conditionIds.join(","));
    if (tab !== "companies") p.set("tab", tab);
    if (sort !== "match") p.set("sort", sort);
    const pg = over.page ?? 1;
    if (pg > 1) p.set("page", String(pg));
    return "/search?" + p.toString();
  };

  /* ---------------- パネル: 企業 ---------------- */
  const panelCompanies = (
    <>
      {suggest ? (
        <div className="suggest reveal" id="suggestBar">
          <p className="suggest__txt">
            <strong>
              「{CAT_LABEL[suggest.cond.category]}：{shortLabel(suggest.cond)}」を外すと{suggest.count}社
            </strong>
            まで広がります
          </p>
          <NavButton className="cond-btn" mutate={{ cond: suggest.condAfter, page: null }}>この条件を外す</NavButton>
        </div>
      ) : null}

      {cards.map(({ c, matched, certs, photos, firstArticle, moreArticles, inq }, idx) => (
        <article key={c.id} className="c-card reveal">
          <div className="c-card__main">
            <div className="c-card__logo"><img src="/assets/img/logoipsum.png" alt={`${c.name} ロゴ`} /></div>
            <div className="c-card__head">
              <h2 className="c-card__name"><Link href={`/companies/${c.slug}?from=search`}>{c.name}</Link></h2>
              <div className="c-card__badges">
                {c.verified ? <span className="tag tag--blue">確認済み</span> : null}
                {certs.map((t) => (
                  <span key={t.id} className="tag">{t.label}</span>
                ))}
                <p className="c-card__loc">
                  {c.prefecture}
                  {c.city}・{c.employees}
                  {c.founded ? `・創業${c.founded}年` : ""}
                </p>
              </div>
            </div>
            <div className="c-card__rest">
              <div className="c-card__chips">
                {matched.map((m) => (
                  <span key={m.id} className="chip chip--check">
                    <i aria-hidden="true">✓</i>
                    <span className="chip__t">{cardChip(c, m)}</span>
                  </span>
                ))}
                {!matched.some((m) => m.category === "delivery") && c.delivery_min ? (
                  <span className="chip chip--outline"><span className="chip__t">納期<span className="pc-inline">は</span>{c.delivery_min}日〜</span></span>
                ) : matched.some((m) => m.category === "delivery") && c.precision_mm != null && c.precision_mm > 0.01 ? (
                  <span className="chip chip--outline sp-hide">±0.01mmは要相談</span>
                ) : null}
              </div>
              <div className="c-card__specs">
                <div className="spec-box">
                  <p className="spec-box__label">得意な加工</p>
                  <p className="spec-box__value">{c.specialty_process}</p>
                  <p className="spec-box__sub">{c.specialty_process_sub}</p>
                </div>
                <div className="spec-box">
                  <p className="spec-box__label"><span className="pc-inline">得意な</span>ロット・納期</p>
                  <p className="spec-box__value">{c.specialty_lot}</p>
                  <p className="spec-box__sub">{c.specialty_lot_sub}</p>
                </div>
                <div className="spec-box sp-hide">
                  <p className="spec-box__label">品質・認証</p>
                  <p className="spec-box__value">{c.specialty_quality}</p>
                  <p className="spec-box__sub">{c.specialty_quality_sub}</p>
                </div>
              </div>
              {firstArticle ? (
                <Link className="c-card__article" href={`/articles/${firstArticle.slug}`}>
                  <span className="c-card__article-tag">関連記事</span>
                  <span className="c-card__article-ttl">{firstArticle.title}</span>
                  {moreArticles > 0 ? <span className="c-card__article-more">他{moreArticles}本</span> : null}
                </Link>
              ) : null}
              <div className="c-card__stats">
                <p>最終更新{fmtDate(c.updated_at)}</p>
                {c.response_days ? <p>相談への返信 平均{c.response_days}営業日</p> : null}
                {inq > 0 ? <p>MONOTE経由の相談 {inq}件</p> : null}
              </div>
              <div className="c-card__photos">
                {photos.length
                  ? photos.slice(0, 6).map((p, i) => (
                      <img key={p} className={i >= 4 ? "sp-hide" : undefined} src={p} alt="加工事例" />
                    ))
                  : Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={"ph-thumb" + (i >= 4 ? " sp-hide" : "")}></div>
                    ))}
              </div>
            </div>
          </div>
          <div className="c-card__actions">
            <Link className="btn c-btn c-btn--dark" href={`/inquiry/new?companies=${c.id}&source=search`}>相談する</Link>
            <CompareButton companyId={c.id} inCompare={cmpIds.has(c.id)} />
            <SaveButton companyId={c.id} saved={savedSet.has(c.id)} />
            {idx === 0 && page === 1 ? <p className="c-card__free">見積依頼も無料</p> : null}
          </div>
        </article>
      ))}

      {total === 0 ? (
        <p className="results-empty">条件に一致する企業が見つかりませんでした。条件を減らしてお試しください。</p>
      ) : (
        <article className="c-card c-card--skeleton" aria-hidden="true">
          <div className="c-card__main">
            <div className="ph-thumb sk-thumb"></div>
            <div className="sk-lines">
              <span style={{ width: "68%" }}></span>
              <span style={{ width: "87%" }}></span>
              <span style={{ width: "79%" }}></span>
            </div>
          </div>
          <div className="c-card__actions">
            <span className="btn c-btn c-btn--dark is-disabled">相談する</span>
            <span className="btn c-btn c-btn--outline is-disabled">比較に追加</span>
          </div>
        </article>
      )}

      {pageCount > 1 ? (
        <nav className="pager" aria-label="ページネーション">
          <Link className="pager__item pager__item--arrow" href={urlWith({ page: Math.max(1, page - 1) })} aria-label="前のページ">
            <svg viewBox="0 0 8 16" width="8" height="16" fill="none"><path d="M6 2 2 8l4 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          {pagerPages.map((p) => (
            <Link
              key={p}
              className={"pager__item" + (p === page ? " is-current" : "")}
              href={urlWith({ page: p })}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          ))}
          <Link className="pager__item pager__item--arrow" href={urlWith({ page: Math.min(pageCount, page + 1) })} aria-label="次のページ">
            <svg viewBox="0 0 8 16" width="8" height="16" fill="none"><path d="M2 2l4 6-4 6" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </nav>
      ) : null}
    </>
  );

  /* ---------------- パネル: 記事 ---------------- */
  const panelArticles = (
    <>
      {articles.length ? (
        articles.slice(0, 30).map((a) => (
          <Link key={a.id} className="a-row" href={`/articles/${a.slug}`}>
            <div className="ph-thumb a-row__thumb"><span>記事サムネイル</span></div>
            <div className="a-row__body">
              <div className="a-row__tags">
                {a.tag1 ? <span className="tag">{a.tag1}</span> : null}
                {a.tag2 ? <span className="tag">{a.tag2}</span> : null}
              </div>
              <h3>{a.title}</h3>
              <p>{a.company_name}・{fmtDate(a.published_at)}</p>
            </div>
          </Link>
        ))
      ) : (
        <p className="results-empty">条件に一致する記事が見つかりませんでした。</p>
      )}
      <div className="a-row__foot">
        <Link className="btn btn--pill btn--ghost" href="/articles">記事一覧をすべて見る</Link>
      </div>
    </>
  );

  return (
    <>
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="sp-back" href="/" aria-label="戻る">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M10.5 2.5 5 8l5.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <Link className="brand" href="/">MONOTE</Link>
          <form className="header-search" action="/search" method="get" role="search">
            <div className="site-header__search">
              <input type="search" name="q" placeholder="SUS304 薄板 小ロット 短納期" defaultValue={q} aria-label="検索" />
            </div>
            <button className="header-search__btn" type="submit">検索</button>
          </form>
          <div className="site-header__actions">
            <Link className="btn btn--box btn--outline" href="/my/compare">保存した企業 <span id="savedCount">{nSavedCompanies}</span></Link>
            {user ? (
              <>
                <Link className="btn btn--pill btn--outline" href="/my/compare">マイページ</Link>
                <form action={logoutAction}><button className="btn btn--pill btn--outline" type="submit">{user.name} 様</button></form>
              </>
            ) : (
              <>
                <Link className="btn btn--pill btn--outline" href="/login">ログイン</Link>
                <Link className="btn btn--pill btn--dark" href="/signup">無料で企業登録</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ==================== 適用中の条件 ==================== */}
      <div className="cond-bar">
        <div className="cond-bar__inner">
          <div className="cond-bar__left">
            <p className="cond-bar__label">適用中の条件</p>
            <button className="sp-filter-btn" type="button">絞り込み <span id="spCondCount">{applied.length}</span></button>
            <div className="cond-bar__chips" id="condChips">
              {applied.map((c) => (
                <CondChip key={c.id} cat={CAT_LABEL[c.category] ?? c.category} label={shortLabel(c)} condAfter={condWithout(c.id)} />
              ))}
            </div>
            <NavButton className="cond-btn" id="condClearAll" mutate={{ cond: "", page: null }}>すべて解除</NavButton>
          </div>
          <button className="cond-btn cond-btn--save" type="button">この検索結果を保存</button>
        </div>
      </div>

      <div className="layout">
        {/* ==================== 絞り込みサイドバー ==================== */}
        <aside className="sidebar">
          <div className="sidebar__head">
            <h1>絞り込む</h1>
            <NavButton className="sidebar__clear" mutate={{ cond: "", page: null }}>条件をクリア</NavButton>
          </div>

          <Collapsible title="加工・工程">
            {processVisible.map((c) => renderCk(c, true))}
            <FMore count={processMore.length}>{processMore.map((c) => renderCk(c, true))}</FMore>
          </Collapsible>

          <hr className="f-line" />

          <section className="f-group" data-collapsible="">
            <div className="f-group__head">
              <h2>材質</h2>
              <span className="tag tag--blue">重要度1位</span>
            </div>
            <div className="f-group__body">{group("material").map((c) => renderCk(c, true))}</div>
          </section>

          <hr className="f-line" />

          <section className="f-group" data-collapsible="">
            <div className="f-group__head">
              <h2>対応ロット</h2>
              <span className="tag tag--blue">重要度1位</span>
            </div>
            <div className="f-group__body">{group("lot").map((c) => renderCk(c, false))}</div>
          </section>

          <hr className="f-line" />

          <section className="f-meta">
            <div className="f-meta__row"><p>品質・認証</p><span>ISO9001 / IATF / 検査体制…</span></div>
            <div className="f-meta__row"><p>実績のある業種・用途</p><span>自動車 / 半導体 / 医療…</span></div>
            <div className="f-meta__row"><p>納期・短納期対応</p><span>7日以内 / 応相談…</span></div>
            <div className="f-meta__row"><p>エリア</p><span>関西 / 関東 / 全国対応…</span></div>
            <div className="f-meta__row"><p>価格帯の目安</p><span className="tag tag--blue">要追加</span></div>
            <div className="f-meta__row"><p>返信の早さ</p><span className="tag tag--blue">要追加</span></div>
            <div className="f-meta__row"><p>加工精度</p><span>±0.1 / ±0.05 / ±0.01mm</span></div>
            <div className="f-meta__row"><p>対応サイズ</p><span>最大寸法・板厚</span></div>
            <div className="f-meta__row"><p>保有設備・生産能力</p><span>設備名で検索</span></div>
          </section>
        </aside>

        {/* ==================== 検索結果 ==================== */}
        <div className="results">
          <Results
            initialTab={tab}
            companyCount={total}
            articleCount={articles.length}
            sort={sort}
            panelCompanies={panelCompanies}
            panelArticles={panelArticles}
          />
        </div>
      </div>

      {/* ==================== 比較バー ==================== */}
      <CompareBar items={cmpItems} />

      <Footer />
      <RevealOnParams />
    </>
  );
}
