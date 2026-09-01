import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  companyBySlug,
  conditionsOfCompany,
  companyWorks,
  companyArticles,
  similarCompanies,
  savedIds,
  compareList,
  recordEvent,
} from "@/lib/repo";
import { sessionKey } from "@/lib/session";
import { inquiryCountOf } from "@/lib/extra/company";
import CompanyTabs from "./CompanyTabs";
import { SaveButton, CompareButton } from "./SaveCompare";
import BodyClass from "./BodyClass";
import "@/css/company.css";

export const dynamic = "force-dynamic";

const fmtDate = (s: string | null | undefined) => (s ? s.slice(0, 10).replaceAll("-", ".") : "-");
const fmtMonth = (s: string) => s.slice(0, 7).replace("-", ".");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = companyBySlug(slug);
  if (!c) return { title: "企業詳細" };
  const proc = conditionsOfCompany(c.id).find((x) => x.category === "process")?.label ?? "";
  return {
    title: `${c.name}（${proc ? proc + "／" : ""}${c.prefecture}）`,
    description: c.description,
  };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const c = companyBySlug(slug);
  if (!c) notFound();

  /* ---------- events ---------- */
  recordEvent("view", c.id);
  const sp = await searchParams;
  if (sp.from === "search") {
    const term = typeof sp.term === "string" ? sp.term : typeof sp.q === "string" ? sp.q : "";
    recordEvent("click", c.id, null, term);
  }

  /* ---------- data ---------- */
  const conds = conditionsOfCompany(c.id);
  const byCat = (cat: string) => conds.filter((x) => x.category === cat).map((x) => x.label);
  const processes = byCat("process");
  const materials = byCat("material");
  const certs = byCat("cert");

  const works = companyWorks(c.id);
  const articles = companyArticles(c.id);
  const similar = similarCompanies(c.id, 2);
  const inquiries = inquiryCountOf(c.id);

  const key = await sessionKey();
  const saved = savedIds(key, "company").includes(c.id);
  const inCompare = compareList(key).some((x) => x.id === c.id);

  const path = `/companies/${c.slug}`;
  const inquiryHref = `/inquiry/new?companies=${c.id}&source=company`;

  const procText = processes.join("／") || "—";
  const matText = materials.join("／") || "—";
  const certText = certs.join("／") || c.specialty_quality || "—";
  const lotText = `${c.lot_min}個${c.lot_min === 1 ? "（試作）" : ""}〜${c.lot_max.toLocaleString()}個`;
  const precText = c.precision_mm != null ? `±${c.precision_mm}mm（標準）` : "要相談";
  const deliveryText =
    c.delivery_min != null && c.delivery_max != null ? `${c.delivery_min}〜${c.delivery_max}日` : "応相談";

  return (
    <>
      <BodyClass className="page-company" />
      <Header variant="sub" searchPlaceholder="SUS304 薄板 小ロット 短納期" />

      {/* ==================== SP header ==================== */}
      <div className="sp-head" aria-hidden="false">
        <Link className="sp-head__back" href="/search" aria-label="検索結果へ戻る">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12.5 4 6.5 10l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
        <p className="sp-head__ttl">{c.name}</p>
        <SaveButton companyId={c.id} initialSaved={saved} path={path} variant="fav" />
      </div>

      {/* ==================== パンくず ==================== */}
      <div className="crumbs">
        <div className="container-wide">
          <p>
            <Link href="/search">企業を探す</Link>
            {processes[0] ? (
              <>
                <span className="crumbs__sep">＞</span>
                <Link href={`/search?q=${encodeURIComponent(processes[0])}`}>{processes[0]}</Link>
              </>
            ) : null}
            <span className="crumbs__sep">＞</span>
            <Link href={`/search?q=${encodeURIComponent(c.prefecture)}`}>{c.prefecture}</Link>
            <span className="crumbs__sep">＞</span>
            <span className="crumbs__cur">{c.name}</span>
          </p>
        </div>
      </div>

      <main>
        {/* ==================== 企業ヘッダー ==================== */}
        <div className="co-head container-wide">
          <div className="co-head__info">
            <div className="co-head__logo">
              <img src="/assets/img/logoipsum.png" alt={`${c.name} ロゴ`} />
            </div>
            <div className="co-head__body">
              <div className="co-head__namebar">
                <h1 className="co-head__name">{c.name}</h1>
                <div className="co-head__badges">
                  {c.verified ? <span className="tag tag--blue">確認済み</span> : null}
                  {certs.map((label) => (
                    <span key={label} className={`tag${label === "ISO14001" ? " badge-iso14001" : ""}`}>{label}</span>
                  ))}
                </div>
              </div>
              <p className="co-head__desc">{c.description}</p>
              <div className="co-head__meta">
                <p>{c.prefecture}{c.city}</p>
                <p>従業員 {c.employees}</p>
                {c.founded ? <p className="pc-i">創業 {c.founded}年</p> : null}
                <p>最終更新 {fmtDate(c.updated_at)}</p>
              </div>
            </div>
          </div>
          <div className="co-head__actions">
            <Link className="btn btn--pill btn--dark btn--lg btn--block" href={inquiryHref}>相談する（無料）</Link>
            <CompareButton companyId={c.id} initialInCompare={inCompare} path={path} />
            <SaveButton companyId={c.id} initialSaved={saved} path={path} variant="box" />
          </div>
        </div>

        {/* ==================== タブ ==================== */}
        <CompanyTabs articleCount={articles.length} />

        {/* ==================== 2カラム ==================== */}
        <div className="co-layout container-wide">
          <div className="co-main">

            {/* できること */}
            <section className="co-sec co-sec--first" id="sec-dekiru">
              <div className="co-strengths" data-stagger="0.06">
                <div className="strength reveal">
                  <p className="strength__label">得意な加工</p>
                  <p className="strength__main">{c.specialty_process}</p>
                  <p className="strength__sub">{c.specialty_process_sub}</p>
                </div>
                <div className="strength reveal">
                  <p className="strength__label">得意なロット<span className="pc-i">・納期</span></p>
                  <p className="strength__main">{c.specialty_lot}</p>
                  <p className="strength__sub">{c.specialty_lot_sub}</p>
                </div>
                <div className="strength reveal sp-hide">
                  <p className="strength__label">品質・認証</p>
                  <p className="strength__main">{c.specialty_quality}</p>
                  <p className="strength__sub">{c.specialty_quality_sub}</p>
                </div>
              </div>
            </section>

            {/* 対応条件 */}
            <section className="co-sec" id="sec-joken">
              <div className="sec-ttl">
                <h2>対応条件</h2>
                <p className="note pc-only">検索の絞り込み項目と1対1で対応</p>
              </div>

              {/* PC: 2テーブル */}
              <div className="spec-tables pc-only">
                <div className="spec-table">
                  <div className="row"><div className="k">加工・工程</div><div className="v -xtight">{procText}</div></div>
                  <div className="row"><div className="k">対応材質</div><div className="v -xtight">{matText}</div></div>
                  <div className="row"><div className="k">対応ロット</div><div className="v">{lotText}</div></div>
                  <div className="row"><div className="k">加工精度</div><div className="v">{precText}</div></div>
                  <div className="row"><div className="k">対応サイズ</div><div className="v">{c.size_note || "—"}</div></div>
                  <div className="row"><div className="k">保有設備</div><div className="v">{c.equipment || "—"}</div></div>
                </div>
                <div className="spec-table">
                  <div className="row"><div className="k">生産能力</div><div className="v">{c.capacity || "—"}</div></div>
                  <div className="row"><div className="k">品質・認証</div><div className="v">{certText}</div></div>
                  <div className="row"><div className="k">実績業種</div><div className="v">{c.industries || "—"}</div></div>
                  <div className="row"><div className="k -tight">対応エリア・納期</div><div className="v">{c.area || "—"}</div></div>
                  <div className="row"><div className="k">価格帯の目安</div><div className="v">{c.price_hint || "—"}</div></div>
                  <div className="row"><div className="k">問い合わせ対応</div><div className="v">{c.contact_hours || "—"}</div></div>
                </div>
              </div>

              {/* SP: 短縮1テーブル */}
              <div className="spec-table spec-table--sp sp-only">
                <div className="row"><div className="k">加工</div><div className="v">{c.specialty_process_sub || procText}</div></div>
                <div className="row"><div className="k">材質</div><div className="v">{matText}</div></div>
                <div className="row"><div className="k">ロット</div><div className="v">{`${c.lot_min}〜${c.lot_max.toLocaleString()}個`}</div></div>
                <div className="row"><div className="k">精度</div><div className="v">{c.precision_mm != null ? `±${c.precision_mm}mm` : "要相談"}</div></div>
                <div className="row"><div className="k">認証</div><div className="v">{certText}</div></div>
                <div className="row"><div className="k">納期</div><div className="v">{deliveryText}{deliveryText !== "応相談" ? "（特急応相談）" : ""}</div></div>
                <div className="row"><div className="k">価格帯</div><div className="v">{c.price_hint || "—"}</div></div>
              </div>

              {/* 対応が難しい条件 */}
              {c.hard_conditions ? (
                <div className="ng-bar">
                  <div className="ng-bar__head">
                    <span className="ng-bar__chip">対応が難しい条件</span>
                    <p className="ng-bar__note pc-only">先に開示して、往復の手間を減らす</p>
                  </div>
                  <p className="ng-bar__body">{c.hard_conditions}</p>
                </div>
              ) : null}
            </section>

            {/* 実績・実例 */}
            <section className="co-sec" id="sec-jisseki">
              <div className="sec-ttl">
                <h2>実績・実例</h2>
              </div>
              {works.length ? (
                <div className="works" data-stagger="0.07">
                  {works.map((w) => (
                    <div className="work-card reveal" key={w.id}>
                      <div className="ph-thumb work-card__thumb"><span>記事サムネイル</span></div>
                      <div className="work-card__body">
                        <p className="work-card__ttl">{w.title}</p>
                        <p className="work-card__spec">{w.spec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">実績はまだ掲載されていません。</div>
              )}
            </section>

            {/* この会社が書いた記事 */}
            <section className="co-sec" id="sec-kiji">
              <div className="sec-ttl">
                <h2>この会社が書いた記事</h2>
                <p className="note">{articles.length}本</p>
              </div>
              {articles.length ? (
                <div className="co-articles" data-stagger="0.07">
                  {articles.map((a) => (
                    <Link className="art-row reveal" href={`/articles/${a.slug}`} key={a.id}>
                      <div className="ph-thumb art-row__thumb"></div>
                      <p className="art-row__ttl">{a.title}</p>
                      <p className="art-row__date">{fmtDate(a.published_at)}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty-state">記事はまだありません。</div>
              )}
            </section>
          </div>

          {/* ==================== サイドバー ==================== */}
          <aside className="co-side">
            <div className="side-card consult">
              <h2 className="side-card__ttl">この会社に相談する</h2>
              <p className="consult__lead">図面がなくても、条件だけで相談できます。</p>
              <div className="consult__btns">
                <Link className="btn btn--pill btn--dark btn--lg btn--block" href={inquiryHref}>相談・見積を依頼する</Link>
                <Link className="btn btn--lg btn--block co-btn-box" href={inquiryHref}>社名を伏せて可否だけ聞く</Link>
                <button className="btn btn--lg btn--block co-btn-phase2" type="button" disabled>打ち合わせ日程を調整する(Phase2)</button>
              </div>
              <dl className="consult__meta">
                <div><dt>返信の早さ</dt><dd>{c.response_days != null ? `平均${c.response_days}営業日` : "—"}</dd></div>
                <div><dt>MONOTE経由の相談</dt><dd>{inquiries}件</dd></div>
                <div><dt>情報の確認</dt><dd>{c.profile_confirmed_at ? `運営確認済 ${fmtMonth(c.profile_confirmed_at)}` : "未確認"}</dd></div>
                <div><dt>最終更新</dt><dd>{fmtDate(c.updated_at)}</dd></div>
              </dl>
            </div>

            <div className="side-card" id="sec-gaiyo">
              <h2 className="side-card__ttl">会社概要</h2>
              <div className="spec-table spec-table--mini">
                <div className="row"><div className="k">所在地</div><div className="v">{c.address || `${c.prefecture}${c.city}`}</div></div>
                <div className="row"><div className="k">従業員</div><div className="v">{c.employees}</div></div>
                <div className="row"><div className="k">創業</div><div className="v">{c.founded ? `${c.founded}年` : "—"}</div></div>
                <div className="row"><div className="k">取引条件</div><div className="v">{c.trade_terms || "—"}</div></div>
              </div>
            </div>

            {similar.length ? (
              <div className="side-card">
                <h2 className="side-card__ttl">条件が近い他の企業</h2>
                <ul className="near-list">
                  {similar.map((s) => (
                    <li key={s.id}>
                      <Link href={`/companies/${s.slug}`}>
                        {s.name}（{s.city}）一致 {Math.min(s.overlap, s.total)}/{s.total}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </main>

      <Footer />

      {/* ==================== SP 下部固定バー ==================== */}
      <div className="sp-bar">
        <SaveButton companyId={c.id} initialSaved={saved} path={path} variant="spbar" />
        <Link className="sp-bar__btn" href="/my/compare">比較</Link>
        <Link className="sp-bar__cta" href={inquiryHref}>相談・見積を依頼</Link>
      </div>
    </>
  );
}
