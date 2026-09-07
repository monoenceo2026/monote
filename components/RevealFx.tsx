"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Ports js/site.js: scroll reveal + stagger delays. Mounted once in the root layout. */
export default function RevealFx() {
  const pathname = usePathname();

  useEffect(() => {
    /* 登場演出のJSが動いたことを知らせる。これが付かないと
       css/base.css の失効タイマーが働いて本文を強制表示する */
    document.documentElement.classList.add("fx-ready");

    document.querySelectorAll<HTMLElement>("[data-stagger]").forEach((group) => {
      const step = parseFloat(group.dataset.stagger || "0.08");
      Array.from(group.children).forEach((child, i) => {
        (child as HTMLElement).style.setProperty("--reveal-delay", (i * step).toFixed(2) + "s");
      });
    });

    const els = document.querySelectorAll<HTMLElement>(".reveal:not(.is-inview)");
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
  }, [pathname]);

  return null;
}
