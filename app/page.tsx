import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroFx from "@/components/HeroFx";
import { latestArticles, siteStats } from "@/lib/repo";
import "@/css/top.css";

const CATS = [
  { img: "cat-kezuru", title: "削る・切る", sub: "試作したい／量産したい／コストを下げたい", q: "切削" },
  { img: "cat-mageru", title: "曲げる・つなぐ", sub: "板金／プレス／溶接", q: "板金" },
  { img: "cat-nagashikomu", title: "かたちを流し込む", sub: "鋳造／鍛造／樹脂成形", q: "鋳造", spHide: true },
  { img: "cat-hyomen", title: "表面を整える", sub: "表面処理／めっき／アルマイト／熱処理", q: "表面処理" },
  { img: "cat-kumitateru", title: "組み立てる", sub: "組立／量産／装置・機械", q: "組立" },
  { img: "cat-hakaru", title: "測る・確かめる", sub: "検査／品質管理／測定", q: "検査", spHide: true },
  { img: "cat-zairyo", title: "材料から探す", sub: "鉄／ステンレス／アルミ／樹脂／繊維", q: "ステンレス" },
  { img: "cat-mokuteki", title: "目的から探す", sub: "試作したい／量産したい／コストを下げたい", q: "試作" },
];

const CHIPS = ["小ロット・1個から", "試作対応", "短納期", "ISO9001", "ステンレス", "高精度±0.01mm", "関西エリア"];

export default function TopPage() {
  const articles = latestArticles(4);
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
        <section className="hero">
          <div className="hero__motion" aria-hidden="true">
            <svg className="hero-blob" viewBox="0 0 306 380" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#f7f7f7" />
                </linearGradient>
              </defs>
              <path fill="url(#blobGrad)" d="" />
            </svg>
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

        <section className="cats container" id="cats">
          <div className="cats__ttl reveal">
            <div className="sec-ttl">
              <h2>何を探すか決まっていない方へ</h2>
              <p className="note">やりたいことから選ぶ</p>
            </div>
            <p className="cats__note">かっこ内は業界での呼び方です</p>
          </div>
          <div className="cats__grid" data-stagger="0.07">
            {CATS.map((c) => (
              <Link key={c.title} className={`cat-card reveal${c.spHide ? " -sp-hide" : ""}`} href={`/search?q=${encodeURIComponent(c.q)}`}>
                <img src={`/assets/img/${c.img}.png`} alt="" />
                <h3>{c.title}</h3>
                <p>{c.sub}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="read container" id="read">
          <div className="read__ttl reveal">
            <div className="sec-ttl">
              <h2>読んで探す</h2>
              <p className="note">技術記事・現場の事例</p>
            </div>
            <Link className="btn btn--pill btn--ghost" href="/articles">記事一覧をすべて見る</Link>
          </div>
          <div className="read__grid" data-stagger="0.07">
            {articles.map((a) => (
              <Link key={a.id} className="article-card reveal" href={`/articles/${a.slug}`}>
                <div className="ph-thumb article-card__thumb"><span>記事サムネイル</span></div>
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
        </section>

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
