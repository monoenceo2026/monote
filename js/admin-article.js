/* MONOTE — W-07 記事投稿エディタ */
(function () {
  "use strict";

  /* ---------- theme radio cards ---------- */
  const themeCards = document.querySelectorAll(".theme-card");
  const leadEl = document.querySelector(".js-lead");
  themeCards.forEach((card) => {
    const input = card.querySelector("input[type=radio]");
    if (!input) return;
    input.addEventListener("change", () => {
      if (!input.checked) return;
      themeCards.forEach((c) => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      if (leadEl && input.dataset.lead) leadEl.textContent = input.dataset.lead;
    });
  });

  /* ---------- title char count ---------- */
  const title = document.querySelector(".js-title");
  const count = document.querySelector(".js-title-count");
  function updateCount() {
    if (!title || !count) return;
    count.textContent = String(title.textContent.replace(/\s+/g, " ").trim().length);
  }
  if (title) {
    title.addEventListener("input", updateCount);
    /* keep it single-line: Enter blurs instead of inserting a break */
    title.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") { ev.preventDefault(); title.blur(); }
    });
    updateCount();
  }

  /* ---------- condition chips ---------- */
  const chipWrap = document.querySelector(".js-chips");
  if (chipWrap) {
    const closeIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>';
    const plusIcon = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11M2.5 8h11"/></svg>';

    chipWrap.addEventListener("click", (ev) => {
      const chip = ev.target.closest(".cond-chip");
      if (!chip) return;
      const label = chip.dataset.label || chip.textContent.trim();

      if (chip.classList.contains("cond-chip--add")) {
        /* add: gray "+" chip becomes an attached blue chip */
        const added = document.createElement("button");
        added.type = "button";
        added.className = "cond-chip";
        added.dataset.label = label;
        added.dataset.readd = "1";
        added.innerHTML = label + closeIcon;
        chip.replaceWith(added);
      } else {
        /* remove: fade out, and offer the suggestion again if it was an added one */
        chip.classList.add("is-leaving");
        setTimeout(() => {
          if (chip.dataset.readd) {
            const re = document.createElement("button");
            re.type = "button";
            re.className = "cond-chip cond-chip--add";
            re.dataset.label = chip.dataset.label;
            re.innerHTML = plusIcon + chip.dataset.label;
            chip.replaceWith(re);
            re.classList.remove("is-leaving");
          } else {
            chip.remove();
          }
        }, 200);
      }
    });
  }

  /* ---------- action bar (fixed) ---------- */
  const status = document.querySelector(".js-bar-status");
  const sendReview = document.querySelector(".js-send-review");
  const publish = document.querySelector(".js-publish");
  if (sendReview && status) {
    sendReview.addEventListener("click", () => {
      status.textContent = "社内確認へ回しました（承認者：工場長）";
    });
  }
  if (publish && status) {
    publish.addEventListener("click", () => {
      status.textContent = "公開しました（デモ）・記事ページに反映されます";
      publish.textContent = "公開済み";
      publish.disabled = true;
      publish.style.opacity = "0.6";
    });
  }

  /* ---------- autosave label (light demo) ---------- */
  const autosave = document.querySelector(".js-autosave");
  if (autosave) {
    let min = 1;
    setInterval(() => {
      min += 1;
      autosave.textContent = min + "分前に自動保存しました";
    }, 60000);
  }
})();
