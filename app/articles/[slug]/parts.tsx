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
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = () => {
    const done = () => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1600);
    };
    const url = location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, done);
    } else {
      done();
    }
  };

  return (
    <button
      className={`btn btn--box btn--outline-thin btn--sm share-btn${copied ? " is-copied" : ""}`}
      type="button"
      id="shareBtn"
      onClick={onClick}
    >
      {copied ? "コピーしました" : "共有"}
    </button>
  );
}
