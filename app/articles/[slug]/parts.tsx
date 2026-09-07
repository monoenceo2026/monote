"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toggleSaveAction } from "@/app/actions";

/** Adds a class to <body> while the page is mounted (page-scoped body styling). */
export function BodyClass({ className }: { className: string }) {
  useEffect(() => {
    const cls = className.split(/\s+/).filter(Boolean);
    document.body.classList.add(...cls);
    return () => document.body.classList.remove(...cls);
  }, [className]);
  return null;
}

/* ---------- 目次 + スクロールスパイ ---------- */

export function Toc({ items }: { items: Array<{ id: string; label: string }> }) {
  const [active, setActive] = useState(0);
  const ids = items.map((it) => it.id).join(",");

  useEffect(() => {
    const sections = ids
      .split(",")
      .filter(Boolean)
      .map((id) => document.getElementById(id));
    const update = () => {
      if (!sections.length) return;
      const probe = window.scrollY + 160;
      let idx = 0;
      sections.forEach((sec, i) => {
        if (sec && sec.offsetTop <= probe) idx = i;
      });
      setActive(idx);
    };
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [ids]);

  return (
    <ol className="toc-list" id="tocList">
      {items.map((it, i) => (
        <li key={it.id}>
          <a href={`#${it.id}`} className={i === active ? "is-active" : undefined}>
            <span className="toc-num">{i + 1}.</span>
            <span>{it.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}

/* ---------- 保存する（記事保存の実書き込み） ---------- */

export function SaveArticleButton({
  articleId,
  initialSaved,
  path,
}: {
  articleId: number;
  initialSaved: boolean;
  path: string;
}) {
  const [override, setOverride] = useState<boolean | null>(null);
  const [, startTransition] = useTransition();
  const on = override ?? initialSaved;

  const toggle = () => {
    setOverride(!on);
    startTransition(async () => {
      const res = await toggleSaveAction("article", articleId, path);
      setOverride(res.saved);
    });
  };

  return (
    <button
      className={`btn btn--box btn--outline-thin btn--sm save-btn${on ? " is-on" : ""}`}
      type="button"
      onClick={toggle}
    >
      {on ? "保存済み" : "保存する"}
    </button>
  );
}

/* ---------- 共有（URLコピー） ---------- */

export function ShareButton() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /* コピーできていないのに「コピーしました」と出すと嘘になるので、成否を分けて表示する */
  const settle = (ok: boolean) => {
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), ok ? 1600 : 2600);
  };

  /* clipboard API が使えない環境（http / 古いブラウザ）向けのフォールバック */
  const legacyCopy = (url: string) => {
    try {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const onClick = () => {
    const url = location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(
        () => settle(true),
        () => settle(legacyCopy(url)),
      );
      return;
    }
    settle(legacyCopy(url));
  };

  const label = state === "copied" ? "コピーしました" : state === "failed" ? "コピーできません" : "共有";

  return (
    <button
      className={`btn btn--box btn--outline-thin btn--sm share-btn${state === "copied" ? " is-copied" : ""}${state === "failed" ? " is-failed" : ""}`}
      type="button"
      id="shareBtn"
      aria-live="polite"
      title={state === "failed" ? "自動コピーに対応していません。アドレスバーのURLをコピーしてください" : "このページのURLをコピー"}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
