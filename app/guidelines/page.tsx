import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "記事ガイドライン",
  description: "MONOTEに技術記事を投稿するときの書き方と、掲載できない内容の基準です。",
};

export default function GuidelinesPage() {
  return (
    <>
      <Header variant="plain" />
      <main id="main" tabIndex={-1} className="doc">
        <p className="doc__lead-label">MONOTE</p>
        <h1>記事ガイドライン</h1>
        <p className="doc__lead">
          MONOTEの記事は、読み物としての面白さよりも「発注の判断材料になるか」を基準にしています。
          自社の現場で実際に起きたことを、条件つきで書いていただくのがもっとも読まれます。
        </p>

        <section>
          <h2>1. 相談につながる記事の型</h2>
          <ul>
            <li><strong>加工事例</strong>：起きていた問題 → 現場で変えたこと → 結果。もっとも相談につながります。</li>
            <li><strong>設備・できることの紹介</strong>：写真1枚と対応範囲があれば書けます。</li>
            <li><strong>品質・検査の考え方</strong>：判断基準を示すと信頼につながります。</li>
            <li><strong>人・現場の話</strong>：採用に効きます。</li>
            <li><strong>技術のしくみの解説</strong>：検索に長く残ります。</li>
          </ul>
        </section>

        <section>
          <h2>2. 書き方の目安</h2>
          <ul>
            <li>タイトルは〈材質〉＋〈困りごと〉＋〈どうしたか〉の形で、25〜45文字を目安に。</li>
            <li>本文には、材質・板厚・ロット・精度・納期など、判断に使える数値を入れてください。</li>
            <li>写真は加工前後や治具など、条件が伝わるものを選んでください。</li>
            <li>記事には技術条件（材質・加工・ロット・精度など）を3つ以上つけてください。検索で見つかりやすくなります。</li>
          </ul>
        </section>

        <section>
          <h2>3. 掲載できない内容</h2>
          <ul>
            <li>取引先の社名・図面・仕様を、許諾なく特定できる形で掲載すること</li>
            <li>自社が対応できない条件を、対応できるかのように書くこと</li>
            <li>他社の技術・品質を根拠なく貶める表現</li>
            <li>他媒体の記事・画像の無断転載</li>
            <li>記事の体裁をとった、実質的な求人・広告のみの内容</li>
          </ul>
        </section>

        <section>
          <h2>4. 編集部レビュー</h2>
          <p>
            投稿時に「編集部のレビューを依頼する」を選ぶと、2営業日を目安に、誤字・専門用語の言い換え・見出し構成のみを調整してお戻しします。
            技術的な内容を編集部が書き換えることはありません。レビューを経た記事には「編集部レビュー済み」を表示します。
          </p>
        </section>

        <div className="doc__note">
          ガイドラインに反する記事は、確認のご連絡をしたうえで非公開にする場合があります。判断に迷う場合は、投稿前にお問い合わせください。
        </div>
        <p className="doc__updated">最終改定日：2026年8月9日</p>
        <div className="doc__cta">
          <Link className="btn btn--pill btn--dark" href="/signup">無料で企業登録する</Link>
          <Link className="btn btn--pill btn--outline" href="/policy">運営ポリシーを見る</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
