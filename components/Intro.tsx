"use client";

import { useEffect, useRef, useState } from "react";
import { introWillPlay } from "@/lib/intro-client";

/**
 * Site entrance animation: plays the Monoen brand movie on a white overlay,
 * then fades into the page (the hero reveal waits for `monote:intro-done`).
 *
 * 再訪時・reduced motion では <video> 自体を描画しないので、動画は一切ダウンロードしない。
 * 初回でも動画が来なければ 2.5 秒で本編に進み、閲覧を止めない。
 */
export default function Intro() {
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [play, setPlay] = useState(false);

  /* 描画するかどうかをマウント時に決める（描画しなければ動画リクエストも発生しない） */
  useEffect(() => {
    if (!introWillPlay()) return; // クライアント遷移や再訪では再生しない（動画も読まない）
    setPlay(true);
  }, []);

  useEffect(() => {
    if (!play) return;
    const root = rootRef.current;
    const video = videoRef.current;
    if (!root) return;

    document.body.style.overflow = "hidden";
    let finished = false;
    const timers: number[] = [];

    const finish = () => {
      if (finished) return;
      finished = true;
      try { sessionStorage.setItem("monote:intro", "1"); } catch {}
      root.classList.add("is-done");
      window.dispatchEvent(new Event("monote:intro-done")); // ヒーローの表示はフェード中に始める
      document.body.style.overflow = "";
      timers.push(window.setTimeout(() => { root.hidden = true; }, 700));
    };

    video?.play().catch(() => finish());
    video?.addEventListener("error", () => finish(), { once: true });
    video?.addEventListener("stalled", () => { timers.push(window.setTimeout(finish, 800)); }, { once: true });
    video?.addEventListener("ended", () => { timers.push(window.setTimeout(finish, 250)); }, { once: true });
    /* 動画が来ないときに閲覧を止めないための保険 */
    timers.push(window.setTimeout(finish, 2500));

    const onSkip = () => finish();
    root.addEventListener("click", onSkip);
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); };
    document.addEventListener("keydown", onKey);

    return () => {
      timers.forEach(clearTimeout);
      root.removeEventListener("click", onSkip);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [play]);

  if (!play) return null;

  return (
    <div className="intro" id="site-intro" ref={rootRef} role="presentation">
      <video ref={videoRef} className="intro__video" muted playsInline preload="auto" aria-hidden="true">
        <source src="/assets/media/intro.webm" type="video/webm" />
        <source src="/assets/media/intro.mp4" type="video/mp4" />
      </video>
      <button className="intro__skip" type="button" onClick={() => rootRef.current?.click()}>スキップ</button>
    </div>
  );
}
