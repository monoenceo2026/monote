"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
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

/* ============================================================
   SP 用ボトムシート（絞り込み / 並び替え）
   閉じる: ×ボタン / 背景クリック / Esc、開いている間は背面をスクロールさせない
   ============================================================ */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Sheet({
  title,
  onClose,
  foot,
  children,
}: {
  title: string;
  onClose: () => void;
  foot?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    /* PC 幅へ戻したときシートは表示されなくなるので、開きっぱなし（スクロール固定）を防ぐ */
    const onResize = () => {
      if (window.innerWidth > 900) onClose();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  /* フォーカスをシート内に閉じ込める */
  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="sheet">
      <button className="sheet__backdrop" type="button" tabIndex={-1} aria-hidden="true" onClick={onClose} />
      <div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={panelRef}
        onKeyDown={trap}
      >
        <div className="sheet__head">
          <p className="sheet__ttl">{title}</p>
          <button className="sheet__close" type="button" aria-label="閉じる" onClick={onClose}>
            <XIcon />
          </button>
        </div>
        <div className="sheet__body">{children}</div>
        {foot ? <div className="sheet__foot">{foot}</div> : null}
      </div>
    </div>
  );
}

/* ---------- SP: 絞り込みドロワー（サイドバーと同じ内容） ---------- */

export function SpFilterPanel({
  condCount,
  resultCount,
  children,
}: {
  condCount: number;
  resultCount: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  /* 閉じたらフォーカスを開いたボタンへ戻す */
  const close = useCallback(() => {
    setOpen(false);
    btnRef.current?.focus();
  }, []);
  return (
    <>
      <button
        className="sp-filter-btn"
        type="button"
        ref={btnRef}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        絞り込み <span id="spCondCount">{condCount}</span>
      </button>
      {open ? (
        <Sheet
          title="絞り込む"
          onClose={close}
          foot={
            <>
              <button
                className="sheet__clear"
                type="button"
                onClick={() => navigateWith(router, { cond: "", page: null })}
              >
                条件をクリア
              </button>
              <button className="sheet__apply" type="button" onClick={close}>
                {resultCount}社の結果を見る
              </button>
            </>
          }
        >
          <div className="sheet__filters">{children}</div>
        </Sheet>
      ) : null}
    </>
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
const SORT_OPTIONS: Array<[string, string]> = [
  ["match", "条件の一致度が高い順"],
  ["updated", "更新が新しい順"],
  ["response", "返信が早い順"],
];

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
  const [sortOpen, setSortOpen] = useState(false);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const closeSort = useCallback(() => {
    setSortOpen(false);
    sortBtnRef.current?.focus();
  }, []);
  const applySort = (v: string) => {
    closeSort();
    navigateWith(router, { sort: v === "match" ? null : v, page: null });
  };

  const tabRefs = {
    companies: useRef<HTMLButtonElement>(null),
    articles: useRef<HTMLButtonElement>(null),
  };

  /* ← → Home End でタブを移動（ARIA tab パターン） */
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const order: Array<"companies" | "articles"> = ["companies", "articles"];
    let next: "companies" | "articles" | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = order[(order.indexOf(tab) + 1) % order.length];
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = order[(order.indexOf(tab) + order.length - 1) % order.length];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[order.length - 1];
    if (!next) return;
    e.preventDefault();
    select(next);
    tabRefs[next].current?.focus();
  };

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
        <div className="tabs" role="tablist" aria-label="検索結果の種類" onKeyDown={onTabKey}>
          <button
            className={"tab" + (tab === "companies" ? " is-active" : "")}
            id="tabCompanies"
            type="button"
            role="tab"
            ref={tabRefs.companies}
            aria-selected={tab === "companies"}
            aria-controls="panelCompanies"
            tabIndex={tab === "companies" ? 0 : -1}
            onClick={() => select("companies")}
          >
            企業　<span className="tab__count" id="companyCount">{companyCount}</span>
          </button>
          <button
            className={"tab" + (tab === "articles" ? " is-active" : "")}
            id="tabArticles"
            type="button"
            role="tab"
            ref={tabRefs.articles}
            aria-selected={tab === "articles"}
            aria-controls="panelArticles"
            tabIndex={tab === "articles" ? 0 : -1}
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
        <button
          className="sp-resultbar__sort"
          type="button"
          ref={sortBtnRef}
          aria-haspopup="dialog"
          aria-expanded={sortOpen}
          onClick={() => setSortOpen(true)}
        >
          {SORT_SP_LABEL[sort] ?? "一致度順"} <span className="tri" aria-hidden="true"></span>
        </button>
        {sortOpen ? (
          <Sheet title="並び替え" onClose={closeSort}>
            <ul className="sheet__opts">
              {SORT_OPTIONS.map(([v, label]) => (
                <li key={v}>
                  <button
                    className={"sheet__opt" + (sort === v ? " is-on" : "")}
                    type="button"
                    aria-current={sort === v ? "true" : undefined}
                    onClick={() => applySort(v)}
                  >
                    {label}
                    {sort === v ? <span aria-hidden="true">✓</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>
        ) : null}
      </div>

      <div className="panel" id="panelCompanies" role="tabpanel" aria-labelledby="tabCompanies" hidden={tab !== "companies"}>
        {panelCompanies}
      </div>
      <div className="panel" id="panelArticles" role="tabpanel" aria-labelledby="tabArticles" hidden={tab !== "articles"}>
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
    <div className={"cmp-bar" + (n === 0 ? " is-hidden" : "")} id="cmpBar" ref={barRef} aria-hidden={n === 0}>
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
          <Link className="cmp-bar__btn cmp-bar__btn--white" href="/my/compare" tabIndex={n === 0 ? -1 : undefined}>
            並べて比較する
          </Link>
          {n > 0 ? (
            <Link
              className="cmp-bar__btn cmp-bar__btn--dark"
              id="cmpConsult"
              href={`/inquiry/new?companies=${items.map((i) => i.id).join(",")}&source=compare`}
            >
              {n}社にまとめて相談
            </Link>
          ) : null}
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

/* ============================================================
   この検索結果を保存 — 条件セットを端末に保存して呼び戻す
   （アカウント横断の保存は Phase2。まずは実際に動く形にしておく）
   ============================================================ */

type SavedSearch = { label: string; url: string; at: string };
const SS_KEY = "monote:saved-searches";

function readSaved(): SavedSearch[] {
  try {
    const v = JSON.parse(localStorage.getItem(SS_KEY) || "[]");
    return Array.isArray(v) ? (v as SavedSearch[]) : [];
  } catch {
    return [];
  }
}

export function SaveSearchButton() {
  const router = useRouter();
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [open, setOpen] = useState(false);
  const [flash, setFlash] = useState("");
  const [saved, setSaved] = useState(false);

  const currentUrl = () => window.location.pathname + window.location.search;

  useEffect(() => {
    const list = readSaved();
    setItems(list);
    setSaved(list.some((s) => s.url === currentUrl()));
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".save-search")) setOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  const label = () => {
    const chips = Array.from(document.querySelectorAll("#condChips .cond-chip__t")).map((el) => el.textContent?.trim()).filter(Boolean);
    const q = new URLSearchParams(window.location.search).get("q");
    return chips.length ? chips.join("・") : q || "すべての企業";
  };

  const save = () => {
    const url = currentUrl();
    const list = readSaved().filter((s) => s.url !== url);
    if (saved) {
      localStorage.setItem(SS_KEY, JSON.stringify(list));
      setItems(list);
      setSaved(false);
      setFlash("保存を解除しました");
    } else {
      const next = [{ label: label(), url, at: new Date().toISOString().slice(0, 10).replaceAll("-", ".") }, ...list].slice(0, 12);
      localStorage.setItem(SS_KEY, JSON.stringify(next));
      setItems(next);
      setSaved(true);
      setFlash("この条件を保存しました");
    }
    window.setTimeout(() => setFlash(""), 2200);
  };

  return (
    <div className="save-search">
      <button className={`cond-btn cond-btn--save${saved ? " is-on" : ""}`} type="button" onClick={save} aria-pressed={saved}>
        {saved ? "保存済みの検索条件" : "この検索結果を保存"}
      </button>
      {items.length > 0 ? (
        <button
          className="cond-btn save-search__toggle"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="保存した検索条件を開く"
        >
          保存した条件 {items.length}
        </button>
      ) : null}
      {open ? (
        <div className="save-search__menu" role="menu">
          {items.map((s) => (
            <button
              key={s.url}
              className="save-search__item"
              type="button"
              role="menuitem"
              onClick={() => { setOpen(false); router.push(s.url); }}
            >
              <span className="save-search__item-label">{s.label}</span>
              <span className="save-search__item-date">{s.at}</span>
            </button>
          ))}
        </div>
      ) : null}
      {flash ? <span className="save-search__flash" role="status">{flash}</span> : null}
    </div>
  );
}
