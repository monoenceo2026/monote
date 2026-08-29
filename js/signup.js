/* MONOTE — W-09 企業登録 step2 */
(function () {
  'use strict';

  var procWrap = document.getElementById('chips-process');
  var matWrap = document.getElementById('chips-material');
  var pvChips = document.getElementById('pv-chips');
  var pvLot = document.getElementById('pv-lot');
  var pvPrecision = document.getElementById('pv-precision');
  var pvDeadline = document.getElementById('pv-deadline');
  var pvPrice = document.getElementById('pv-price');
  var meterFill = document.getElementById('meter-fill');
  var meterPct = document.getElementById('meter-pct');
  var checkRequired = document.getElementById('check-required');

  var lotMin = document.getElementById('lot-min');
  var lotMax = document.getElementById('lot-max');
  var precision = document.getElementById('fld-precision');
  var deadline = document.getElementById('fld-deadline');
  var price = document.getElementById('fld-price');

  function checked(wrap) {
    return Array.prototype.slice.call(wrap.querySelectorAll('.ckchip.is-on'));
  }

  /* ---- preview ✓chips: 1素材 + 1工程(まとめ表記) + ロット ---- */
  function previewChipLabels() {
    var labels = [];
    var mats = checked(matWrap);
    if (mats.length) labels.push(mats[0].dataset.label);

    var procs = checked(procWrap);
    var seen = {};
    for (var i = 0; i < procs.length && labels.length < 2; i++) {
      var l = procs[i].dataset.label;
      if (!seen[l]) { seen[l] = true; labels.push(l); }
    }

    var min = (lotMin.value || '').replace(/[^0-9]/g, '');
    if (min === '1') {
      labels.push('1個から');
    } else if (min) {
      labels.push(min + '個〜');
    }
    return labels.slice(0, 3);
  }

  function renderPreviewChips() {
    var labels = previewChipLabels();
    pvChips.innerHTML = '';
    labels.forEach(function (label) {
      var chip = document.createElement('span');
      chip.className = 'pv-chip';
      var ck = document.createElement('span');
      ck.className = 'pv-chip__ck';
      ck.textContent = '✓';
      chip.appendChild(ck);
      chip.appendChild(document.createTextNode(label));
      pvChips.appendChild(chip);
    });
    pvChips.hidden = labels.length === 0;
  }

  /* ---- preview values <- form ---- */
  function renderPreviewValues() {
    var min = lotMin.value.trim();
    var max = lotMax.value.trim();
    pvLot.textContent = (min || '−') + '〜' + (max || '−') + '個';
    pvPrecision.textContent = precision.value;
    pvDeadline.textContent = deadline.value.trim() || '−';
    pvPrice.textContent = price.value === '非公開' ? '非公開' : price.value.replace(/\s+/g, '');
  }

  /* ---- 充足度 ---- */
  function renderMeter() {
    var count = checked(procWrap).length + checked(matWrap).length;
    var pct = Math.max(12, Math.min(92, 36 + count * 4));
    meterFill.style.width = pct + '%';
    meterPct.textContent = pct + '%';

    var ok = checked(procWrap).length > 0 &&
             checked(matWrap).length > 0 &&
             lotMin.value.trim() !== '';
    checkRequired.classList.toggle('is-done', ok);
    checkRequired.textContent = ok
      ? '✓ 加工・材質・ロット（必須）'
      : '− 加工・材質・ロット（必須）＜ 未入力';
  }

  /* ---- caret はテキスト直後に置く（Figma準拠） / 納期inputは内容幅 ---- */
  var measurer = document.createElement('span');
  measurer.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;' +
    'font:15px/1.3 "IBM Plex Sans JP","Hiragino Kaku Gothic ProN",sans-serif;';
  document.body.appendChild(measurer);

  function textW(t) {
    measurer.textContent = t;
    return measurer.getBoundingClientRect().width;
  }

  function layoutInline() {
    Array.prototype.forEach.call(document.querySelectorAll('.fld__select'), function (wrap) {
      var sel = wrap.querySelector('select');
      var caret = wrap.querySelector('.fld__caret');
      if (!sel || !caret) return;
      var opt = sel.options[sel.selectedIndex];
      var w = 16 + textW(opt ? opt.text : '') + 8;
      if (w < wrap.clientWidth - 24) {
        caret.style.right = 'auto';
        caret.style.left = w + 'px';
      } else {
        caret.style.left = 'auto';
        caret.style.right = '16px';
      }
    });
    deadline.style.width = Math.max(20, Math.ceil(textW(deadline.value)) + 4) + 'px';
  }

  function update() {
    renderPreviewChips();
    renderPreviewValues();
    renderMeter();
    layoutInline();
  }

  /* ---- chip toggle ---- */
  [procWrap, matWrap].forEach(function (wrap) {
    wrap.addEventListener('click', function (e) {
      var chip = e.target.closest('.ckchip');
      if (!chip) return;
      var on = chip.classList.toggle('is-on');
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
      update();
    });
  });

  /* ---- form bindings ---- */
  [lotMin, lotMax, deadline].forEach(function (el) {
    el.addEventListener('input', update);
  });
  [precision, price].forEach(function (el) {
    el.addEventListener('change', update);
  });
  Array.prototype.forEach.call(document.querySelectorAll('.fld__select select'), function (el) {
    el.addEventListener('change', layoutInline);
  });

  update();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layoutInline);
  }
  window.addEventListener('load', layoutInline);
})();
