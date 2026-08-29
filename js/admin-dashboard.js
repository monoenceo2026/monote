/* MONOTE — W-08 企業管理ダッシュボード behaviors */
(function () {
  "use strict";

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- KPI count-up ---------- */
  function animateCount(el) {
    var target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    var useComma = el.dataset.format === "comma";
    var dur = 900;
    var start = null;
    function fmt(n) {
      return useComma ? n.toLocaleString("en-US") : String(n);
    }
    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
      el.textContent = fmt(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = fmt(target);
    }
    el.textContent = fmt(0);
    requestAnimationFrame(frame);
  }

  /* ---------- viewport-triggered animations ---------- */
  var bars = document.getElementById("dashBars");
  var meterFill = document.getElementById("meterFill");
  var counters = Array.prototype.slice.call(document.querySelectorAll(".js-count"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    if (bars) bars.classList.add("is-anim");
    if (meterFill) meterFill.classList.add("is-anim");
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-anim");
          io.unobserve(e.target);
        });
      },
      { threshold: 0.4 }
    );
    if (bars) io.observe(bars);
    if (meterFill) io.observe(meterFill);

    var ioCount = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          animateCount(e.target);
          ioCount.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach(function (el) { ioCount.observe(el); });
  }

  /* ---------- period dropdown ---------- */
  var select = document.getElementById("periodSelect");
  if (select) {
    var btn = select.querySelector(".dash-select__btn");
    var menu = select.querySelector(".dash-select__menu");
    var label = select.querySelector(".js-period-label");

    function closeMenu() {
      select.classList.remove("is-open");
      menu.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      var open = !menu.hidden;
      if (open) { closeMenu(); return; }
      select.classList.add("is-open");
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    });
    menu.querySelectorAll("li").forEach(function (li) {
      li.addEventListener("click", function () {
        menu.querySelectorAll("li").forEach(function (o) {
          o.setAttribute("aria-selected", "false");
        });
        li.setAttribute("aria-selected", "true");
        label.textContent = li.textContent;
        closeMenu();
      });
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          li.click();
        }
      });
    });
    document.addEventListener("click", function (ev) {
      if (!select.contains(ev.target)) closeMenu();
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") closeMenu();
    });
  }

  /* ---------- inbox: 返信する / 対応できない ---------- */
  function inboxCounts() {
    var open = document.querySelectorAll(".inbox-item:not(.is-done)").length;
    document.querySelectorAll(".js-inbox-count").forEach(function (el) {
      el.textContent = String(open);
    });
    var badge = document.querySelector(".js-inbox-badge");
    if (badge) {
      if (open === 0) {
        badge.classList.remove("tag--blue");
        badge.textContent = "未対応0件";
      }
    }
  }
  document.querySelectorAll(".inbox-item").forEach(function (item) {
    var state = item.querySelector(".inbox-item__state");
    function done(text) {
      item.classList.add("is-done");
      if (state) state.textContent = text;
      inboxCounts();
    }
    var reply = item.querySelector(".js-inbox-reply");
    var decline = item.querySelector(".js-inbox-decline");
    if (reply) reply.addEventListener("click", function () { done("返信済み"); });
    if (decline) decline.addEventListener("click", function () { done("対応済み"); });
  });
})();
