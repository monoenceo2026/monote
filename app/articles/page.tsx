import Link from "next/link";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { latestArticles, siteStats } from "@/lib/repo";
import "@/css/articles.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事を読む | MONOTE",
  description: "製造業の技術記事・現場の事例を最新順に読めます。",
};

const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).replaceAll("-", ".") : "");

export default async function ArticlesIndexPage() {
  const stats = siteStats();
  const articles = latestArticles(24);

  return (
    <>
      <Header variant="sub" savedKind="articles" />

      <main className="articles-main">
        <section className="articles-list container">
          <div className="articles-list__ttl reveal">
            <div className="sec-ttl">
              <h2>記事を読む</h2>
              <p className="note">技術記事・現場の事例 全{stats.articles}本</p>
            </div>
            <Link className="btn btn--pill btn--ghost" href="/search?tab=articles">条件で記事を絞り込む</Link>
          </div>

          <div className="articles-grid" data-stagger="0.05">
            {articles.map((a) => (
              <Link key={a.id} className="article-card reveal" href={`/articles/${a.slug}`}>
                <div className="ph-thumb article-card__thumb"><span>記事サムネイル</span></div>
                <div className="article-card__body">
                  <div className="article-card__tags">
                    {a.tag1 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag1}</span> : null}
                    {a.tag2 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag2}</span> : null}
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.company_name}・{fmtDate(a.published_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
