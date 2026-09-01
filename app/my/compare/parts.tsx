"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { removeCompareAction, setCompareMemoAction } from "@/app/actions";

type TabId = "compare" | "companies" | "articles" | "history";

/* ---------- tabs (比較 / 保存した企業 / 保存した記事 / 相談の履歴) ---------- */

export function CompareTabs({
  nCompare,
  nCompanies,
  nArticles,
  nHistory,
  panelCompare,
  panelCompanies,
  panelHistory,
}: {
  nCompare: number;
  nCompanies: number;
  nArticles: number;
  nHistory: number;
  panelCompare: ReactNode;
  panelCompanies: ReactNode;
  panelHistory: ReactNode;
}) {
  const [tab, setTab] = useState<TabId>("compare");

  const select = (t: TabId) => {
    setTab(t);
    if (t === "articles") {
      /* 保存した記事 is a section further down the page (static behavior) */
      window.requestAnimationFrame(() => {
        const target = document.querySelector("#savedArticles");
        if (target) {
          const y = target.getBoundingClientRect().top + window.scrollY - 104;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      });
    }
  };

  const tabs: Array<{ id: TabId; label: ReactNode }> = [
    { id: "compare", label: <>比較 <span data-cmp-count>{nCompare}</span>社</> },
    { id: "companies", label: <>保存した企業 {nCompanies}</> },
    { id: "articles", label: <>保存した記事 {nArticles}</> },
    { id: "history", label: <>相談の履歴 {nHistory}</> },
  ];

  return (
    <>
      <div className="tabs" role="tablist" aria-label="保存・比較の切り替え">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={"tab" + (tab === t.id ? " is-active" : "")}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div hidden={tab === "companies" || tab === "history"}>{panelCompare}</div>
      <div hidden={tab !== "companies"}>{panelCompanies}</div>
      <div hidden={tab !== "history"}>{panelHistory}</div>
    </>
  );
}

/* ---------- メモ: blur / Enter で保存 ---------- */

export function MemoCell({
  companyId,
  col,
  memo,
  companyName,
}: {
  companyId: number;
  col: number;
  memo: string;
  companyName: string;
}) {
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLInputElement>(null);
  const last = useRef(memo);

  const commit = () => {
    const v = ref.current?.value ?? "";
    if (v === last.current) return;
    last.current = v;
    startTransition(async () => {
      await setCompareMemoAction(companyId, v);
    });
  };

  return (
    <td
      data-col={col}
      onClick={(e) => {
        /* clicking anywhere in the cell focuses the input (static behavior) */
        if (e.target !== ref.current) ref.current?.focus();
      }}
    >
      <input
        ref={ref}
        className="memo-input"
        type="text"
        defaultValue={memo}
        placeholder="＋メモを追加"
        aria-label={`${companyName}へのメモ`}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        onBlur={commit}
      />
    </td>
  );
}

/* ---------- 外す: fade the column, then remove on the server ---------- */

export function RemoveButton({ companyId, col }: { companyId: number; col: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="cmp-remove"
      type="button"
      onClick={() => {
        if (pending) return;
        const table = document.getElementById("cmpTable");
        table
          ?.querySelectorAll(`th[data-col="${col}"], td[data-col="${col}"]`)
          .forEach((c) => c.classList.add("is-leaving"));
        window.setTimeout(() => {
          startTransition(async () => {
            await removeCompareAction(companyId, "/my/compare");
          });
        }, 420);
      }}
    >
      外す
    </button>
  );
}

/* ---------- 社名を伏せて送る toggle ---------- */

export function MaskToggle() {
  const [on, setOn] = useState(false);
  return (
    <button
      className={"bulk__mask" + (on ? " is-on" : "")}
      id="maskToggle"
      type="button"
      aria-pressed={on}
      onClick={() => setOn((v) => !v)}
    >
      {on ? "社名を伏せて送る ✓" : "社名を伏せて送る"}
    </button>
  );
}
