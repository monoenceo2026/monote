import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "運営ポリシー",
  description: "MONOTEの掲載基準・技術情報の取り扱い・相談のやりとりに関する運営方針です。",
};

export default function PolicyPage() {
  return (
    <>
      <Header variant="plain" />
      <main id="main" tabIndex={-1} className="doc">
        <p className="doc__lead-label">MONOTE</p>
        <h1>運営ポリシー</h1>
        <p className="doc__lead">
          MONOTEは、製造業の技術情報が「選定・比較・相談」に使われる状態をつくるための情報プラットフォームです。
          掲載する情報の基準と、お預かりする情報の取り扱いを以下のとおり定めています。
        </p>

        <section>
          <h2>1. 掲載の基準</h2>
          <p>企業情報・技術記事は、次の条件を満たす場合に掲載します。</p>
          <ul>
            <li>実在する事業者が、自社の設備・体制で対応できる内容を記載していること</li>
            <li>加工方法・材質・ロット・精度・納期などの条件が、実際の対応範囲と一致していること</li>
            <li>他社の権利（著作権・商標・営業秘密）を侵害しないこと</li>
            <li>受注できない条件を「対応可」と表示していないこと</li>
          </ul>
          <p>
            掲載内容が事実と異なることが確認された場合、編集部から確認のご連絡をしたうえで、修正または掲載停止の対応をとることがあります。
          </p>
        </section>

        <section>
          <h2>2. 「確認済み」表示について</h2>
          <p>
            企業プロフィールに表示される「確認済み」は、編集部が事業実態と主要な対応条件を確認した企業に付与しています。
            確認は定期的に更新し、最終確認日を企業ページに表示します。認証・資格の有効性そのものを保証するものではありません。
          </p>
        </section>

        <section>
          <h2>3. 技術情報・図面の取り扱い</h2>
          <ul>
            <li>相談フォームで送信された条件・添付ファイルは、選択された送信先企業にのみ共有します。</li>
            <li>「社名を伏せて相談する」を選んだ場合、送信先には条件と添付のみが届き、社名・担当者名は返信を承諾した時点で開示されます。</li>
            <li>「添付図面を他社に転送しない」を選んだ場合、送信先企業からの第三者提供を禁じます。</li>
            <li>運営が相談内容を営業目的で二次利用することはありません。</li>
          </ul>
        </section>

        <section>
          <h2>4. 検索結果の表示順</h2>
          <p>
            検索結果は、入力された条件との一致度を最優先に並べます。同じ一致度の場合は、掲載情報の充実度（対応条件の記載、実績・写真、記事、返信の早さ）を加味します。
            広告出稿によって一致しない企業を上位に表示することはありません。優先表示枠を設ける場合は、その旨を明示します。
          </p>
        </section>

        <section>
          <h2>5. 禁止事項</h2>
          <ul>
            <li>虚偽・誇大な対応条件の掲載</li>
            <li>第三者になりすました企業登録・記事投稿</li>
            <li>相談機能を利用した、発注意思のない情報収集や営業行為</li>
            <li>自動化された手段による大量アクセス・情報の複製</li>
          </ul>
        </section>

        <section>
          <h2>6. 料金</h2>
          <p>
            企業登録・技術記事の投稿・検索・閲覧は無料です。優先表示やレコメンド配信、記事の企画・取材・執筆の運用代行は有料オプションとして提供します。
            有料機能を利用する場合は、事前に内容と料金をご案内します。
          </p>
        </section>

        <div className="doc__note">
          本ポリシーは、サービスの改善にあわせて改定することがあります。重要な変更がある場合は、サイト上でお知らせします。
        </div>
        <p className="doc__updated">最終改定日：2026年8月9日</p>
        <div className="doc__cta">
          <Link className="btn btn--pill btn--outline" href="/guidelines">記事ガイドラインを見る</Link>
          <Link className="btn btn--pill btn--outline" href="/contact">お問い合わせ</Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
