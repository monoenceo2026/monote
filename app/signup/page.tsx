import Link from "next/link";
import Footer from "@/components/Footer";
import { companyById, conditionsOfCompany } from "@/lib/repo";
import { currentUser } from "@/lib/session";
import { recentSearchCount } from "@/lib/extra/signup";
import SignupClient, { type SignupInitial } from "./SignupClient";
import {
  AREA_OPTIONS,
  CERT_OPTIONS,
  MAT_CHIPS,
  PRECISION_OPTIONS,
  PRICE_OPTIONS,
  PRIMARY_PROC_CHIPS,
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
};

/* ---------- companyユーザー: 自社の条件・プロフィールを初期値に ---------- */
function initialForCompany(companyId: number): SignupInitial {
  const c = companyById(companyId);
  if (!c) return STATIC_INITIAL;
  const keySet = new Set(conditionsOfCompany(c.id).map((x) => `${x.category}:${x.label}`));

  const procOn = [...new Set([...keySet].flatMap((k) => PRIMARY_PROC_CHIPS[k] ?? []))];
  const matOn = MAT_CHIPS.filter((ch) => ch.cond && keySet.has(ch.cond)).map((ch) => ch.label);

  const precisionStr = c.precision_mm != null ? `±${c.precision_mm}mm` : "±0.05mm";
  const precision = PRECISION_OPTIONS.includes(precisionStr) ? precisionStr : "±0.05mm";

  const deadline =
    c.delivery_min != null
      ? c.delivery_max != null && c.delivery_max !== c.delivery_min
        ? `${c.delivery_min}〜${c.delivery_max}日`
        : `${c.delivery_min}日`
      : "";

  const has9001 = keySet.has("cert:ISO9001");
  const has14001 = keySet.has("cert:ISO14001");
  const cert = has9001 && has14001 ? CERT_OPTIONS[0] : has9001 ? "ISO9001" : has14001 ? "ISO14001" : "認証なし";

  const areaSel = c.area.includes("全国")
    ? "全国発送"
    : c.area.includes("関東")
      ? "関東エリア"
      : c.area.includes("関西")
        ? "関西エリア"
        : AREA_OPTIONS[3];

  const price = c.price_hint.includes("非公開")
    ? "非公開"
    : c.price_hint.includes("1万")
      ? "試作 1万円〜"
      : c.price_hint.includes("5万")
        ? "試作 5万円〜"
        : PRICE_OPTIONS[1];

  const place = `${c.prefecture}${c.city}`;
  const pvSub = [place, c.employees].filter(Boolean).join("・") || STATIC_INITIAL.pvSub;

  return {
    companyName: c.name,
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
  };
}

function SignupHeader() {
  return (
    <header className="signup-header">
      <div className="signup-header__inner">
        <Link className="brand" href="/">MONOTE</Link>
        <div className="signup-header__right">
          <p className="signup-header__note">登録は無料です。途中でやめても内容は保存されます。</p>
          <Link className="btn btn--box btn--outline" href="/">あとで続ける</Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- 完了画面（?done=1） ---------- */
function DoneScreen() {
  return (
    <main className="signup-main">
      <div className="signup-done container-wide reveal">
        <span className="signup-done__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5 10 17.5 19 7" stroke="currentColor" strokeWidth="1.6" /></svg>
        </span>
        <h1 className="signup-done__ttl">登録しました</h1>
        <p className="signup-done__desc">
          ダッシュボードで見え方を確認できます。入力した条件は検索の絞り込みにも反映されています。
        </p>
        <div className="signup-done__actions">
          <Link className="btn btn--box-lg btn--dark" href="/admin">ダッシュボードへ</Link>
          <Link className="btn btn--box-lg btn--outline-thin" href="/search">検索での見え方を見る</Link>
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

      <main className="signup-main">
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
