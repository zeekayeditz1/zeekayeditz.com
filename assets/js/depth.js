/* ═══════════════════════════════════════════════════════════════════
   ZEEKAY DEPTH ENGINE v1.0 — 3D Scroll Depth Layer
   ───────────────────────────────────────────────────────────────────
   Drop-in script. Loads AFTER assets/js/script.js.
   It NEVER touches elements that script.js transforms inline
   (.card, .service-card, .port-card, .blob children, typewriter)
   so the existing tilt / particles / reveal systems keep working.

   What it adds:
   1. Section depth fly-in  — sections rise out of Z-depth as you
      scroll (perspective + rotateX + scale + fade), settle flat,
      then gently recede when leaving the viewport.
   2. Hero camera pull      — hero content scales back & fades like
      a camera dolly-out as you scroll past it.
   3. Velocity skew         — subtle Lenis-style skew driven by
      scroll speed (desktop only).
   4. Depth dust            — a global 3-layer parallax particle
      field behind the whole page (theme-aware).
   5. Background blob parallax (moves the .bg-blobs CONTAINER only,
      never the .blob children that script.js animates).
   6. Scroll progress bar.

   Safety: prefers-reduced-motion → engine fully disabled.
           Mobile → lightweight mode (no rotation/skew, fewer dust
           particles, lighter hero pull).
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── Hard bail-outs ─────────────────────────────────────────── */
  if (window.__zkDepthEngine) return; // double-include guard
  window.__zkDepthEngine = true;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* matchMedia always exists in modern browsers */ }
  if (reduceMotion) return;

  /* ─── Helpers ────────────────────────────────────────────────── */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t)  { return a + (b - a) * t; }

  function isMobile() {
    return window.innerWidth < 768;
  }

  /* ─── Config (re-evaluated on resize) ────────────────────────── */
  var CFG = {};
  function buildConfig() {
    var m = isMobile();
    CFG = {
      mobile:     m,
      rotMax:     m ? 0    : 7,      // max rotateX in degrees (enter)
      rotExitMax: m ? 0    : 4,      // max rotateX leaving viewport
      scaleIn:    m ? 0.03 : 0.05,   // scale shrink at full depth
      fadeIn:     m ? 0.20 : 0.30,   // opacity drop at full depth
      liftIn:     m ? 14   : 28,     // translateY px at full depth
      skewMax:    m ? 0    : 1.1,    // velocity skew clamp (deg)
      heroScale:  m ? 0.05 : 0.08,   // hero camera-pull scale amount
      heroFade:   0.45,
      heroLift:   m ? 22   : 38,
      dustCount:  m ? 26   : 70,
      blobPar:    0.05                // bg-blobs container parallax rate
    };
  }
  buildConfig();

  /* ─── Element registry ───────────────────────────────────────── */
  var SECTION_SELECTORS = [
    '.about',
    '#services',
    '.stats-section',
    '.testimonials',
    '.skills',
    '#contact',
    '.marquee-section'
  ];

  var sections = [];   // [{ el, top, h, cur:{rx,sc,op,ty}, active }]
  var heroCam  = null; // { el, cur:{sc,op,ty} }
  var blobs    = null; // .bg-blobs container
  var progressBar = null;
  var docHeight = 0;

  function collect() {
    sections = [];
    SECTION_SELECTORS.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      el.classList.add('zk-depth');
      sections.push({
        el: el, top: 0, h: 0, active: false,
        cur: { rx: 0, sc: 1, op: 1, ty: 0 }
      });
    });

    var hc = document.querySelector('.hero > .container');
    if (hc) {
      hc.classList.add('zk-hero-cam');
      heroCam = { el: hc, cur: { sc: 1, op: 1, ty: 0 } };
    }

    blobs = document.querySelector('.bg-blobs');
  }

  /* ─── Layout measurement (transform-free, no feedback loop) ──── */
  var measureQueued = false;
  function measure() {
    measureQueued = false;
    // temporarily clear our inline transforms so we read TRUE layout
    sections.forEach(function (s) {
      s.el.style.transform = '';
      s.el.style.opacity = '';
    });
    var sy = window.pageYOffset || document.documentElement.scrollTop || 0;
    sections.forEach(function (s) {
      var r = s.el.getBoundingClientRect();
      s.top = r.top + sy;
      s.h   = r.height;
    });
    docHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
  }
  function queueMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    setTimeout(measure, 120); // debounce layout shifts
  }

  /* ─── Inject UI: progress bar + dust canvas ──────────────────── */
  function injectUI() {
    progressBar = document.createElement('div');
    progressBar.className = 'zk-progress';
    progressBar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(progressBar);

    dust.canvas = document.createElement('canvas');
    dust.canvas.id = 'zk-depth-canvas';
    dust.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(dust.canvas);
    dust.ctx = dust.canvas.getContext('2d');
    dustResize();
    dustBuild();
  }

  /* ─── Depth dust (3-layer parallax star-field) ───────────────── */
  var dust = { canvas: null, ctx: null, parts: [], W: 0, H: 0, dpr: 1 };

  function dustPalette() {
    var dark = document.documentElement.classList.contains('dark') ||
               !document.documentElement.classList.contains('light');
    return dark
      ? ['232,201,122', '255,255,255', '201,168,76', '192,87,73']
      : ['122,100,40',  '70,70,82',    '150,120,50', '160,70,60'];
  }

  function dustResize() {
    if (!dust.canvas) return;
    dust.dpr = Math.min(window.devicePixelRatio || 1, 2);
    dust.W = window.innerWidth;
    dust.H = window.innerHeight;
    dust.canvas.width  = Math.floor(dust.W * dust.dpr);
    dust.canvas.height = Math.floor(dust.H * dust.dpr);
    if (dust.ctx) dust.ctx.setTransform(dust.dpr, 0, 0, dust.dpr, 0, 0);
  }

  function dustBuild() {
    dust.parts = [];
    var pal = dustPalette();
    for (var i = 0; i < CFG.dustCount; i++) {
      var z = 0.25 + Math.random() * 0.75;          // depth 0.25 (far) → 1 (near)
      dust.parts.push({
        x:  Math.random(),                          // 0..1 of width
        y:  Math.random(),                          // 0..1 of virtual span
        z:  z,
        r:  0.6 + z * 1.7,                          // nearer = bigger
        a:  0.10 + z * 0.30,                        // nearer = brighter
        c:  pal[Math.floor(Math.random() * pal.length)],
        tw: Math.random() * Math.PI * 2,            // twinkle phase
        ts: 0.4 + Math.random() * 0.9,              // twinkle speed
        vx: (Math.random() - 0.5) * 0.012           // slow horizontal drift (%/s)
      });
    }
  }

  function dustRecolor() {
    var pal = dustPalette();
    dust.parts.forEach(function (p) {
      p.c = pal[Math.floor(Math.random() * pal.length)];
    });
  }

  function dustDraw(scrollY, t, dt) {
    var ctx = dust.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, dust.W, dust.H);
    var span = dust.H + 240; // virtual vertical span with off-screen margin
    for (var i = 0; i < dust.parts.length; i++) {
      var p = dust.parts[i];
      p.x += p.vx * dt;
      if (p.x < -0.02) p.x = 1.02;
      if (p.x >  1.02) p.x = -0.02;

      var baseY = p.y * span;
      var sy = baseY - scrollY * p.z * 0.16;
      sy = ((sy % span) + span) % span - 120;       // wrap into [-120, H+120]

      var alpha = p.a * (0.65 + 0.35 * Math.sin(t * p.ts + p.tw));
      ctx.beginPath();
      ctx.arc(p.x * dust.W, sy, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + p.c + ',' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  /* ─── Main animation loop ────────────────────────────────────── */
  var lastScrollY = 0;
  var smoothVel   = 0;
  var lastT       = 0;
  var settleFrames = 0; // small idle optimization counter

  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { lastT = now; return; }

    var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 0.016;
    lastT = now;

    var vh = window.innerHeight;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;

    /* scroll velocity → smoothed skew */
    var vel = scrollY - lastScrollY;
    lastScrollY = scrollY;
    smoothVel = lerp(smoothVel, vel, 0.12);
    var skew = clamp(smoothVel * 0.018, -CFG.skewMax, CFG.skewMax);

    var anyMotion = Math.abs(smoothVel) > 0.05;

    /* ── 1. Sections: depth fly-in / recede ── */
    for (var i = 0; i < sections.length; i++) {
      var s = sections[i];
      var top = s.top - scrollY;            // untransformed viewport-relative top
      var inRange = !(top + s.h < -250 || top > vh + 250);

      var trx = 0, tsc = 1, top_ = 1, tty = 0;
      if (inRange) {
        if (!s.active) { s.active = true; s.el.style.willChange = 'transform, opacity'; }
        var center = top + s.h / 2;
        var half = vh / 2 + s.h / 2;
        var p = clamp((center - vh / 2) / half, -1, 1);
        var damp = clamp(600 / Math.max(s.h, 1), 0.35, 1);

        if (p > 0) {                        // entering from below → lies back in depth
          var e = p * p;
          trx  =  e * CFG.rotMax * damp;
          tsc  =  1 - e * CFG.scaleIn;
          top_ =  1 - e * CFG.fadeIn;
          tty  =  e * CFG.liftIn;
        } else {                            // leaving upward → gently tips away
          var q = -p, e2 = q * q;
          trx  = -e2 * CFG.rotExitMax * damp;
          tsc  =  1 - e2 * (CFG.scaleIn * 0.4);
          top_ =  1 - e2 * (CFG.fadeIn * 0.55);
          tty  = -e2 * (CFG.liftIn * 0.5);
        }
      } else if (s.active) {
        s.active = false;
        s.el.style.willChange = '';
        s.el.style.transform = '';
        s.el.style.opacity = '';
        s.cur.rx = 0; s.cur.sc = 1; s.cur.op = 1; s.cur.ty = 0;
        continue;
      } else {
        continue;
      }

      var c = s.cur;
      c.rx = lerp(c.rx, trx, 0.14);
      c.sc = lerp(c.sc, tsc, 0.14);
      c.op = lerp(c.op, top_, 0.14);
      c.ty = lerp(c.ty, tty, 0.14);

      var atRest = Math.abs(c.rx) < 0.04 && Math.abs(1 - c.sc) < 0.0015 &&
                   Math.abs(c.ty) < 0.3 && Math.abs(skew) < 0.04 &&
                   Math.abs(1 - c.op) < 0.01;

      if (atRest) {
        if (s.el.style.transform !== '') { s.el.style.transform = ''; s.el.style.opacity = ''; }
      } else {
        s.el.style.transform =
          'perspective(1100px) translate3d(0,' + c.ty.toFixed(2) + 'px,0)' +
          ' rotateX(' + c.rx.toFixed(3) + 'deg)' +
          (CFG.skewMax > 0 ? ' skewY(' + skew.toFixed(3) + 'deg)' : '') +
          ' scale(' + c.sc.toFixed(4) + ')';
        s.el.style.opacity = c.op.toFixed(3);
      }
    }

    /* ── 2. Hero camera pull ── */
    if (heroCam) {
      var hpRaw = clamp(scrollY / (vh * 0.9), 0, 1);
      var hp = hpRaw * hpRaw;               // ease-in
      var h = heroCam.cur;
      h.sc = lerp(h.sc, 1 - hp * CFG.heroScale, 0.14);
      h.op = lerp(h.op, 1 - hp * CFG.heroFade, 0.14);
      h.ty = lerp(h.ty, hp * CFG.heroLift, 0.14);

      if (Math.abs(1 - h.sc) < 0.0015 && Math.abs(h.ty) < 0.3) {
        if (heroCam.el.style.transform !== '') {
          heroCam.el.style.transform = '';
          heroCam.el.style.opacity = '';
        }
      } else {
        heroCam.el.style.transform =
          'translate3d(0,' + h.ty.toFixed(2) + 'px,0) scale(' + h.sc.toFixed(4) + ')';
        heroCam.el.style.opacity = h.op.toFixed(3);
      }
    }

    /* ── 3. Background blob container parallax ── */
    if (blobs) {
      var bty = -clamp(scrollY * CFG.blobPar, 0, 240);
      blobs.style.transform = 'translate3d(0,' + bty.toFixed(1) + 'px,0)';
    }

    /* ── 4. Progress bar ── */
    if (progressBar) {
      var max = Math.max(docHeight - vh, 1);
      progressBar.style.transform = 'scaleX(' + clamp(scrollY / max, 0, 1).toFixed(4) + ')';
    }

    /* ── 5. Depth dust ── */
    if (anyMotion) settleFrames = 0; else settleFrames++;
    // dust keeps twinkling even at rest, but we can halve draw rate when idle
    if (settleFrames < 90 || (settleFrames % 2 === 0)) {
      dustDraw(scrollY, now / 1000, dt);
    }
  }

  /* ─── Events ─────────────────────────────────────────────────── */
  function onResize() {
    var wasMobile = CFG.mobile;
    buildConfig();
    dustResize();
    if (wasMobile !== CFG.mobile) dustBuild();
    queueMeasure();
  }

  function watchTheme() {
    if (!('MutationObserver' in window)) return;
    new MutationObserver(function () { dustRecolor(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  function watchLayout() {
    if ('ResizeObserver' in window && document.body) {
      var firstFire = true;
      new ResizeObserver(function () {
        if (firstFire) { firstFire = false; return; } // skip initial observation
        queueMeasure();
      }).observe(document.body);
    }
    window.addEventListener('load', queueMeasure);
  }

  /* ─── Boot ───────────────────────────────────────────────────── */
  function boot() {
    collect();
    injectUI();
    measure();
    watchTheme();
    watchLayout();
    window.addEventListener('resize', onResize, { passive: true });
    lastScrollY = window.pageYOffset || 0;
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
