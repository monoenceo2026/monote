import { db } from "@/lib/db";

/* extra queries for /signup (W-09 企業登録 step2) — repo.ts is read-only for page agents */

/** 「直近1か月でN回検索されている」— events の impression を term LIKE で実カウント */
export function recentSearchCount(termLike: string): number {
  const row = db()
    .prepare(
      `SELECT COUNT(*) AS n FROM events
       WHERE type = 'impression' AND term LIKE ? AND created_at >= datetime('now','-30 days')`
    )
    .get(termLike) as { n: number };
  return row.n;
}

/** conditions を "category:label" → id で引けるようにする */
export function conditionIdByKey(): Map<string, number> {
  const rows = db().prepare("SELECT id, category, label FROM conditions").all() as Array<{
    id: number;
    category: string;
    label: string;
  }>;
  return new Map(rows.map((r) => [`${r.category}:${r.label}`, r.id]));
}

/** 新規登録時の company ユーザー作成（users への insert は repo に無い） */
export function createCompanyUser(email: string, name: string, companyId: number): number {
  return db()
    .prepare("INSERT INTO users (email, name, role, company_id) VALUES (?, ?, 'company', ?)")
    .run(email, name, companyId).lastInsertRowid as number;
}
