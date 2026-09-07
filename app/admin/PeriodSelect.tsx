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
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const itemsRef = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (ev: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(ev.target as Node)) setOpen(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** 上下キーで option 間を移動（roving tabindex） */
  const move = (delta: number, from = active) => {
    const next = (from + delta + OPTIONS.length) % OPTIONS.length;
    setActive(next);
    requestAnimationFrame(() => itemsRef.current[next]?.focus());
  };

  const openAndFocus = (index: number) => {
    setOpen(true);
    setActive(index);
    requestAnimationFrame(() => itemsRef.current[index]?.focus());
  };

  return (
    <div className={`dash-select${open ? " is-open" : ""}`} id="periodSelect" ref={rootRef}>
      <button
        className="dash-select__btn"
        type="button"
        ref={btnRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={(ev) => {
          ev.stopPropagation();
          setOpen((o) => !o);
        }}
        onKeyDown={(ev) => {
          if (ev.key === "ArrowDown") {
            ev.preventDefault();
            openAndFocus(0);
          } else if (ev.key === "ArrowUp") {
            ev.preventDefault();
            openAndFocus(OPTIONS.length - 1);
          }
        }}
      >
        <span className="js-period-label">直近1か月</span>
        <svg className="dash-select__caret" viewBox="0 0 6 6" width="6" height="6" aria-hidden="true">
          <path d="M0.4 1 3 5 5.6 1Z" fill="currentColor" />
        </svg>
      </button>
      <ul className="dash-select__menu" role="listbox" aria-label="集計期間" hidden={!open}>
        {OPTIONS.map((o, i) => (
          <li
            key={o.label}
            role="option"
            ref={(el) => { itemsRef.current[i] = el; }}
            aria-selected={o.enabled}
            aria-disabled={!o.enabled}
            className={o.enabled ? undefined : "is-disabled"}
            tabIndex={active === i ? 0 : -1}
            onFocus={() => setActive(i)}
            onClick={() => {
              if (o.enabled) {
                setOpen(false);
                btnRef.current?.focus();
              }
            }}
            onKeyDown={(ev) => {
              if (ev.key === "ArrowDown") {
                ev.preventDefault();
                move(1, i);
              } else if (ev.key === "ArrowUp") {
                ev.preventDefault();
                move(-1, i);
              } else if (ev.key === "Home") {
                ev.preventDefault();
                move(0, 0);
              } else if (ev.key === "End") {
                ev.preventDefault();
                move(0, OPTIONS.length - 1);
              } else if (o.enabled && (ev.key === "Enter" || ev.key === " ")) {
                ev.preventDefault();
                setOpen(false);
                btnRef.current?.focus();
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
