/* MONOTE — W-03 企業詳細 */
(function () {
  "use strict";

  /* ---------- tabs: click → active + smooth scroll (scroll は site.js が処理) ---------- */
  const tabs = Array.from(document.querySelectorAll(".co-tabs a"));
  let clickLock = 0;

  function setActive(id) {
    tabs.forEach((t) => t.classList.toggle("is-active", t.getAttribute("href") === "#" + id));
  }

  tabs.forEach((t) => {
    t.addEventListener("click", () => {
      setActive(t.getAttribute("href").slice(1));
      clickLock = Date.now() + 900; /* スムーススクロール中は scrollspy を抑制 */
    });
  });

  /* ---------- scrollspy ---------- */
  const spyIds = ["sec-dekiru", "sec-joken", "sec-jisseki", "sec-kiji"];
  const sections = spyIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let ticking = false;
  function spy() {
    if (Date.now() < clickLock) return;
    const y = window.scrollY + 150;
    let current = sections.length ? sections[0].id : null;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top + window.scrollY <= y) current = s.id;
    });
    if (current) setActive(current);
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        requestAnimationFrame(() => { spy(); ticking = false; });
        ticking = true;
      }
    },
    { passive: true }
  );

  /* ---------- 保存する / 比較に追加 (ラベル切替) ---------- */
  const saveBtn = document.getElementById("btn-save");
  if (saveBtn) {
    /* data-save の toggle 自体は site.js が処理。ラベルだけ追従させる */
    const syncSave = () => { saveBtn.textContent = saveBtn.classList.contains("is-on") ? "保存済み" : "保存する"; };
    saveBtn.addEventListener("click", () => requestAnimationFrame(syncSave));
    try {
      const saved = (window.monoteStore && window.monoteStore.read("saved")) || [];
      if (saved.includes(saveBtn.dataset.save)) saveBtn.classList.add("is-on");
    } catch (_) {}
    syncSave();
  }

  const spSave = document.getElementById("btn-save-sp");
  if (spSave) {
    const syncSp = () => { spSave.textContent = spSave.classList.contains("is-on") ? "保存済" : "保存"; };
    spSave.addEventListener("click", () => requestAnimationFrame(syncSp));
    try {
      const saved = (window.monoteStore && window.monoteStore.read("saved")) || [];
      if (saved.includes(spSave.dataset.save)) spSave.classList.add("is-on");
    } catch (_) {}
    syncSp();
  }

  const favBtn = document.querySelector(".sp-head__fav");
  if (favBtn) {
    try {
      const saved = (window.monoteStore && window.monoteStore.read("saved")) || [];
      if (saved.includes(favBtn.dataset.save)) favBtn.classList.add("is-on");
    } catch (_) {}
  }

  const cmpBtn = document.getElementById("btn-compare");
  if (cmpBtn) {
    cmpBtn.addEventListener("click", () => {
      const on = cmpBtn.classList.toggle("is-on");
      cmpBtn.textContent = on ? "追加済み" : "比較に追加";
      let list = (window.monoteStore && window.monoteStore.read("compare")) || [];
      if (on) { if (!list.includes("maruma-seisakusho")) list.push("maruma-seisakusho"); }
      else { list = list.filter((x) => x !== "maruma-seisakusho"); }
      if (window.monoteStore) window.monoteStore.write("compare", list);
    });
    try {
      const list = (window.monoteStore && window.monoteStore.read("compare")) || [];
      if (list.includes("maruma-seisakusho")) {
        cmpBtn.classList.add("is-on");
        cmpBtn.textContent = "追加済み";
      }
    } catch (_) {}
  }
})();
