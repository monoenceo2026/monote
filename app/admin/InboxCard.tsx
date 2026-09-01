"use client";

import { useEffect, useState, useTransition } from "react";
import { setInquiryStatusAction } from "./actions";

export type InboxItemData = {
  id: number;
  title: string;
  date: string; // "2026.08.09受信"
  note: string; // "" = no note line
  status: "open" | "replied" | "declined";
};

const DONE_LABEL: Record<"replied" | "declined", string> = {
  replied: "返信済み",
  declined: "対応済み",
};

/**
 * 相談の受信箱 — real inbox (inboxOf). 返信する/対応できない write through a
 * server action; items handled in this session stay visible in the faded
 * is-done state (same behavior as the static js/admin-dashboard.js).
 */
export default function InboxCard({ items }: { items: InboxItemData[] }) {
  /* items handled during this session (keeps them rendered after revalidate) */
  const [handled, setHandled] = useState<Record<number, "replied" | "declined">>({});
  const [, startTransition] = useTransition();

  const shown = items.filter((i) => i.status === "open" || handled[i.id]);
  const openCount = items.filter((i) => i.status === "open" && !handled[i.id]).length;

  /* keep every 受信箱バッジ (incl. the header nav [data-inbox-count]) on the real count */
  useEffect(() => {
    document.querySelectorAll("[data-inbox-count]").forEach((el) => {
      el.textContent = String(openCount);
    });
  });

  const act = (id: number, status: "replied" | "declined") => {
    setHandled((h) => ({ ...h, [id]: status }));
    startTransition(() => {
      void setInquiryStatusAction(id, status);
    });
  };

  return (
    <section className="dash-card reveal" id="inbox">
      <div className="inbox-head">
        <h2 className="dash-card__ttl dash-card__ttl--ink">相談の受信箱</h2>
        <span className={`tag js-inbox-badge${openCount > 0 ? " tag--blue" : ""}`}>
          未対応<span data-inbox-count>{openCount}</span>件
        </span>
      </div>
      {shown.map((item) => {
        const done = handled[item.id] ?? (item.status !== "open" ? item.status : undefined);
        return (
          <article key={item.id} className={`inbox-item${done ? " is-done" : ""}`}>
            <div className="inbox-item__meta">
              <span className="tag tag--blue inbox-item__state">{done ? DONE_LABEL[done] : "未対応"}</span>
              <span className="inbox-item__date">{item.date}</span>
            </div>
            <p className="inbox-item__ttl">{item.title}</p>
            {item.note ? <p className="inbox-item__note">{item.note}</p> : null}
            <div className="inbox-item__actions">
              <button className="btn btn--pill btn--sm btn--dark" type="button" onClick={() => act(item.id, "replied")}>
                返信する
              </button>
              <button className="btn btn--box btn--outline-thin btn--sm" type="button" onClick={() => act(item.id, "declined")}>
                対応できない
              </button>
            </div>
          </article>
        );
      })}
      {shown.length === 0 ? <p className="dash-card__foot">未対応の相談はありません。</p> : null}
      <p className="dash-card__foot">3営業日以内の返信で、検索順位と「返信の早さ」表示が改善します。</p>
    </section>
  );
}
