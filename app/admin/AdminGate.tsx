import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { loginAction } from "@/app/actions";
import type { SessionUser } from "@/lib/session";
import "@/css/admin-dashboard.css";

/**
 * /admin 配下は企業アカウント専用。
 * 権限が無いときに黙って /login へ飛ばすと「ログイン済みなのにログイン画面」に見えるので、
 * 理由と次にやることを説明する画面を出す（発注側アカウントのままでもここに留まる）。
 */
export default function AdminGate({ user }: { user: SessionUser | null }) {
  const isBuyer = user?.role === "buyer";
  return (
    <div className="page-admin-dashboard">
      <Header variant="plain" />
      <main id="main" tabIndex={-1} className="admin-main container-wide">
        <section className="admin-gate">
          <p className="admin-gate__eyebrow">企業管理</p>
          <h1 className="admin-gate__ttl">この画面は企業アカウント専用です</h1>
          <p className="admin-gate__lead">
            企業管理ダッシュボード（成果の集計・相談の受信箱・記事の投稿）は、MONOTE に掲載している企業のアカウントでご利用いただけます。
            {isBuyer
              ? `いまは ${user?.name} 様（探す側・発注担当）のアカウントでログイン中です。`
              : "ログインすると利用できます。"}
          </p>

          <div className="admin-gate__actions">
            <form action={loginAction}>
              <input type="hidden" name="userId" value="2" />
              <button className="btn btn--box btn--dark" type="submit">
                企業アカウント（○○製作所）に切り替える
              </button>
            </form>
            <Link className="btn btn--box btn--outline-thin" href="/login">
              ログイン画面へ
            </Link>
            <Link className="btn btn--box btn--outline-thin" href="/signup">
              無料で企業登録
            </Link>
          </div>
          <p className="admin-gate__note">
            ※ β版のデモ環境のため、ログイン画面のデモアカウントをそのまま切り替えられます。
          </p>

          {isBuyer ? (
            <div className="admin-gate__box">
              <h2 className="admin-gate__box-ttl">探す側のアカウントでできること</h2>
              <ul className="admin-gate__list">
                <li><Link href="/search">条件から企業を探す</Link></li>
                <li><Link href="/my/compare">保存した企業・記事／比較リスト</Link></li>
                <li><Link href="/inquiry/new">相談・見積を送る</Link></li>
              </ul>
            </div>
          ) : null}
        </section>
      </main>
      <Footer />
    </div>
  );
}
