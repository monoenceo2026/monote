"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addCompareAction, removeCompareAction, toggleSaveAction } from "@/app/actions";

const CMP_MAX_EVENT = "monote:cmp-max";

/* navigate keeping the current query string, applying mutations (null = remove key) */
function navigateWith(router: ReturnType<typeof useRouter>, mutate: Record<string, string | null>) {
  const u = new URL(window.location.href);
  for (const [k, v] of Object.entries(mutate)) {
    if (v === null) u.searchParams.delete(k);
    else u.searchParams.set(k, v);
  }
  const qs = u.searchParams.toString();
  router.push(u.pathname + (qs ? "?" + qs : ""));
}

function XIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/* ---------- generic button that rewrites the URL query ---------- */

export function NavButton({
  className,
  mutate,
  ariaLabel,
  id,
  children,
}: {
  className: string;
  mutate: Record<string, string | null>;
  ariaLabel?: string;
  id?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  return (
    <button className={className} id={id} type="button" aria-label={ariaLabel} onClick={() => navigateWith(router, mutate)}>
      {children}
    </button>
  );
}

/* ---------- 適用中の条件チップ ---------- */

export function CondChip({ cat, label, condAfter }: { cat: string; label: string; condAfter: string }) {
  const router = useRouter();
  return (
    <span className="cond-chip">
      <span className="cond-chip__t">
        <span className="pc-inline">{cat}：</span>
        {label}
      </span>
      <button
        className="cond-chip__x"
        type="button"
        aria-label="条件を外す"
        onClick={() => navigateWith(router, { cond: condAfter, page: null })}
      >
        <XIcon />
      </button>
    </span>
  );
}

/* ---------- サイドバー ---------- */

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <section className={"f-group" + (collapsed ? " is-collapsed" : "")} data-collapsible="">
      <div className="f-group__head">
        <h2>{title}</h2>
        <button
          className="f-group__toggle"
          type="button"
          aria-expanded={!collapsed}
          aria-label="折りたたむ"
          onClick={() => setCollapsed((c) => !c)}
        >
          <span></span>
        </button>
      </div>
      <div className="f-group__body">{children}</div>
    </section>
  );
}

export function FMore({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="f-more" hidden={!open}>
        {children}
      </div>
      <button className="f-more-btn" type="button" onClick={() => setOpen((o) => !o)}>
        {open ? "− 表示を減らす" : `＋さらに表示（${count}）`}
      </button>
    </>
  );
}

