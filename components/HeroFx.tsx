"use client";

import { useEffect } from "react";

/**
 * Ports js/top.js — no.meets.ltd-inspired hero motion:
 * morphing Monoen symbol blob, metallic symbol parallax, marquee, sp menu.
 * Attaches to the server-rendered hero DOM via selectors.
 */

const BASE: Array<[number, number]> = [
  [172.0, 0.0], [204.2, 1.0], [233.7, 8.7], [260.5, 22.5], [283.5, 44.5],
  [300.0, 70.3], [305.0, 100.8], [299.0, 131.0], [290.0, 159.9], [287.9, 190.9],
  [293.3, 221.3], [299.4, 251.4], [295.9, 282.1], [274.5, 303.5], [245.8, 313.0],
  [216.5, 321.0], [188.9, 333.0], [165.4, 353.6], [140.9, 372.0], [111.2, 379.0],
  [80.2, 375.0], [52.6, 363.0], [28.2, 343.2], [10.0, 318.1], [3.0, 289.2],
  [3.0, 259.6], [16.5, 232.5], [31.0, 206.0], [41.0, 177.5], [43.0, 145.7],
  [43.1, 113.9], [51.0, 84.6], [65.2, 57.8], [87.1, 34.9], [112.6, 17.4],
  [140.4, 6.0],
];
const CX = 153, CY = 190, N = BASE.length;

function buildPath(pts: Array<[number, number]>): string {
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

export default function HeroFx() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = document.querySelector<HTMLElement>(".hero");
    const blobSvg = document.querySelector<SVGSVGElement>(".hero-blob");
    const blobPath = blobSvg?.querySelector("path") ?? null;
    const metalTL = document.querySelector<HTMLElement>(".hero-metal--tl");
    const metalR = document.querySelector<HTMLElement>(".hero-metal--r");

    requestAnimationFrame(() => hero?.classList.add("is-loaded"));

    const heroInput = document.querySelector<HTMLInputElement>(".hero__search-input");
    if (heroInput && window.matchMedia("(max-width: 768px)").matches) {
      heroInput.placeholder = "例：SUS304の薄板 小ロット";
    }

    const menuBtn = document.querySelector<HTMLButtonElement>(".menu-btn");
    const spMenu = document.querySelector<HTMLElement>(".sp-menu");
    const onMenu = () => {
      if (!menuBtn || !spMenu) return;
      const open = spMenu.hidden;
      spMenu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn?.addEventListener("click", onMenu);

    const track = document.querySelector<HTMLElement>(".hero__logos-track");
    if (track && !track.dataset.duped) {
      track.innerHTML += track.innerHTML;
      track.dataset.duped = "1";
    }

    if (blobPath) blobPath.setAttribute("d", buildPath(BASE));
    if (reduceMotion || !blobPath || !blobSvg) return () => menuBtn?.removeEventListener("click", onMenu);

    let mx = 0, my = 0, tmx = 0, tmy = 0, scrollY = 0, raf = 0;
    const onMove = (e: MouseEvent) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
    };
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const pts: Array<[number, number]> = BASE.map((p) => [p[0], p[1]]);
    const tick = (now: number) => {
      const t = now * 0.001;
      for (let i = 0; i < N; i++) {
        const bx = BASE[i][0], by = BASE[i][1];
        const dx = bx - CX, dy = by - CY;
        const r = Math.sqrt(dx * dx + dy * dy) || 1;
        const wobble = Math.sin(t * 0.55 + i * 0.9) * 3.2 + Math.sin(t * 0.9 + i * 2.3) * 1.8;
        const k = 1 + (wobble / r) * 0.9;
        pts[i][0] = CX + dx * k;
        pts[i][1] = CY + dy * k;
      }
      blobPath.setAttribute("d", buildPath(pts));

      const heroH = hero ? hero.offsetHeight : 625;
      const progress = Math.min(scrollY / heroH, 1.4);
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      const scale = 1 + progress * 0.35;
      const driftY = progress * 90;
      const rot = Math.sin(t * 0.18) * 3 - progress * 6;
      blobSvg.style.transform =
        `translate(calc(-50% + ${(mx * 26).toFixed(1)}px), calc(-54% + ${(driftY + my * 18).toFixed(1)}px)) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;

      if (metalTL) {
        metalTL.style.transform =
          `translate(${(-mx * 18).toFixed(1)}px, ${(Math.sin(t * 0.5) * 8 - my * 12 + scrollY * 0.12).toFixed(1)}px) rotate(${(Math.sin(t * 0.3) * 2).toFixed(2)}deg)`;
      }
      if (metalR) {
        metalR.style.transform =
          `translate(${(mx * 22).toFixed(1)}px, ${(Math.cos(t * 0.45) * 10 + my * 16 - scrollY * 0.08).toFixed(1)}px) rotate(${(Math.cos(t * 0.35) * -2.5).toFixed(2)}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      menuBtn?.removeEventListener("click", onMenu);
    };
  }, []);

  return null;
}
