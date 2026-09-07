"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveDraftAction, sendInquiryAction, type InquiryPayload } from "./actions";

export type Recipient = { id: number; name: string; response_days: number | null };
export type ContactPrefill = { company: string; name: string; email: string; phone: string };

const TYPES = [
  { value: "estimate", ttl: "見積を依頼したい", sub: "図面あり／条件のみ どちらでも可" },
  { value: "feasibility", ttl: "対応できるか確認したい", sub: "可否だけ先に知りたい場合" },
  { value: "technical", ttl: "技術的に相談したい", sub: "設計・材質・工法の相談" },
  { value: "partner", ttl: "協力会社を探している", sub: "継続取引を前提とした相談" },
] as const;

const PROCESS_OPTIONS = ["板金・レーザー切断／曲げ", "切削（マシニング／旋盤）", "プレス・絞り", "溶接・組立", "表面処理・めっき"];
const MATERIAL_OPTIONS = ["ステンレス SUS304", "ステンレス SUS316", "鉄 SPCC", "アルミ A5052", "樹脂（POM／PEEKなど）"];
const BUDGET_OPTIONS = ["〜10万円", "10〜50万円", "50〜100万円", "100万円以上"];
const INDUSTRY_OPTIONS = ["半導体製造装置", "医療機器", "食品機械", "自動車・輸送機器", "建築・内装", "その他"];

type ErrKey =
  | "process" | "material" | "quantity"
  | "contact_company" | "contact_name" | "contact_email" | "contact_email_format";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 入力欄の脇に出すエラー（これ以外は右カラムにまとめて出す） */
const FIELD_ERRORS: ErrKey[] = [
  "process", "material", "quantity", "contact_company", "contact_name", "contact_email", "contact_email_format",
];

/** サーバーが返すエラーコードの文言（errors 配列で来る） */
const ERROR_TEXT: Record<string, string> = {
  rate_limited: "短時間に送信が集中しています。10分ほど時間をおいてから、もう一度お試しください。",
  recipients: "送信先が選ばれていません。「変更」から送信先を追加してください。",
  contact_email_format: "メールアドレスの形式が正しくありません（例：tanaka@example.co.jp）。",
};

/** 下書き（?draft=<id>）から復元するときの初期値 */
export type InitialValues = {
  type: string; process: string; material: string; quantity: string; deadline: string;
  size: string; required_precision: string; budget: string; industry: string; note: string;
  attachments: string[]; anonymous: boolean; no_forward: boolean;
};

/** 自動保存で持ち回すフォームの値（送信先は URL / 比較リストが正なので保存しない） */
type FormValues = {
  type: string; process: string; material: string; quantity: string; deadline: string;
  size: string; tol: string; budget: string; industry: string; note: string;
  files: string[]; anon: boolean; nofwd: boolean;
  company: string; name: string; email: string; phone: string;
};

/* ---------- 自動保存（この端末の localStorage。サーバーの「下書き保存」とは別物） ---------- */
const STORAGE_KEY = "monote.inquiry.form.v1";
const STORAGE_MAX_AGE = 14 * 24 * 60 * 60 * 1000; // 2週間で失効
const AUTOSAVE_DEBOUNCE = 700;

type Snapshot = { v: 1; savedAt: number; data: FormValues };

const str = (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback);

/** localStorage の中身は信用せず、型を整えてから復元する */
function sanitize(raw: unknown, base: FormValues): FormValues | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  return {
    type: str(d.type, base.type) || base.type,
    process: str(d.process, base.process) || base.process,
    material: str(d.material, base.material) || base.material,
    quantity: str(d.quantity, base.quantity),
    deadline: str(d.deadline, base.deadline),
    size: str(d.size, base.size),
    tol: str(d.tol, base.tol),
    budget: str(d.budget, base.budget),
    industry: str(d.industry, base.industry) || base.industry,
    note: str(d.note, base.note),
    files: Array.isArray(d.files) ? d.files.filter((f): f is string => typeof f === "string").slice(0, 20) : base.files,
    anon: typeof d.anon === "boolean" ? d.anon : base.anon,
    nofwd: typeof d.nofwd === "boolean" ? d.nofwd : base.nofwd,
    company: str(d.company, base.company),
    name: str(d.name, base.name),
    email: str(d.email, base.email),
    phone: str(d.phone, base.phone),
  };
}

