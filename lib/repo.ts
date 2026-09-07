import { db } from "./db";

/* ============================================================
   MONOTE repository layer — all pages read/write through here.
   Page agents: treat this file as READ-ONLY. If you need an
   extra query, add it in lib/extra/<page>.ts instead.
   ============================================================ */

export type Company = {
  id: number; slug: string; name: string; verified: number;
  prefecture: string; city: string; employees: string; founded: number | null;
  description: string;
  specialty_process: string; specialty_process_sub: string;
  specialty_lot: string; specialty_lot_sub: string;
  specialty_quality: string; specialty_quality_sub: string;
  lot_min: number; lot_max: number; precision_mm: number | null;
  delivery_min: number | null; delivery_max: number | null;
  size_note: string; equipment: string; capacity: string; industries: string;
  area: string; price_hint: string; contact_hours: string; hard_conditions: string;
  response_days: number | null; trade_terms: string; address: string;
  completeness: number; profile_confirmed_at: string | null;
  created_at: string; updated_at: string;
};

export type Article = {
  id: number; slug: string; company_id: number; title: string; excerpt: string;
  body: string; theme: string; status: string; reviewed: number; read_minutes: number;
  tag1: string; tag2: string; thumb: string; published_at: string | null; created_at: string; updated_at: string;
  company_name?: string; company_slug?: string;
};

export type Condition = { id: number; category: string; label: string };

/* ---------------- conditions ---------------- */

export function allConditions(): Condition[] {
  return db().prepare("SELECT id, category, label FROM conditions ORDER BY id").all() as Condition[];
}

export function conditionsOfCompany(companyId: number): Condition[] {
  return db().prepare(
    `SELECT c.id, c.category, c.label FROM conditions c
     JOIN company_conditions cc ON cc.condition_id = c.id WHERE cc.company_id = ? ORDER BY c.id`
  ).all(companyId) as Condition[];
}

export function conditionsOfArticle(articleId: number): Condition[] {
  return db().prepare(
    `SELECT c.id, c.category, c.label FROM conditions c
     JOIN article_conditions ac ON ac.condition_id = c.id WHERE ac.article_id = ? ORDER BY c.id`
  ).all(articleId) as Condition[];
}

/* ---------------- search ---------------- */

export type SearchFilters = {
  q?: string;
  conditionIds?: number[];  // AND across categories, OR within a category
  sort?: "match" | "updated";
};

/** 記事タブ用: 条件 OR キーワードのいずれかに当たる公開記事（関連度順） */
export function searchArticlesRelated(opts: { terms?: string[]; conditionIds?: number[] }): Article[] {
  const terms = (opts.terms ?? []).map((t) => t.trim()).filter(Boolean);
  const condIds = opts.conditionIds ?? [];
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (condIds.length) {
    clauses.push(`EXISTS (SELECT 1 FROM article_conditions ac WHERE ac.article_id = t.id AND ac.condition_id IN (${condIds.map(() => "?").join(",")}))`);
    params.push(...condIds);
  }
  for (const term of terms) {
    const like = `%${term}%`;
    clauses.push("(t.title LIKE ? OR t.excerpt LIKE ? OR t.tag1 LIKE ? OR t.tag2 LIKE ?)");
    params.push(like, like, like, like);
  }

  const where = clauses.length ? `t.status='published' AND (${clauses.join(" OR ")})` : "t.status='published'";
  const relevance = condIds.length
    ? `(SELECT COUNT(*) FROM article_conditions r WHERE r.article_id = t.id AND r.condition_id IN (${condIds.map(() => "?").join(",")}))`
    : "0";
  const sql = `SELECT t.*, c.name AS company_name, c.slug AS company_slug, ${relevance} AS relevance
    FROM articles t JOIN companies c ON c.id = t.company_id
    WHERE ${where} ORDER BY relevance DESC, t.published_at DESC`;
  /* SELECT 側の relevance が先に来るのでバインド順は condIds → where */
  return db().prepare(sql).all(...condIds, ...params) as Article[];
}

