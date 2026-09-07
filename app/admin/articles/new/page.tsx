import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { allConditions, companyWorks } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { latestDraftOf, publishedArticlesOf } from "@/lib/extra/editor";
import AdminGate from "../../AdminGate";
import EditorClient from "./EditorClient";
import "@/css/admin-article.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事を書く",
  description: "MONOTE 企業管理。テーマの型に沿って記事を書き、検索条件をつけて公開できます。",
};

export default async function AdminArticleNewPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) return <AdminGate user={user} />;

  const sp = await searchParams;
  const fresh = sp.new === "1"; /* 「新しい記事を書く」= 下書きを引き継がない */

  const conditions = allConditions();
  /* 開くたびに下書き行を増やさないよう、直近の下書きがあればそれを読み込んで編集する */
  const draft = fresh ? null : latestDraftOf(user.company_id);
  /* エディタの「実績データ」「過去の記事から引用」で本文に挿し込める実データ */
  const works = companyWorks(user.company_id);
  const quotes = publishedArticlesOf(user.company_id);

  return (
    <>
      <Header variant="admin" adminActive="articles" />
      <EditorClient conditions={conditions} draft={draft} works={works} quotes={quotes} />
      <Footer />
    </>
  );
}
