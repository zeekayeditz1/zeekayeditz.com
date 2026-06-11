/* ═══════════════════════════════════════════════════════════════════
   ZEEKAY CINEMA LAYER v1.0 — "The Edit Session"
   ───────────────────────────────────────────────────────────────────
   Loads AFTER script.js and depth.js. Injects everything itself —
   no HTML edits needed beyond the <script>/<link> tags.

   What it does:
   • Bottom timeline dock styled like Premiere Pro: one colored clip
     per section, a red playhead that scrubs as you scroll, a live
     24fps timecode, clickable clips that jump to sections.
   • Camera viewfinder HUD: blinking REC while scrolling, STBY when
     idle, corner brackets (desktop).
   • Camera shutter blink whenever you cross into a new section.
   • Clapperboard "SCENE 0X" slate that pops in for each section.

   Safety: prefers-reduced-motion → fully disabled. Mobile gets the
   slim dock. Theme-aware via existing html.dark / html.light.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  if (window.__zkCinema) return;
  window.__zkCinema = true;

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}
  if (reduceMotion) return;

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function pad(n, w) { n = String(n); while (n.length < w) n = '0' + n; return n; }

  /* ─── Scene definitions (selector, label, clip color) ────────── */
  var SCENES = [
    { sel: '#home',          label: 'INTRO',    color: '#9747FF' },
    { sel: '.about',         label: 'ABOUT',    color: '#FF6900' },
    { sel: '#services',      label: 'SERVICES', color: '#2EC4B6' },
    { sel: '.stats-section', label: 'STATS',    color: '#E84C5C' },
    { sel: '.testimonials',  label: 'REVIEWS',  color: '#7A5CFF' },
    { sel: '.skills',        label: 'SKILLS',   color: '#FFB020' },
    { sel: '#contact',       label: 'CONTACT',  color: '#36A2EB' }
  ];

  var FPS = 24;
  var NAV_OFFSET = 78; // fixed nav height + gap for click-to-jump

  var scenes = [];     // [{ el, label, color, top, h, clipEl }]
  var els = {};        // injected DOM refs
  var activeIdx = -1;
  var lastShutter = 0;
  var slateTimer = null;
  var bootedAt = 0;

  /* ─── Collect sections ───────────────────────────────────────── */
  function collect() {
    scenes = [];
    SCENES.forEach(function (s) {
      var el = document.querySelector(s.sel);
      if (el) scenes.push({ el: el, label: s.label, color: s.color, top: 0, h: 1, clipEl: null });
    });
  }

  /* ─── Measure layout (transform-free; depth.js may be animating
         these sections, so subtract nothing — we clear & re-read) ── */
  var measureQueued = false;
  function measure() {
    measureQueued = false;
    var saved = [];
    scenes.forEach(function (s) {
      saved.push(s.el.style.transform);
      s.el.style.transform = '';
    });
    var sy = window.pageYOffset || document.documentElement.scrollTop || 0;
    scenes.forEach(function (s, i) {
      var r = s.el.getBoundingClientRect();
      s.top = r.top + sy;
      s.h = Math.max(r.height, 1);
      s.el.style.transform = saved[i];
    });
    sizeClips();
  }
  function queueMeasure() {
    if (measureQueued) return;
    measureQueued = true;
    setTimeout(measure, 150);
  }

  /* ─── Build the dock + HUD + shutter + slate ─────────────────── */
  function inject() {
    /* dock */
    var dock = document.createElement('div');
    dock.className = 'zk-dock';
    dock.setAttribute('aria-hidden', 'true');
    dock.innerHTML =
      '<div class="zk-dock-tc">' +
        '<div class="zk-tc-time">00:00:00:00</div>' +
        '<div class="zk-tc-label">Sequence 01</div>' +
      '</div>' +
      '<div class="zk-track"><div class="zk-playhead"></div></div>' +
      '<div class="zk-dock-fps">24 FPS &middot; ZK EDIT</div>';
    document.body.appendChild(dock);

    els.dock = dock;
    els.tc = dock.querySelector('.zk-tc-time');
    els.track = dock.querySelector('.zk-track');
    els.playhead = dock.querySelector('.zk-playhead');

    scenes.forEach(function (s, i) {
      var clip = document.createElement('button');
      clip.type = 'button';
      clip.className = 'zk-clip';
      clip.style.setProperty('--zk-clip', s.color);
      clip.setAttribute('aria-label', 'Jump to ' + s.label);
      clip.innerHTML = '<span>' + s.label + '</span>';
      clip.addEventListener('click', function () {
        window.scrollTo({ top: Math.max(s.top - NAV_OFFSET, 0), behavior: 'smooth' });
      });
      els.track.appendChild(clip);
      s.clipEl = clip;
    });
    /* keep playhead above clips */
    els.track.appendChild(els.playhead);

    /* HUD */
    var hud = document.createElement('div');
    hud.className = 'zk-hud';
    hud.setAttribute('aria-hidden', 'true');
    hud.innerHTML =
      '<div class="zk-rec"><div class="zk-rec-dot"></div><span class="zk-rec-txt">STBY</span></div>' +
      '<div class="zk-corner tl"></div><div class="zk-corner tr"></div>' +
      '<div class="zk-corner bl"></div><div class="zk-corner br"></div>';
    document.body.appendChild(hud);
    els.rec = hud.querySelector('.zk-rec');
    els.recTxt = hud.querySelector('.zk-rec-txt');

    /* shutter */
    var shutter = document.createElement('div');
    shutter.className = 'zk-shutter';
    shutter.setAttribute('aria-hidden', 'true');
    shutter.innerHTML = '<div class="bar top"></div><div class="bar bottom"></div>';
    document.body.appendChild(shutter);
    els.shutter = shutter;

    /* slate */
    var slate = document.createElement('div');
    slate.className = 'zk-slate';
    slate.setAttribute('aria-hidden', 'true');
    slate.innerHTML =
      '<div class="zk-slate-clap"></div>' +
      '<div class="zk-slate-body">' +
        '<span class="zk-slate-scene">SC. 01</span>' +
        '<span class="zk-slate-name">INTRO</span>' +
      '</div>';
    document.body.appendChild(slate);
    els.slate = slate;
    els.slateScene = slate.querySelector('.zk-slate-scene');
    els.slateName = slate.querySelector('.zk-slate-name');
  }

  /* clip widths proportional to section heights */
  function sizeClips() {
    var total = 0;
    scenes.forEach(function (s) { total += s.h; });
    if (total <= 0) return;
    scenes.forEach(function (s) {
      s.clipEl.style.flexGrow = (s.h / total * 100).toFixed(2);
    });
  }

  /* ─── Effects ────────────────────────────────────────────────── */
  function fireShutter() {
    var now = performance.now();
    if (now - lastShutter < 750) return;       // throttle
    if (now - bootedAt < 1200) return;         // never on page load
    lastShutter = now;
    els.shutter.classList.remove('zk-snap');
    // force reflow so the animation can restart
    void els.shutter.offsetWidth;
    els.shutter.classList.add('zk-snap');
    setTimeout(function () { els.shutter.classList.remove('zk-snap'); }, 420);
  }

  function showSlate(idx) {
    els.slateScene.textContent = 'SC. ' + pad(idx + 1, 2);
    els.slateName.textContent = scenes[idx].label;
    els.slate.classList.add('zk-show');
    if (slateTimer) clearTimeout(slateTimer);
    slateTimer = setTimeout(function () {
      els.slate.classList.remove('zk-show');
    }, 1500);
  }

  function setActive(idx) {
    if (idx === activeIdx) return;
    var first = activeIdx === -1;
    activeIdx = idx;
    scenes.forEach(function (s, i) {
      s.clipEl.classList.toggle('zk-active', i === idx);
    });
    if (!first) {
      fireShutter();
      showSlate(idx);
    }
  }

  /* ─── Main loop ──────────────────────────────────────────────── */
  var lastY = 0;
  var idleFrames = 0;
  var recOn = false;
  var lastTcText = '';

  function frame() {
    requestAnimationFrame(frame);
    if (document.hidden) return;

    var vh = window.innerHeight;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var docH = Math.max(document.documentElement.scrollHeight - vh, 1);
    var progress = clamp(scrollY / docH, 0, 1);

    /* REC / STBY */
    var moving = Math.abs(scrollY - lastY) > 0.5;
    lastY = scrollY;
    if (moving) idleFrames = 0; else idleFrames++;
    var shouldRec = idleFrames < 30;
    if (shouldRec !== recOn) {
      recOn = shouldRec;
      els.rec.classList.toggle('zk-on', recOn);
      els.recTxt.textContent = recOn ? 'REC' : 'STBY';
    }

    /* playhead position */
    var trackW = els.track.clientWidth;
    els.playhead.style.transform =
      'translateX(' + (progress * Math.max(trackW - 2, 0)).toFixed(1) + 'px)';

    /* timecode — full page = 60 s sequence @ 24fps */
    var totalFrames = Math.round(progress * 60 * FPS);
    var ss = Math.floor(totalFrames / FPS);
    var ff = totalFrames % FPS;
    var mm = Math.floor(ss / 60);
    ss = ss % 60;
    var tc = '00:' + pad(mm, 2) + ':' + pad(ss, 2) + ':' + pad(ff, 2);
    if (tc !== lastTcText) {
      lastTcText = tc;
      els.tc.textContent = tc;
    }

    /* active scene = the one containing the viewport center */
    var centerDoc = scrollY + vh * 0.5;
    var idx = 0;
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (centerDoc >= s.top && centerDoc < s.top + s.h) { idx = i; break; }
      if (centerDoc >= s.top) idx = i; // fallback: last section we passed
    }
    setActive(idx);
  }

  /* ─── Boot ───────────────────────────────────────────────────── */
  function boot() {
    collect();
    if (!scenes.length) return;
    inject();
    measure();

    bootedAt = performance.now();
    lastY = window.pageYOffset || 0;

    window.addEventListener('resize', queueMeasure, { passive: true });
    window.addEventListener('load', queueMeasure);
    if ('ResizeObserver' in window && document.body) {
      var first = true;
      new ResizeObserver(function () {
        if (first) { first = false; return; }
        queueMeasure();
      }).observe(document.body);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
