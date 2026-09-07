/** イントロを再生すべきか（クライアント専用）。Intro と HeroFx が同じ判定を使う。 */
export function introWillPlay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem("monote:intro") === "1") return false;
  } catch {
    /* プライベートモード等では判定できないので再生する */
  }
  if (document.documentElement.hasAttribute("data-intro-off")) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
