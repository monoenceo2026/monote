import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroFx from "@/components/HeroFx";
import { featuredArticles, siteStats } from "@/lib/repo";
import "@/css/top.css";

export const dynamic = "force-dynamic";

/* organic blob traced in the Figma design (2432:559) — the Monoen symbol silhouette */
const BLOB_PATH =
  "M512.094 386.906C470.434 292.062 560.644 218.519 523.701 124.893C423.368 -98.228 38.9403 -4.07296 71.5899 262.391C85.9006 379.276 -72.418 486.837 41.4844 599.219C38.0393 595.88 25.2126 580.197 20.9194 575.11C73.0209 666.669 223.919 718.065 300.455 609.922C396.813 520.217 575.114 593.496 512.094 386.906Z";

const CAROUSEL = [
  { img: "carousel-kezuru", title: "削る・切る", sub: "試作したい／量産したい／コストを下げたい", q: "切削", subW: 164 },
  { img: "carousel-mageru", title: "曲げる・つなぐ", sub: "板金／プレス／溶接", q: "板金" },
  { img: "carousel-nagashikomu", title: "かたちを流し込む", sub: "鋳造／鍛造／樹脂成形", q: "鋳造" },
  { img: "carousel-hyomen", title: "表面を整える", sub: "表面処理／めっき／アルマイト／熱処理", q: "表面処理", subW: 129 },
  { img: "cat-kumitateru", title: "組み立てる", sub: "組立／量産／装置・機械", q: "組立" },
  { img: "cat-hakaru", title: "測る・確かめる", sub: "検査／品質管理／測定", q: "検査" },
  { img: "cat-zairyo", title: "材料から探す", sub: "鉄／ステンレス／アルミ／樹脂／繊維", q: "ステンレス" },
  { img: "cat-mokuteki", title: "目的から探す", sub: "試作したい／量産したい／コストを下げたい", q: "試作", subW: 164 },
];

const CHIPS = ["小ロット・1個から", "試作対応", "短納期", "ISO9001", "ステンレス", "高精度±0.01mm", "関西エリア"];

export default function TopPage() {
  const articles = featuredArticles(4);
  const stats = siteStats();

  return (
    <>
      <Header variant="top" active="search" />

      <div className="sp-menu" hidden>
        <nav>
          <Link href="/search">企業を探す</Link>
          <Link href="/articles">記事を読む</Link>
          <Link href="/search?tab=articles">特集</Link>
          <a href="#stats">MONOTEとは</a>
          <Link className="btn btn--pill btn--dark btn--block" href="/signup">無料で企業登録</Link>
        </nav>
      </div>

      <main>
        {/* ==================== FV / hero ==================== */}
        <section className="hero">
          <div className="hero__motion" aria-hidden="true">
            <img className="hero-metal hero-metal--tl" src="/assets/img/monoen-symbol-metal.png" alt="" />
            <img className="hero-metal hero-metal--r" src="/assets/img/monoen-symbol-metal.png" alt="" />
          </div>

          <div className="hero__body">
            <h1 className="hero__title">
              <span className="hero__title-line"><span>つくりたいものから、<br className="sp-br" />つくれる会社を探す。</span></span>
            </h1>
            <p className="hero__lead">加工方法・材質・ロット・精度・認証などの条件で、製造業の技術記事と企業情報をまとめて検索できます。</p>

            <form className="hero__search" action="/search" method="get" role="search">
              <input className="hero__search-input" type="search" name="q" placeholder="例：SUS304の薄板を、小ロット・短納期で加工したい" aria-label="条件・キーワードで検索" />
              <button className="hero__search-btn" type="submit">検索</button>
            </form>

            <div className="hero__tags">
              <p className="hero__tags-label">よく使われる条件</p>
              <div className="hero__tags-list">
                {CHIPS.map((c) => (
                  <Link key={c} className="chip" href={`/search?q=${encodeURIComponent(c)}`}>{c}</Link>
                ))}
              </div>
            </div>
          </div>

          <div className="hero__logos" aria-label="掲載企業">
            <div className="hero__logos-track">
              {Array.from({ length: 8 }).map((_, i) => (
                <img key={i} src="/assets/img/logoipsum.png" alt={i === 0 ? "掲載企業ロゴ" : ""} />
              ))}
            </div>
          </div>
        </section>

        {/* ==================== やりたいことから選ぶ ==================== */}
        <section className="pick" id="cats">
          <img className="pick__bgwide" src="/assets/img/blob-bg-wide.svg" alt="" aria-hidden="true" />
          <svg className="pick__blob" viewBox="0 0 532.804 670.756" aria-hidden="true">
            <path className="pick__blob-path" fill="#181c1f" d={BLOB_PATH} />
          </svg>

          <div className="pick__head reveal">
            <p className="pick__label">何を探すか決まっていない方へ</p>
            <h2 className="pick__title">やりたいことから選ぶ</h2>
            <p className="pick__sub">目的から選ぶことで、あなたに合った<br />加工方法や企業が見つかります。</p>
          </div>

          <div className="pick__carousel" data-carousel>
            <div className="pick__track">
              {CAROUSEL.map((c) => (
                <Link key={c.title} className="pick-card" href={`/search?q=${encodeURIComponent(c.q)}`} draggable={false}>
                  <img src={`/assets/img/${c.img}.png`} alt="" draggable={false} />
                  <h3>{c.title}</h3>
                  <p style={c.subW ? { width: c.subW } : undefined}>{c.sub}</p>
                  <span className="pick-card__arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none"><path d="M4 12h15M13 5.5 19.5 12 13 18.5" stroke="#181c1f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== 読んで探す ==================== */}
        <section className="read2" id="read">
          <svg className="read2__blob" viewBox="0 0 532.804 670.756" aria-hidden="true">
            <path fill="#efefef" d={BLOB_PATH} />
          </svg>

          <div className="read2__head reveal">
            <p className="read2__label">技術記事・現場の事例</p>
            <h2 className="read2__title">読んで探す</h2>
            <p className="read2__sub">技術や事例を読むことで、課題解決のヒントや<br />新しい発見が見つかります。</p>
          </div>

          <div className="read2__grid container" data-stagger="0.07">
            {articles.map((a) => (
              <Link key={a.id} className="article-card reveal" href={`/articles/${a.slug}`}>
                {a.thumb ? (
                  <img className="article-card__photo" src={a.thumb} alt="" />
                ) : (
                  <div className="ph-thumb article-card__thumb"><span>記事サムネイル</span></div>
                )}
                <div className="article-card__body">
                  <div className="article-card__tags">
                    {a.tag1 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag1}</span> : null}
                    {a.tag2 ? <span className="tag" style={{ fontWeight: 400 }}>{a.tag2}</span> : null}
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.company_name}・{(a.published_at ?? "").slice(0, 10).replaceAll("-", ".")}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="read2__more reveal">
            <Link className="read2__more-btn" href="/articles">記事一覧をすべて見る</Link>
          </div>
        </section>

        {/* ==================== stats ==================== */}
        <section className="stats container reveal" id="stats">
          <p><strong>掲載企業 {stats.companies}社</strong>　/　技術記事 {stats.articles}本　/　最終更新 {stats.lastUpdated}</p>
          <p>検索・閲覧に会員登録は不要です。企業登録・記事投稿も無料。</p>
        </section>
      </main>

      <Footer />

      <div className="sp-cta">
        <Link className="btn btn--pill btn--dark btn--block btn--lg" href="/signup">無料で企業登録</Link>
      </div>

      <HeroFx />
    </>
  );
}
