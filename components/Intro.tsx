"use client";

import { useEffect, useRef } from "react";

/**
 * Site entrance animation: plays the Monoen brand movie on a white overlay,
 * then fades into the page (the hero reveal waits for `monote:intro-done`).
 * Shown once per tab session; skipped for prefers-reduced-motion.
 * A parser-inline script in page.tsx sets html[data-intro-off] before first
 * paint so repeat visitors never see the overlay flash.
 */
export default function Intro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const video = videoRef.current;
    const done = () => window.dispatchEvent(new Event("monote:intro-done"));

    if (!root || document.documentElement.hasAttribute("data-intro-off")) {
      done();
      return;
    }

    document.body.style.overflow = "hidden";
    let finished = false;
    const timers: number[] = [];

    const finish = () => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem("monote:intro", "1"); } catch {}
      root.classList.add("is-done");
      done(); // hero reveal starts while the overlay fades
      document.body.style.overflow = "";
      timers.push(window.setTimeout(() => { root.hidden = true; }, 700));
    };

    video?.play().catch(() => finish());
    video?.addEventListener("error", () => finish(), { once: true });
    video?.addEventListener("ended", () => { timers.push(window.setTimeout(finish, 250)); }, { once: true });
    /* safety: never trap the visitor if the video stalls */
    timers.push(window.setTimeout(finish, 6000));

    const onSkip = () => finish();
    root.addEventListener("click", onSkip);

    return () => {
      timers.forEach(clearTimeout);
      root.removeEventListener("click", onSkip);
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="intro" id="site-intro" ref={rootRef} aria-hidden="true">
      <video ref={videoRef} className="intro__video" muted playsInline preload="auto">
        <source src="/assets/media/intro.mp4" type="video/mp4" />
        <source src="/assets/media/intro.webm" type="video/webm" />
      </video>
      <button className="intro__skip" type="button">スキップ</button>
    </div>
  );
}
