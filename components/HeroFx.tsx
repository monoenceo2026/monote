"use client";

import { useEffect } from "react";

/**
 * TOP page motion (no.meets.ltd-inspired), attached to the server-rendered DOM:
 * - the black Monoen-symbol blob in the やりたいことから選ぶ section morphs
 *   organically and reacts to scroll (scale / drift / slight rotation)
 * - metallic symbols in the hero float with mouse parallax
 * - logo marquee, title reveal, sp menu, drag-to-scroll carousel
 */
export default function HeroFx() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = document.querySelector<HTMLElement>(".hero");
    const metalTL = document.querySelector<HTMLElement>(".hero-metal--tl");
    const metalR = document.querySelector<HTMLElement>(".hero-metal--r");
    const pick = document.querySelector<HTMLElement>(".pick");
    const blobSvg = document.querySelector<SVGSVGElement>(".pick__blob");
    const blobPath = blobSvg?.querySelector<SVGPathElement>(".pick__blob-path") ?? null;

    requestAnimationFrame(() => hero?.classList.add("is-loaded"));

    /* mobile placeholder (per SP design) */
    const heroInput = document.querySelector<HTMLInputElement>(".hero__search-input");
    if (heroInput && window.matchMedia("(max-width: 768px)").matches) {
      heroInput.placeholder = "例：SUS304の薄板 小ロット";
    }

    /* sp menu */
    const menuBtn = document.querySelector<HTMLButtonElement>(".menu-btn");
    const spMenu = document.querySelector<HTMLElement>(".sp-menu");
    const onMenu = () => {
      if (!menuBtn || !spMenu) return;
      const open = spMenu.hidden;
      spMenu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    };
    menuBtn?.addEventListener("click", onMenu);

    /* marquee: duplicate track once for a seamless loop */
    const track = document.querySelector<HTMLElement>(".hero__logos-track");
    if (track && !track.dataset.duped) {
      track.innerHTML += track.innerHTML;
      track.dataset.duped = "1";
    }

    /* carousel: drag to scroll */
    const carousel = document.querySelector<HTMLElement>(".pick__carousel");
    let dragging = false, dragStartX = 0, dragStartScroll = 0, moved = 0;
    const onDown = (e: PointerEvent) => {
      if (!carousel) return;
      dragging = true;
      moved = 0;
      dragStartX = e.clientX;
      dragStartScroll = carousel.scrollLeft;
      carousel.classList.add("is-dragging");
    };
    const onMovePtr = (e: PointerEvent) => {
      if (!dragging || !carousel) return;
      const dx = e.clientX - dragStartX;
      moved = Math.max(moved, Math.abs(dx));
      carousel.scrollLeft = dragStartScroll - dx;
    };
    const onUp = () => {
      dragging = false;
      carousel?.classList.remove("is-dragging");
    };
    const onClickCapture = (e: MouseEvent) => {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    };
    carousel?.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMovePtr, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    carousel?.addEventListener("click", onClickCapture, true);

    /* ---------- blob morph ---------- */
    let raf = 0;
    let cleanupMotion = () => {};
    if (!reduceMotion && blobPath && blobSvg) {
      /* sample the designer's exact path into N points, then wobble them */
      const N = 40;
      const total = blobPath.getTotalLength();
      const base: Array<[number, number]> = [];
      for (let i = 0; i < N; i++) {
        const p = blobPath.getPointAtLength((total * i) / N);
        base.push([p.x, p.y]);
      }
      const CX = 266.4, CY = 335.4;
      const pts: Array<[number, number]> = base.map((p) => [p[0], p[1]]);

      const buildPath = () => {
        let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
        for (let i = 0; i < N; i++) {
          const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
          const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
          const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
          d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
        }
        return d + "Z";
      };

      let mx = 0, my = 0, tmx = 0, tmy = 0, scrollY = window.scrollY;
      const onMove = (e: MouseEvent) => {
        tmx = e.clientX / window.innerWidth - 0.5;
        tmy = e.clientY / window.innerHeight - 0.5;
      };
      const onScroll = () => { scrollY = window.scrollY; };
      window.addEventListener("mousemove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });

      const tick = (now: number) => {
        const t = now * 0.001;

        /* organic wobble on the designed silhouette */
        for (let i = 0; i < N; i++) {
          const bx = base[i][0], by = base[i][1];
          const dx = bx - CX, dy = by - CY;
          const r = Math.sqrt(dx * dx + dy * dy) || 1;
          const wobble = Math.sin(t * 0.5 + i * 0.85) * 4.5 + Math.sin(t * 0.85 + i * 2.1) * 2.5;
          const k = 1 + (wobble / r) * 0.9;
          pts[i][0] = CX + dx * k;
          pts[i][1] = CY + dy * k;
        }
        blobPath.setAttribute("d", buildPath());

        /* scroll response: the symbol swells as the section enters the viewport */
        if (pick) {
          const rect = pick.getBoundingClientRect();
          const vh = window.innerHeight;
          const progress = Math.min(Math.max((vh - rect.top) / (vh + rect.height), 0), 1);
          const scale = 0.92 + progress * 0.16;
          const drift = (progress - 0.5) * -50;
          const rot = Math.sin(t * 0.16) * 2.5 + (progress - 0.5) * 5;
          blobSvg.style.transform = `translateY(${drift.toFixed(1)}px) scale(${scale.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        }

        /* metallic symbols: slow float + inverse parallax */
        mx += (tmx - mx) * 0.05;
        my += (tmy - my) * 0.05;
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
      cleanupMotion = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("scroll", onScroll);
      };
    }

    return () => {
      cleanupMotion();
      menuBtn?.removeEventListener("click", onMenu);
      carousel?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMovePtr);
      window.removeEventListener("pointerup", onUp);
      carousel?.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return null;
}
