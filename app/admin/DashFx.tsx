"use client";

import { useEffect } from "react";

/**
 * Viewport-triggered dashboard animations, ported from js/admin-dashboard.js:
 * - KPI count-up (.js-count with data-count / data-format="comma")
 * - consult-source bars (#dashBars .is-anim)
 * - completeness meter (#meterFill .is-anim)
 */
export default function DashFx() {
  useEffect(() => {
    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const bars = document.getElementById("dashBars");
    const meterFill = document.getElementById("meterFill");
    const counters = Array.from(document.querySelectorAll<HTMLElement>(".js-count"));

    function animateCount(el: HTMLElement) {
      const target = parseInt(el.dataset.count ?? "", 10);
      if (isNaN(target)) return;
      const useComma = el.dataset.format === "comma";
      const dur = 900;
      let start: number | null = null;
      const fmt = (n: number) => (useComma ? n.toLocaleString("en-US") : String(n));
      function frame(ts: number) {
        if (start === null) start = ts;
        const p = Math.min((ts - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
        el.textContent = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = fmt(target);
      }
      el.textContent = fmt(0);
      requestAnimationFrame(frame);
    }

    if (reduceMotion || !("IntersectionObserver" in window)) {
      bars?.classList.add("is-anim");
      meterFill?.classList.add("is-anim");
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-anim");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.4 }
    );
    if (bars) io.observe(bars);
    if (meterFill) io.observe(meterFill);

    const ioCount = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          animateCount(e.target as HTMLElement);
          ioCount.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((el) => ioCount.observe(el));

    return () => {
      io.disconnect();
      ioCount.disconnect();
    };
  }, []);

  return null;
}
