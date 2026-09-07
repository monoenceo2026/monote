"use client";

import { useState, useTransition } from "react";
import { addWorkAction, deleteWorkAction } from "./actions";

export type WorkItem = { id: number; title: string; spec: string };

/**
 * 実績（加工事例）の最小限の追加・削除。
 * ダッシュボードの「実績を追加する」CTA の実際の受け皿（以前は /signup に飛んでいて何もできなかった）。
 * 追加した実績は企業ページ（/companies/[slug]）の「実績・事例」にそのまま出る。
 */
export default function WorksCard({ items, recommended = 5 }: { items: WorkItem[]; recommended?: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [spec, setSpec] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    const t = title.trim();
    if (!t) {
      setMsg("案件名を入力してください");
      return;
    }
    start(async () => {
      const res = await addWorkAction(t, spec.trim());
      if (res.ok) {
        setTitle("");
        setSpec("");
        setMsg("実績を追加しました（企業ページにも反映されます）");
        setOpen(false);
      } else {
        setMsg(res.error === "auth" ? "企業アカウントでログインしてください" : "案件名を入力してください");
      }
    });
  };

  const remove = (id: number) => {
    start(async () => {
      await deleteWorkAction(id);
      setMsg("実績を削除しました");
    });
  };

  const left = Math.max(0, recommended - items.length);

  return (
    <section className="dash-card reveal" id="works">
      <div className="dash-card__head">
        <h2 className="dash-card__ttl dash-card__ttl--ink">実績（加工事例）</h2>
        <p className="dash-card__note">{items.length}件／推奨{recommended}件</p>
      </div>
      <p className="dash-card__foot works-lead">
        {left
          ? `あと${left}件追加すると、検索条件に合ったときに候補として出やすくなります。`
          : "推奨件数を満たしています。内容を最新に保ちましょう。"}
      </p>

      <ul className="works-list">
        {items.map((w) => (
          <li key={w.id} className="works-item">
            <div className="works-item__txt">
              <p className="works-item__ttl">{w.title}</p>
              {w.spec ? <p className="works-item__spec">{w.spec}</p> : null}
            </div>
            <button
              className="btn dash-btn-sm"
              type="button"
              onClick={() => remove(w.id)}
              disabled={pending}
              aria-label={`${w.title} を削除`}
            >
              削除
            </button>
          </li>
        ))}
        {items.length === 0 ? <li className="works-item works-item--empty">まだ実績が登録されていません。</li> : null}
      </ul>

      {open ? (
        <form className="works-form" onSubmit={submit}>
          <label className="works-field">
            <span>案件名</span>
            <input
              type="text"
              value={title}
              maxLength={60}
              autoFocus
              placeholder="例）半導体装置向け SUS304カバー"
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="works-field">
            <span>仕様メモ（任意）</span>
            <input
              type="text"
              value={spec}
              maxLength={120}
              placeholder="例）材質 SUS304／板厚 1.5mm／ロット 20個／納期 6日"
              onChange={(e) => setSpec(e.target.value)}
            />
          </label>
          <div className="works-form__btns">
            <button className="btn dash-btn-sm dash-btn-sm--dark" type="submit" disabled={pending}>
              {pending ? "追加中…" : "この内容で追加"}
            </button>
            <button className="btn dash-btn-sm" type="button" onClick={() => { setOpen(false); setMsg(""); }}>
              やめる
            </button>
          </div>
        </form>
      ) : (
        <button className="btn dash-btn-sm dash-btn-sm--dark works-add" type="button" onClick={() => { setOpen(true); setMsg(""); }}>
          実績を追加する
        </button>
      )}

      {msg ? <p className="works-msg" role="status">{msg}</p> : null}
    </section>
  );
}
