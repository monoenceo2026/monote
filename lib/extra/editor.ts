import { db } from "@/lib/db";

/* extra queries for /admin/articles/new (W-07 記事投稿エディタ) */

/** slug of an article by id — the editor links to /articles/[slug] after publishing */
export function articleSlugById(id: number): string | null {
  const row = db().prepare("SELECT slug FROM articles WHERE id = ?").get(id) as { slug: string } | undefined;
  return row?.slug ?? null;
}

/** 記事本文（DB）の形 — /articles/[slug] が読むのと同じ JSON */
export type DraftSection = { heading: string; paragraphs: string[] };

export type EditorDraft = {
  id: number;
  title: string;
  theme: string;
  status: "draft" | "review" | "published";
  sections: Array<{ heading: string; body: string }>;
  conditionIds: number[];
  updatedAt: string;
};

/**
 * 直近の自分の下書き（draft / review）を1件返す。
 * エディタを開くたびに新規行を作らず、この下書きを引き継いで編集するために使う。
 */
export function latestDraftOf(companyId: number): EditorDraft | null {
  const row = db()
    .prepare(
      `SELECT id, title, theme, status, body, updated_at
         FROM articles
        WHERE company_id = ? AND status IN ('draft','review')
        ORDER BY datetime(updated_at) DESC, id DESC
        LIMIT 1`
    )
    .get(companyId) as
    | { id: number; title: string; theme: string; status: "draft" | "review"; body: string; updated_at: string }
    | undefined;
  if (!row) return null;

  let parsed: DraftSection[] = [];
  try {
    const j = JSON.parse(row.body || "[]");
    if (Array.isArray(j)) parsed = j as DraftSection[];
  } catch {
    parsed = [];
  }
  const sections = parsed.map((s) => ({
    heading: String(s?.heading ?? ""),
    body: Array.isArray(s?.paragraphs) ? s.paragraphs.join("\n\n") : "",
  }));

  const conditionIds = (
    db().prepare("SELECT condition_id FROM article_conditions WHERE article_id = ?").all(row.id) as Array<{
      condition_id: number;
    }>
  ).map((r) => r.condition_id);

  return {
    id: row.id,
    title: row.title === "（無題の下書き）" ? "" : row.title,
    theme: row.theme,
    status: row.status,
    sections: sections.length ? sections : [{ heading: "", body: "" }],
    conditionIds,
    updatedAt: row.updated_at,
  };
}

/** 「過去の記事から引用」用：自社の公開記事の見出しと書き出し */
export type QuoteSource = { id: number; title: string; excerpt: string };

export function publishedArticlesOf(companyId: number, limit = 6): QuoteSource[] {
  const rows = db()
    .prepare(
      `SELECT id, title, excerpt, body FROM articles
        WHERE company_id = ? AND status = 'published'
        ORDER BY COALESCE(published_at, updated_at) DESC LIMIT ?`
    )
    .all(companyId, limit) as Array<{ id: number; title: string; excerpt: string; body: string }>;
  return rows.map((r) => {
    let excerpt = (r.excerpt ?? "").trim();
    if (!excerpt) {
      try {
        const j = JSON.parse(r.body || "[]");
        excerpt = Array.isArray(j) ? String(j[0]?.paragraphs?.[0] ?? "") : "";
      } catch {
        excerpt = "";
      }
    }
    return { id: r.id, title: r.title, excerpt: excerpt.slice(0, 120) };
  });
}