export function CondCheckbox({
  checked,
  condAfter,
  children,
}: {
  checked: boolean;
  condAfter: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [on, setOn] = useState(checked);
  useEffect(() => setOn(checked), [checked]);
  return (
    <label className="ck">
      <input
        type="checkbox"
        checked={on}
        onChange={() => {
          setOn(!on);
          navigateWith(router, { cond: condAfter, page: null });
        }}
      />
      <span className="ck__box"></span>
      {children}
    </label>
  );
}

/* ---------- タブ + 並び替え + パネル ---------- */

const SORT_SP_LABEL: Record<string, string> = { match: "一致度順", updated: "更新順", response: "返信順" };

export function Results({
  initialTab,
  companyCount,
  articleCount,
  sort,
  panelCompanies,
  panelArticles,
}: {
  initialTab: "companies" | "articles";
  companyCount: number;
  articleCount: number;
  sort: string;
  panelCompanies: ReactNode;
  panelArticles: ReactNode;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"companies" | "articles">(initialTab);
  useEffect(() => setTab(initialTab), [initialTab]);

  const select = (t: "companies" | "articles") => {
    setTab(t);
    const u = new URL(window.location.href);
    if (t === "companies") u.searchParams.delete("tab");
    else u.searchParams.set("tab", t);
    const qs = u.searchParams.toString();
    window.history.replaceState(null, "", u.pathname + (qs ? "?" + qs : ""));
  };

  return (
    <>
      <div className="results__head">
        <div className="tabs" role="tablist">
          <button
            className={"tab" + (tab === "companies" ? " is-active" : "")}
            id="tabCompanies"
            type="button"
            role="tab"
            aria-selected={tab === "companies"}
            onClick={() => select("companies")}
          >
            企業　<span className="tab__count" id="companyCount">{companyCount}</span>
          </button>
          <button
            className={"tab" + (tab === "articles" ? " is-active" : "")}
            id="tabArticles"
            type="button"
            role="tab"
            aria-selected={tab === "articles"}
            onClick={() => select("articles")}
          >
            記事　<span className="tab__count">{articleCount}</span>
          </button>
        </div>
        <div className="sort">
          <p className="sort__label">並び替え</p>
          <div className="sort__select">
            <select
              aria-label="並び替え"
              value={sort}
              onChange={(e) =>
                navigateWith(router, { sort: e.target.value === "match" ? null : e.target.value, page: null })
              }
            >
              <option value="match">条件の一致度が高い順</option>
              <option value="updated">更新が新しい順</option>
              <option value="response">返信が早い順</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sp-resultbar">
        <p>
          <strong id="spCompanyCount">{companyCount}社</strong> が条件に一致
        </p>
        <button className="sp-resultbar__sort" type="button">
          {SORT_SP_LABEL[sort] ?? "一致度順"} <span className="tri" aria-hidden="true"></span>
        </button>
      </div>

      <div className="panel" id="panelCompanies" hidden={tab !== "companies"}>
        {panelCompanies}
      </div>
      <div className="panel" id="panelArticles" hidden={tab !== "articles"}>
        {panelArticles}
      </div>
    </>
  );
}

/* ---------- 保存する / 比較に追加 ---------- */

export function SaveButton({ companyId, saved }: { companyId: number; saved: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [on, setOn] = useState(saved);
  useEffect(() => setOn(saved), [saved]);
  return (
    <button
      className={"btn c-btn c-btn--outline js-save" + (on ? " is-on" : "")}
      type="button"
      onClick={() => {
        if (isPending) return;
        setOn(!on);
        startTransition(async () => {
          const res = await toggleSaveAction("company", companyId, "/search");
          setOn(res.saved);
        });
      }}
    >
      <span className="js-save-label">
        {on ? "保存済み" : (
          <>
            保存<span className="pc-inline">する</span>
          </>
        )}
      </span>
    </button>
  );
}

export function CompareButton({ companyId, inCompare }: { companyId: number; inCompare: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [on, setOn] = useState(inCompare);
  useEffect(() => setOn(inCompare), [inCompare]);
  return (
    <button
      className={"btn c-btn c-btn--outline js-compare" + (on ? " is-on" : "")}
      type="button"
      onClick={() => {
        if (isPending) return;
        startTransition(async () => {
          if (on) {
            setOn(false);
            await removeCompareAction(companyId, "/search");
          } else {
            const res = await addCompareAction(companyId, "/search");
            if (!res.ok && res.reason === "max") {
              window.dispatchEvent(new Event(CMP_MAX_EVENT));
            } else {
              setOn(true);
            }
          }
        });
      }}
    >
      {on ? (
        <>
          <span aria-hidden="true">✓ </span>追加済み
        </>
      ) : (
        <>
          比較<span className="pc-inline">に追加</span>
        </>
      )}
    </button>
  );
}

/* ---------- 比較バー ---------- */

export function CompareBar({ items }: { items: Array<{ id: number; name: string }> }) {
  const [, startTransition] = useTransition();
  const [maxNote, setMaxNote] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const n = items.length;

  useEffect(() => {
    const onMax = () => setMaxNote(true);
    window.addEventListener(CMP_MAX_EVENT, onMax);
    return () => window.removeEventListener(CMP_MAX_EVENT, onMax);
  }, []);
  useEffect(() => {
    if (n < 3) setMaxNote(false);
  }, [n]);

  /* フッターの上で止まる（静的版 dockBar の移植） */
  useEffect(() => {
    const bar = barRef.current;
    const footer = document.querySelector(".site-footer");
    if (!bar || !footer) return;
    let ticking = false;
    const dock = () => {
      const overlap = window.innerHeight - footer.getBoundingClientRect().top;
      bar.style.bottom = overlap > 0 ? overlap + "px" : "0px";
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        dock();
        ticking = false;
      });
    };
    dock();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const note = n >= 3 || maxNote ? "比較は3社までです" : `あと${3 - n}社まで追加できます`;

  return (
    <div className={"cmp-bar" + (n === 0 ? " is-hidden" : "")} id="cmpBar" ref={barRef}>
      <div className="cmp-bar__inner">
        <div className="cmp-bar__left">
          <p className="cmp-bar__ttl">
            比較リスト　<span id="cmpCount">{n}社</span>
          </p>
          <div className="cmp-bar__chips" id="cmpChips">
            {items.map((it) => (
              <span key={it.id} className="cmp-chip">
                <span>{it.name}</span>
                <button
                  type="button"
                  aria-label={`${it.name} を比較から外す`}
                  onClick={() =>
                    startTransition(async () => {
                      await removeCompareAction(it.id, "/search");
                    })
                  }
                >
                  <XIcon />
                </button>
              </span>
            ))}
          </div>
          <p className="cmp-bar__note" id="cmpNote">{note}</p>
        </div>
        <div className="cmp-bar__right">
          <Link className="cmp-bar__btn cmp-bar__btn--white" href="/my/compare">並べて比較する</Link>
          <Link
            className="cmp-bar__btn cmp-bar__btn--dark"
            id="cmpConsult"
            href={`/inquiry/new?companies=${items.map((i) => i.id).join(",")}&source=compare`}
          >
            {n}社にまとめて相談
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------- 検索パラメータが変わった後も .reveal を発火させる ---------- */

export function RevealOnParams() {
  const sp = useSearchParams();
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".reveal:not(.is-inview)");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-inview"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-inview");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -5% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sp]);
  return null;
}
