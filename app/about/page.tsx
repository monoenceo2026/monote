import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { siteStats } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "MONOTEとは",
  description: "MONOTEは、製造業の技術記事と企業情報を、加工方法・材質・ロット・精度・認証などの条件で横断検索できるプラットフォームです。",
};

export default function AboutPage() {
  const stats = siteStats();
  return (
    <>
      <Header variant="plain" />
      <main className="doc">
        <p className="doc__lead-label">ABOUT</p>
        <h1>技術情報が、選定・比較・相談に<br />使われる状態をつくる</h1>
        <p className="doc__lead">
          MONOTEは、製造業に特化した情報発信・企業検索プラットフォームです。
          記事の本数を増やすことではなく、技術情報が実際の発注判断に使われる状態をつくることを目的にしています。
          現在、掲載企業 {stats.companies}社・技術記事 {stats.articles}本を掲載しています。
        </p>

        <section>
          <h2>解こうとしている問題</h2>
          <ul>
            <li><strong>発信する企業</strong>：技術はあるが、記事の企画・執筆・継続運用の担当者がいない。公開しても成果が見えにくい。</li>
            <li><strong>探す企業・技術者</strong>：加工法・材質・ロット・精度などの条件で横断検索できず、比較に時間がかかる。</li>
            <li><strong>プラットフォーム</strong>：無料投稿だけでは原価が先行し、低品質な記事が増えると検索体験と信頼性が落ちる。</li>
          </ul>
        </section>

        <section>
          <h2>MONOTEの構造</h2>
          <p>
            一般的な投稿プラットフォームとの違いは、投稿機能そのものではなく「選定に使える構造」です。
            記事と企業プロフィールの両方に、企業選定で実際に使う条件を構造化して持たせています。
          </p>
          <ul>
            <li>業種・用途／加工・工程／材質／対応条件（ロット・精度・サイズ）</li>
            <li>設備・能力／認証・品質（ISO・検査・トレーサビリティ）</li>
            <li>地域・納期／課題・目的（試作・量産・改善・代替）</li>
          </ul>
          <p>
            検索結果は記事だけでなく、企業プロフィール・実績・相談導線へ直接つながります。
            保存・比較して、複数社へ同じ条件で一度に相談できます。
          </p>
        </section>

        <section>
          <h2>三者の価値</h2>
          <ul>
            <li><strong>投稿企業</strong>：発信が、営業・採用・信頼形成に使える資産になる。反応と相談行動が数字で見える。</li>
            <li><strong>探す人</strong>：自社の条件に合う企業・技術・知見へ早くたどり着ける。保存・比較・相談まで一続き。</li>
            <li><strong>モノエン</strong>：編集品質による信頼と、検索・閲覧データの蓄積を、再現性のある事業にする。</li>
          </ul>
        </section>

        <section>
          <h2>料金</h2>
          <p>
            企業登録・プロフィール公開・記事投稿・基本の検索掲載・閲覧反応の確認は無料です。
            狙った読者への到達を高める優先表示やレコメンド配信、発信を継続するための企画・取材・執筆の運用代行を有料で提供します。
          </p>
        </section>

        <div className="doc__cta">
          <Link className="btn btn--pill btn--dark" href="/signup">無料で企業登録</Link>
          <Link className="btn btn--pill btn--outline" href="/search">企業を探す</Link>
          <Link className="btn btn--pill btn--outline" href="/policy">運営ポリシー</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
