import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { allConditions } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import EditorClient from "./EditorClient";
import "@/css/admin-article.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "記事を書く",
  description: "MONOTE 企業管理。テーマの型に沿って記事を書き、検索条件をつけて公開できます。",
};

export default async function AdminArticleNewPage() {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) redirect("/login");

  const conditions = allConditions();

  return (
    <>
      <Header variant="admin" adminActive="articles" />
      <EditorClient conditions={conditions} />
      <Footer />
    </>
  );
}
