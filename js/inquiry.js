/* W-06 相談フォーム — page behaviors */
(function () {
  'use strict';

  /* ---------- 相談の種類: radio cards ---------- */
  var cards = Array.prototype.slice.call(document.querySelectorAll('.type-card'));
  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      cards.forEach(function (c) {
        var on = c === card;
        c.classList.toggle('is-selected', on);
        c.setAttribute('aria-checked', on ? 'true' : 'false');
      });
      flashSaved();
    });
  });

  /* ---------- fake selects: sync view text with native select ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.selectbox'), function (box) {
    var sel = box.querySelector('select');
    var view = box.querySelector('.selectbox__view');
    if (!sel || !view) return;
    sel.addEventListener('change', function () {
      var opt = sel.options[sel.selectedIndex];
      view.textContent = opt ? opt.text : '';
      view.classList.toggle('is-placeholder', !!(opt && opt.hasAttribute('data-placeholder')));
      flashSaved();
    });
  });

  /* ---------- dropzone / file picker (dummy) ---------- */
  var dz = document.getElementById('dropzone');
  var fileInput = document.getElementById('file-input');
  var fileBtn = document.getElementById('file-btn');
  var fileList = document.getElementById('file-list');

  function addFiles(files) {
    Array.prototype.forEach.call(files, function (f) {
      var li = document.createElement('li');
      var name = document.createElement('span');
      name.textContent = f.name;
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.setAttribute('aria-label', f.name + ' を削除');
      rm.textContent = '×';
      rm.addEventListener('click', function () {
        li.remove();
        fileList.hidden = !fileList.children.length;
      });
      li.appendChild(name);
      li.appendChild(rm);
      fileList.appendChild(li);
    });
    fileList.hidden = !fileList.children.length;
    flashSaved();
  }

  if (dz && fileInput) {
    fileBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      addFiles(fileInput.files);
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        dz.classList.add('is-drag');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      dz.addEventListener(ev, function (e) {
        e.preventDefault();
        dz.classList.remove('is-drag');
      });
    });
    dz.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        addFiles(e.dataTransfer.files);
      }
    });
  }

  /* ---------- 送信先: remove recipient / keep counts in sync ---------- */
  var recList = document.getElementById('rec-list');
  var sendBtn = document.getElementById('send-btn');

  function recipientCount() {
    return recList ? recList.querySelectorAll('.rec').length : 0;
  }
  function syncCounts() {
    var n = recipientCount();
    Array.prototype.forEach.call(document.querySelectorAll('.js-count'), function (el) {
      el.textContent = n;
    });
    if (sendBtn) sendBtn.disabled = n === 0;
  }
  if (recList) {
    Array.prototype.forEach.call(recList.querySelectorAll('.rec__x'), function (x) {
      x.addEventListener('click', function () {
        var rec = x.closest('.rec');
        if (rec) rec.remove();
        syncCounts();
      });
    });
  }

  /* ---------- send / draft (demo) ---------- */
  if (sendBtn) {
    sendBtn.addEventListener('click', function () {
      var n = recipientCount();
      if (!n) return;
      alert(n + '社に相談を送信しました。\n各社の返信はマイページの「相談の履歴」に届きます。（デモ）');
    });
  }
  var draftBtn = document.getElementById('draft-btn');
  if (draftBtn) {
    draftBtn.addEventListener('click', function () {
      alert('下書きとして保存しました。（デモ）');
    });
  }

  /* ---------- autosave note flash ---------- */
  var note = document.getElementById('autosave-note');
  var noteTimer = null;
  function flashSaved() {
    if (!note) return;
    note.textContent = '入力内容を自動保存しました';
    note.classList.add('is-saved');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () {
      note.textContent = '入力内容は自動保存されます';
      note.classList.remove('is-saved');
    }, 1600);
  }
  var form = document.getElementById('inquiry-form');
  if (form) {
    form.addEventListener('change', flashSaved);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
  }
})();
