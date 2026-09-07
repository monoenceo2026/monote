import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import BodyClass from "./BodyClass";
import { companyById, conditionsOfCompany } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { recentSearchCount, worksCount } from "@/lib/extra/signup";
import SignupClient, { type SignupInitial } from "./SignupClient";
import {
  AREA_OPTIONS,
  CERT_OPTIONS,
  MAT_CHIPS,
  PRECISION_OPTIONS,
  PRIMARY_PROC_CHIPS,
  areaOption,
  deadlineText,
  precisionOption,
  priceOption,
} from "./defs";
import "@/css/signup.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "企業登録（対応条件）",
  description: "御社が「どんな条件で探されるか」を決めます。入力した項目がそのまま検索の絞り込み条件になります。",
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/* ---------- 静的版の初期値（未ログイン時） ---------- */
const STATIC_INITIAL: SignupInitial = {
  companyName: "",
  prefecture: "",
  city: "",
  employees: "",
  founded: "",
  procOn: ["レーザー切断", "曲げ・ベンダー", "TIG溶接", "組立"],
  matOn: ["ステンレス", "鉄・鋼", "アルミ"],
  lotMin: "1",
  lotMax: "2,000",
  precision: "±0.05mm",
  size: "1,500×3,000mm／板厚 0.5〜6.0mm",
  deadline: "5〜10日",
  express: true,
  cert: "ISO9001／ISO14001",
  areaSel: "全国発送",
  price: "試作 3万円〜",
  hours: "平日 9:00 - 17:30",
  hard: "",
  pvName: "株式会社○○製作所",
  pvSub: "大阪府八尾市・30〜99名",
  /* 充足度の文脈（フォーム外の項目。未ログイン=新規なので空） */
  equipment: "",
  description: "",
  works: 0,
  storedCompleteness: 0,
};

/* ---------- companyユーザー: 自社の条件・プロフィールを初期値に ---------- */
function initialForCompany(companyId: number): SignupInitial {
  const c = companyById(companyId);
  if (!c) return STATIC_INITIAL;
  const conds = conditionsOfCompany(c.id);
  const keySet = new Set(conds.map((x) => `${x.category}:${x.label}`));

  const procOn = [...new Set([...keySet].flatMap((k) => PRIMARY_PROC_CHIPS[k] ?? []))];
  const matOn = MAT_CHIPS.filter((ch) => ch.cond && keySet.has(ch.cond)).map((ch) => ch.label);

  const precision = precisionOption(c.precision_mm) ?? PRECISION_OPTIONS[1];
  const deadline = deadlineText(c.delivery_min, c.delivery_max);

  const has9001 = keySet.has("cert:ISO9001");
  const has14001 = keySet.has("cert:ISO14001");
  const cert = has9001 && has14001 ? CERT_OPTIONS[0] : has9001 ? "ISO9001" : has14001 ? "ISO14001" : "認証なし";

  const areaSel = c.area ? areaOption(c.area) : AREA_OPTIONS[3];
  const price = priceOption(c.price_hint);

  const place = `${c.prefecture}${c.city}`;
  const pvSub = [place, c.employees].filter(Boolean).join("・") || STATIC_INITIAL.pvSub;

  const works = worksCount(c.id);

  return {
    companyName: c.name,
    prefecture: c.prefecture,
    city: c.city,
    employees: c.employees,
    founded: c.founded != null ? String(c.founded) : "",
    procOn,
    matOn,
    lotMin: c.lot_min.toLocaleString("en-US"),
    lotMax: c.lot_max.toLocaleString("en-US"),
    precision,
    size: c.size_note,
    deadline,
    express: c.area.includes("特急"),
    cert,
    areaSel,
    price,
    hours: c.contact_hours,
    hard: c.hard_conditions,
    pvName: c.name,
    pvSub,
    equipment: c.equipment,
    description: c.description,
    works,
    storedCompleteness: c.completeness,
  };
}

/* 共有ヘッダー（plain）。ログイン中は名前・ログアウトも出す＝他ルートと同じ見え方。
   .page-signup は狭い画面でのヘッダー調整（css/signup.css）に使う */
