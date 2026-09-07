import Link from "next/link";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <img className="site-footer__logo" width={50} height={62} loading="lazy" decoding="async" src="/assets/img/monoen-symbol-metal.webp" alt="モノエン" />
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
