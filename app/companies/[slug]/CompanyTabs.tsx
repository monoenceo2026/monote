"use client";

import { useEffect, useRef, useState } from "react";

/* ports js/company.js: tabs click → active + smooth scroll, plus scrollspy */

const SPY_IDS = ["sec-dekiru", "sec-joken", "sec-jisseki", "sec-kiji"];

export default function CompanyTabs({ articleCount }: { articleCount: number }) {
  const [active, setActive] = useState("sec-dekiru");
  const lockRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const spy = () => {
      if (Date.now() < lockRef.current) return;
      const y = window.scrollY + 150;
      let current = SPY_IDS[0];
      for (const id of SPY_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= y) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          spy();
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: string) => (ev: React.MouseEvent<HTMLAnchorElement>) => {
    ev.preventDefault();
    setActive(id);
    lockRef.current = Date.now() + 900; /* スムーススクロール中は scrollspy を抑制 */
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const cls = (id: string, extra = "") =>
    [active === id ? "is-active" : "", extra].filter(Boolean).join(" ") || undefined;

  return (
    <nav className="co-tabs-wrap container-wide" aria-label="ページ内タブ">
      <div className="co-tabs">
        <a href="#sec-dekiru" className={cls("sec-dekiru")} onClick={go("sec-dekiru")}>できること</a>
        <a href="#sec-joken" className={cls("sec-joken")} onClick={go("sec-joken")}>対応条件</a>
        <a href="#sec-jisseki" className={cls("sec-jisseki")} onClick={go("sec-jisseki")}>実績<span className="pc-i">・事例</span></a>
        <a href="#sec-kiji" className={cls("sec-kiji")} onClick={go("sec-kiji")}>記事 {articleCount}</a>
        <a href="#sec-gaiyo" className={cls("sec-gaiyo", "pc-only")} onClick={go("sec-gaiyo")}>会社概要</a>
      </div>
    </nav>
  );
}
