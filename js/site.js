/* MONOTE — shared behaviors */
(function () {
  "use strict";

  /* ---------- scroll reveal ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
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
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-inview"));
  }

  /* ---------- stagger helper: .reveal-group children get sequential delays ---------- */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    const step = parseFloat(group.dataset.stagger || "0.08");
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty("--reveal-delay", (i * step).toFixed(2) + "s");
    });
  });

  /* ---------- 保存 / 比較 (lightweight demo state) ---------- */
  const store = {
    read(key) {
      try { return JSON.parse(localStorage.getItem("monote:" + key)) || []; }
      catch (_) { return []; }
    },
    write(key, val) {
      try { localStorage.setItem("monote:" + key, JSON.stringify(val)); }
      catch (_) { /* private mode */ }
    },
  };
  window.monoteStore = store;

  document.querySelectorAll("[data-save]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.save;
      let saved = store.read("saved");
      if (saved.includes(id)) {
        saved = saved.filter((x) => x !== id);
        btn.classList.remove("is-on");
      } else {
        saved.push(id);
        btn.classList.add("is-on");
      }
      store.write("saved", saved);
    });
  });

  /* ---------- smooth anchor scroll (tabs / TOC) ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (ev) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      ev.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: y, behavior: "smooth" });
    });
  });
})();
