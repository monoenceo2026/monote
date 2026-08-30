import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { loginAction } from "@/app/actions";
import { currentUser } from "@/lib/session";
import "@/css/login.css";

export const metadata = { title: "ログイン" };

export default async function LoginPage() {
  const user = await currentUser();

  return (
    <>
      <Header variant="plain" />
      <main className="login container-wide">
        <h1 className="login__title">ログイン</h1>
        <p className="login__lead">
          β版のデモ環境です。デモアカウントを選んでログインすると、保存・比較・相談・企業管理まで一通り試せます。
          {user ? `（現在：${user.name} 様でログイン中）` : ""}
        </p>
        <div className="login__cards">
          <form action={loginAction} className="login-card">
            <input type="hidden" name="userId" value="1" />
            <p className="login-card__role">探す側（発注担当）</p>
            <p className="login-card__name">田中 様</p>
            <p className="login-card__desc">
              株式会社△△の設計担当。保存した企業・記事、比較リスト、相談の送信を試せます。
            </p>
            <button className="btn btn--pill btn--dark btn--block" type="submit">田中 様でログイン</button>
          </form>
          <form action={loginAction} className="login-card">
            <input type="hidden" name="userId" value="2" />
            <p className="login-card__role">つくる側（掲載企業）</p>
            <p className="login-card__name">株式会社○○製作所</p>
            <p className="login-card__desc">
              掲載企業の管理者。ダッシュボード・相談の受信箱・記事の投稿を試せます。
            </p>
            <button className="btn btn--pill btn--dark btn--block" type="submit">製作所でログイン</button>
          </form>
        </div>
        <p className="login__note">
          アカウントをお持ちでない企業の方は <Link href="/signup">無料で企業登録</Link> へ。
        </p>
      </main>
      <Footer />
    </>
  );
}
