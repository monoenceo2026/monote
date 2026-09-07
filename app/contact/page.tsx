import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "お問い合わせ",
  description: "MONOTEの掲載・記事投稿・不具合のご連絡先です。",
};

export default function ContactPage() {
  return (
    <>
      <Header variant="plain" />
      <main id="main" tabIndex={-1} className="doc">
        <p className="doc__lead-label">MONOTE</p>
        <h1>お問い合わせ</h1>
        <p className="doc__lead">
          用件によって窓口が分かれています。企業への見積・技術相談は、各企業ページの「相談・見積を依頼」からお送りください。
          運営への連絡は下記の宛先へお願いします。
        </p>

        <section>
          <h2>企業への相談・見積依頼</h2>
          <p>
            条件を入力して複数社へ同時に送れます。図面がなくても、材質・数量・希望納期だけで送信できます。
            会員登録は不要で、費用もかかりません。
          </p>
          <div className="doc__cta">
            <Link className="btn btn--pill btn--dark" href="/search">企業を探して相談する</Link>
          </div>
        </section>

        <section>
          <h2>掲載・記事投稿について</h2>
          <p>
            企業登録と記事投稿は無料で、その場で開始できます。取材・執筆の代行や優先表示などの有料オプションについてのご相談も、下記の宛先で承ります。
          </p>
          <div className="doc__cta">
            <Link className="btn btn--pill btn--outline" href="/signup">無料で企業登録</Link>
            <Link className="btn btn--pill btn--outline" href="/guidelines">記事ガイドライン</Link>
          </div>
        </section>

        <section>
          <h2>運営への連絡先</h2>
          <ul>
            <li>掲載内容の修正・削除のご依頼</li>
            <li>掲載情報が事実と異なる場合のご報告</li>
            <li>不具合・表示崩れのご連絡</li>
            <li>取材・広報に関するお問い合わせ</li>
          </ul>
          <p>
            運営：株式会社モノエン<br />
            メール：<a href="mailto:contact@monoen.co.jp">contact@monoen.co.jp</a><br />
            受付時間：平日 9:00〜17:30（土日祝・年末年始を除く）
          </p>
          <div className="doc__note">
            返信は3営業日以内を目安にお送りします。掲載企業への見積依頼をこの宛先にいただいた場合、企業へは自動で転送されません。
            お手数ですが、企業ページの相談フォームからお送りください。
          </div>
        </section>

        <p className="doc__updated">最終更新日：2026年8月9日</p>
      </main>
      <Footer />
    </>
  );
}
