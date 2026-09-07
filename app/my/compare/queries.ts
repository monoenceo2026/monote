import { db } from "@/lib/db";

/* /my/compare 用の追加クエリ（lib/repo.ts は読み取り専用のため、ページ配下に置く） */

/**
 * このセッションの直近の検索条件。
 * /search は結果表示時に `recordImpressions(ids, 条件ラベルを×で連結 または キーワード, sessionKey)` を
 * 記録しているので、その最新の term を「比較の基準にしている検索条件」として使う。
 */
export function lastSearchTerm(sessionKey: string): string {
  if (!sessionKey) return "";
  const row = db()
    .prepare(
      `SELECT term FROM events
       WHERE session_id = ? AND term != '' AND type = 'impression'
       ORDER BY created_at DESC, id DESC LIMIT 1`
    )
    .get(sessionKey) as { term: string } | undefined;
  return row?.term ?? "";
}
