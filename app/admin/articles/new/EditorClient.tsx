"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Condition } from "@/lib/repo";
import { saveArticleEditorAction } from "./actions";

/* ============================================================
   W-07 記事投稿エディタ — クライアント側
   見た目は admin-article.html と同一。グレーバー部分だけ実際に
   入力できる textarea / contenteditable に置き換え、変更のたびに
   debounce で saveArticle(status:'draft') に自動保存する。
   ============================================================ */

/* テーマ（静的版のラジオと同じ並び・data-lead） */
const THEMES = [
  { key: "jirei", db: "case", name: "加工事例を書く", sub: "いちばん相談につながる型", lead: "起きていた問題" },
  { key: "setsubi", db: "equipment", name: "設備・できることの紹介", sub: "写真1枚あれば書ける", lead: "持っている設備" },
  { key: "hinshitsu", db: "quality", name: "品質・検査の考え方", sub: "信頼づくり向け", lead: "検査の基準" },
  { key: "hito", db: "people", name: "人・現場の話", sub: "採用に効く型", lead: "現場の一日" },
  { key: "gijutsu", db: "explain", name: "技術のしくみを解説", sub: "検索に長く残る型", lead: "よくある疑問" },
] as const;

/* 初期値 = デザイン（シードの SUS304 記事）の文章 */
const INITIAL_TITLE = "SUS304の曲げ割れを減らすために、設計段階でR指定をどう相談してほしいか";
const INITIAL_SECTIONS = [
  {
    heading: "板厚1.0mmのSUS304で、最初に確認していること",
    body:
      "曲げ線と圧延方向の関係、そして内Rの指定があるかどうかを最初に確認します。指定が無い場合は板厚と同じRを仮置きし、試作の1個目で割れの兆候を見ます。\n\n" +
      "圧延方向に平行な曲げは割れやすく、同じ図面でも取り都合によって結果が変わります。ネスティングの段階で曲げ線が方向に直交するよう配置できるか、材料取りとあわせて検討します。",
  },
  {
    heading: "R指定が無いときに、当社が推定する順番",
    body:
      "1) 板厚と同じ内R、2) 使用環境からの応力想定、3) 過去の類似案件、の順で推定します。推定の根拠は見積書に書き添えるようにしています。\n\n" +
      "推定のまま量産に入ると、ロットによる材料の硬さの差で割れが出ることがあります。量産前に一度だけ、R指定の確定について相談させてもらえると手戻りが減ります。",
  },
];

/* この記事につける条件（本文から拾った体の初期セット） */
const INITIAL_ATTACHED_LABELS = ["ステンレス", "板金・プレス", "1個から（試作）", "高精度±0.01mm"];
const SUGGEST_LABELS = ["短納期（7日以内）", "ISO9001"];

type ChipState = { id: number; label: string; attached: boolean; origin: "body" | "suggest"; leaving: boolean };
type SectionState = { key: number; heading: string; body: string };
type Status = "draft" | "review" | "published";

const CloseIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" /></svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11" /></svg>
);

