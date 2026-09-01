import { db } from "@/lib/db";
import { allConditions, searchCompanies } from "@/lib/repo";

/* ============================================================
   /admin (企業管理ダッシュボード) extra queries.
   dashboardStats() in lib/repo covers the numbers; these helpers
   add what the dashboard additionally needs.
   ============================================================ */

/**
 * 「順位」列: for each search term the company was found by, compute
 * "would this company rank where, if that search ran today?".
 * Term tokens (split on ×) are mapped to real condition labels;
 * matched conditions run through searchCompanies() (same ordering as
 * the real /search results). Tokens that match no condition fall back
 * to a text match over the company profile fields.
 */
export function termRankMap(companyId: number, terms: string[]): Map<string, string> {
  const conds = allConditions();
  const out = new Map<string, string>();
  for (const term of terms) {
    const tokens = term.split(/[×✕]/).map((s) => s.trim()).filter(Boolean);
    if (!tokens.length) { out.set(term, "—"); continue; }
    const condIds: number[] = [];
    const rest: string[] = [];
    for (const t of tokens) {
      const hit = conds.find((c) => c.label === t) ?? conds.find((c) => c.label.includes(t));
      if (hit) condIds.push(hit.id);
      else rest.push(t);
    }
    let ids: number[];
    if (condIds.length) {
      /* rank inside the real condition search (extra free words are treated as soft signal) */
      ids = searchCompanies({ conditionIds: condIds }).map((c) => c.id);
    } else {
      /* free-word search over profile text (OR across tokens) */
      const like = rest
        .map(() => "(c.name || c.description || c.specialty_process || c.specialty_process_sub || c.industries || c.equipment) LIKE ?")
        .join(" OR ");
      ids = (db()
        .prepare(`SELECT c.id FROM companies c WHERE ${like} ORDER BY c.verified DESC, c.updated_at DESC`)
        .all(...rest.map((t) => `%${t}%`)) as Array<{ id: number }>).map((r) => r.id);
    }
    const idx = ids.indexOf(companyId);
    out.set(term, idx >= 0 ? `${idx + 1}位 / ${ids.length}社` : ids.length ? `— / ${ids.length}社` : "—");
  }
  return out;
}

/** slug lookup for the よく読まれている記事 table links (dashboardStats returns ids only) */
export function articleSlugsOf(companyId: number): Map<number, string> {
  const rows = db().prepare("SELECT id, slug FROM articles WHERE company_id = ?").all(companyId) as Array<{ id: number; slug: string }>;
  return new Map(rows.map((r) => [r.id, r.slug]));
}

/** number of 実績 (works) — for the 会社情報の充足度 todo判定 */
export function worksCountOf(companyId: number): number {
  return (db().prepare("SELECT COUNT(*) n FROM works WHERE company_id = ?").get(companyId) as { n: number }).n;
}