function SignupHeader() {
  return (
    <>
      <BodyClass className="page-signup" />
      <Header
        variant="plain"
        plainNote="登録は無料です。途中でやめても内容は保存されます。"
        plainCta={{ label: "あとで続ける", href: "/" }}
      />
    </>
  );
}

/* ---------- 完了画面（?done=1） ---------- */
/* 保存直後の自社を実データで拾い、「検索でどう見えるか」への導線を出す */
async function DoneScreen() {
  const user = await currentUser();
  const c = user?.role === "company" && user.company_id ? companyById(user.company_id) : null;

  /* 検索リンクは自社に付いている条件のうち代表4つ（材質→加工→ロット→納期） */
  const conds = c ? conditionsOfCompany(c.id) : [];
  const order = ["material", "process", "lot", "delivery", "cert", "area"];
  const picked = order
    .map((cat) => conds.find((x) => x.category === cat))
    .filter((x): x is (typeof conds)[number] => !!x)
    .slice(0, 4);
  const condHref = picked.length ? `/search?cond=${picked.map((x) => x.id).join(",")}` : "/search";

  return (
    <main className="signup-main" id="main" tabIndex={-1}>
      <div className="signup-done container-wide reveal">
        <span className="signup-done__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="1.6" /></svg>
        </span>
        <h1 className="signup-done__ttl">登録しました</h1>
        <p className="signup-done__desc">
          ダッシュボードで見え方を確認できます。入力した条件は検索の絞り込みにも反映されています。
        </p>

        {c ? (
          <section className="signup-done__check">
            <h2 className="signup-done__check-ttl">自社の検索での見え方</h2>
            <p className="signup-done__check-sub">
              {[`${c.prefecture}${c.city}`, c.employees].filter(Boolean).join("・") || "所在地・規模は未入力です"}
              {picked.length ? `／${picked.map((x) => x.label).join("・")}` : ""}
            </p>
            <ul className="signup-done__links">
              <li>
                <Link href={`/companies/${c.slug}`}>企業ページ（/companies/{c.slug}）を見る</Link>
              </li>
              <li>
                <Link href={condHref}>この条件の検索結果に自社が出るか確認する</Link>
              </li>
            </ul>
          </section>
        ) : null}

        <p className="signup-note signup-done__note">
          企業情報は自己申告のため、登録直後は「確認済み」バッジは付きません。運営確認後に「確認済み」が表示されます。
        </p>

        <div className="signup-done__actions">
          <Link className="btn btn--box-lg btn--dark" href="/admin">ダッシュボードへ</Link>
          <Link className="btn btn--box-lg btn--outline-thin" href={condHref}>検索での見え方を見る</Link>
        </div>
      </div>
    </main>
  );
}

export default async function SignupPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;

  if (one(sp.done)) {
    return (
      <>
        <SignupHeader />
        <DoneScreen />
        <Footer />
      </>
    );
  }

  const user = await currentUser();
  const initial =
    user?.role === "company" && user.company_id ? initialForCompany(user.company_id) : STATIC_INITIAL;

  /* 「直近1か月でN回検索」— events の実カウント（SUS304×小ロット×短納期） */
  const searchCount = recentSearchCount("%SUS304%小ロット%短納期%");

  return (
    <>
      <SignupHeader />

      <main className="signup-main" id="main" tabIndex={-1}>
        {/* ======= intro / steps ======= */}
        <div className="signup-intro container-wide reveal">
          <div className="signup-intro__txt">
            <h1>御社が「どんな条件で探されるか」を決めます</h1>
            <p>ここで入力した項目が、そのまま検索の絞り込み条件になります。あとから何度でも編集できます。</p>
          </div>
          <ol className="steps" aria-label="登録ステップ">
            <li className="step is-done">1　会社の基本情報<span className="step__check" aria-hidden="true">✓</span></li>
            <li className="steps__line" aria-hidden="true"></li>
            <li className="step is-active" aria-current="step">2　対応条件</li>
            <li className="steps__line" aria-hidden="true"></li>
            <li className="step is-next">3　最初の記事（あとでも可）</li>
          </ol>
          <p className="signup-intro__meta">所要 約5分／残り 2ステップ</p>
        </div>

        <SignupClient initial={initial} searchCount={searchCount} />
      </main>

      <Footer />
    </>
  );
}
