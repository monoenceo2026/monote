/* MONOTE — W-02 検索結果ページ behaviors */
(function () {
  "use strict";

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- タブ（企業 / 記事） ---------- */
  var tabCompanies = $("#tabCompanies");
  var tabArticles = $("#tabArticles");
  var panelCompanies = $("#panelCompanies");
  var panelArticles = $("#panelArticles");

  function selectTab(articles) {
    tabCompanies.classList.toggle("is-active", !articles);
    tabArticles.classList.toggle("is-active", articles);
    tabCompanies.setAttribute("aria-selected", String(!articles));
    tabArticles.setAttribute("aria-selected", String(articles));
    panelCompanies.hidden = articles;
    panelArticles.hidden = !articles;
  }
  tabCompanies.addEventListener("click", function () { selectTab(false); });
  tabArticles.addEventListener("click", function () { selectTab(true); });

  /* ---------- 適用中の条件チップ ---------- */
  var suggestBar = $("#suggestBar");
  var companyCount = $("#companyCount");
  var spCompanyCount = $("#spCompanyCount");
  var spCondCount = $("#spCondCount");

  function setCompanyCount(n) {
    if (companyCount) companyCount.textContent = n;
    if (spCompanyCount) spCompanyCount.textContent = n + "社";
  }
  function refreshCondCount() {
    if (spCondCount) spCondCount.textContent = $$(".cond-chip").length;
  }
  function removeChip(chip) {
    chip.style.transition = "opacity .25s ease, transform .25s ease";
    chip.style.opacity = "0";
    chip.style.transform = "scale(.9)";
    setTimeout(function () {
      var isDelivery = chip.dataset.cond === "delivery";
      chip.remove();
      refreshCondCount();
      if (isDelivery) {
        hideSuggest();
        setCompanyCount(48);
      }
    }, 220);
  }
  function hideSuggest() {
    if (!suggestBar || suggestBar.hidden) return;
    suggestBar.style.transition = "opacity .3s ease";
    suggestBar.style.opacity = "0";
    setTimeout(function () { suggestBar.hidden = true; }, 280);
  }

  $$(".cond-chip__x").forEach(function (x) {
    x.addEventListener("click", function () { removeChip(x.closest(".cond-chip")); });
  });

  var clearAll = $("#condClearAll");
  if (clearAll) {
    clearAll.addEventListener("click", function () {
      $$(".cond-chip").forEach(removeChip);
      hideSuggest();
      setTimeout(function () { setCompanyCount(128); }, 240);
    });
  }

  var suggestRemove = $("#suggestRemove");
  if (suggestRemove) {
    suggestRemove.addEventListener("click", function () {
      var chip = $('.cond-chip[data-cond="delivery"]');
      if (chip) removeChip(chip);
      else { hideSuggest(); setCompanyCount(48); }
    });
  }

  /* ---------- サイドバー ---------- */
  // 折りたたみ（—）
  $$(".f-group__toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var group = btn.closest(".f-group");
      var collapsed = group.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", String(!collapsed));
    });
  });
  // ＋さらに表示
  $$(".f-more-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var more = btn.parentElement.querySelector(".f-more");
      if (!more) return;
      more.hidden = !more.hidden;
      btn.textContent = more.hidden ? "＋さらに表示（8）" : "− 表示を減らす";
    });
  });
  // 条件をクリア
  var filterClear = $("#filterClear");
  if (filterClear) {
    filterClear.addEventListener("click", function () {
      $$('.sidebar .ck input[type="checkbox"]').forEach(function (c) { c.checked = false; });
    });
  }

  /* ---------- 保存する ---------- */
  var savedCountEl = $("#savedCount");
  $$(".js-save").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var on = btn.classList.toggle("is-on");
      var label = btn.querySelector(".js-save-label");
      if (label) {
        label.innerHTML = on
          ? "保存済み"
          : '保存<span class="pc-inline">する</span>';
      }
      if (savedCountEl) {
        savedCountEl.textContent = String(
          parseInt(savedCountEl.textContent, 10) + (on ? 1 : -1)
        );
      }
    });
  });

  /* ---------- 比較リスト ---------- */
  var MAX = 3;
  var cmpBar = $("#cmpBar");
  var cmpChips = $("#cmpChips");
  var cmpCount = $("#cmpCount");
  var cmpNote = $("#cmpNote");
  var cmpConsult = $("#cmpConsult");
  var compareList = ["〇〇製作所", "〇〇金属工業"]; // Figmaの初期状態

  function cardButtonFor(name) {
    var card = $('.c-card[data-company="' + name + '"]');
    return card ? card.querySelector(".js-compare") : null;
  }

  function renderCompare() {
    cmpChips.innerHTML = "";
    compareList.forEach(function (name) {
      var chip = document.createElement("span");
      chip.className = "cmp-chip";
      chip.innerHTML =
        "<span>" + name + "</span>" +
        '<button type="button" aria-label="' + name + ' を比較から外す">' +
        '<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1"/></svg>' +
        "</button>";
      chip.querySelector("button").addEventListener("click", function () {
        compareList = compareList.filter(function (n) { return n !== name; });
        var btn = cardButtonFor(name);
        if (btn) {
          btn.classList.remove("is-on");
          btn.innerHTML = '比較<span class="pc-inline">に追加</span>';
        }
        renderCompare();
      });
      cmpChips.appendChild(chip);
    });

    var n = compareList.length;
    cmpCount.textContent = n + "社";
    cmpNote.textContent =
      n >= MAX ? "比較は3社までです" : "あと" + (MAX - n) + "社まで追加できます";
    cmpConsult.textContent = n + "社にまとめて相談";
    cmpBar.classList.toggle("is-hidden", n === 0);
    dockBar();
  }

  $$(".js-compare").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var card = btn.closest(".c-card");
      var name = card ? card.dataset.company : null;
      if (!name) return;
      var idx = compareList.indexOf(name);
      if (idx >= 0) {
        compareList.splice(idx, 1);
        btn.classList.remove("is-on");
        btn.innerHTML = '比較<span class="pc-inline">に追加</span>';
      } else {
        if (compareList.length >= MAX) {
          cmpNote.textContent = "比較は3社までです";
          return;
        }
        compareList.push(name);
        btn.classList.add("is-on");
        btn.innerHTML = '<span aria-hidden="true">✓ </span>追加済み';
      }
      renderCompare();
    });
  });

  /* ---------- 比較バーの追従（フッターの上で止まる） ---------- */
  var footer = document.querySelector(".site-footer");
  function dockBar() {
    if (!cmpBar || !footer) return;
    var overlap = window.innerHeight - footer.getBoundingClientRect().top;
    cmpBar.style.bottom = overlap > 0 ? overlap + "px" : "0px";
  }
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { dockBar(); ticking = false; });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  renderCompare();
})();
