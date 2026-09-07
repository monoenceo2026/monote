import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { allConditions, searchCompanies, searchArticlesRelated } from "@/lib/repo";
import "@/css/features.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "特集",
  description: "よくある発注条件から、対応できる企業と技術記事をまとめて探せる特集です。",
};

/** 特集＝よく使われる条件の組み合わせ。件数は毎回DBから数える。 */
const FEATURES: Array<{ key: string; title: string; lead: string; labels: string[] }> = [
  {
    key: "prototype",
    title: "1個からの試作に応える",
    lead: "単品・ワンオフの試作を受けてくれる企業。量産前の検証をここから始められます。",
    labels: ["1個から（試作）"],
  },
  {
    key: "quick",
    title: "短納期でしのぐ",
    lead: "7日以内の対応を掲げている企業。特急・応相談の可否も条件から確認できます。",
    labels: ["短納期（7日以内）"],
  },
  {
    key: "sus-sheet",
    title: "ステンレスの精密板金",
    lead: "SUS304・SUS316の薄板を、曲げ・溶接まで一貫で受けられる企業を集めました。",
    labels: ["ステンレス", "板金・プレス"],
  },
  {
    key: "precision",
    title: "±0.01mmの精度が要る",
    lead: "高精度の公差を標準対応としている企業。検査体制もあわせて比較できます。",
    labels: ["高精度±0.01mm"],
  },
  {
    key: "iso",
    title: "ISO9001で選ぶ",
    lead: "品質マネジメントの認証を取得している企業。医療・自動車向けの選定に。",
    labels: ["ISO9001"],
  },
  {
    key: "kansai",
    title: "関西でまとめて頼む",
    lead: "近くで打ち合わせながら進めたいときに。関西エリアで対応できる企業です。",
    labels: ["関西"],
  },
  {
    key: "surface",
    title: "表面処理・熱処理を任せる",
    lead: "めっき・アルマイト・熱処理まで含めて相談できる企業を集めました。",
    labels: ["表面処理・熱処理"],
  },
  {
    key: "mass",
    title: "量産に切り替える",
    lead: "1,000個以上の継続生産に対応できる企業。試作から量産移行の実績で選べます。",
    labels: ["量産（1,000個以上）"],
  },
];

export default function FeaturesPage() {
  const conds = allConditions();
  const items = FEATURES.map((f) => {
    const ids = f.labels
      .map((l) => conds.find((c) => c.label === l)?.id)
      .filter((n): n is number => typeof n === "number");
    return {
      ...f,
      ids,
      companies: searchCompanies({ conditionIds: ids }).length,
      articles: searchArticlesRelated({ conditionIds: ids }).length,
    };
  });

  return (
    <>
      <Header variant="sub" active="features" />
      <main className="feat">
        <div className="feat__head">
          <p className="feat__label">FEATURES</p>
          <h1 className="feat__title">特集</h1>
          <p className="feat__lead">
            よくある発注条件から、対応できる企業と関連する技術記事をまとめて開けます。
            件数はいまの掲載状況をそのまま数えたものです。
          </p>
        </div>

        <div className="feat__grid" data-stagger="0.06">
          {items.map((f) => (
            <Link
              key={f.key}
              className="feat-card reveal"
              href={`/search?cond=${f.ids.join(",")}`}
            >
              <h2 className="feat-card__title">{f.title}</h2>
              <p className="feat-card__lead">{f.lead}</p>
              <div className="feat-card__conds">
                {f.labels.map((l) => (
                  <span key={l} className="chip chip--gray">{l}</span>
                ))}
              </div>
              <p className="feat-card__count">
                <strong>{f.companies}社</strong>が該当　/　関連記事 {f.articles}本
              </p>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