const fmtSavedAt = (ts: number) =>
  new Date(ts).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default function InquiryClient({
  recipients: initialRecipients,
  contact,
  source,
  initial = null,
  draftId = null,
}: {
  recipients: Recipient[];
  contact: ContactPrefill;
  source: string;
  /** 保存済みの下書き（?draft=<id>）の内容 */
  initial?: InitialValues | null;
  /** 上書き保存の対象になる下書きID */
  draftId?: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* このページを開いた時点の値（下書きから開いた場合はその内容、それ以外は既定値＋連絡先プリフィル）。
     「破棄」したときの戻り先にもなる */
  const base = useRef<FormValues>({
    type: initial?.type || "estimate",
    process: initial?.process || PROCESS_OPTIONS[0],
    material: initial?.material || MATERIAL_OPTIONS[0],
    quantity: initial ? initial.quantity : "20個（試作）",
    deadline: initial ? initial.deadline : "2026年8月25日まで",
    size: initial?.size ?? "",
    tol: initial?.required_precision ?? "",
    budget: initial?.budget ?? "", // "" = 未定でも可（プレースホルダ扱い）
    industry: initial?.industry || INDUSTRY_OPTIONS[0],
    note: initial?.note ?? "",
    files: initial?.attachments ?? [],
    anon: initial ? initial.anonymous : true,
    nofwd: initial ? initial.no_forward : false,
    company: contact.company,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
  }).current;

  /* 相談の種類 */
  const [type, setType] = useState<string>(base.type);

  /* 依頼の条件 */
  const [process, setProcess] = useState(base.process);
  const [material, setMaterial] = useState(base.material);
  const [quantity, setQuantity] = useState(base.quantity);
  const [deadline, setDeadline] = useState(base.deadline);
  const [size, setSize] = useState(base.size);
  const [tol, setTol] = useState(base.tol);
  const [budget, setBudget] = useState(base.budget);
  const [industry, setIndustry] = useState(base.industry);
  const [note, setNote] = useState(base.note);
  const [files, setFiles] = useState<string[]>(base.files);
  const [drag, setDrag] = useState(false);
  const [anon, setAnon] = useState(base.anon);
  const [nofwd, setNofwd] = useState(base.nofwd);

  /* 連絡先（ログイン中はプリフィル） */
  const [company, setCompany] = useState(base.company);
  const [name, setName] = useState(base.name);
  const [email, setEmail] = useState(base.email);
  const [phone, setPhone] = useState(base.phone);

  /* 送信先 */
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);

  /* validation / feedback */
  const [errors, setErrors] = useState<ErrKey[]>([]);
  const [sideError, setSideError] = useState("");
  const [toast, setToast] = useState("");
  const [noteMsg, setNoteMsg] = useState("入力内容はこの端末に自動保存されます");
  const [noteSaved, setNoteSaved] = useState(false);

  /* 自動保存の復元 / サーバー下書き */
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [autosaveReady, setAutosaveReady] = useState(false);
  const [draftNote, setDraftNote] = useState<{ text: string; href?: string } | null>(
    draftId ? { text: "保存した下書きを開いています。「下書きとして保存」で上書きされます。" } : null
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const typeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const recListRef = useRef<HTMLUListElement>(null);
  const recHeadRef = useRef<HTMLHeadingElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipSave = useRef(true);

  const flashSaved = useCallback((msg = "入力内容を自動保存しました", ms = 1600) => {
    setNoteMsg(msg);
    setNoteSaved(true);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      setNoteMsg("入力内容はこの端末に自動保存されます");
      setNoteSaved(false);
    }, ms);
  }, []);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }, []);

  /* ---------- 自動保存: 復元 → debounce 保存 ---------- */
  const applyValues = (v: FormValues) => {
    setType(v.type); setProcess(v.process); setMaterial(v.material); setQuantity(v.quantity);
    setDeadline(v.deadline); setSize(v.size); setTol(v.tol); setBudget(v.budget);
    setIndustry(v.industry); setNote(v.note); setFiles(v.files); setAnon(v.anon); setNofwd(v.nofwd);
    setCompany(v.company); setName(v.name); setEmail(v.email); setPhone(v.phone);
  };

  useEffect(() => {
    /* ?draft=<id> で開いたときはサーバーに保存した下書きが正。ローカルの自動保存では上書きしない */
    if (!draftId) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const snap = JSON.parse(raw) as Snapshot;
          const data = snap && snap.v === 1 ? sanitize(snap.data, base) : null;
          if (data && Date.now() - Number(snap.savedAt) < STORAGE_MAX_AGE) {
            applyValues(data);
            setRestoredAt(Number(snap.savedAt));
          } else {
            window.localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        /* localStorage が使えない環境（プライベートモード等）では自動保存なしで動かす */
      }
    }
    setAutosaveReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autosaveReady) return;
    /* 復元直後・破棄直後は「保存しました」を出さない（値が変わっていないため） */
    if (skipSave.current) { skipSave.current = false; return; }
    const data: FormValues = {
      type, process, material, quantity, deadline, size, tol, budget, industry, note,
      files, anon, nofwd, company, name, email, phone,
    };
    const t = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, savedAt: Date.now(), data } satisfies Snapshot));
        flashSaved();
      } catch {
        /* 保存できない環境では黙って諦める（嘘の「保存しました」は出さない） */
        setNoteMsg("この環境では自動保存できません");
      }
    }, AUTOSAVE_DEBOUNCE);
    return () => clearTimeout(t);
  }, [autosaveReady, type, process, material, quantity, deadline, size, tol, budget, industry, note,
      files, anon, nofwd, company, name, email, phone, flashSaved]);

  const clearAutosave = useCallback(() => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  }, []);

  /** 復元した内容を捨てて、このページを開いた時点の値に戻す */
  const discardRestored = () => {
    clearAutosave();
    skipSave.current = true;
    applyValues(base);
    setRestoredAt(null);
    setErrors([]);
    setSideError("");
    showToast("前回の入力を破棄しました");
  };

  const hasErr = (k: ErrKey) => errors.includes(k);
  const clearErr = (k: ErrKey) => setErrors((prev) => prev.filter((e) => e !== k));

  const payload = (): InquiryPayload => ({
    type,
    process,
    material,
    quantity,
    deadline,
    size,
    required_precision: tol,
    budget,
    industry,
    note,
    attachments: files,
    anonymous: anon,
    no_forward: nofwd,
    contact_company: company,
    contact_name: name,
    contact_email: email,
    contact_phone: phone,
    source,
    recipientCompanyIds: recipients.map((r) => r.id),
    draftId: draftId ?? undefined,
  });

  const missingRequired = (): ErrKey[] => {
    const errs: ErrKey[] = [];
    if (!process.trim()) errs.push("process");
    if (!material.trim()) errs.push("material");
    if (!quantity.trim()) errs.push("quantity");
    if (!company.trim()) errs.push("contact_company");
    if (!name.trim()) errs.push("contact_name");
    if (!email.trim()) errs.push("contact_email");
    else if (!EMAIL_RE.test(email.trim())) errs.push("contact_email_format");
    return errs;
  };

  /** サーバー / クライアント両方のエラーコードを1行の文言にする */
  const errorMessage = (codes: string[]) => {
    const known = codes.find((c) => ERROR_TEXT[c]);
    return known ? ERROR_TEXT[known] : "必須項目が未入力です。※必須 の項目を入力してください。";
  };

  const doSend = () => {
    if (!recipients.length || pending) return;
    const errs = missingRequired();
    if (errs.length) {
      setErrors(errs);
      setSideError(errorMessage(errs));
      showToast(errs.includes("contact_email_format") ? "メールアドレスをご確認ください" : "必須項目を入力してください");
      return;
    }
    setErrors([]);
    setSideError("");
    startTransition(async () => {
      const res = await sendInquiryAction(payload());
      if (!res.ok) {
        /* 入力欄に紐づくエラーは欄の下に、それ以外（送信先なし・レート制限）は右カラムに出す */
        setErrors(res.errors.filter((e): e is ErrKey => (FIELD_ERRORS as string[]).includes(e)));
        setSideError(errorMessage(res.errors));
        showToast(res.errors.includes("rate_limited") ? "時間をおいて再度お試しください" : "送信できませんでした");
        return;
      }
      clearAutosave(); // 送信できたので、この端末に残した自動保存は消す
      router.push(`/inquiry/new?sent=${res.id}`);
    });
  };

  const doDraft = () => {
    if (pending) return;
    startTransition(async () => {
      const res = await saveDraftAction(payload());
      if (!res.ok) {
        setSideError(errorMessage(res.errors));
        showToast("下書きを保存できませんでした");
        return;
      }
      setSideError("");
      /* 同じ下書きに上書きされるので、何度押しても相談が増えない */
      setDraftNote({
        text: res.reused ? "下書きを上書き保存しました。" : "下書きを保存しました。",
        href: `/inquiry/new?draft=${res.id}`,
      });
      flashSaved(res.reused ? "下書きを上書き保存しました" : "下書きを保存しました", 2600);
      showToast(res.reused ? "下書きを上書き保存しました" : "下書きを保存しました");
    });
  };

  const addFiles = (list: FileList) => {
    const names = Array.from(list).map((f) => f.name);
    if (!names.length) return;
    setFiles((prev) => [...prev, ...names]);
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  /* 外した直後にフォーカスが body に落ちないよう、隣の×ボタン（無ければ見出し）へ移す */
  const removeRecipient = (id: number) => {
    const idx = recipients.findIndex((r) => r.id === id);
    const next = recipients[idx + 1] ?? recipients[idx - 1] ?? null;
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    window.requestAnimationFrame(() => {
      if (next) recListRef.current?.querySelector<HTMLButtonElement>(`[data-rec="${next.id}"]`)?.focus();
      else recHeadRef.current?.focus();
    });
  };

  /* role="radio" のカードを矢印キーで移動・選択できるようにする（ネイティブのラジオと同じ操作感） */
  const onTypeKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const last = TYPES.length - 1;
    const next =
      e.key === "Home" ? 0
      : e.key === "End" ? last
      : e.key === "ArrowRight" || e.key === "ArrowDown" ? (index + 1) % TYPES.length
      : (index - 1 + TYPES.length) % TYPES.length;
    setType(TYPES[next].value);
    typeRefs.current[next]?.focus();
  };

  const n = recipients.length;

  return (
    <main className="inquiry container-wide" id="main" tabIndex={-1}>
      {/* 画面上は見出しを置かない設計（Figma）なので、h1 は読み上げ専用にして見出し構造だけ整える */}
      <h1 className="iq-h1">相談・見積を依頼する</h1>

      {/* ==================== step indicator ==================== */}
      <div className="steps">
        <ol className="steps__list">
          <li className="steps__pill is-done">1　相談の種類</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill is-current" aria-current="step">2　条件を入力</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill">3　送信先の確認</li>
        </ol>
        <p className={`steps__note${noteSaved ? " is-saved" : ""}`} id="autosave-note" aria-live="polite">{noteMsg}</p>
      </div>

      {restoredAt ? (
        <div className="iq-restore" role="status">
          <p className="iq-restore__txt">前回の入力を復元しました（{fmtSavedAt(restoredAt)} 時点）</p>
          <button type="button" className="iq-restore__discard" onClick={discardRestored}>破棄して入力し直す</button>
        </div>
      ) : null}

      <div className="inquiry__layout">
        <form className="inquiry__main" id="inquiry-form" noValidate onSubmit={(e) => e.preventDefault()}>
          {/* ========== 相談の種類 ========== */}
          <section className="iq-section reveal" aria-labelledby="type-ttl">
            <div className="sec-ttl"><h2 id="type-ttl">相談の種類</h2></div>
            <div className="type-grid" role="radiogroup" aria-labelledby="type-ttl" data-stagger="0.05">
              {TYPES.map((t, i) => (
                <button
                  key={t.value}
                  type="button"
                  ref={(el) => { typeRefs.current[i] = el; }}
                  className={`type-card${type === t.value ? " is-selected" : ""}`}
                  role="radio"
                  aria-checked={type === t.value}
                  tabIndex={type === t.value ? 0 : -1}
                  onKeyDown={(e) => onTypeKeyDown(e, i)}
                  onClick={() => setType(t.value)}
                >
                  <span className="type-card__ttl">{t.ttl}</span>
                  <span className="type-card__sub">{t.sub}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ========== 依頼の条件 ========== */}
          <section className="iq-section reveal" aria-labelledby="cond-ttl">
            <div className="sec-ttl">
              <h2 id="cond-ttl">依頼の条件</h2>
              <p className="note">検索した条件が引き継がれています</p>
            </div>

            <div className="field-grid">
              <div className={`field${hasErr("process") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-process">加工・工程<span className="req">※必須</span></label>
                <div className="selectbox">
                  <select
                    id="f-process"
                    aria-label="加工・工程"
                    value={process}
                    onChange={(e) => { setProcess(e.target.value); clearErr("process"); }}
                  >
                    {PROCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className="selectbox__view">{process}</span>
                  <span className="selectbox__caret" aria-hidden="true"></span>
                </div>
                {hasErr("process") ? <p className="field__error">加工・工程を選択してください</p> : null}
              </div>
              <div className={`field${hasErr("material") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-material">材質<span className="req">※必須</span></label>
                <div className="selectbox">
                  <select
                    id="f-material"
                    aria-label="材質"
                    value={material}
                    onChange={(e) => { setMaterial(e.target.value); clearErr("material"); }}
                  >
                    {MATERIAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className="selectbox__view">{material}</span>
                  <span className="selectbox__caret" aria-hidden="true"></span>
                </div>
                {hasErr("material") ? <p className="field__error">材質を選択してください</p> : null}
              </div>
              <div className={`field${hasErr("quantity") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-lot">数量・ロット<span className="req">※必須</span></label>
                <input
                  className="input"
                  id="f-lot"
                  type="text"
                  value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); if (e.target.value.trim()) clearErr("quantity"); }}
                />
                {hasErr("quantity") ? <p className="field__error">数量・ロットを入力してください</p> : null}
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-due">希望納期</label>
                <input className="input" id="f-due" type="text" value={deadline}
                  onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-size">サイズ・板厚</label>
                <input className="input" id="f-size" type="text" placeholder="例：板厚1.5mm／300×400mm" value={size}
                  onChange={(e) => setSize(e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-tol">要求精度</label>
                <input className="input" id="f-tol" type="text" placeholder="例：±0.05mm" value={tol}
                  onChange={(e) => setTol(e.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-budget">予算の目安</label>
                <div className="selectbox">
                  <select
                    id="f-budget"
                    aria-label="予算の目安"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  >
                    <option value="">未定でも可</option>
                    {BUDGET_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className={`selectbox__view${budget === "" ? " is-placeholder" : ""}`}>{budget === "" ? "未定でも可" : budget}</span>
                  <span className="selectbox__caret" aria-hidden="true"></span>
                </div>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-use">用途・業種</label>
                <div className="selectbox">
                  <select
                    id="f-use"
                    aria-label="用途・業種"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  >
                    {INDUSTRY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <span className="selectbox__view">{industry}</span>
                  <span className="selectbox__caret" aria-hidden="true"></span>
                </div>
              </div>
            </div>

            <div className="field">
              <label className="field__label" htmlFor="f-note">補足・背景</label>
              <textarea
                className="textarea iq-textarea"
                id="f-note"
                rows={3}
                placeholder="現行品の曲げ割れを改善したく、Rの指定から相談したいです。図面は暫定的です。"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              ></textarea>
            </div>

            <div className="field">
              <p className="field__label" id="attach-label">図面・写真の添付</p>
              <div
                className={`dropzone${drag ? " is-drag" : ""}`}
                id="dropzone"
                aria-labelledby="attach-label"
                onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
                }}
              >
                <p className="dropzone__hint">ファイルをドラッグ&amp;ドロップ（PDF / DXF / STEP / 画像・20MBまで）</p>
                <div className="dropzone__row">
                  <button type="button" className="btn btn--box btn--outline-thin dropzone__btn" id="file-btn"
                    onClick={() => fileInput.current?.click()}>ファイルを選ぶ</button>
                  <p className="dropzone__hint">図面がなくても送信できます。</p>
                </div>
                <ul className="dropzone__files" id="file-list" hidden={files.length === 0}>
                  {files.map((f, i) => (
                    <li key={`${f}-${i}`}>
                      <span>{f}</span>
                      <button type="button" aria-label={`${f} を削除`} onClick={() => removeFile(i)}>×</button>
                    </li>
                  ))}
                </ul>
                <input
                  type="file"
                  id="file-input"
                  multiple
                  hidden
                  accept=".pdf,.dxf,.step,.stp,image/*"
                  ref={fileInput}
                  onChange={(e) => {
                    if (e.target.files) addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            <div className="option-box">
              <label className="opt">
                <input type="checkbox" id="opt-anon" checked={anon}
                  onChange={(e) => setAnon(e.target.checked)} />
                <span className="opt__box" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M4.6 10.4 8.2 14l7.2-7.6" stroke="currentColor" strokeWidth="1.1" /></svg>
                </span>
                <span className="opt__ttl">社名を伏せて相談する</span>
                <span className="opt__desc">送信先には条件・添付のみが届き、社名と担当者名は返信を承諾した時点で開示されます</span>
              </label>
              <label className="opt">
                <input type="checkbox" id="opt-nofwd" checked={nofwd}
                  onChange={(e) => setNofwd(e.target.checked)} />
                <span className="opt__box" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M4.6 10.4 8.2 14l7.2-7.6" stroke="currentColor" strokeWidth="1.1" /></svg>
                </span>
                <span className="opt__ttl">添付図面を他社に転送しない</span>
                <span className="opt__desc">複数社へ同時送信する場合の制御</span>
              </label>
            </div>
          </section>

          {/* ========== 連絡先 ========== */}
          <section className="iq-section reveal" aria-labelledby="contact-ttl">
            <div className="sec-ttl"><h2 id="contact-ttl">連絡先</h2></div>
            <div className="field-grid">
              <div className={`field${hasErr("contact_company") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-company">会社名<span className="req">※必須</span></label>
                <input className="input" id="f-company" type="text" placeholder="株式会社○○" value={company}
                  onChange={(e) => { setCompany(e.target.value); if (e.target.value.trim()) clearErr("contact_company"); }} />
                {hasErr("contact_company") ? <p className="field__error">会社名を入力してください</p> : null}
              </div>
              <div className={`field${hasErr("contact_name") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-name">担当者名<span className="req">※必須</span></label>
                <input className="input" id="f-name" type="text" placeholder="田中" value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) clearErr("contact_name"); }} />
                {hasErr("contact_name") ? <p className="field__error">担当者名を入力してください</p> : null}
              </div>
              <div className={`field${hasErr("contact_email") || hasErr("contact_email_format") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-mail">メールアドレス<span className="req">※必須</span></label>
                <input className="input" id="f-mail" type="email" placeholder="tanaka@example.co.jp" value={email}
                  onChange={(e) => { setEmail(e.target.value); clearErr("contact_email"); clearErr("contact_email_format"); }} />
                {hasErr("contact_email") ? <p className="field__error">メールアドレスを入力してください</p> : null}
                {hasErr("contact_email_format") ? <p className="field__error">メールアドレスの形式が正しくありません（例：tanaka@example.co.jp）</p> : null}
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-tel">電話番号（任意）</label>
                <input className="input" id="f-tel" type="tel" placeholder="06-0000-0000" value={phone}
                  onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          </section>
        </form>

        {/* ==================== sidebar ==================== */}
        <aside className="inquiry__side">
          <div className="side-card reveal" id="recipients-card">
            <div className="side-card__head">
              <h2 className="side-card__ttl" ref={recHeadRef} tabIndex={-1}>送信先  <span className="js-count">{n}</span>社</h2>
              <Link className="btn btn--box btn--outline" href="/my/compare">変更</Link>
            </div>
            <ul className="rec-list" id="rec-list" ref={recListRef}>
              {recipients.map((r) => (
                <li className="rec" key={r.id}>
                  <span className="ph-thumb rec__thumb" aria-hidden="true"></span>
                  <div className="rec__txt">
                    <p className="rec__name">{r.name}</p>
                    <p className="rec__meta">{r.response_days != null ? `返信 平均${r.response_days}営業日` : "返信 実績なし"}</p>
                  </div>
                  <button type="button" className="rec__x" data-rec={r.id} aria-label={`${r.name}を送信先から外す`}
                    onClick={() => removeRecipient(r.id)}>
                    <svg viewBox="0 0 20 20" fill="none"><path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="0.9" /></svg>
                  </button>
                </li>
              ))}
            </ul>
            <hr className="side-card__line" />
            <p className="side-card__desc">同じ内容が<span className="js-count">{n}</span>社に同時送信されます。各社の返信はマイページの「相談の履歴」に集約されます。</p>
          </div>

          <div className="side-card reveal">
            <h2 className="side-card__ttl">送信前の確認</h2>
            <ul className="confirm-list">
              <li>相談・見積の依頼は無料です</li>
              <li>MONOTEは仲介手数料を取りません（β版）</li>
              <li>返信がない場合、3営業日後にお知らせします</li>
              <li>技術情報の取り扱いは運営ポリシーに準じます</li>
            </ul>
            <button
              type="button"
              className="btn btn--box btn--dark btn--block side-card__send"
              id="send-btn"
              disabled={n === 0 || pending}
              onClick={doSend}
            >
              <span className="js-count">{n}</span>社に送信する
            </button>
            <button type="button" className="btn btn--box btn--outline-thin btn--block side-card__draft" id="draft-btn"
              disabled={pending} onClick={doDraft}>下書きとして保存</button>
            {draftNote ? (
              <p className="side-card__note" role="status">
                {draftNote.text}
                {draftNote.href ? (
                  <Link className="side-card__note-link" href={draftNote.href}>保存した下書きから再開する</Link>
                ) : null}
              </p>
            ) : null}
            {sideError ? <p className="side-card__error" role="alert">{sideError}</p> : null}
          </div>

          <div className="side-card side-card--dashed reveal">
            <h2 className="side-card__ttl side-card__ttl--sm">Phase2</h2>
            <p className="side-card__desc">送信後の画面に「打ち合わせ日程を調整する」を追加（企業のカレンダーと連携し、その場で商談を確定させる）。有料オプション化の候補。</p>
          </div>
        </aside>
      </div>

      {toast ? <div className="toast">{toast}</div> : null}
    </main>
  );
}