function conditionFilterSql(conditionIds: number[], joinTable: string, fkCol: string): { sql: string; params: number[] } {
  if (!conditionIds.length) return { sql: "", params: [] };
  const rows = db().prepare(
    `SELECT id, category FROM conditions WHERE id IN (${conditionIds.map(() => "?").join(",")})`
  ).all(...conditionIds) as Array<{ id: number; category: string }>;
  const byCat = new Map<string, number[]>();
  for (const r of rows) byCat.set(r.category, [...(byCat.get(r.category) ?? []), r.id]);
  let sql = "";
  const params: number[] = [];
  for (const ids of byCat.values()) {
    sql += ` AND EXISTS (SELECT 1 FROM ${joinTable} x WHERE x.${fkCol} = t.id AND x.condition_id IN (${ids.map(() => "?").join(",")}))`;
    params.push(...ids);
  }
  return { sql, params };
}

/**
 * 自由入力を検索語に割る。空白区切りで最大8語。
 * LIKEのワイルドカード（% _）はESCAPE句を足さずに済むよう単純に取り除く。
 */
function keywordTokens(q: string | undefined): string[] {
  const raw = (q ?? "").trim();
  if (!raw) return [];
  return [...new Set(
    raw.split(/[\s\u3000]+/)
      .map((t) => t.replace(/[%_]/g, ""))
      .filter((t) => t.length > 0),
  )].slice(0, 8);
}

export function searchCompanies(f: SearchFilters): Array<Company & { match_count: number }> {
  const cond = conditionFilterSql(f.conditionIds ?? [], "company_conditions", "company_id");
  const params: unknown[] = [];
  let where = "1=1";
  /* 語ごとにANDで判定する。1本の `%A%B%` にすると語順が一致しないとヒットしない
     （「小ロット ステンレス」で「ステンレス…小ロット」が漏れる） */
  const COMPANY_TEXT_COLS = [
    "t.name", "t.description", "t.specialty_process", "t.specialty_process_sub",
    "t.specialty_lot", "t.specialty_quality", "t.industries", "t.equipment",
    "t.prefecture", "t.city",
  ];
  for (const token of keywordTokens(f.q)) {
    where += ` AND (${COMPANY_TEXT_COLS.map((c) => `${c} LIKE ?`).join(" OR ")})`;
    params.push(...COMPANY_TEXT_COLS.map(() => `%${token}%`));
  }
  const matchExpr = f.conditionIds?.length
    ? `(SELECT COUNT(*) FROM company_conditions m WHERE m.company_id = t.id AND m.condition_id IN (${f.conditionIds.map(() => "?").join(",")}))`
    : "0";
  /* richness: profile completeness + photos + published articles + response speed —
     verified, well-maintained profiles rank above thin ones at equal match */
  const richness = `(t.completeness
    + (EXISTS (SELECT 1 FROM company_photos p WHERE p.company_id = t.id)) * 40
    + (SELECT COUNT(*) FROM articles a WHERE a.company_id = t.id AND a.status='published') * 6
    + (t.response_days IS NOT NULL) * (5 - COALESCE(t.response_days, 5)) * 8)`;
  const order = f.sort === "updated"
    ? "t.updated_at DESC"
    : `match_count DESC, t.verified DESC, ${richness} DESC, t.updated_at DESC`;
  const sql = `SELECT t.*, ${matchExpr} AS match_count FROM companies t WHERE ${where}${cond.sql} ORDER BY ${order}`;
  return db().prepare(sql).all(...(f.conditionIds ?? []), ...params, ...cond.params) as Array<Company & { match_count: number }>;
}

export function searchArticles(f: SearchFilters): Article[] {
  const cond = conditionFilterSql(f.conditionIds ?? [], "article_conditions", "article_id");
  const params: unknown[] = [];
  let where = "t.status = 'published'";
  const ARTICLE_TEXT_COLS = ["t.title", "t.excerpt", "t.tag1", "t.tag2"];
  for (const token of keywordTokens(f.q)) {
    where += ` AND (${ARTICLE_TEXT_COLS.map((c) => `${c} LIKE ?`).join(" OR ")})`;
    params.push(...ARTICLE_TEXT_COLS.map(() => `%${token}%`));
  }
  const sql = `SELECT t.*, c.name AS company_name, c.slug AS company_slug
    FROM articles t JOIN companies c ON c.id = t.company_id
    WHERE ${where}${cond.sql} ORDER BY t.published_at DESC`;
  return db().prepare(sql).all(...params, ...cond.params) as Article[];
}

/**
 * 絞り込みサイドバーの件数。
 * ファセットの定石どおり、同じカテゴリの条件は外し、他カテゴリの条件は効かせて数える
 * （「ステンレスを選んだ状態で、加工を切り替えたら何社になるか」が分かる件数になる）。
 */
