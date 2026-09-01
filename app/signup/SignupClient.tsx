"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { submitSignupAction, type SignupPayload } from "./actions";
import {
  AREA_OPTIONS,
  CERT_OPTIONS,
  MAT_CHIPS,
  PRECISION_OPTIONS,
  PRICE_OPTIONS,
  PROC_CHIPS,
  meterPct,
  type ChipDef,
} from "./defs";

export type SignupInitial = {
  companyName: string;
  procOn: string[];
  matOn: string[];
  lotMin: string;
  lotMax: string;
  precision: string;
  size: string;
  deadline: string;
  express: boolean;
  cert: string;
  areaSel: string;
  price: string;
  hours: string;
  hard: string;
  pvName: string; // プレビューのフォールバック社名
  pvSub: string; // プレビューの所在地・規模
};

/* 静的版 signup.html と同じ SVG パーツ */
function CkBox() {
  return (
    <svg className="ckchip__box" viewBox="0 0 15 15" aria-hidden="true">
      <rect x="1.75" y="1.75" width="11.5" height="11.5" fill="none" stroke="currentColor" strokeWidth="1" />
      <path className="tick" d="M4.2 7.6l2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
function Caret() {
  return (
    <svg className="fld__caret" viewBox="0 0 8 6" aria-hidden="true">
      <path d="M0.7 0.9h6.6L4 5.4z" fill="currentColor" />
    </svg>
  );
}

export default function SignupClient({ initial, searchCount }: { initial: SignupInitial; searchCount: number }) {
  const [pending, startTransition] = useTransition();

  const [companyName, setCompanyName] = useState(initial.companyName);
  const [procOn, setProcOn] = useState<string[]>(initial.procOn);
  const [matOn, setMatOn] = useState<string[]>(initial.matOn);
  const [lotMin, setLotMin] = useState(initial.lotMin);
  const [lotMax, setLotMax] = useState(initial.lotMax);
  const [precision, setPrecision] = useState(initial.precision);
  const [size, setSize] = useState(initial.size);
  const [deadline, setDeadline] = useState(initial.deadline);
  const [express, setExpress] = useState(initial.express);
  const [cert, setCert] = useState(initial.cert);
  const [areaSel, setAreaSel] = useState(initial.areaSel);
  const [price, setPrice] = useState(initial.price);
  const [hours, setHours] = useState(initial.hours);
  const [hard, setHard] = useState(initial.hard);

  const intentRef = useRef<"next" | "later">("next");

  const toggle = (list: string[], set: (v: string[]) => void, label: string) => {
    set(list.includes(label) ? list.filter((l) => l !== label) : [...list, label]);
  };

  /* ---- preview ✓chips: 1素材 + 1工程(まとめ表記) + ロット（静的版 signup.js のロジック） ---- */
  const pvLabels = (() => {
    const labels: string[] = [];
    const mats = MAT_CHIPS.filter((c) => matOn.includes(c.label));
    if (mats.length) labels.push(mats[0].pv);
    const procs = PROC_CHIPS.filter((c) => procOn.includes(c.label));
    const seen = new Set<string>();
    for (const p of procs) {
      if (labels.length >= 2) break;
      if (!seen.has(p.pv)) {
        seen.add(p.pv);
        labels.push(p.pv);
      }
    }
    const min = (lotMin || "").replace(/[^0-9]/g, "");
    if (min === "1") labels.push("1個から");
    else if (min) labels.push(min + "個〜");
    return labels.slice(0, 3);
  })();

  /* ---- preview values ---- */
  const pvLot = `${lotMin.trim() || "−"}〜${lotMax.trim() || "−"}個`;
  const pvDeadline = deadline.trim() || "−";
  const pvPrice = price === "非公開" ? "非公開" : price.replace(/\s+/g, "");
  const pvIso = cert === "認証なし" ? "" : cert.split("／")[0];
  const pvName = companyName.trim() || initial.pvName;

  /* ---- 充足度 ---- */
  const chipCount = procOn.length + matOn.length;
  const pct = meterPct(chipCount);
  const requiredOk = procOn.length > 0 && matOn.length > 0 && lotMin.trim() !== "";

  /* ---- caret はテキスト直後に置く（Figma準拠）／納期inputは内容幅（静的版のまま移植） ---- */
  const cardRef = useRef<HTMLElement | null>(null);
  const deadlineRef = useRef<HTMLInputElement | null>(null);
  const measurerRef = useRef<HTMLSpanElement | null>(null);

  const layoutInline = () => {
    let m = measurerRef.current;
    if (!m) {
      m = document.createElement("span");
      m.style.cssText =
        'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;' +
        'font:15px/1.3 "IBM Plex Sans JP","Hiragino Kaku Gothic ProN",sans-serif;';
      document.body.appendChild(m);
      measurerRef.current = m;
    }
    const textW = (t: string) => {
      m!.textContent = t;
      return m!.getBoundingClientRect().width;
    };
    cardRef.current?.querySelectorAll<HTMLElement>(".fld__select").forEach((wrap) => {
      const sel = wrap.querySelector("select");
      const caret = wrap.querySelector<SVGSVGElement>(".fld__caret");
      if (!sel || !caret) return;
      const opt = sel.options[sel.selectedIndex];
      const w = 16 + textW(opt ? opt.text : "") + 8;
      if (w < wrap.clientWidth - 24) {
        caret.style.right = "auto";
        caret.style.left = w + "px";
      } else {
        caret.style.left = "auto";
        caret.style.right = "16px";
      }
    });
    const dl = deadlineRef.current;
    if (dl) dl.style.width = Math.max(20, Math.ceil(textW(dl.value)) + 4) + "px";
  };

  useEffect(() => {
    layoutInline();
  });
  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(layoutInline);
    window.addEventListener("load", layoutInline);
    return () => {
      window.removeEventListener("load", layoutInline);
      measurerRef.current?.remove();
      measurerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- submit（次へ／あとで入力して先に進む） ---- */
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const payload: SignupPayload = {
      companyName,
      processChips: procOn,
      materialChips: matOn,
      lotMin,
      lotMax,
      precision,
      size,
      deadline,
      express,
      cert,
      areaSel,
      price,
      hours,
      hard,
      intent: intentRef.current,
    };
    startTransition(async () => {
      await submitSignupAction(payload);
    });
  };

  const chipButton = (c: ChipDef, list: string[], set: (v: string[]) => void) => {
    const on = list.includes(c.label);
    return (
      <button
        key={c.label}
        type="button"
        className={`ckchip${on ? " is-on" : ""}`}
        aria-pressed={on}
        data-label={c.pv}
        onClick={() => toggle(list, set, c.label)}
      >
        <CkBox />
        {c.label}
      </button>
    );
  };

  return (
    <div className="signup-cols container-wide">
      {/* ======= main column ======= */}
      <form className="signup-col-main" onSubmit={onSubmit}>
        <section className="signup-card reveal" ref={cardRef}>
          {/* 会社名（step1の代替） */}
          <div className="sg-group">
            <div className="sg-group__head -left">
              <h2 className="sg-group__ttl">会社名</h2>
              <p className="sg-group__note">検索結果にこの名前で表示されます</p>
            </div>
            <input
              className="fld__input"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="例：株式会社○○製作所"
              aria-label="会社名"
              required
            />
          </div>

          <hr className="sg-rule" />

          {/* できる加工・工程 */}
          <div className="sg-group">
            <div className="sg-group__head">
              <h2 className="sg-group__ttl">できる加工・工程</h2>
              <p className="sg-group__note">当てはまるものをすべて</p>
            </div>
            <div className="ckchips" id="chips-process">
              {PROC_CHIPS.map((c) => chipButton(c, procOn, setProcOn))}
            </div>
          </div>

          <hr className="sg-rule" />

          {/* 扱える素材 */}
          <div className="sg-group">
            <div className="sg-group__head">
              <h2 className="sg-group__ttl">扱える素材</h2>
              <p className="sg-group__note">当てはまるものをすべて</p>
            </div>
            <div className="ckchips" id="chips-material">
              {MAT_CHIPS.map((c) => chipButton(c, matOn, setMatOn))}
            </div>
          </div>

          <hr className="sg-rule" />

          {/* 2カラムフォーム */}
          <div className="sg-fields">
            <div className="fld">
              <div className="fld__label">
                <span>対応ロット</span>
                <span className="tag tag--blue">探す人が最も重視</span>
              </div>
              <div className="fld__lot">
                <input
                  className="fld__input"
                  id="lot-min"
                  type="text"
                  value={lotMin}
                  onChange={(e) => setLotMin(e.target.value)}
                  aria-label="対応ロット（最小）"
                />
                <span className="fld__lot-sep">〜</span>
                <input
                  className="fld__input"
                  id="lot-max"
                  type="text"
                  value={lotMax}
                  onChange={(e) => setLotMax(e.target.value)}
                  aria-label="対応ロット（最大）"
                />
                <span className="fld__lot-unit">個</span>
              </div>
            </div>

            <div className="fld">
              <div className="fld__label"><span>加工精度（標準）</span></div>
              <div className="fld__select">
                <select
                  id="fld-precision"
                  aria-label="加工精度（標準）"
                  value={precision}
                  onChange={(e) => setPrecision(e.target.value)}
                >
                  {PRECISION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <Caret />
              </div>
            </div>

            <div className="fld">
              <div className="fld__label"><span>対応サイズ（最大）</span></div>
              <input
                className="fld__input"
                type="text"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                aria-label="対応サイズ（最大）"
              />
            </div>

            <div className="fld">
              <div className="fld__label"><span>標準納期</span></div>
              <div className="fld__deadline">
                <input
                  className="fld__bare"
                  id="fld-deadline"
                  type="text"
                  ref={deadlineRef}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  aria-label="標準納期"
                />
                <label className="cbx-label">
                  <input
                    type="checkbox"
                    id="cbx-express"
                    checked={express}
                    onChange={(e) => setExpress(e.target.checked)}
                  />
                  <svg className="cbx" viewBox="0 0 15 15" aria-hidden="true">
                    <rect x="1.75" y="1.75" width="11.5" height="11.5" fill="none" stroke="currentColor" strokeWidth="1" />
                    <path className="tick" d="M4.2 7.6l2.2 2.2 4.4-4.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  特急応相談
                </label>
              </div>
            </div>

            <div className="fld">
              <div className="fld__label"><span>品質・認証</span></div>
              <div className="fld__select">
                <select aria-label="品質・認証" value={cert} onChange={(e) => setCert(e.target.value)}>
                  {CERT_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <Caret />
              </div>
            </div>

            <div className="fld">
              <div className="fld__label"><span>対応エリア</span></div>
              <div className="fld__select">
                <select aria-label="対応エリア" value={areaSel} onChange={(e) => setAreaSel(e.target.value)}>
                  {AREA_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <Caret />
              </div>
            </div>

            <div className="fld">
              <div className="fld__label">
                <span>価格帯の目安</span>
                <span className="tag tag--text">非公開にもできます</span>
              </div>
              <div className="fld__select">
                <select id="fld-price" aria-label="価格帯の目安" value={price} onChange={(e) => setPrice(e.target.value)}>
                  {PRICE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
                <Caret />
              </div>
            </div>

            <div className="fld">
              <div className="fld__label"><span>問い合わせ対応時間</span></div>
              <input
                className="fld__input"
                type="text"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                aria-label="問い合わせ対応時間"
              />
            </div>
          </div>

          <hr className="sg-rule" />

          {/* 対応が難しい条件 */}
          <div className="sg-group">
            <div className="sg-group__head -left">
              <h2 className="sg-group__ttl">対応が難しい条件</h2>
              <p className="sg-group__note">先に書いておくと、合わない問い合わせが減ります</p>
            </div>
            <textarea
              className="sg-textarea"
              rows={3}
              value={hard}
              onChange={(e) => setHard(e.target.value)}
              placeholder="板厚6.0mm超／鋳物・樹脂／10,000個以上の量産／めっき・塗装（協力会社へ手配）"
              aria-label="対応が難しい条件"
            ></textarea>
          </div>
        </section>

        {/* ======= bottom actions ======= */}
        <div className="signup-actions reveal">
          <div className="signup-actions__left">
            <Link className="btn btn--box-lg btn--outline-thin" href="/">戻る</Link>
            <p className="signup-actions__note">入力内容は自動保存されます</p>
          </div>
          <div className="signup-actions__right">
            <button
              className="btn btn--box-lg btn--outline-thin"
              type="submit"
              disabled={pending}
              onClick={() => { intentRef.current = "later"; }}
            >あとで入力して先に進む</button>
            <button
              className="btn btn--box-lg btn--dark"
              type="submit"
              disabled={pending}
              onClick={() => { intentRef.current = "next"; }}
            >次へ（最初の記事へ）</button>
          </div>
        </div>
      </form>

      {/* ======= sidebar ======= */}
      <aside className="signup-side" data-stagger="0.08">
        <section className="side-card reveal">
          <div className="side-card__head">
            <h2 className="side-card__ttl">検索結果での見え方</h2>
            <span className="tag tag--blue">入力にあわせて変化</span>
          </div>
          <div className="pv">
            <div className="pv__company">
              <div className="ph-thumb pv__thumb" aria-hidden="true"></div>
              <div className="pv__company-txt">
                <div className="pv__name-row">
                  <p className="pv__name">{pvName}</p>
                  {pvIso ? <span className="tag tag--text pv__iso">{pvIso}</span> : null}
                </div>
                <p className="pv__sub">{initial.pvSub}</p>
              </div>
            </div>
            <div className="pv__chips" id="pv-chips" hidden={pvLabels.length === 0}>
              {pvLabels.map((label) => (
                <span key={label} className="pv-chip">
                  <span className="pv-chip__ck">✓</span>
                  {label}
                </span>
              ))}
            </div>
            <dl className="pv__specs">
              <div className="pv__spec"><dt>ロット</dt><dd id="pv-lot">{pvLot}</dd></div>
              <div className="pv__spec"><dt>精度</dt><dd id="pv-precision">{precision}</dd></div>
              <div className="pv__spec"><dt>納期</dt><dd id="pv-deadline">{pvDeadline}</dd></div>
              <div className="pv__spec"><dt>価格</dt><dd id="pv-price">{pvPrice}</dd></div>
            </dl>
          </div>
          <p className="side-card__desc">
            この条件だと、直近1か月で<strong>{searchCount}回</strong>検索されている「SUS304×小ロット×短納期」に表示されます。
          </p>
        </section>

        <section className="side-card reveal">
          <h2 className="side-card__ttl">入力の充足度</h2>
          <div className="meter">
            <div className="meter__bar"><div className="meter__fill" id="meter-fill" style={{ width: `${pct}%` }}></div></div>
            <p className="meter__pct" id="meter-pct">{pct}%</p>
          </div>
          <ul className="side-check">
            <li className={`side-check__item${requiredOk ? " is-done" : ""}`} id="check-required">
              {requiredOk ? "✓ 加工・材質・ロット（必須）" : "− 加工・材質・ロット（必須）＜ 未入力"}
            </li>
            <li className="side-check__item is-done">✓ 精度・サイズ・納期</li>
            <li className="side-check__item">− 実績・事例（推奨5件）＜ 未入力</li>
            <li className="side-check__item">− 保有設備の型式 ＜ 未入力</li>
          </ul>
        </section>

        <section className="side-card -bg reveal">
          <h2 className="side-card__ttl">この登録でかかる費用</h2>
          <div className="side-cost">
            <p className="side-cost__price">¥0</p>
            <p className="side-cost__for">／企業登録・記事投稿・検索掲載・相談の受信</p>
          </div>
          <p className="side-card__desc">
            優先表示・レコメンド配信・運用代行は有料オプション（Phase2）。登録時点で費用は発生しません。
          </p>
        </section>
      </aside>
    </div>
  );
}
