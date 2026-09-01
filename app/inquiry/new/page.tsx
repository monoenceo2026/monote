import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { companyById, compareList } from "@/lib/repo";
import { currentUser, sessionKey } from "@/lib/session";
import { inquiryWithRecipients, type SentInquiry } from "@/lib/extra/inquiry";
import InquiryClient, { type Recipient } from "./InquiryClient";
import BodyClass from "./BodyClass";
import RevealOnParams from "./RevealOnParams";
import "@/css/inquiry.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "相談フォーム" };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/* 受信企業デモ（株式会社○○製作所 = company id 1, user id 2） */
const DEMO_COMPANY_ID = 1;

function SentScreen({ sent }: { sent: SentInquiry }) {
  const n = sent.recipients.length;
  const hitsDemo = sent.recipients.some((r) => r.id === DEMO_COMPANY_ID);
  return (
    <main className="inquiry container-wide">
      <div className="steps">
        <ol className="steps__list">
          <li className="steps__pill is-done">1　相談の種類</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill is-done">2　条件を入力</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill is-done" aria-current="step">3　送信先の確認</li>
        </ol>
      </div>

      <section className="iq-done reveal">
        <span className="iq-done__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="1.6" /></svg>
        </span>
        <h1 className="iq-done__ttl">{n}社に相談を送信しました</h1>
        <p className="iq-done__desc">
          各社の返信はマイページの「相談の履歴」に集約されます。
          <br className="iq-done__br" />
          送信先：{sent.recipients.map((r) => r.name).join("／")}
        </p>
        <div className="iq-done__actions">
          <Link className="btn btn--box btn--dark" href="/my/compare">保存・比較へ</Link>
          <Link className="btn btn--box btn--outline" href="/search">検索へ戻る</Link>
        </div>
        {hitsDemo ? (
          <div className="iq-done__demo">
            <p className="iq-done__demo-ttl">受け取る側も見てみる（デモ）</p>
            <p>
              いま送信した相談は、株式会社○○製作所の受信箱に実際に届いています。
              <Link href="/login">ログイン画面</Link>で「製作所」アカウントに切り替えると、
              <Link href="/admin">企業管理</Link>の「相談の受信箱」でこの相談を確認できます。
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default async function InquiryNewPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  /* ?sent=<id> → 成功画面（同ルートで出し分け） */
  const sentParam = one(sp.sent);
  if (sentParam) {
    const sent = inquiryWithRecipients(parseInt(sentParam, 10));
    if (sent && sent.status === "sent") {
      return (
        <>
          <BodyClass className="page-inquiry" />
          <Header variant="plain" />
          <SentScreen sent={sent} />
          <Footer />
          <RevealOnParams />
        </>
      );
    }
  }

  const user = await currentUser();

  /* 送信先: ?companies=1,2,3 の実カード。指定なしは比較リストをデフォルトに */
  const companiesParam = one(sp.companies);
  let recipients: Recipient[];
  if (companiesParam) {
    const ids = [...new Set(companiesParam.split(",").map((s) => parseInt(s.trim(), 10)).filter((i) => Number.isFinite(i)))];
    recipients = ids
      .map((id) => companyById(id))
      .filter((c): c is NonNullable<ReturnType<typeof companyById>> => c != null)
      .map((c) => ({ id: c.id, name: c.name, response_days: c.response_days }));
  } else {
    const key = await sessionKey();
    recipients = compareList(key).map((c) => ({ id: c.id, name: c.name, response_days: c.response_days }));
  }

  /* ログイン中（田中様）は連絡先を自動プリフィル */
  const contact = user
    ? {
        company: user.role === "buyer" ? "株式会社△△" : user.name,
        name: user.name,
        email: user.email,
        phone: "",
      }
    : { company: "", name: "", email: "", phone: "" };

  return (
    <>
      <BodyClass className="page-inquiry" />
      <Header variant="plain" />
      <InquiryClient recipients={recipients} contact={contact} source={one(sp.source) || "search"} />
      <Footer />
      <RevealOnParams />
    </>
  );
}
