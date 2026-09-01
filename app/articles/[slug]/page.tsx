import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  articleBySlug,
  companiesMatchingConditions,
  companyById,
  conditionsOfArticle,
  conditionsOfCompany,
  recordEvent,
  savedIds,
  searchCompanies,
} from "@/lib/repo";
import { sessionKey } from "@/lib/session";
import { BodyClass, SaveArticleButton, ShareButton, Toc } from "./parts";
import "@/css/article.css";

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

type Section = { heading: string; paragraphs: string[] };

const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).replaceAll("-", ".") : "");
const fmtNum = (n: number) => n.toLocaleString("en-US");

function parseSections(body: string): Section[] {
  try {
    const parsed = JSON.parse(body);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (s): s is Section => s && typeof s.heading === "string" && Array.isArray(s.paragraphs)
      );
    }
  } catch {
    /* body が JSON でない記事はセクション無しで表示 */
  }
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return { title: "記事が見つかりません | MONOTE" };
  return { title: `${article.title} | MONOTE`, description: article.excerpt };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article || article.status !== "published") notFound();

  const company = companyById(article.company_id);
  if (!company) notFound();

  const path = `/articles/${article.slug}`;
  const sections = parseSections(article.body);

  /* 記事の技術条件（Figma と同じく 材質→加工→… のカテゴリ順） */
  const conds = conditionsOfArticle(article.id).sort(
    (a, b) => CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category) || a.id - b.id
  );
  const condIds = conds.map((c) => c.id);
  const condQuery = condIds.join(",");

  /* パンくず: 記事を読む ＞ 加工条件 ＞ 材質条件（無ければ tag1/tag2） */
  const crumbProcess = conds.find((c) => c.category === "process");
  const crumbMaterial = conds.find((c) => c.category === "material");

  /* 著者会社の情報 */
  const companyConds = conditionsOfCompany(company.id);
  const cert =
    companyConds.find((c) => c.category === "cert")?.label ??
    (company.specialty_quality.split("／")[0] || "");
  const lotRange = `${fmtNum(company.lot_min)}個〜${fmtNum(company.lot_max)}個`;
  const areaShort = company.area.split("／")[0] || company.area;

  /* サイドバー: 同じ条件に対応できる企業（著者を除く上位3社）＋ 実検索の件数 */
  const matches = condIds.length
    ? companiesMatchingConditions(condIds, 4).filter((c) => c.id !== company.id).slice(0, 3)
    : [];
  const searchCount = condIds.length ? searchCompanies({ conditionIds: condIds }).length : 0;

  /* 保存状態・閲覧イベント */
  const key = await sessionKey();
  const saved = savedIds(key, "article").includes(article.id);
  recordEvent("article_view", article.company_id, article.id);

  const tocItems = sections.map((s, i) => ({ id: `sec-${i + 1}`, label: s.heading }));
  const inquiryHref = `/inquiry/new?companies=${company.id}&source=article`;

  return (
    <>
      <BodyClass className="page-article" />
      <Header variant="sub" savedKind="articles" />

      <div className="crumb-bar">
        <nav className="container-wide crumb-bar__inner" aria-label="パンくず">
          <Link href="/articles">記事を読む</Link>
          <span className="crumb-bar__sep" aria-hidden="true">＞</span>
          {crumbProcess ? (
            <Link href={`/search?cond=${crumbProcess.id}`}>{crumbProcess.label}</Link>
          ) : (
            <Link href={`/search?q=${encodeURIComponent(article.tag1)}`}>{article.tag1}</Link>
          )}
          <span className="crumb-bar__sep" aria-hidden="true">＞</span>
          <span aria-current="page">{crumbMaterial?.label ?? article.tag2}</span>
        </nav>
      </div>

      <main>
        <div className="article-layout container-wide">

          <article className="article-main">
            <div className="article-tags">
              {article.tag1 ? (
                <Link className="a-chip" href={`/search?q=${encodeURIComponent(article.tag1)}`}>{article.tag1}</Link>
              ) : null}
              {article.tag2 ? (
                <Link className="a-chip" href={`/search?q=${encodeURIComponent(article.tag2)}`}>{article.tag2}</Link>
              ) : null}
            </div>

            <h1 className="article-title">{article.title}</h1>

            <section className="author-card" aria-label="執筆企業">
              <div className="ph-thumb author-card__logo" aria-hidden="true"></div>
              <div className="author-card__txt">
                <div className="author-card__row">
                  <p className="author-card__name">{company.name}</p>
                  {company.verified ? <span className="tag tag--blue">確認済み</span> : null}
                  {cert ? <span className="tag">{cert}</span> : null}
                </div>
                <p className="author-card__sub">
                  {company.prefecture}{company.city}・{company.specialty_process}・{lotRange}
                </p>
              </div>
              <div className="author-card__actions">
                <Link className="btn btn--box btn--outline-thin btn--sm" href={`/companies/${company.slug}`}>会社を見る</Link>
                <Link className="btn btn--pill btn--dark btn--sm" href={inquiryHref}>相談する</Link>
              </div>
            </section>

            <div className="article-meta">
              <div className="article-meta__info">
                <span>公開 {fmtDate(article.published_at)}</span>
                <span>更新 {fmtDate(article.updated_at)}</span>
                <span>読了 約{article.read_minutes}分</span>
                {article.reviewed ? <span className="tag">編集部レビュー済み</span> : null}
              </div>
              <div className="article-meta__actions">
                <SaveArticleButton articleId={article.id} initialSaved={saved} path={path} />
                <ShareButton />
              </div>
            </div>

            <div className="ph-thumb article-hero"><span>記事ヘッダー画像（任意・なくても投稿可）</span></div>

            <p className="article-lead">{article.excerpt}</p>

            {sections.map((sec, i) => (
              <section key={i} className="article-sec reveal" id={`sec-${i + 1}`}>
                <h2 className="article-sec__ttl">
                  <span className="num">{i + 1}.</span>
                  <span>{sec.heading}</span>
                </h2>
                <div className="article-sec__body">
                  {sec.paragraphs.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
                {i === 0 ? (
                  <div className="ph-thumb article-fig"><span>作業風景・図解</span></div>
                ) : null}
              </section>
            ))}

            {conds.length ? (
              <section className="tech-cond reveal" aria-label="この記事の技術条件">
                <div className="tech-cond__head">
                  <p className="tech-cond__ttl">この記事の技術条件</p>
                  <p className="tech-cond__note">クリックすると同じ条件で企業を検索します</p>
                </div>
                <div className="tech-cond__chips">
                  {conds.map((c) => (
                    <Link key={c.id} className="chip chip--check" href={`/search?cond=${c.id}`}>
                      {CAT_LABEL[c.category] ?? c.category}：{c.label}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="article-cta reveal" aria-label="この記事を書いた企業に相談する">
              <div className="ph-thumb article-cta__logo" aria-hidden="true"></div>
              <div className="article-cta__txt">
                <div className="article-cta__row">
                  <p className="article-cta__ttl">この記事を書いた {company.name} に相談する</p>
                  {company.verified ? <span className="tag tag--blue">確認済み</span> : null}
                </div>
                <p className="article-cta__sub">
                  ロット <strong>{lotRange}</strong>
                  {company.delivery_min ? <>　最短納期 <strong>{company.delivery_min}日</strong></> : null}
                  {company.response_days ? <>　返信平均 <strong>{company.response_days}営業日</strong></> : null}
                </p>
              </div>
              <div className="article-cta__actions">
                <Link className="btn btn--pill btn--dark article-cta__btn" href={inquiryHref}>相談・見積を依頼する</Link>
                <Link className="btn btn--box btn--outline-thin article-cta__btn" href={`/companies/${company.slug}`}>企業ページを見る</Link>
              </div>
            </section>
          </article>

          <aside className="article-side">
            <div className="article-side__sticky" data-stagger="0.08">
              {tocItems.length ? (
                <nav className="side-card reveal" aria-label="目次">
                  <p className="side-card__ttl">目次</p>
                  <Toc items={tocItems} />
                </nav>
              ) : null}

              <div className="side-card reveal">
                <p className="side-card__ttl">この会社に相談する</p>
                <div className="consult-btns">
                  <Link className="btn btn--pill btn--dark btn--lg btn--block" href={inquiryHref}>相談・見積を依頼</Link>
                  <Link className="btn btn--box btn--outline-thin btn--lg btn--block consult-btns__ghost" href={`${inquiryHref}&anonymous=1`}>社名を伏せて聞く</Link>
                </div>
                <hr className="side-card__line" />
                <dl className="spec-list">
                  <div><dt>対応ロット</dt><dd>{fmtNum(company.lot_min)}〜{fmtNum(company.lot_max)}個</dd></div>
                  <div><dt>加工精度</dt><dd>{company.precision_mm != null ? `±${company.precision_mm}mm` : "応相談"}</dd></div>
                  <div><dt>認証</dt><dd>{cert || "—"}</dd></div>
                  <div><dt>エリア</dt><dd>{areaShort}</dd></div>
                </dl>
              </div>

              {matches.length ? (
                <div className="side-card reveal">
                  <p className="side-card__ttl">同じ条件に対応できる企業</p>
                  <ul className="match-list">
                    {matches.map((m) => (
                      <li key={m.id}>
                        <Link href={`/companies/${m.slug}`}>{m.name}　一致 {m.overlap}/{m.total}</Link>
                      </li>
                    ))}
                  </ul>
                  <Link className="btn btn--box btn--outline-thin btn--block match-btn" href={`/search?cond=${condQuery}`}>
                    {searchCount}社すべてを見る
                  </Link>
                </div>
              ) : null}
            </div>
          </aside>

        </div>
      </main>

      <Footer />
    </>
  );
}
