/* MONOTE TOP — hero motion (no.meets.ltd-inspired, Monoen symbol blob) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- load-in ---------- */
  window.requestAnimationFrame(function () {
    document.body.classList.add("is-loaded");
  });

  /* ---------- mobile placeholder (per SP design) ---------- */
  var heroInput = document.querySelector(".hero__search-input");
  if (heroInput && window.matchMedia("(max-width: 768px)").matches) {
    heroInput.placeholder = "例：SUS304の薄板 小ロット";
  }

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector(".menu-btn");
  var spMenu = document.querySelector(".sp-menu");
  if (menuBtn && spMenu) {
    menuBtn.addEventListener("click", function () {
      var open = spMenu.hidden;
      spMenu.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- morphing Monoen symbol blob ---------- */
  // Contour of the Monoen logo symbol traced from the brand asset (viewBox 306x380)
  var BASE = [
    [172.0, 0.0], [204.2, 1.0], [233.7, 8.7], [260.5, 22.5], [283.5, 44.5],
    [300.0, 70.3], [305.0, 100.8], [299.0, 131.0], [290.0, 159.9], [287.9, 190.9],
    [293.3, 221.3], [299.4, 251.4], [295.9, 282.1], [274.5, 303.5], [245.8, 313.0],
    [216.5, 321.0], [188.9, 333.0], [165.4, 353.6], [140.9, 372.0], [111.2, 379.0],
    [80.2, 375.0], [52.6, 363.0], [28.2, 343.2], [10.0, 318.1], [3.0, 289.2],
    [3.0, 259.6], [16.5, 232.5], [31.0, 206.0], [41.0, 177.5], [43.0, 145.7],
    [43.1, 113.9], [51.0, 84.6], [65.2, 57.8], [87.1, 34.9], [112.6, 17.4],
    [140.4, 6.0]
  ];
  var CX = 153, CY = 190;
  var N = BASE.length;

  var blobSvg = document.querySelector(".hero-blob");
  var blobPath = blobSvg ? blobSvg.querySelector("path") : null;
  var metalTL = document.querySelector(".hero-metal--tl");
  var metalR = document.querySelector(".hero-metal--r");
  var hero = document.querySelector(".hero");

  function buildPath(pts) {
    var d = "M" + pts[0][0].toFixed(1) + "," + pts[0][1].toFixed(1);
    for (var i = 0; i < N; i++) {
      var p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += "C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " +
                 c2x.toFixed(1) + "," + c2y.toFixed(1) + " " +
                 p2[0].toFixed(1) + "," + p2[1].toFixed(1);
    }
    return d + "Z";
  }

  if (blobPath) {
    blobPath.setAttribute("d", buildPath(BASE));
  }

  if (reduceMotion || !blobPath) return;

  /* mouse parallax state */
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  window.addEventListener("mousemove", function (e) {
    tmx = e.clientX / window.innerWidth - 0.5;
    tmy = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* scroll state */
  var scrollY = 0;
  window.addEventListener("scroll", function () {
    scrollY = window.scrollY;
  }, { passive: true });

  var pts = BASE.map(function (p) { return [p[0], p[1]]; });

  function tick(now) {
    var t = now * 0.001;

    /* organic wobble: each contour point breathes radially with its own phase */
    for (var i = 0; i < N; i++) {
      var bx = BASE[i][0], by = BASE[i][1];
      var dx = bx - CX, dy = by - CY;
      var r = Math.sqrt(dx * dx + dy * dy) || 1;
      var wobble =
        Math.sin(t * 0.55 + i * 0.9) * 3.2 +
        Math.sin(t * 0.9 + i * 2.3) * 1.8;
      var k = 1 + wobble / r * 0.9;
      pts[i][0] = CX + dx * k;
      pts[i][1] = CY + dy * k;
    }
    blobPath.setAttribute("d", buildPath(pts));

    /* meets.ltd-style scroll response: the symbol grows and drifts as you scroll */
    var heroH = hero ? hero.offsetHeight : 625;
    var progress = Math.min(scrollY / heroH, 1.4);
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;

    var scale = 1 + progress * 0.35;
    var driftY = progress * 90;
    var rot = Math.sin(t * 0.18) * 3 - progress * 6;
    blobSvg.style.transform =
      "translate(calc(-50% + " + (mx * 26).toFixed(1) + "px), calc(-54% + " +
      (driftY + my * 18).toFixed(1) + "px)) scale(" + scale.toFixed(3) + ") rotate(" + rot.toFixed(2) + "deg)";

    /* metallic symbols: slow float + inverse parallax */
    if (metalTL) {
      metalTL.style.transform =
        "translate(" + (-mx * 18).toFixed(1) + "px, " +
        (Math.sin(t * 0.5) * 8 - my * 12 + scrollY * 0.12).toFixed(1) + "px) rotate(" +
        (Math.sin(t * 0.3) * 2).toFixed(2) + "deg)";
    }
    if (metalR) {
      metalR.style.transform =
        "translate(" + (mx * 22).toFixed(1) + "px, " +
        (Math.cos(t * 0.45) * 10 + my * 16 - scrollY * 0.08).toFixed(1) + "px) rotate(" +
        (Math.cos(t * 0.35) * -2.5).toFixed(2) + "deg)";
    }

    window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);

  /* ---------- marquee: duplicate track content for seamless loop ---------- */
  var track = document.querySelector(".hero__logos-track");
  if (track) {
    track.innerHTML += track.innerHTML;
  }
})();
