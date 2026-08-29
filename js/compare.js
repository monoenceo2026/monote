/* MONOTE — W-05 保存・比較 */
(function () {
  "use strict";

  var table = document.getElementById("cmpTable");
  if (!table) return;

  /* ---------- tabs (visual switch; 保存した記事 scrolls to section) ---------- */
  var tabs = document.querySelectorAll(".tab");
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      var sel = tab.dataset.scroll;
      if (sel) {
        var target = document.querySelector(sel);
        if (target) {
          var y = target.getBoundingClientRect().top + window.scrollY - 104;
          window.scrollTo({ top: y, behavior: "smooth" });
        }
      }
    });
  });

  /* ---------- 外す: fade out the whole column, then remove it ---------- */
  function updateCounts(n) {
    document.querySelectorAll("[data-cmp-count]").forEach(function (el) {
      el.textContent = n;
    });
  }

  function remainingCols() {
    return table.querySelectorAll("thead th[data-col]").length;
  }

  document.querySelectorAll("[data-remove]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var n = btn.dataset.remove;
      var cells = table.querySelectorAll('th[data-col="' + n + '"], td[data-col="' + n + '"]');
      var col = table.querySelector('col[data-col="' + n + '"]');
      cells.forEach(function (c) { c.classList.add("is-leaving"); });
      window.setTimeout(function () {
        cells.forEach(function (c) { c.remove(); });
        if (col) col.remove();
        var left = remainingCols();
        updateCounts(left);
        if (left === 0) {
          document.getElementById("cmpScroll").hidden = true;
          document.getElementById("bulkBox").hidden = true;
          document.getElementById("cmpEmpty").hidden = false;
        }
      }, 420);
    });
  });

  /* ---------- メモ: editable inputs, persisted locally ---------- */
  var store = window.monoteStore;
  document.querySelectorAll(".memo-input").forEach(function (input) {
    var key = "memo:" + input.dataset.memo;
    if (store) {
      var saved = store.read(key);
      if (typeof saved === "string" && saved) input.value = saved;
    }
    input.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter") input.blur();
    });
    input.addEventListener("change", function () {
      if (store) store.write(key, input.value);
    });
    /* clicking anywhere in the cell focuses the input */
    var cell = input.closest("td");
    if (cell) {
      cell.addEventListener("click", function (ev) {
        if (ev.target !== input) input.focus();
      });
    }
  });

  /* ---------- 社名を伏せて送る toggle ---------- */
  var mask = document.getElementById("maskToggle");
  if (mask) {
    mask.addEventListener("click", function () {
      var on = mask.classList.toggle("is-on");
      mask.setAttribute("aria-pressed", on ? "true" : "false");
      mask.textContent = on ? "社名を伏せて送る ✓" : "社名を伏せて送る";
    });
  }
})();
