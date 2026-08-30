import Link from "next/link";
import { currentUser, sessionKey } from "@/lib/session";
import { savedCompanies, savedArticles, compareList } from "@/lib/repo";
import { logoutAction } from "@/app/actions";

export type HeaderVariant = "top" | "sub" | "admin" | "plain";

/**
 * Shared site header.
 * - top:   TOP page (gray bg, global nav)
 * - sub:   search / company / article / compare pages (search field + counts)
 * - admin: company admin pages (企業管理 nav)
 * - plain: focused flows (inquiry / signup)
 */
export default async function Header({
  variant = "sub",
  active = "",
  searchPlaceholder = "条件・キーワードで探す",
  searchQuery = "",
  savedKind = "companies",
  adminActive = "dashboard",
  plainNote,
  plainCta,
}: {
  variant?: HeaderVariant;
  active?: string;
  searchPlaceholder?: string;
  searchQuery?: string;
  savedKind?: "companies" | "articles";
  adminActive?: "dashboard" | "articles" | "profile" | "inbox";
  plainNote?: string;
  plainCta?: { label: string; href: string };
}) {
  const user = await currentUser();
  const key = await sessionKey();
  const nSavedCompanies = savedCompanies(key).length;
  const nSavedArticles = savedArticles(key).length;
  const nCompare = compareList(key).length;

  if (variant === "admin") {
    return (
      <header className="site-header">
        <div className="site-header__inner site-header__inner--admin">
          <Link className="brand" href="/">MONOTE</Link>
          <span className="admin-badge">企業管理</span>
          <nav className="admin-nav" aria-label="企業管理ナビゲーション">
            <Link href="/admin" className={adminActive === "dashboard" ? "is-active" : ""}>ダッシュボード</Link>
            <Link href="/admin/articles/new" className={adminActive === "articles" ? "is-active" : ""}>記事</Link>
            <Link href="/admin#company-info" className={adminActive === "profile" ? "is-active" : ""}>会社情報</Link>
            <Link href="/admin#inbox" className={adminActive === "inbox" ? "is-active" : ""}>相談の受信箱 <span data-inbox-count>2</span></Link>
          </nav>
          <div className="site-header__actions">
            <span className="admin-company-name">{user?.name ?? "株式会社○○製作所"}</span>
            {adminActive === "articles" ? (
              <button className="btn btn--box btn--outline" type="button">ヘルプ</button>
            ) : (
              <Link className="btn btn--box btn--dark" href="/admin/articles/new">記事を書く</Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  if (variant === "plain") {
    return (
      <header className="site-header">
        <div className="site-header__inner">
          <Link className="brand" href="/">MONOTE</Link>
          <div className="site-header__actions">
            {plainNote ? <span className="header-note">{plainNote}</span> : null}
            {plainCta ? <Link className="btn btn--box btn--outline" href={plainCta.href}>{plainCta.label}</Link> : null}
            {user ? (
              !plainCta ? (
                <>
                  <Link className="btn btn--box btn--outline" href="/my/compare">保存・比較</Link>
                  <form action={logoutAction}><button className="btn btn--box btn--outline" type="submit">{user.name} 様</button></form>
                </>
              ) : null
            ) : (
              <Link className="btn btn--pill btn--outline" href="/login">ログイン</Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  if (variant === "top") {
    return (
      <header className="site-header -bg">
        <div className="site-header__inner">
          <Link className="brand" href="/">MONOTE</Link>
          <nav className="site-header__nav" aria-label="グローバルナビゲーション">
            <Link href="/search" className={active === "search" ? "is-active" : ""}>企業を探す</Link>
            <Link href="/articles" className={active === "articles" ? "is-active" : ""}>記事を読む</Link>
            <Link href="/search?tab=articles">特集</Link>
            <a href="#stats">MONOTEとは</a>
          </nav>
          <div className="site-header__actions">
            {user ? (
              <>
                <Link className="btn btn--pill btn--white" href="/my/compare">マイページ</Link>
                <form action={logoutAction}><button className="btn btn--pill btn--white" type="submit">{user.name} 様</button></form>
              </>
            ) : (
              <>
                <Link className="btn btn--pill btn--white" href="/login">ログイン</Link>
                <Link className="btn btn--pill btn--dark" href="/signup">無料で企業登録</Link>
              </>
            )}
          </div>
          <button className="menu-btn" type="button" aria-label="メニュー" aria-expanded="false">
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>
    );
  }

  /* sub */
  const savedBtn = savedKind === "articles"
    ? { label: `保存した記事 ${nSavedArticles}`, href: "/my/compare#articles" }
    : { label: `保存した企業 ${nSavedCompanies}`, href: "/my/compare" };
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="brand" href="/">MONOTE</Link>
        <form className="site-header__search" action="/search" method="get" role="search">
          <input type="search" name="q" placeholder={searchPlaceholder} defaultValue={searchQuery} aria-label="検索" />
        </form>
        <div className="site-header__actions">
          <Link className="btn btn--box btn--outline" href={savedBtn.href}>{savedBtn.label}</Link>
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
  );
}
