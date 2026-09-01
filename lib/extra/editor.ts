import { db } from "@/lib/db";

/* extra queries for /admin/articles/new (W-07 記事投稿エディタ) */

/** slug of an article by id — the editor links to /articles/[slug] after publishing */
export function articleSlugById(id: number): string | null {
  const row = db().prepare("SELECT slug FROM articles WHERE id = ?").get(id) as { slug: string } | undefined;
  return row?.slug ?? null;
}
