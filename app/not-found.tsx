import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "ページが見つかりません" };

export default function NotFound() {
  return (
    <>
      <Header variant="plain" />
      <main id="main" tabIndex={-1} className="sys-page">
        <p className="sys-page__code-lg">404</p>
        <h1 className="sys-page__title">お探しのページは見つかりませんでした</h1>
        <p className="sys-page__lead">
          URLが変更されたか、公開が終了した可能性があります。
          <br />
          条件から企業を探すか、技術記事から探してみてください。
        </p>
        <div className="sys-page__actions">
          <Link className="btn btn--pill btn--dark" href="/search">企業を探す</Link>
          <Link className="btn btn--pill btn--outline" href="/articles">記事を読む</Link>
          <Link className="btn btn--pill btn--outline" href="/">トップへ戻る</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
