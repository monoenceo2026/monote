"use client";

import { useRef, useState, useTransition } from "react";
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

type ErrKey = "process" | "material" | "quantity" | "contact_company" | "contact_name" | "contact_email";

export default function InquiryClient({
  recipients: initialRecipients,
  contact,
  source,
}: {
  recipients: Recipient[];
  contact: ContactPrefill;
  source: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  /* 相談の種類 */
  const [type, setType] = useState<string>("estimate");

  /* 依頼の条件 */
  const [process, setProcess] = useState(PROCESS_OPTIONS[0]);
  const [material, setMaterial] = useState(MATERIAL_OPTIONS[0]);
  const [quantity, setQuantity] = useState("20個（試作）");
  const [deadline, setDeadline] = useState("2026年8月25日まで");
  const [size, setSize] = useState("");
  const [tol, setTol] = useState("");
  const [budget, setBudget] = useState(""); // "" = 未定でも可（プレースホルダ扱い）
  const [industry, setIndustry] = useState(INDUSTRY_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const [anon, setAnon] = useState(true);
  const [nofwd, setNofwd] = useState(false);

  /* 連絡先（ログイン中はプリフィル） */
  const [company, setCompany] = useState(contact.company);
  const [name, setName] = useState(contact.name);
  const [email, setEmail] = useState(contact.email);
  const [phone, setPhone] = useState(contact.phone);

  /* 送信先 */
  const [recipients, setRecipients] = useState<Recipient[]>(initialRecipients);

  /* validation / feedback */
  const [errors, setErrors] = useState<ErrKey[]>([]);
  const [sideError, setSideError] = useState("");
  const [toast, setToast] = useState("");
  const [noteMsg, setNoteMsg] = useState("入力内容は自動保存されます");
  const [noteSaved, setNoteSaved] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusSnapshot = useRef("");

  const flashSaved = (msg = "入力内容を自動保存しました", ms = 1600) => {
    setNoteMsg(msg);
    setNoteSaved(true);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      setNoteMsg("入力内容は自動保存されます");
      setNoteSaved(false);
    }, ms);
  };
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  };
  /* static版の change イベント相当: テキスト欄は編集して離れたときに自動保存表示 */
  const onTextFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    focusSnapshot.current = e.target.value;
  };
  const onTextBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.value !== focusSnapshot.current) flashSaved();
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
  });

  const missingRequired = (): ErrKey[] => {
    const errs: ErrKey[] = [];
    if (!process.trim()) errs.push("process");
    if (!material.trim()) errs.push("material");
    if (!quantity.trim()) errs.push("quantity");
    if (!company.trim()) errs.push("contact_company");
    if (!name.trim()) errs.push("contact_name");
    if (!email.trim()) errs.push("contact_email");
    return errs;
  };

  const doSend = () => {
    if (!recipients.length || pending) return;
    const errs = missingRequired();
    if (errs.length) {
      setErrors(errs);
      setSideError("必須項目が未入力です。※必須 の項目を入力してください。");
      showToast("必須項目を入力してください");
      return;
    }
    setErrors([]);
    setSideError("");
    startTransition(async () => {
      const res = await sendInquiryAction(payload());
      if (!res.ok) {
        setErrors(res.errors.filter((e): e is ErrKey => e !== "recipients"));
        setSideError(
          res.errors.includes("recipients")
            ? "送信先が選ばれていません。"
            : "必須項目が未入力です。※必須 の項目を入力してください。"
        );
        return;
      }
      router.push(`/inquiry/new?sent=${res.id}`);
    });
  };

  const doDraft = () => {
    if (pending) return;
    startTransition(async () => {
      await saveDraftAction(payload());
      flashSaved("下書きを保存しました", 2600);
      showToast("下書きを保存しました");
    });
  };

  const addFiles = (list: FileList) => {
    const names = Array.from(list).map((f) => f.name);
    if (!names.length) return;
    setFiles((prev) => [...prev, ...names]);
    flashSaved();
  };
  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const removeRecipient = (id: number) => setRecipients((prev) => prev.filter((r) => r.id !== id));

  const n = recipients.length;

  return (
    <main className="inquiry container-wide">
      {/* ==================== step indicator ==================== */}
      <div className="steps">
        <ol className="steps__list">
          <li className="steps__pill is-done">1　相談の種類</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill is-current" aria-current="step">2　条件を入力</li>
          <li className="steps__line" aria-hidden="true"></li>
          <li className="steps__pill">3　送信先の確認</li>
        </ol>
        <p className={`steps__note${noteSaved ? " is-saved" : ""}`} id="autosave-note">{noteMsg}</p>
      </div>

      <div className="inquiry__layout">
        <form className="inquiry__main" id="inquiry-form" noValidate onSubmit={(e) => e.preventDefault()}>
          {/* ========== 相談の種類 ========== */}
          <section className="iq-section reveal" aria-labelledby="type-ttl">
            <div className="sec-ttl"><h2 id="type-ttl">相談の種類</h2></div>
            <div className="type-grid" role="radiogroup" aria-labelledby="type-ttl" data-stagger="0.05">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`type-card${type === t.value ? " is-selected" : ""}`}
                  role="radio"
                  aria-checked={type === t.value}
                  onClick={() => { setType(t.value); flashSaved(); }}
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
                    onChange={(e) => { setProcess(e.target.value); clearErr("process"); flashSaved(); }}
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
                    onChange={(e) => { setMaterial(e.target.value); clearErr("material"); flashSaved(); }}
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
                  onFocus={onTextFocus}
                  onBlur={onTextBlur}
                />
                {hasErr("quantity") ? <p className="field__error">数量・ロットを入力してください</p> : null}
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-due">希望納期</label>
                <input className="input" id="f-due" type="text" value={deadline}
                  onChange={(e) => setDeadline(e.target.value)} onFocus={onTextFocus} onBlur={onTextBlur} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-size">サイズ・板厚</label>
                <input className="input" id="f-size" type="text" placeholder="例：板厚1.5mm／300×400mm" value={size}
                  onChange={(e) => setSize(e.target.value)} onFocus={onTextFocus} onBlur={onTextBlur} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-tol">要求精度</label>
                <input className="input" id="f-tol" type="text" placeholder="例：±0.05mm" value={tol}
                  onChange={(e) => setTol(e.target.value)} onFocus={onTextFocus} onBlur={onTextBlur} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-budget">予算の目安</label>
                <div className="selectbox">
                  <select
                    id="f-budget"
                    aria-label="予算の目安"
                    value={budget}
                    onChange={(e) => { setBudget(e.target.value); flashSaved(); }}
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
                    onChange={(e) => { setIndustry(e.target.value); flashSaved(); }}
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
                onFocus={onTextFocus}
                onBlur={onTextBlur}
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
                  onChange={(e) => { setAnon(e.target.checked); flashSaved(); }} />
                <span className="opt__box" aria-hidden="true">
                  <svg viewBox="0 0 20 20" fill="none"><path d="M4.6 10.4 8.2 14l7.2-7.6" stroke="currentColor" strokeWidth="1.1" /></svg>
                </span>
                <span className="opt__ttl">社名を伏せて相談する</span>
                <span className="opt__desc">送信先には条件・添付のみが届き、社名と担当者名は返信を承諾した時点で開示されます</span>
              </label>
              <label className="opt">
                <input type="checkbox" id="opt-nofwd" checked={nofwd}
                  onChange={(e) => { setNofwd(e.target.checked); flashSaved(); }} />
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
                  onChange={(e) => { setCompany(e.target.value); if (e.target.value.trim()) clearErr("contact_company"); }}
                  onFocus={onTextFocus} onBlur={onTextBlur} />
                {hasErr("contact_company") ? <p className="field__error">会社名を入力してください</p> : null}
              </div>
              <div className={`field${hasErr("contact_name") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-name">担当者名<span className="req">※必須</span></label>
                <input className="input" id="f-name" type="text" placeholder="田中" value={name}
                  onChange={(e) => { setName(e.target.value); if (e.target.value.trim()) clearErr("contact_name"); }}
                  onFocus={onTextFocus} onBlur={onTextBlur} />
                {hasErr("contact_name") ? <p className="field__error">担当者名を入力してください</p> : null}
              </div>
              <div className={`field${hasErr("contact_email") ? " has-error" : ""}`}>
                <label className="field__label" htmlFor="f-mail">メールアドレス<span className="req">※必須</span></label>
                <input className="input" id="f-mail" type="email" placeholder="tanaka@example.co.jp" value={email}
                  onChange={(e) => { setEmail(e.target.value); if (e.target.value.trim()) clearErr("contact_email"); }}
                  onFocus={onTextFocus} onBlur={onTextBlur} />
                {hasErr("contact_email") ? <p className="field__error">メールアドレスを入力してください</p> : null}
              </div>
              <div className="field">
                <label className="field__label" htmlFor="f-tel">電話番号（任意）</label>
                <input className="input" id="f-tel" type="tel" placeholder="06-0000-0000" value={phone}
                  onChange={(e) => setPhone(e.target.value)} onFocus={onTextFocus} onBlur={onTextBlur} />
              </div>
            </div>
          </section>
        </form>

        {/* ==================== sidebar ==================== */}
        <aside className="inquiry__side">
          <div className="side-card reveal" id="recipients-card">
            <div className="side-card__head">
              <h2 className="side-card__ttl">送信先  <span className="js-count">{n}</span>社</h2>
              <Link className="btn btn--box btn--outline" href="/my/compare">変更</Link>
            </div>
            <ul className="rec-list" id="rec-list">
              {recipients.map((r) => (
                <li className="rec" key={r.id}>
                  <span className="ph-thumb rec__thumb" aria-hidden="true"></span>
                  <div className="rec__txt">
                    <p className="rec__name">{r.name}</p>
                    <p className="rec__meta">{r.response_days != null ? `返信 平均${r.response_days}営業日` : "返信 実績なし"}</p>
                  </div>
                  <button type="button" className="rec__x" aria-label={`${r.name}を送信先から外す`} onClick={() => removeRecipient(r.id)}>
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
              <li>相談見積の依頼は無料です</li>
              <li>MONOTEは仲介手数料は取りません（β板）</li>
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
