"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Root RevealFx only re-observes on pathname change; the ?sent=<id> success
 * screen arrives via a query-only navigation, so re-observe on params too.
 */
export default function RevealOnParams() {
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
