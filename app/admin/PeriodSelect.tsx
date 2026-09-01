"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS = [
  { label: "直近1か月", enabled: true },
  { label: "直近3か月", enabled: false },
  { label: "直近6か月", enabled: false },
  { label: "全期間", enabled: false },
] as const;

/** 集計期間セレクト — 直近1か月のみ実装（他期間は disabled） */
export default function PeriodSelect() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`dash-select${open ? " is-open" : ""}`} id="periodSelect" ref={rootRef}>
      <button
        className="dash-select__btn"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(ev) => {
          ev.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <span className="js-period-label">直近1か月</span>
        <svg className="dash-select__caret" viewBox="0 0 6 6" width="6" height="6" aria-hidden="true">
          <path d="M0.4 1 3 5 5.6 1Z" fill="currentColor" />
        </svg>
      </button>
      <ul className="dash-select__menu" role="listbox" aria-label="集計期間" hidden={!open}>
        {OPTIONS.map((o) => (
          <li
            key={o.label}
            role="option"
            aria-selected={o.enabled}
            aria-disabled={!o.enabled}
            className={o.enabled ? undefined : "is-disabled"}
            tabIndex={o.enabled ? 0 : -1}
            onClick={() => {
              if (o.enabled) setOpen(false);
            }}
            onKeyDown={(ev) => {
              if (o.enabled && (ev.key === "Enter" || ev.key === " ")) {
                ev.preventDefault();
                setOpen(false);
              }
            }}
          >
            {o.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