const countChars = (s: string) => s.replace(/\s+/g, " ").trim().length;
const grow = (el: HTMLTextAreaElement) => {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
};
const fmtTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export default function EditorClient({ conditions }: { conditions: Condition[] }) {
  /* ---------- body class（静的版 body.page-admin-article） ---------- */
  useEffect(() => {
    document.body.classList.add("page-admin-article");
    return () => document.body.classList.remove("page-admin-article");
  }, []);

  /* ---------- チップ（実データの conditions から） ---------- */
  const initialChips = useMemo<ChipState[]>(() => {
    const byLabel = new Map(conditions.map((c) => [c.label, c]));
    const chips: ChipState[] = [];
    for (const label of INITIAL_ATTACHED_LABELS) {
      const c = byLabel.get(label);
      if (c) chips.push({ id: c.id, label: c.label, attached: true, origin: "body", leaving: false });
    }
    for (const label of SUGGEST_LABELS) {
      const c = byLabel.get(label);
      if (c) chips.push({ id: c.id, label: c.label, attached: false, origin: "suggest", leaving: false });
    }
    return chips;
  }, [conditions]);

  const [chips, setChips] = useState<ChipState[]>(initialChips);
  const [themeKey, setThemeKey] = useState<(typeof THEMES)[number]["key"]>("jirei");
  const [sections, setSections] = useState<SectionState[]>(
    INITIAL_SECTIONS.map((s, i) => ({ key: i, ...s }))
  );
  const [titleCount, setTitleCount] = useState(countChars(INITIAL_TITLE));
  const [mode, setMode] = useState<Status>("draft");
  const [slug, setSlug] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [barTime, setBarTime] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);

  /* ---------- 現在値（contenteditable/textarea は非制御なので ref で持つ） ---------- */
  const contentRef = useRef<{ title: string; sections: Map<number, { heading: string; body: string }> } | null>(null);
  if (!contentRef.current) {
    contentRef.current = {
      title: INITIAL_TITLE,
      sections: new Map(INITIAL_SECTIONS.map((s, i) => [i, { heading: s.heading, body: s.body }])),
    };
  }
  const chipsRef = useRef(chips);
  chipsRef.current = chips;
  const themeRef = useRef(themeKey);
  themeRef.current = themeKey;
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;

  const articleIdRef = useRef<number | null>(null);
  const statusRef = useRef<Status>("draft");
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), 2600);
  };

  /* ---------- 保存 ---------- */
  const buildPayload = (status: Status) => ({
    id: articleIdRef.current,
    status,
    theme: THEMES.find((t) => t.key === themeRef.current)?.db ?? "case",
    title: contentRef.current!.title,
    sections: sectionsRef.current.map((s) => contentRef.current!.sections.get(s.key) ?? { heading: "", body: "" }),
    conditionIds: chipsRef.current.filter((c) => c.attached).map((c) => c.id),
  });

  const doSave = async (status?: Status): Promise<{ ok: boolean; slug?: string }> => {
    if (savingRef.current) {
      pendingRef.current = true;
      return { ok: false };
    }
    savingRef.current = true;
    const st = status ?? statusRef.current;
    try {
      const res = await saveArticleEditorAction(buildPayload(st));
      if (res.ok) {
        articleIdRef.current = res.id;
        statusRef.current = st;
        setSlug(res.slug);
        const now = new Date();
        setLastSavedAt(now);
        if (st === "draft") setBarTime(fmtTime(now));
        return { ok: true, slug: res.slug };
      }
      if (res.error === "empty") showToast("タイトルか本文を入力してください");
      return { ok: false };
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        timerRef.current = setTimeout(() => void doSave(), 400);
      }
    }
  };

  /* 変更のたびに debounce 自動保存（公開後は published のまま上書き保存） */
  const scheduleAutosave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void doSave(), 1400);
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  /* 「N分前に自動保存しました」を実時刻で更新 */
  useEffect(() => {
    if (!lastSavedAt) return;
    const iv = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(iv);
  }, [lastSavedAt]);

  const autosaveLabel = (() => {
    if (!lastSavedAt) return "1分前に自動保存しました";
    const mins = Math.floor((Date.now() - lastSavedAt.getTime()) / 60000);
    return mins < 1 ? "たった今自動保存しました" : `${mins}分前に自動保存しました`;
  })();

  /* ---------- 公開・社内確認 ---------- */
  const publish = async () => {
    if (busy || mode === "published") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setBusy(true);
    const res = await doSave("published");
    setBusy(false);
    if (res.ok) {
      setMode("published");
      showToast("公開しました");
    }
  };

  const sendReview = async () => {
    if (busy) return;
    if (statusRef.current === "published") {
      showToast("すでに公開済みの記事です");
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    setBusy(true);
    const res = await doSave("review");
    setBusy(false);
    if (res.ok) setMode("review");
  };

  /* ---------- チップ操作 ---------- */
  const clickChip = (chip: ChipState) => {
    if (!chip.attached) {
      /* 追加: グレーの「+」チップが青チップになる */
      setChips((cur) => cur.map((c) => (c.id === chip.id ? { ...c, attached: true } : c)));
      scheduleAutosave();
      return;
    }
    /* 削除: フェードアウト。候補由来なら「+」に戻す */
    setChips((cur) => cur.map((c) => (c.id === chip.id ? { ...c, leaving: true } : c)));
    setTimeout(() => {
      setChips((cur) =>
        chip.origin === "suggest"
          ? cur.map((c) => (c.id === chip.id ? { ...c, attached: false, leaving: false } : c))
          : cur.filter((c) => c.id !== chip.id)
      );
      scheduleAutosave();
    }, 200);
  };

  /* ---------- セクション ---------- */
  const addSection = () => {
    setSections((cur) => {
      const key = cur.length ? Math.max(...cur.map((s) => s.key)) + 1 : 0;
      contentRef.current!.sections.set(key, { heading: "", body: "" });
      return [...cur, { key, heading: "", body: "" }];
    });
    scheduleAutosave();
  };

  const lead = THEMES.find((t) => t.key === themeKey)?.lead ?? "起きていた問題";

  const blurOnEnter = (ev: React.KeyboardEvent<HTMLElement>) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      (ev.currentTarget as HTMLElement).blur();
    }
  };

  return (
    <>
      <main className="editor-main container-wide">

        {/* steps */}
        <div className="steps-row">
          <ol className="steps" aria-label="投稿ステップ">
            <li className="step is-done"><span className="step__num">1</span>テーマを選ぶ</li>
            <li className="steps__line" aria-hidden="true"></li>
            <li className="step is-active" aria-current="step"><span className="step__num">2</span>書く</li>
            <li className="steps__line" aria-hidden="true"></li>
            <li className="step"><span className="step__num">3</span>条件をつける</li>
            <li className="steps__line" aria-hidden="true"></li>
            <li className="step"><span className="step__num">4</span>確認して公開</li>
          </ol>
          <p className="steps-row__saved js-autosave">{autosaveLabel}</p>
        </div>

        {/* theme */}
        <section className="theme-sec" aria-label="選んだテーマ">
          <div className="theme-sec__head">
            <h1 className="theme-sec__ttl">選んだテーマ</h1>
            <p className="theme-sec__note">テーマを変えると見出しの型も切り替わります</p>
          </div>
          <div className="theme-grid reveal" data-stagger role="radiogroup" aria-label="テーマ">
            {THEMES.map((t) => (
              <label key={t.key} className={`theme-card${themeKey === t.key ? " is-selected" : ""}`}>
                <input
                  type="radio"
                  name="theme"
                  value={t.key}
                  checked={themeKey === t.key}
                  onChange={() => { setThemeKey(t.key); scheduleAutosave(); }}
                />
                <p className="theme-card__ttl"><span className="theme-card__mark" aria-hidden="true"></span><span className="theme-card__name">{t.name}</span></p>
                <p className="theme-card__sub">{t.sub}</p>
              </label>
            ))}
          </div>
        </section>

        {/* editor + sidebar */}
        <div className="editor-grid">

          {/* editor card */}
          <section className="editor-card reveal" aria-label="本文エディタ">
            <p className="editor-label">タイトル</p>
            <h2
              className="editor-title js-title"
              contentEditable
              suppressContentEditableWarning
              spellCheck={false}
              onInput={(ev) => {
                const text = ev.currentTarget.textContent ?? "";
                contentRef.current!.title = text;
                setTitleCount(countChars(text));
                scheduleAutosave();
              }}
              onKeyDown={blurOnEnter}
            >
              {INITIAL_TITLE}
            </h2>
            <div className="editor-title-hint">
              <p>検索されやすいタイトルの例：〈材質〉＋〈困りごと〉＋〈どうしたか〉現在<span className="js-title-count">{titleCount}</span>文字（推奨25〜45文字）</p>
            </div>

            <div className="assist-bar">
              <div className="assist-bar__lead">
                <span className="assist-bar__tag">書き出しに困ったら</span>
                <p className="assist-bar__txt">箇条書きや音声メモから下書きをつくる</p>
              </div>
              <div className="assist-bar__btns">
                <button className="mini-btn" type="button">下書きを作る</button>
                <button className="mini-btn" type="button">過去の記事から引用</button>
              </div>
            </div>

            {sections.map((sec, i) => (
              <div key={sec.key} className="editor-section" style={{ display: "contents" }}>
                <div className="editor-hlabel">
                  <p className="editor-label">見出し{i + 1}</p>
                  {i === 0 ? (
                    <p className="editor-hlabel__note">この型では「<span className="js-lead">{lead}</span>」から書きます</p>
                  ) : null}
                </div>
                <ol className="editor-h" start={i + 1}>
                  <li
                    contentEditable
                    suppressContentEditableWarning
                    spellCheck={false}
                    data-placeholder="見出しを入力"
                    onInput={(ev) => {
                      const rec = contentRef.current!.sections.get(sec.key);
                      if (rec) rec.heading = ev.currentTarget.textContent ?? "";
                      scheduleAutosave();
                    }}
                    onKeyDown={blurOnEnter}
                  >
                    {sec.heading}
                  </li>
                </ol>
                <textarea
                  className="editor-body"
                  aria-label={`見出し${i + 1}の本文`}
                  defaultValue={sec.body}
                  rows={3}
                  ref={(el) => { if (el) grow(el); }}
                  onInput={(ev) => {
                    const el = ev.currentTarget;
                    const rec = contentRef.current!.sections.get(sec.key);
                    if (rec) rec.body = el.value;
                    grow(el);
                    scheduleAutosave();
                  }}
                  placeholder="本文を入力（空行で段落を分けられます）"
                />

                {i === 0 ? (
                  <div className="photo-row">
                    <div className="ph-thumb photo-row__thumb"><span>写真を追加</span></div>
                    <div className="photo-row__note">
                      <p>写真が用意できない場合は、そのまま公開できます。<br />図・表・テキストだけの記事でも検索対象になります。</p>
                      <div className="photo-row__btns">
                        <button className="mini-btn" type="button">スマホから送る</button>
                        <button className="mini-btn" type="button">図をつくる</button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}

            <div className="editor-tools">
              <button className="mini-btn mini-btn--plus" type="button" onClick={addSection}><PlusIcon />見出しを追加</button>
              <button className="mini-btn mini-btn--plus" type="button"><PlusIcon />画像</button>
              <button className="mini-btn mini-btn--plus" type="button"><PlusIcon />表</button>
              <button className="mini-btn mini-btn--plus" type="button"><PlusIcon />実績データ</button>
            </div>
          </section>

          {/* sidebar */}
          <aside className="editor-side">

            <section className="side-card reveal" aria-label="この記事につける条件">
              <div className="side-card__head">
                <h2 className="side-card__ttl side-card__ttl--ink">この記事につける条件</h2>
                <span className="tag tag--blue">検索に必要</span>
              </div>
              <p className="side-card__desc">本文から候補を拾いました。合っていれば残してください。</p>
              <div className="cond-chips js-chips">
                {chips.map((c) => (
                  <button
                    key={c.id}
                    className={`cond-chip${c.attached ? "" : " cond-chip--add"}${c.leaving ? " is-leaving" : ""}`}
                    type="button"
                    data-label={c.label}
                    onClick={() => clickChip(c)}
                  >
                    {c.attached ? (<>{c.label}<CloseIcon /></>) : (<><PlusIcon />{c.label}</>)}
                  </button>
                ))}
              </div>
              <hr className="side-card__line" />
              <p className="side-card__desc"><strong>条件を3つ以上つけた記事は、検索での表示が平均2.4倍</strong>（β版の実測値）をここに表示</p>
            </section>

            <section className="side-card reveal" aria-label="公開の設定">
              <h2 className="side-card__ttl">公開の設定</h2>
              <div className="pub-opts">
                <label className="pub-opt">
                  <input type="radio" name="pub" defaultChecked onChange={scheduleAutosave} />
                  <span className="pub-opt__txt">全体に公開する</span>
                </label>
                <label className="pub-opt">
                  <input type="radio" name="pub" onChange={scheduleAutosave} />
                  <span className="pub-opt__txt">条件だけを公開し、本文は問い合わせた企業にのみ開示</span>
                </label>
                <label className="pub-opt">
                  <input type="radio" name="pub" onChange={scheduleAutosave} />
                  <span className="pub-opt__txt">限定公開（URLを知っている人だけ）</span>
                </label>
                <hr className="side-card__line" />
                <label className="pub-opt pub-opt--nw">
                  <input type="checkbox" defaultChecked onChange={scheduleAutosave} />
                  <span className="pub-opt__txt">公開前に社内で確認する<small>（承認者：工場長）</small></span>
                </label>
                <label className="pub-opt pub-opt--nw">
                  <input type="checkbox" defaultChecked onChange={scheduleAutosave} />
                  <span className="pub-opt__txt">編集部のレビューを依頼する<small>（無料・2営業日）</small></span>
                </label>
                <p className="side-card__desc">誤字・専門語の言い換え・見出し構成のみ。技術内容は書き換えません。</p>
              </div>
            </section>

            <section className="side-card reveal" aria-label="公開後にできること">
              <h2 className="side-card__ttl">公開後にできること</h2>
              <ul className="side-card__list">
                <li>どの検索条件で表示されたかを確認</li>
                <li>保存・相談された数を確認</li>
                <li>SNS・自社サイト用のテキストを書き出し</li>
              </ul>
            </section>

          </aside>
        </div>
      </main>

      {/* fixed action bar */}
      <div className="action-bar" role="region" aria-label="保存と公開">
        <div className="action-bar__inner">
          <p className="action-bar__status js-bar-status">
            {mode === "published" && slug ? (
              <>公開しました。<Link href={`/articles/${slug}`}>記事を見る</Link></>
            ) : mode === "review" ? (
              "社内確認へ回しました（承認者：工場長）"
            ) : barTime ? (
              `下書き保存済み ${barTime}・所要時間の目安 15分`
            ) : (
              "下書き保存済み・所要時間の目安 15分"
            )}
          </p>
          <div className="action-bar__btns">
            {mode === "published" && slug ? (
              <Link className="bar-btn" href={`/articles/${slug}`}>プレビュー</Link>
            ) : (
              <button className="bar-btn" type="button" onClick={() => showToast("公開すると記事ページでプレビューできます")}>プレビュー</button>
            )}
            <button className="bar-btn js-send-review" type="button" onClick={() => void sendReview()}>社内確認へ回す</button>
            <button
              className="bar-btn bar-btn--dark js-publish"
              type="button"
              disabled={busy || mode === "published"}
              style={mode === "published" ? { opacity: 0.6 } : undefined}
              onClick={() => void publish()}
            >
              {mode === "published" ? "公開済み" : "公開する"}
            </button>
          </div>
        </div>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
