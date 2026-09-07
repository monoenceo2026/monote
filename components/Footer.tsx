import Link from "next/link";
import { currentUser } from "@/lib/session";
import { logoutAction } from "@/app/actions";

export default async function Footer() {
  /* SPでは各ページのヘッダーが「戻る＋検索」等に置き換わり、
     アカウント導線がTOPのメニューにしか無くなる。フッターで補う。 */
  const user = await currentUser();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img className="site-footer__logo" width={50} height={62} loading="lazy" decoding="async" src="/assets/img/monoen-symbol-metal.webp" alt="モノエン" />

        <nav className="site-footer__account" aria-label="アカウント">
          {user ? (
            <>
              <Link href="/my/compare">マイページ（保存・比較）</Link>
              {user.company_id ? <Link href="/admin">企業管理</Link> : null}
              <form action={logoutAction}>
                <button type="submit">{user.name} 様（ログアウト）</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/my/compare">保存・比較</Link>
              <Link href="/login">ログイン</Link>
              <Link href="/signup">無料で企業登録</Link>
            </>
          )}
        </nav>

        <nav className="site-footer__nav">
          <Link href="/signup">企業の方へ</Link>
          <Link href="/policy">運営ポリシー</Link>
          <Link href="/guidelines">記事ガイドライン</Link>
          <Link href="/contact">お問い合わせ</Link>
        </nav>
        <p className="site-footer__brand">MONOTE</p>
        <p className="site-footer__copy">運営：株式会社モノエン</p>
      </div>
    </footer>
  );
}