export function conditionCounts(f: SearchFilters): Map<number, number> {
  const applied = f.conditionIds ?? [];
  const conds = allConditions();
  const catOf = new Map(conds.map((c) => [c.id, c.category]));
  const categories = [...new Set(conds.map((c) => c.category))];
  const out = new Map<number, number>();

  for (const cat of categories) {
    /* このカテゴリ以外の適用条件を維持した母集合 */
    const base = searchCompanies({ ...f, conditionIds: applied.filter((id) => catOf.get(id) !== cat) });
    if (!base.length) {
      for (const c of conds) if (c.category === cat) out.set(c.id, 0);
      continue;
    }
    const ids = base.map((c) => c.id);
    const rows = db().prepare(
      `SELECT condition_id, COUNT(*) AS n FROM company_conditions
       WHERE company_id IN (${ids.map(() => "?").join(",")}) GROUP BY condition_id`
    ).all(...ids) as Array<{ condition_id: number; n: number }>;
    const byId = new Map(rows.map((r) => [r.condition_id, r.n]));
    for (const c of conds) if (c.category === cat) out.set(c.id, byId.get(c.id) ?? 0);
  }
  return out;
}

/* ---------------- companies / articles ---------------- */

export function companyBySlug(slug: string): Company | null {
  return (db().prepare("SELECT * FROM companies WHERE slug = ?").get(slug) as Company | undefined) ?? null;
}
export function companyById(id: number): Company | null {
  return (db().prepare("SELECT * FROM companies WHERE id = ?").get(id) as Company | undefined) ?? null;
}
export function companyPhotos(companyId: number): string[] {
  return (db().prepare("SELECT path FROM company_photos WHERE company_id = ? ORDER BY sort").all(companyId) as Array<{ path: string }>).map((r) => r.path);
}
export function companyWorks(companyId: number): Array<{ id: number; title: string; spec: string }> {
  return db().prepare("SELECT id, title, spec FROM works WHERE company_id = ?").all(companyId) as any[];
}
export function companyArticles(companyId: number, publishedOnly = true): Article[] {
  return db().prepare(
    `SELECT * FROM articles WHERE company_id = ? ${publishedOnly ? "AND status='published'" : ""} ORDER BY COALESCE(published_at, updated_at) DESC`
  ).all(companyId) as Article[];
}
export function articleBySlug(slug: string): Article | null {
  const row = db().prepare(
    `SELECT t.*, c.name AS company_name, c.slug AS company_slug FROM articles t JOIN companies c ON c.id = t.company_id WHERE t.slug = ?`
  ).get(slug) as Article | undefined;
  return row ?? null;
}
/** TOP の「読んで探す」: サムネイル付き記事を優先し、足りなければ最新記事で埋める */
export function featuredArticles(limit: number): Article[] {
  const withThumb = db().prepare(
    `SELECT t.*, c.name AS company_name, c.slug AS company_slug FROM articles t JOIN companies c ON c.id = t.company_id
     WHERE t.status='published' AND t.thumb != '' ORDER BY t.published_at DESC LIMIT ?`
  ).all(limit) as Article[];
  if (withThumb.length >= limit) return withThumb;
  const rest = db().prepare(
    `SELECT t.*, c.name AS company_name, c.slug AS company_slug FROM articles t JOIN companies c ON c.id = t.company_id
     WHERE t.status='published' AND t.thumb = '' ORDER BY t.published_at DESC LIMIT ?`
  ).all(limit - withThumb.length) as Article[];
  return [...withThumb, ...rest];
}

export function latestArticles(limit: number): Article[] {
  return db().prepare(
    `SELECT t.*, c.name AS company_name, c.slug AS company_slug FROM articles t JOIN companies c ON c.id = t.company_id
     WHERE t.status='published' ORDER BY t.published_at DESC LIMIT ?`
  ).all(limit) as Article[];
}

/** companies whose condition sets overlap the given company/article the most */
export function similarCompanies(companyId: number, limit: number): Array<Company & { overlap: number; total: number }> {
  const mine = conditionsOfCompany(companyId).map((c) => c.id);
  if (!mine.length) return [];
  const rows = db().prepare(
    `SELECT c.*, COUNT(*) AS overlap FROM companies c
     JOIN company_conditions cc ON cc.company_id = c.id
     WHERE cc.condition_id IN (${mine.map(() => "?").join(",")}) AND c.id != ?
     GROUP BY c.id ORDER BY overlap DESC, c.verified DESC LIMIT ?`
  ).all(...mine, companyId, limit) as any[];
  return rows.map((r) => ({ ...r, total: Math.min(mine.length, 5) }));
}

