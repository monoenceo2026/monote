import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img className="site-footer__logo" src="/assets/img/monoen-symbol-metal.png" alt="モノエン" />
        <nav className="site-footer__nav">
          <Link href="/signup">企業の方へ</Link>
          <a href="#">運営ポリシー</a>
          <a href="#">記事ガイドライン</a>
          <a href="#">お問い合わせ</a>
        </nav>
        <p className="site-footer__brand">MONOTE</p>
        <p className="site-footer__copy">運営：株式会社モノエン</p>
      </div>
    </footer>
  );
}
