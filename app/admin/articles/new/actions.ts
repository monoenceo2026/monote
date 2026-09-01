"use server";

import { revalidatePath } from "next/cache";
import { currentUser } from "@/lib/session";
import { allConditions, companyById, saveArticle } from "@/lib/repo";
import { articleSlugById } from "@/lib/extra/editor";

export type EditorSectionInput = { heading: string; body: string };

export type EditorSavePayload = {
  id: number | null;
  status: "draft" | "review" | "published";
  theme: string;
  title: string;
  sections: EditorSectionInput[];
  conditionIds: number[];
};

export type EditorSaveResult =
  | { ok: true; id: number; slug: string; savedAt: string }
  | { ok: false; error: "auth" | "empty" };

/**
 * 下書き自動保存・社内確認・公開をひとつのアクションで扱う。
 * body は記事ページ(/articles/[slug])が読む { heading, paragraphs[] }[] の JSON に変換する。
 */
export async function saveArticleEditorAction(p: EditorSavePayload): Promise<EditorSaveResult> {
  const user = await currentUser();
  if (!user || user.role !== "company" || !user.company_id) return { ok: false, error: "auth" };

  const sections = (p.sections ?? [])
    .map((s) => ({
      heading: String(s.heading ?? "").replace(/\s+/g, " ").trim(),
      paragraphs: String(s.body ?? "")
        .split(/\n+/)
        .map((t) => t.trim())
        .filter(Boolean),
    }))
    .filter((s) => s.heading || s.paragraphs.length);

  const title = String(p.title ?? "").replace(/\s+/g, " ").trim();
  if (!title && !sections.length) return { ok: false, error: "empty" };

  const conditionIds = (p.conditionIds ?? []).filter((n) => Number.isFinite(n));
  const conds = allConditions().filter((c) => conditionIds.includes(c.id));
  const tag1 = conds.find((c) => c.category === "process")?.label ?? "";
  const tag2 = conds.find((c) => c.category === "material")?.label ?? "";
  const firstPara = sections[0]?.paragraphs[0] ?? "";
  const excerpt = firstPara.length > 80 ? `${firstPara.slice(0, 80)}…` : firstPara;

  const id = saveArticle({
    id: p.id ?? undefined,
    company_id: user.company_id,
    title: title || "（無題の下書き）",
    body: JSON.stringify(sections),
    theme: p.theme || "case",
    status: p.status,
    tag1,
    tag2,
    excerpt,
    conditionIds,
  });
  const slug = articleSlugById(id) ?? "";

  if (p.status === "published") {
    const company = companyById(user.company_id);
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath("/search");
    if (slug) revalidatePath(`/articles/${slug}`);
    if (company) revalidatePath(`/companies/${company.slug}`);
  }
  return { ok: true, id, slug, savedAt: new Date().toISOString() };
}