export function companiesMatchingConditions(conditionIds: number[], limit: number): Array<Company & { overlap: number; total: number }> {
  if (!conditionIds.length) return [];
  const rows = db().prepare(
    `SELECT c.*, COUNT(*) AS overlap FROM companies c
     JOIN company_conditions cc ON cc.company_id = c.id
     WHERE cc.condition_id IN (${conditionIds.map(() => "?").join(",")})
     GROUP BY c.id ORDER BY overlap DESC, c.verified DESC LIMIT ?`
  ).all(...conditionIds, limit) as any[];
  return rows.map((r) => ({ ...r, total: Math.min(conditionIds.length, 5) }));
}

/* ---------------- site stats (TOP) ---------------- */

export function siteStats() {
  const d = db();
  const companies = (d.prepare("SELECT COUNT(*) n FROM companies").get() as any).n as number;
  const articles = (d.prepare("SELECT COUNT(*) n FROM articles WHERE status='published'").get() as any).n as number;
  const last = (d.prepare("SELECT MAX(COALESCE(published_at, updated_at)) m FROM articles WHERE status='published'").get() as any).m as string | null;
  return { companies, articles, lastUpdated: last ? last.slice(0, 10).replaceAll("-", ".") : "-" };
}

/* ---------------- saves / compare ---------------- */

export function savedIds(sessionKey: string, kind: "company" | "article"): number[] {
  return (db().prepare("SELECT target_id FROM saves WHERE session_id = ? AND kind = ?").all(sessionKey, kind) as any[]).map((r) => r.target_id);
}
export function toggleSave(sessionKey: string, kind: "company" | "article", targetId: number): boolean {
  const d = db();
  const hit = d.prepare("SELECT 1 FROM saves WHERE session_id=? AND kind=? AND target_id=?").get(sessionKey, kind, targetId);
  if (hit) {
    d.prepare("DELETE FROM saves WHERE session_id=? AND kind=? AND target_id=?").run(sessionKey, kind, targetId);
    return false;
  }
  d.prepare("INSERT INTO saves (session_id, kind, target_id) VALUES (?,?,?)").run(sessionKey, kind, targetId);
  if (kind === "company") recordEvent("save", targetId);
  if (kind === "article") {
    const a = d.prepare("SELECT company_id FROM articles WHERE id=?").get(targetId) as any;
    if (a) d.prepare("INSERT INTO events (type, company_id, article_id, term) VALUES ('article_save', ?, ?, '')").run(a.company_id, targetId);
  }
  return true;
}
export function savedCompanies(sessionKey: string): Company[] {
  return db().prepare(
    `SELECT c.* FROM companies c JOIN saves s ON s.target_id = c.id AND s.kind='company' WHERE s.session_id = ? ORDER BY s.created_at DESC`
  ).all(sessionKey) as Company[];
}
export function savedArticles(sessionKey: string): Array<Article & { saved_at: string }> {
  return db().prepare(
    `SELECT a.*, c.name AS company_name, c.slug AS company_slug, s.created_at AS saved_at
     FROM articles a JOIN companies c ON c.id = a.company_id
     JOIN saves s ON s.target_id = a.id AND s.kind='article' WHERE s.session_id = ? ORDER BY s.created_at DESC`
  ).all(sessionKey) as any[];
}

export function compareList(sessionKey: string): Array<Company & { memo: string }> {
  return db().prepare(
    `SELECT c.*, cm.memo FROM companies c JOIN compares cm ON cm.company_id = c.id WHERE cm.session_id = ? ORDER BY cm.created_at`
  ).all(sessionKey) as any[];
}
export function addCompare(sessionKey: string, companyId: number): { ok: boolean; reason?: string } {
  const d = db();
  const n = (d.prepare("SELECT COUNT(*) n FROM compares WHERE session_id=?").get(sessionKey) as any).n as number;
  const exists = d.prepare("SELECT 1 FROM compares WHERE session_id=? AND company_id=?").get(sessionKey, companyId);
  if (exists) return { ok: true };
  if (n >= 3) return { ok: false, reason: "max" };
  d.prepare("INSERT INTO compares (session_id, company_id) VALUES (?,?)").run(sessionKey, companyId);
  return { ok: true };
}
export function removeCompare(sessionKey: string, companyId: number) {
  db().prepare("DELETE FROM compares WHERE session_id=? AND company_id=?").run(sessionKey, companyId);
}
export function setCompareMemo(sessionKey: string, companyId: number, memo: string) {
  db().prepare("UPDATE compares SET memo=? WHERE session_id=? AND company_id=?").run(memo, sessionKey, companyId);
}

