/* MONOTE — W-04 記事詳細 behaviors */
(function () {
  "use strict";

  /* ---------- 目次スクロールスパイ ---------- */
  const tocLinks = Array.from(document.querySelectorAll(".toc-list a"));
  const sections = tocLinks
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);

  function updateToc() {
    if (!sections.length) return;
    const probe = window.scrollY + 160;
    let idx = 0;
    sections.forEach((sec, i) => {
      if (sec.offsetTop <= probe) idx = i;
    });
    tocLinks.forEach((a, i) => a.classList.toggle("is-active", i === idx));
  }
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        updateToc();
        ticking = false;
      });
    },
    { passive: true }
  );
  window.addEventListener("resize", updateToc);
  updateToc();

  /* ---------- 保存する: ラベル切替 (state は site.js の data-save が管理) ---------- */
  const saveBtn = document.querySelector(".save-btn");
  if (saveBtn) {
    const syncLabel = () => {
      saveBtn.textContent = saveBtn.classList.contains("is-on") ? "保存済み" : "保存する";
    };
    // site.js のクリックハンドラが is-on を切り替えた後に反映する
    saveBtn.addEventListener("click", () => requestAnimationFrame(syncLabel));
    // 再訪時に保存済み状態を復元
    try {
      const saved = (window.monoteStore && window.monoteStore.read("saved")) || [];
      if (saved.includes(saveBtn.dataset.save)) saveBtn.classList.add("is-on");
    } catch (_) { /* noop */ }
    syncLabel();
  }

  /* ---------- 共有: URLコピー ---------- */
  const shareBtn = document.getElementById("shareBtn");
  if (shareBtn) {
    let timer = null;
    shareBtn.addEventListener("click", () => {
      const url = location.href;
      const done = () => {
        shareBtn.textContent = "コピーしました";
        shareBtn.classList.add("is-copied");
        clearTimeout(timer);
        timer = setTimeout(() => {
          shareBtn.textContent = "共有";
          shareBtn.classList.remove("is-copied");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, done);
      } else {
        done();
      }
    });
  }
})();