/* ---------------- inquiries ---------------- */

export type NewInquiry = {
  type: string; process: string; material: string; quantity: string; deadline: string;
  size: string; required_precision: string; budget: string; industry: string; note: string;
  attachments: string[]; anonymous: boolean; no_forward: boolean;
  contact_company: string; contact_name: string; contact_email: string; contact_phone: string;
  source: string; recipientCompanyIds: number[]; createdBy?: number | null; status?: "draft" | "sent";
  sessionId?: string;
};

export function createInquiry(inq: NewInquiry): number {
  const d = db();
  /* 相談本体・送信先・計測イベントは1トランザクションで（途中失敗で孤立行を残さない） */
  const tx = d.transaction((): number => {
  const id = d.prepare(
    `INSERT INTO inquiries (type, process, material, quantity, deadline, size, required_precision, budget, industry, note,
      attachments, anonymous, no_forward, contact_company, contact_name, contact_email, contact_phone, source, status, created_by, session_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    inq.type, inq.process, inq.material, inq.quantity, inq.deadline, inq.size, inq.required_precision,
    inq.budget, inq.industry, inq.note, JSON.stringify(inq.attachments ?? []),
    inq.anonymous ? 1 : 0, inq.no_forward ? 1 : 0,
    inq.contact_company, inq.contact_name, inq.contact_email, inq.contact_phone,
    inq.source, inq.status ?? "sent", inq.createdBy ?? null, inq.sessionId ?? ""
  ).lastInsertRowid as number;
  const rec = d.prepare("INSERT INTO inquiry_recipients (inquiry_id, company_id) VALUES (?,?)");
  const exists = d.prepare("SELECT 1 FROM companies WHERE id = ?");
  for (const cid of inq.recipientCompanyIds) {
    if (!exists.get(cid)) continue; // 存在しない企業IDは無視（不正な送信先で相談全体を失わせない）
    rec.run(id, cid);
    if ((inq.status ?? "sent") === "sent") {
      recordEvent("inquiry", cid);
      recordEvent("inquiry_source_" + (inq.source || "search"), cid);
    }
  }
  return id;
  });
  return tx();
}

export function inboxOf(companyId: number) {
  return db().prepare(
    `SELECT i.*, r.status AS recipient_status FROM inquiries i
     JOIN inquiry_recipients r ON r.inquiry_id = i.id
     WHERE r.company_id = ? AND i.status='sent' ORDER BY i.created_at DESC`
  ).all(companyId) as any[];
}
export function setInquiryStatus(companyId: number, inquiryId: number, status: "replied" | "declined") {
  db().prepare("UPDATE inquiry_recipients SET status=? WHERE inquiry_id=? AND company_id=?").run(status, inquiryId, companyId);
}
/** 送信済みの相談だけを履歴に出す（下書きは draftsOf で別扱い） */
export function inquiryHistoryOf(sessionUserId: number) {
  return db().prepare(
    "SELECT * FROM inquiries WHERE created_by = ? AND status = 'sent' ORDER BY created_at DESC"
  ).all(sessionUserId) as any[];
}

export function inquiryDraftsOf(sessionUserId: number) {
  return db().prepare(
    "SELECT * FROM inquiries WHERE created_by = ? AND status = 'draft' ORDER BY created_at DESC"
  ).all(sessionUserId) as any[];
}

/* ---------------- company profile (signup / admin) ---------------- */

export function updateCompanyConditions(companyId: number, conditionIds: number[]) {
  const d = db();
  const tx = d.transaction(() => {
    d.prepare("DELETE FROM company_conditions WHERE company_id=?").run(companyId);
    const ins = d.prepare("INSERT OR IGNORE INTO company_conditions (company_id, condition_id) VALUES (?,?)");
    for (const cid of conditionIds) ins.run(companyId, cid);
  });
  tx();
}

export function updateCompanyProfile(companyId: number, fields: Partial<Company>) {
  const allowed = ["name", "prefecture", "city", "employees", "founded", "description", "lot_min", "lot_max",
    "precision_mm", "delivery_min", "delivery_max", "size_note", "equipment", "capacity", "industries",
    "area", "price_hint", "contact_hours", "hard_conditions", "completeness"] as const;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of allowed) {
    if (k in fields) { sets.push(`${k} = ?`); vals.push((fields as any)[k]); }
  }
  if (!sets.length) return;
  sets.push("updated_at = datetime('now')");
  db().prepare(`UPDATE companies SET ${sets.join(", ")} WHERE id = ?`).run(...vals, companyId);
}

export function createCompany(fields: { slug: string; name: string; prefecture: string; city?: string; description?: string }): number {
  return db().prepare(
    `INSERT INTO companies (slug, name, prefecture, city, description) VALUES (?,?,?,?,?)`
  ).run(fields.slug, fields.name, fields.prefecture, fields.city ?? "", fields.description ?? "").lastInsertRowid as number;
}

/* ---------------- articles (editor) ---------------- */

const ARTICLE_TITLE_MAX = 200;
const ARTICLE_BODY_MAX = 200_000;

export function saveArticle(a: {
  id?: number; company_id: number; title: string; body: string; theme: string;
  status: "draft" | "review" | "published"; tag1?: string; tag2?: string; excerpt?: string;
  conditionIds?: number[];
}): number {
  const d = db();
  a = { ...a, title: (a.title ?? "").slice(0, ARTICLE_TITLE_MAX), body: (a.body ?? "").slice(0, ARTICLE_BODY_MAX) };
  let id = a.id ?? 0;
  /* 他社の記事IDを渡されても触らせない（条件テーブルまで書き換えられるのを防ぐ） */
  if (id) {
    const owner = d.prepare("SELECT company_id FROM articles WHERE id = ?").get(id) as { company_id: number } | undefined;
    if (!owner || owner.company_id !== a.company_id) {
      throw new Error("saveArticle: article does not belong to this company");
    }
  }
  /* slug は時刻＋乱数＋衝突時リトライで一意にする（同時保存でも UNIQUE 違反にしない） */
  const newSlug = () => "post-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  let slugBase = newSlug();
  const slugTaken = d.prepare("SELECT 1 FROM articles WHERE slug = ?");
  for (let i = 0; i < 5 && slugTaken.get(slugBase); i++) slugBase = newSlug();
  if (id) {
    d.prepare(
      `UPDATE articles SET title=?, body=?, theme=?, status=?, tag1=COALESCE(?, tag1), tag2=COALESCE(?, tag2),
       excerpt=COALESCE(?, excerpt), updated_at=datetime('now'),
       published_at=CASE WHEN ?='published' AND published_at IS NULL THEN datetime('now') ELSE published_at END
       WHERE id=? AND company_id=?`
    ).run(a.title, a.body, a.theme, a.status, a.tag1 ?? null, a.tag2 ?? null, a.excerpt ?? null, a.status, id, a.company_id);
  } else {
    id = d.prepare(
      `INSERT INTO articles (slug, company_id, title, excerpt, body, theme, status, tag1, tag2, published_at)
       VALUES (?,?,?,?,?,?,?,?,?, CASE WHEN ?='published' THEN datetime('now') ELSE NULL END)`
    ).run(slugBase, a.company_id, a.title, a.excerpt ?? "", a.body, a.theme, a.status, a.tag1 ?? "", a.tag2 ?? "", a.status).lastInsertRowid as number;
  }
  if (a.conditionIds) {
    d.prepare("DELETE FROM article_conditions WHERE article_id=?").run(id);
    const ins = d.prepare("INSERT OR IGNORE INTO article_conditions (article_id, condition_id) VALUES (?,?)");
    for (const cid of a.conditionIds) ins.run(id, cid);
  }
  return id;
}

/* ---------------- events / dashboard ---------------- */

export function recordEvent(type: string, companyId?: number | null, articleId?: number | null, term = "") {
  db().prepare("INSERT INTO events (type, company_id, article_id, term) VALUES (?,?,?,?)").run(type, companyId ?? null, articleId ?? null, term);
}

const DEDUPE_MINUTES = 30;

/**
 * 同じ閲覧の再レンダー（保存・比較の revalidate、リロード）で計測が水増しされないよう、
 * セッション＋対象＋検索条件が同じイベントは一定時間内は1回だけ記録する。
 */
function recordEventOnce(
  sessionId: string,
  type: string,
  opts: { companyId?: number | null; articleId?: number | null; term?: string }
) {
  const d = db();
  const { companyId = null, articleId = null, term = "" } = opts;
  const dup = d.prepare(
    `SELECT 1 FROM events
     WHERE session_id = ? AND type = ? AND IFNULL(company_id,-1) = IFNULL(?,-1)
       AND IFNULL(article_id,-1) = IFNULL(?,-1) AND term = ?
       AND created_at >= datetime('now', ?)`
  ).get(sessionId, type, companyId, articleId, term, `-${DEDUPE_MINUTES} minutes`);
  if (dup) return false;
  d.prepare("INSERT INTO events (type, company_id, article_id, term, session_id) VALUES (?,?,?,?,?)")
    .run(type, companyId, articleId, term, sessionId);
  return true;
}

/** ページ表示の計測（セッション単位で重複排除。sessionId 未指定なら毎回記録） */
export function recordView(
  sessionId: string,
  type: string,
  opts: { companyId?: number | null; articleId?: number | null; term?: string } = {}
) {
  if (!sessionId) {
    recordEvent(type, opts.companyId ?? null, opts.articleId ?? null, opts.term ?? "");
    return;
  }
  recordEventOnce(sessionId, type, opts);
}

export function recordImpressions(companyIds: number[], term: string, sessionId = "") {
  const d = db();
  if (!sessionId) {
    const ins = d.prepare("INSERT INTO events (type, company_id, term) VALUES ('impression', ?, ?)");
    const tx = d.transaction(() => { for (const id of companyIds) ins.run(id, term); });
    tx();
    return;
  }
  const tx = d.transaction(() => {
    for (const id of companyIds) recordEventOnce(sessionId, "impression", { companyId: id, term });
  });
  tx();
}

function countEvents(companyId: number, type: string, fromDays: number, toDays = 0): number {
  return (db().prepare(
    `SELECT COUNT(*) n FROM events WHERE company_id=? AND type=? AND created_at >= datetime('now', ?) AND created_at < datetime('now', ?)`
  ).get(companyId, type, `-${fromDays} days`, `-${toDays} days`) as any).n as number;
}

export function dashboardStats(companyId: number) {
  const cur = {
    impressions: countEvents(companyId, "impression", 30),
    views: countEvents(companyId, "click", 30) + countEvents(companyId, "view", 30),
    saves: countEvents(companyId, "save", 30),
    inquiries: countEvents(companyId, "inquiry", 30),
  };
  /* 前期間は [60日前, 30日前) — 当期間 [30日前, 現在) と隙間なく接続させる */
  const prev = {
    impressions: countEvents(companyId, "impression", 60, 30),
    views: countEvents(companyId, "click", 60, 30) + countEvents(companyId, "view", 60, 30),
    saves: countEvents(companyId, "save", 60, 30),
    inquiries: countEvents(companyId, "inquiry", 60, 30),
  };
  const terms = db().prepare(
    `SELECT term,
      SUM(type='impression') AS impressions, SUM(type='click') AS clicks,
      SUM(type='save') AS saves, SUM(type='inquiry') AS inquiries
     FROM events WHERE company_id=? AND term != '' AND created_at >= datetime('now','-30 days')
     GROUP BY term ORDER BY inquiries DESC, impressions DESC LIMIT 8`
  ).all(companyId) as Array<{ term: string; impressions: number; clicks: number; saves: number; inquiries: number }>;
  const articles = db().prepare(
    `SELECT a.id, a.title, a.published_at,
      SUM(e.type='article_view') AS views, SUM(e.type='article_save') AS saves, SUM(e.type='article_inquiry') AS inquiries
     FROM events e JOIN articles a ON a.id = e.article_id
     WHERE e.company_id=? AND e.created_at >= datetime('now','-30 days')
     GROUP BY a.id ORDER BY views DESC LIMIT 5`
  ).all(companyId) as any[];
  const sources = {
    search: countEvents(companyId, "inquiry_source_search", 30),
    article: countEvents(companyId, "inquiry_source_article", 30),
    compare: countEvents(companyId, "inquiry_source_compare", 30),
  };
  const searchShare = (() => {
    const total = cur.views || 1;
    const viaSearch = countEvents(companyId, "click", 30);
    return Math.round((viaSearch / total) * 100);
  })();
  return { cur, prev, terms, articles, sources, searchShare };
}
