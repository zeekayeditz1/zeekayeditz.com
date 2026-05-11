/* ═══════════════════════════════════════════════════════════════════
   ZEEKAY EDITZ — PORTFOLIO SCRIPT
   Vanilla JS — no dependencies. Smooth, fast, accessible.
   ═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Helpers ──────────────────────────────────────────────────
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Theme Toggle ─────────────────────────────────────────────
  const html = document.documentElement;
  const STORAGE_KEY = 'zeekay-theme';

  function applyTheme(theme) {
    html.classList.remove('light', 'dark');
    html.classList.add(theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }

  function initTheme() {
    let theme;
    try { theme = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    // Default to dark — only honor saved preference, not OS preference
    if (theme !== 'light' && theme !== 'dark') theme = 'dark';
    applyTheme(theme);
  }
  initTheme();

  document.addEventListener('DOMContentLoaded', () => {
    $$('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const cur = html.classList.contains('dark') ? 'dark' : 'light';
        applyTheme(cur === 'dark' ? 'light' : 'dark');
      });
    });

    // ─── Preloader ────────────────────────────────────────────────
    window.addEventListener('load', () => {
      const pre = $('#preloader');
      if (pre) {
        setTimeout(() => {
          pre.classList.add('gone');
          setTimeout(() => { pre.remove(); }, 600);
        }, 400);
      }
    });
    // Fallback in case load already fired
    setTimeout(() => {
      const pre = $('#preloader');
      if (pre && !pre.classList.contains('gone')) {
        pre.classList.add('gone');
        setTimeout(() => pre.remove(), 600);
      }
    }, 2500);

    // ─── Custom Cursor ────────────────────────────────────────────
    const cursorOutline = $('.cursor-outline');
    const cursorDot = $('.cursor-dot');
    if (cursorOutline && cursorDot && !('ontouchstart' in window) && window.matchMedia('(hover: hover)').matches) {
      let mouseX = 0, mouseY = 0, outX = 0, outY = 0;
      document.addEventListener('mousemove', e => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        cursorDot.style.left = mouseX + 'px';
        cursorDot.style.top  = mouseY + 'px';
      });
      function loop() {
        outX += (mouseX - outX) * 0.18;
        outY += (mouseY - outY) * 0.18;
        cursorOutline.style.left = outX + 'px';
        cursorOutline.style.top  = outY + 'px';
        requestAnimationFrame(loop);
      }
      loop();

      // Hover state on interactive elements
      const hoverSelector = 'a, button, .card, .chip, .tool, .filter-btn, .social-bubble, .cs-link, .port-card, .mini-thumb';
      document.addEventListener('mouseover', e => {
        if (e.target.closest(hoverSelector)) cursorOutline.classList.add('hover');
      });
      document.addEventListener('mouseout', e => {
        if (e.target.closest(hoverSelector)) cursorOutline.classList.remove('hover');
      });
    }

    // ─── Sticky Nav ───────────────────────────────────────────────
    const nav = $('.nav-wrap');
    function checkScroll() {
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 30);
      const top = $('.to-top');
      if (top) top.classList.toggle('show', window.scrollY > 600);
    }
    checkScroll();
    window.addEventListener('scroll', checkScroll, { passive: true });

    // ─── Mobile Menu ──────────────────────────────────────────────
    const menuToggle = $('.menu-toggle');
    const navLinks = $('.nav-links');
    if (menuToggle && navLinks) {
      menuToggle.addEventListener('click', () => {
        const open = navLinks.classList.toggle('open');
        menuToggle.classList.toggle('open', open);
        menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // ─── Smooth Scroll & Active Link ──────────────────────────────
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const id = link.getAttribute('href');
        if (id.length > 1) {
          const target = $(id);
          if (target) {
            e.preventDefault();
            const top = target.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
            // Close mobile menu if open
            if (navLinks && navLinks.classList.contains('open')) {
              navLinks.classList.remove('open');
              if (menuToggle) menuToggle.classList.remove('open');
            }
          }
        }
      });
    });

    // Active link highlighting on scroll
    const sections = $$('section[id], div[id="home"]');
    const navAs = $$('.nav-links a');
    function highlightLink() {
      let current = '';
      const scrollY = window.scrollY + 120;
      sections.forEach(s => {
        if (scrollY >= s.offsetTop) current = s.id;
      });
      navAs.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + current);
      });
    }
    window.addEventListener('scroll', highlightLink, { passive: true });
    highlightLink();

    // ─── Scroll To Top ────────────────────────────────────────────
    const toTop = $('.to-top');
    if (toTop) {
      toTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    }

    // ─── Reveal On Scroll (IntersectionObserver) ─────────────────
    const revealEls = $$('.reveal, .reveal-l, .reveal-r, .reveal-s');
    if (revealEls.length && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      revealEls.forEach(el => io.observe(el));
    } else {
      revealEls.forEach(el => el.classList.add('in'));
    }

    // ─── Counter Animation ────────────────────────────────────────
    const counters = $$('[data-count]');
    const counterObserver = ('IntersectionObserver' in window) ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 }) : null;

    function animateCount(el) {
      const target = parseFloat(el.getAttribute('data-count'));
      const suffix = el.getAttribute('data-suffix') || '';
      const duration = 1800;
      const start = performance.now();
      const easeOut = t => 1 - Math.pow(1 - t, 3);
      function tick(now) {
        const elapsed = Math.min((now - start) / duration, 1);
        const value = Math.round(target * easeOut(elapsed));
        el.textContent = value + suffix;
        if (elapsed < 1) requestAnimationFrame(tick);
        else el.textContent = target + suffix;
      }
      requestAnimationFrame(tick);
    }

    if (counterObserver) {
      counters.forEach(c => counterObserver.observe(c));
    } else {
      counters.forEach(c => c.textContent = c.getAttribute('data-count') + (c.getAttribute('data-suffix') || ''));
    }

    // ─── Skill Bars Animation ─────────────────────────────────────
    const skillFills = $$('.skill-fill');
    if (skillFills.length && 'IntersectionObserver' in window) {
      const skillObs = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const pct = entry.target.getAttribute('data-pct');
            entry.target.style.width = pct + '%';
            skillObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.3 });
      skillFills.forEach(el => skillObs.observe(el));
    }

    // ─── Typewriter ───────────────────────────────────────────────
    const tw = $('#typewriter');
    if (tw && !reduceMotion) {
      const words = (tw.getAttribute('data-words') || 'Motion Designer, Video Editor, Content Creator, AE Artist').split(',').map(s => s.trim());
      let wi = 0, ci = 0, deleting = false;
      function step() {
        const word = words[wi];
        tw.textContent = deleting ? word.substring(0, ci - 1) : word.substring(0, ci + 1);
        ci = deleting ? ci - 1 : ci + 1;
        let delay = deleting ? 50 : 90;
        if (!deleting && ci === word.length) { delay = 1800; deleting = true; }
        else if (deleting && ci === 0) { deleting = false; wi = (wi + 1) % words.length; delay = 400; }
        setTimeout(step, delay);
      }
      step();
    } else if (tw) {
      tw.textContent = 'Motion Designer';
    }

    // ─── Portfolio Filter ─────────────────────────────────────────
    const filterBtns = $$('.filter-btn');
    const portfolioItems = $$('.portfolio-item');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.getAttribute('data-filter');
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        portfolioItems.forEach(item => {
          if (filter === 'all' || item.classList.contains(filter)) {
            item.classList.remove('hide');
            item.classList.add('show');
            item.style.display = '';
          } else {
            item.classList.add('hide');
            item.classList.remove('show');
            setTimeout(() => { if (item.classList.contains('hide')) item.style.display = 'none'; }, 300);
          }
        });
      });
    });

    // ─── Magnetic effect on small interactive elements ───────────
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
      $$('.cta-arrow, .social-bubble, .cs-link, .to-top').forEach(el => {
        el.addEventListener('mousemove', e => {
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px) scale(1.05)`;
        });
        el.addEventListener('mouseleave', () => {
          el.style.transform = '';
        });
      });
    }

    // ─── Contact Form (Formspree) ────────────────────────────────
    const form = $('#contact-form');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        const msg = $('#form-msg');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';
        try {
          const res = await fetch(form.action, {
            method: 'POST',
            body: new FormData(form),
            headers: { 'Accept': 'application/json' }
          });
          if (res.ok) {
            msg.className = 'form-msg show success';
            msg.textContent = '✓ Message sent successfully! I will get back to you soon.';
            form.reset();
          } else {
            const data = await res.json().catch(() => ({}));
            msg.className = 'form-msg show error';
            msg.textContent = (data.errors && data.errors[0] && data.errors[0].message) || 'Something went wrong. Please try again.';
          }
        } catch (err) {
          msg.className = 'form-msg show error';
          msg.textContent = 'Network error. Please check your connection and try again.';
        }
        btn.disabled = false;
        btn.innerHTML = original;
        setTimeout(() => { if (msg) msg.className = 'form-msg'; }, 6000);
      });
    }

    // ─── Parallax Background Blobs ───────────────────────────────
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
      const blobs = $$('.blob');
      window.addEventListener('mousemove', e => {
        const x = (e.clientX / window.innerWidth - 0.5) * 30;
        const y = (e.clientY / window.innerHeight - 0.5) * 30;
        blobs.forEach((b, i) => {
          const factor = (i + 1) * 0.5;
          b.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
        });
      });
    }

    // ─── Premium 3D Card Tilt with Shine ──────────────────────────
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches && window.innerWidth > 991) {
      const tiltCards = $$('.card, .service-card, .port-card');
      tiltCards.forEach(card => {
        let rafId = null;
        let targetX = 0, targetY = 0, currentX = 0, currentY = 0;
        let mouseInside = false;

        // Add glare overlay element (uses existing .card-glare CSS with --gx/--gy vars)
        if (!card.querySelector('.card-glare')) {
          const glare = document.createElement('div');
          glare.className = 'card-glare';
          glare.setAttribute('aria-hidden', 'true');
          card.appendChild(glare);
        }

        function animate() {
          // Smooth lerp toward target
          currentX += (targetX - currentX) * 0.15;
          currentY += (targetY - currentY) * 0.15;
          if (mouseInside) {
            card.style.transform = `perspective(1000px) rotateX(${-currentY * 8}deg) rotateY(${currentX * 8}deg) translateZ(12px)`;
          } else {
            card.style.transform = '';
          }
          if (mouseInside || Math.abs(currentX) > 0.01 || Math.abs(currentY) > 0.01) {
            rafId = requestAnimationFrame(animate);
          } else {
            rafId = null;
          }
        }

        card.addEventListener('mouseenter', () => {
          mouseInside = true;
          card.classList.add('tilting');
          if (!rafId) animate();
        });

        card.addEventListener('mousemove', e => {
          if (window.innerWidth <= 991) return;
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top) / rect.height;
          targetX = px - 0.5;
          targetY = py - 0.5;
          // Update glare position via CSS variables (used by .card-glare)
          card.style.setProperty('--gx', (px * 100) + '%');
          card.style.setProperty('--gy', (py * 100) + '%');
          if (!rafId) animate();
        });

        card.addEventListener('mouseleave', () => {
          mouseInside = false;
          targetX = 0; targetY = 0;
          card.classList.remove('tilting');
        });
      });
    }

    // Defensive cleanup on resize — clears any leftover inline transforms when going to mobile
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => {
        if (window.innerWidth <= 991) {
          $$('.card, .service-card, .port-card, .cta-arrow, .social-bubble, .cs-link, .to-top').forEach(el => {
            el.style.transform = '';
          });
          $$('.card-shine').forEach(s => s.style.background = '');
        }
      }, 100);
    });

    // ════════════════════════════════════════════════════════════
    // ═══ PARTICLES BACKGROUND ═══════════════════════════════════
    // ════════════════════════════════════════════════════════════
    (function initParticles() {
      const canvas = document.getElementById('particles-canvas');
      if (!canvas || reduceMotion) return;

      const ctx = canvas.getContext('2d');
      const isMobile = window.innerWidth <= 767;
      const PARTICLE_COUNT = isMobile ? 28 : 55;
      const CONNECT_DIST = isMobile ? 90 : 130;
      const MOUSE_RADIUS = 140;
      let particles = [];
      let mouse = { x: -9999, y: -9999 };
      let rafId = null;
      let visible = true;
      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width  = rect.width  + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      function createParticles() {
        particles = [];
        const rect = canvas.getBoundingClientRect();
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          particles.push({
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            vx: (Math.random() - 0.5) * 0.35,
            vy: (Math.random() - 0.5) * 0.35,
            size: Math.random() * 1.8 + 0.6,
          });
        }
      }

      function spawnBurst(x, y) {
        const burstCount = 10;
        for (let i = 0; i < burstCount; i++) {
          const angle = (Math.PI * 2 * i) / burstCount;
          const speed = 1.5 + Math.random() * 1.2;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 1.8,
            life: 70,
            maxLife: 70,
          });
        }
        // Keep array size bounded
        if (particles.length > PARTICLE_COUNT + 80) {
          particles.splice(PARTICLE_COUNT, particles.length - PARTICLE_COUNT - 80);
        }
      }

      function step() {
        if (!visible) { rafId = null; return; }
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, rect.width, rect.height);

        const isDark = document.documentElement.classList.contains('dark');
        const particleFill = isDark ? 'rgba(178, 130, 255, 0.85)' : 'rgba(120, 60, 220, 0.55)';
        const lineBase    = isDark ? '178, 130, 255' : '120, 60, 220';

        // Update & draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;

          // Wall bounce for ambient particles
          if (p.life === undefined) {
            if (p.x < 0 || p.x > rect.width)  p.vx *= -1;
            if (p.y < 0 || p.y > rect.height) p.vy *= -1;
          } else {
            p.life--;
            if (p.life <= 0 || p.x < -10 || p.x > rect.width + 10 || p.y < -10 || p.y > rect.height + 10) {
              particles.splice(i, 1);
              continue;
            }
          }

          // Mouse repulsion
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 1.5;
            p.x -= (dx / dist) * force;
            p.y -= (dy / dist) * force;
          }

          // Draw particle
          const opacity = p.life !== undefined ? (p.life / p.maxLife) : 1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = particleFill.replace('0.85)', (0.85 * opacity) + ')').replace('0.55)', (0.55 * opacity) + ')');
          ctx.fill();
        }

        // Draw connection lines
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i], p2 = particles[j];
            const dx = p1.x - p2.x, dy = p1.y - p2.y;
            const dist = Math.hypot(dx, dy);
            if (dist < CONNECT_DIST) {
              const op = (1 - dist / CONNECT_DIST) * 0.35;
              ctx.beginPath();
              ctx.moveTo(p1.x, p1.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle = `rgba(${lineBase}, ${op})`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        }

        // Mouse-to-particle highlight lines
        for (const p of particles) {
          const dx = mouse.x - p.x, dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < MOUSE_RADIUS) {
            const op = (1 - dist / MOUSE_RADIUS) * 0.5;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = `rgba(${lineBase}, ${op})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }

        rafId = requestAnimationFrame(step);
      }

      // Pause when hero not visible (performance)
      const heroSection = document.getElementById('home');
      if (heroSection && 'IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          entries.forEach(entry => {
            visible = entry.isIntersecting;
            if (visible && !rafId) step();
          });
        }, { threshold: 0 }).observe(heroSection);
      }

      // Events
      window.addEventListener('resize', () => { resize(); createParticles(); });
      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; });
      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        spawnBurst(e.clientX - rect.left, e.clientY - rect.top);
      });
      // Touch support: tap to burst
      canvas.addEventListener('touchstart', e => {
        if (e.touches[0]) {
          const rect = canvas.getBoundingClientRect();
          spawnBurst(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
        }
      }, { passive: true });

      resize();
      createParticles();
      step();
    })();

    // ════════════════════════════════════════════════════════════
    // ═══ TYPING SOUND (Web Audio API — no audio file needed) ═══
    // ════════════════════════════════════════════════════════════
    const TypingSound = (function() {
      let audioCtx = null;
      let enabled = false;
      let fadeMultiplier = 1; // 0..1 — controlled by typewriter visibility
      const STORAGE = 'zk-sound-on';

      try { enabled = localStorage.getItem(STORAGE) === '1'; } catch(e) {}

      function ensureCtx() {
        if (audioCtx) return audioCtx;
        try {
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) { return null; }
        return audioCtx;
      }

      function click() {
        if (!enabled || fadeMultiplier <= 0.01) return;
        const ctx2 = ensureCtx();
        if (!ctx2) return;
        if (ctx2.state === 'suspended') ctx2.resume();
        const t = ctx2.currentTime;
        const osc = ctx2.createOscillator();
        const gain = ctx2.createGain();
        const filter = ctx2.createBiquadFilter();

        // Realistic mechanical keyboard click — short, mid-frequency thock
        osc.type = 'triangle';
        const baseFreq = 600 + Math.random() * 250;
        osc.frequency.setValueAtTime(baseFreq, t);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2400, t);
        filter.Q.setValueAtTime(2, t);

        const vol = 0.09 * fadeMultiplier;
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);

        osc.connect(filter).connect(gain).connect(ctx2.destination);
        osc.start(t);
        osc.stop(t + 0.07);
      }

      function setEnabled(on) {
        enabled = !!on;
        try { localStorage.setItem(STORAGE, enabled ? '1' : '0'); } catch(e) {}
        if (enabled) ensureCtx(); // pre-init on user gesture
      }

      function isEnabled() { return enabled; }
      function setFade(v) { fadeMultiplier = Math.max(0, Math.min(1, v)); }

      return { click, setEnabled, isEnabled, setFade };
    })();

    // Wire the sound toggle button
    const soundBtn = $('.sound-toggle');
    if (soundBtn) {
      function updateBtn() {
        soundBtn.classList.toggle('on', TypingSound.isEnabled());
        soundBtn.setAttribute('aria-pressed', TypingSound.isEnabled() ? 'true' : 'false');
      }
      updateBtn();
      soundBtn.addEventListener('click', () => {
        TypingSound.setEnabled(!TypingSound.isEnabled());
        updateBtn();
        // Play a single test click so user hears it
        if (TypingSound.isEnabled()) setTimeout(() => TypingSound.click(), 80);
      });
    }

    // Hook into typewriter: patch tw element to emit click on character change
    const twEl = document.getElementById('typewriter');
    if (twEl) {
      let lastLen = twEl.textContent.length;
      // Use MutationObserver to detect text changes from typewriter loop
      new MutationObserver(() => {
        const newLen = twEl.textContent.length;
        if (newLen > lastLen) {
          // A character was added — click sound
          TypingSound.click();
        }
        lastLen = newLen;
      }).observe(twEl, { childList: true, characterData: true, subtree: true });
    }

    // Fade typewriter sound based on hero visibility (scroll-driven)
    const heroForSound = document.getElementById('home');
    if (heroForSound && 'IntersectionObserver' in window) {
      const thresholds = [];
      for (let i = 0; i <= 20; i++) thresholds.push(i / 20);
      new IntersectionObserver(entries => {
        entries.forEach(entry => {
          // ratio 1 = fully visible (full volume), 0 = gone (muted)
          TypingSound.setFade(entry.intersectionRatio);
        });
      }, { threshold: thresholds }).observe(heroForSound);
    }

    // ════════════════════════════════════════════════════════════
    // ═══ TESTIMONIALS CAROUSEL ══════════════════════════════════
    // ════════════════════════════════════════════════════════════
    (function initTestimonials() {
      const cards = $$('.testimonial-card');
      const dots  = $$('.testimonial-dot');
      const prevBtn = $('.testimonial-btn.prev');
      const nextBtn = $('.testimonial-btn.next');
      if (!cards.length) return;

      let current = 0;
      let autoTimer = null;
      const AUTO_DELAY = 5500;

      function show(idx) {
        idx = (idx + cards.length) % cards.length;
        cards.forEach((c, i) => c.classList.toggle('active', i === idx));
        dots.forEach((d, i) => {
          d.classList.toggle('active', i === idx);
          d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
        });
        current = idx;
      }

      function next() { show(current + 1); }
      function prev() { show(current - 1); }

      function startAuto() {
        stopAuto();
        autoTimer = setInterval(next, AUTO_DELAY);
      }
      function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      }

      dots.forEach((d, i) => {
        d.addEventListener('click', () => { show(i); startAuto(); });
        d.setAttribute('role', 'tab');
      });
      if (nextBtn) nextBtn.addEventListener('click', () => { next(); startAuto(); });
      if (prevBtn) prevBtn.addEventListener('click', () => { prev(); startAuto(); });

      // Pause on hover
      const wrap = $('.testimonial-wrap');
      if (wrap) {
        wrap.addEventListener('mouseenter', stopAuto);
        wrap.addEventListener('mouseleave', startAuto);
      }

      // Touch swipe support
      let touchX = 0;
      if (wrap) {
        wrap.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
        wrap.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].clientX - touchX;
          if (Math.abs(dx) > 50) {
            if (dx < 0) next(); else prev();
            startAuto();
          }
        }, { passive: true });
      }

      // Start only when section enters viewport (saves CPU)
      const tsec = document.getElementById('testimonials');
      if (tsec && 'IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) startAuto();
            else stopAuto();
          });
        }, { threshold: 0.2 }).observe(tsec);
      } else {
        startAuto();
      }
    })();

    // ════════════════════════════════════════════════════════════
    // ═══ LIVE VISITOR COUNTER ═══════════════════════════════════
    // ════════════════════════════════════════════════════════════
    (function initVisitorCounter() {
      const el = document.getElementById('visitor-count');
      if (!el) return;

      const STORAGE_KEY = 'zk-visit-count';
      const SESSION_KEY = 'zk-visit-session';
      const BASE = 1247; // starting baseline so the number looks alive on day 1

      function format(n) { return n.toLocaleString('en-US'); }

      function localFallback() {
        // Bump once per browser session
        let stored = parseInt(localStorage.getItem(STORAGE_KEY) || BASE, 10);
        if (!sessionStorage.getItem(SESSION_KEY)) {
          stored += 1 + Math.floor(Math.random() * 3);
          try {
            localStorage.setItem(STORAGE_KEY, String(stored));
            sessionStorage.setItem(SESSION_KEY, '1');
          } catch(e) {}
        }
        animateTo(stored);
      }

      function animateTo(target) {
        const duration = 1400;
        const start = performance.now();
        const startVal = 0;
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        function tick(now) {
          const t = Math.min((now - start) / duration, 1);
          const val = Math.round(startVal + (target - startVal) * easeOut(t));
          el.textContent = format(val);
          if (t < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }

      // Try free counter API first, fall back to localStorage if it fails
      const API_URL = 'https://api.counterapi.dev/v1/zeekayeditz/visits/up';
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 3500);

      fetch(API_URL, { signal: ctrl.signal })
        .then(r => r.ok ? r.json() : Promise.reject('bad status'))
        .then(data => {
          clearTimeout(timeoutId);
          const n = (data && (data.count || data.value)) || 0;
          if (n > 0) {
            try { localStorage.setItem(STORAGE_KEY, String(n)); } catch(e) {}
            animateTo(n);
          } else {
            localFallback();
          }
        })
        .catch(() => { clearTimeout(timeoutId); localFallback(); });
    })();

    // ════════════════════════════════════════════════════════════
    // ═══ WhatsApp Float — show after small delay (less jarring) ═
    // ════════════════════════════════════════════════════════════
    const waFloat = $('.wa-float');
    if (waFloat) {
      setTimeout(() => waFloat.classList.add('show'), 1400);
    }

  }); // DOMContentLoaded
})();

/* ═══════════════════════════════════════════════════════════════════
   ADVANCED FEATURES — Particles, Testimonials, Counter, Sound, Parallax
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = ('ontouchstart' in window) || !window.matchMedia('(hover: hover)').matches;

  document.addEventListener('DOMContentLoaded', () => {

    /* ── 1. PARTICLES BACKGROUND ─────────────────────────────── */
    (function initParticles() {
      const canvas = $('#particles-canvas');
      if (!canvas || reduce) return;
      const ctx = canvas.getContext('2d');
      let particles = [];
      let mouse = { x: -9999, y: -9999, down: false };
      let connections = [];
      const DPR = Math.min(window.devicePixelRatio || 1, 2);

      function resize() {
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  * DPR;
        canvas.height = rect.height * DPR;
        ctx.scale(DPR, DPR);
        ctx.scale(1, 1);
        spawn();
      }

      function spawn() {
        const rect = canvas.getBoundingClientRect();
        const count = Math.min(60, Math.floor(rect.width * rect.height / 18000));
        particles = [];
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * rect.width,
            y: Math.random() * rect.height,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            r: Math.random() * 1.6 + 0.6,
            life: 1
          });
        }
      }

      function getColor(alpha) {
        const isLight = document.documentElement.classList.contains('light');
        return isLight
          ? `rgba(120, 60, 200, ${alpha})`
          : `rgba(180, 140, 255, ${alpha})`;
      }

      function step() {
        const rect = canvas.getBoundingClientRect();
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Update + draw particles
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          // Drift
          p.x += p.vx;
          p.y += p.vy;
          // Soft bounce
          if (p.x < 0 || p.x > rect.width)  p.vx *= -1;
          if (p.y < 0 || p.y > rect.height) p.vy *= -1;
          p.x = Math.max(0, Math.min(rect.width, p.x));
          p.y = Math.max(0, Math.min(rect.height, p.y));

          // Mouse repel
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 14400) {
            const d = Math.sqrt(d2);
            const force = (120 - d) / 120 * 0.6;
            p.x += (dx / d) * force;
            p.y += (dy / d) * force;
          }

          // Life decay (for connection burst)
          if (p.life < 1) p.life = Math.min(1, p.life + 0.01);

          ctx.beginPath();
          ctx.fillStyle = getColor(0.5 * p.life);
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Lines between close particles
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const a = particles[i], b = particles[j];
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 11000) {
              const opacity = (1 - d2 / 11000) * 0.35;
              ctx.beginPath();
              ctx.strokeStyle = getColor(opacity);
              ctx.lineWidth = 0.6;
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }

        // Click burst lines
        connections = connections.filter(c => c.life > 0);
        for (const c of connections) {
          c.life -= 0.015;
          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const dx = p.x - c.x, dy = p.y - c.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < 30000) {
              const opacity = (1 - d2 / 30000) * c.life;
              ctx.beginPath();
              ctx.strokeStyle = getColor(opacity);
              ctx.lineWidth = 1;
              ctx.moveTo(c.x, c.y);
              ctx.lineTo(p.x, p.y);
              ctx.stroke();
            }
          }
        }

        requestAnimationFrame(step);
      }

      // Events
      canvas.addEventListener('mousemove', e => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        connections.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, life: 1 });
        // Burst particles outward
        for (const p of particles) {
          const dx = p.x - (e.clientX - rect.left);
          const dy = p.y - (e.clientY - rect.top);
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 200) {
            const force = (200 - d) / 200 * 8;
            p.vx += (dx / d) * force * 0.3;
            p.vy += (dy / d) * force * 0.3;
            p.life = 0.3;
          }
        }
      });

      window.addEventListener('resize', resize);
      resize();
      step();
    })();


    /* ── 2. 3D CARD PARALLAX WITH GLARE ─────────────────────── */
    (function init3DParallax() {
      if (reduce || isTouch || window.innerWidth <= 991) return;

      const cards = $$('.card, .service-card, .port-card');
      cards.forEach(card => {
        // Inject glare element
        if (!card.querySelector('.card-glare')) {
          const glare = document.createElement('div');
          glare.className = 'card-glare';
          card.appendChild(glare);
        }
        const glare = card.querySelector('.card-glare');

        let rafId = null;
        let pendingX = 0, pendingY = 0;

        card.addEventListener('mousemove', e => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width;
          const py = (e.clientY - rect.top)  / rect.height;
          pendingX = px;
          pendingY = py;

          if (!rafId) {
            rafId = requestAnimationFrame(() => {
              const rx = (0.5 - pendingY) * 8;
              const ry = (pendingX - 0.5) * 8;
              card.style.transform = `perspective(1000px) translateY(-6px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.01, 1.01, 1.01)`;
              card.classList.add('tilting');
              glare.style.setProperty('--gx', (pendingX * 100) + '%');
              glare.style.setProperty('--gy', (pendingY * 100) + '%');
              rafId = null;
            });
          }
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
          card.classList.remove('tilting');
          if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        });
      });
    })();


    /* ── 3. TESTIMONIALS CAROUSEL ───────────────────────────── */
    (function initTestimonials() {
      const cards = $$('.testimonial-card');
      const dots  = $$('.testimonial-dot');
      const prev  = $('.testimonial-prev');
      const next  = $('.testimonial-next');
      if (cards.length === 0) return;

      let idx = 0;
      let timer = null;
      let isHovering = false;

      function show(i) {
        idx = (i + cards.length) % cards.length;
        cards.forEach((c, ci) => c.classList.toggle('active', ci === idx));
        dots.forEach((d, di)  => d.classList.toggle('active', di === idx));
      }

      function autoplay() {
        clearInterval(timer);
        timer = setInterval(() => {
          if (!isHovering && !document.hidden) show(idx + 1);
        }, 5500);
      }

      dots.forEach(dot => {
        dot.addEventListener('click', () => {
          show(parseInt(dot.getAttribute('data-go'), 10));
          autoplay();
        });
      });
      if (next) next.addEventListener('click', () => { show(idx + 1); autoplay(); });
      if (prev) prev.addEventListener('click', () => { show(idx - 1); autoplay(); });

      const wrap = $('.testimonial-wrap');
      if (wrap) {
        wrap.addEventListener('mouseenter', () => { isHovering = true;  });
        wrap.addEventListener('mouseleave', () => { isHovering = false; });
      }

      // Touch swipe support
      let touchStartX = 0;
      if (wrap) {
        wrap.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
        wrap.addEventListener('touchend', e => {
          const dx = e.changedTouches[0].clientX - touchStartX;
          if (Math.abs(dx) > 50) {
            show(dx > 0 ? idx - 1 : idx + 1);
            autoplay();
          }
        }, { passive: true });
      }

      autoplay();
    })();


    /* ── 4. LIVE VISITOR COUNTER ────────────────────────────── */
    (function initVisitorCounter() {
      const numEl = $('#vc-num');
      if (!numEl) return;

      const NAMESPACE = 'zeekayeditz-com';
      const KEY = 'site-visits';

      function animateTo(target) {
        const duration = 1800;
        const start = performance.now();
        const startVal = 0;
        function tick(now) {
          const elapsed = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          const val = Math.round(startVal + (target - startVal) * eased);
          numEl.textContent = val.toLocaleString();
          if (elapsed < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }

      function localFallback() {
        // Generate plausible weekly visitor count using localStorage
        try {
          let stored = JSON.parse(localStorage.getItem('zk-visits') || 'null');
          const now = Date.now();
          const weekMs = 7 * 24 * 60 * 60 * 1000;
          if (!stored || (now - stored.weekStart) > weekMs) {
            stored = { weekStart: now, count: Math.floor(150 + Math.random() * 250) };
          } else {
            stored.count += Math.floor(Math.random() * 3) + 1;
          }
          localStorage.setItem('zk-visits', JSON.stringify(stored));
          animateTo(stored.count);
        } catch (e) {
          animateTo(247);
        }
      }

      // Try multiple free counter APIs with fallback chain
      const tryApi = async (url, parseKey) => {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
          if (!res.ok) throw new Error('bad response');
          const data = await res.json();
          const val = parseKey(data);
          if (typeof val === 'number' && val > 0) return val;
          throw new Error('no value');
        } catch (e) { return null; }
      };

      (async () => {
        // Try counterapi.dev first (most reliable as of 2026)
        let count = await tryApi(
          `https://api.counterapi.dev/v1/${NAMESPACE}/${KEY}/up`,
          d => d.count
        );
        // Fallback to abacus
        if (!count) {
          count = await tryApi(
            `https://abacus.jasoncameron.dev/hit/${NAMESPACE}/${KEY}`,
            d => d.value
          );
        }
        if (count) animateTo(count);
        else localFallback();
      })();
    })();


    /* ── 5. TYPING SOUND EFFECT ─────────────────────────────── */
    (function initTypingSound() {
      if (reduce) return;

      let audioCtx = null;
      let enabled = true;
      let volumeMultiplier = 1;
      let lastClickTime = 0;
      const toggle = $('.sound-toggle');
      const tw = $('#typewriter');
      if (!toggle || !tw) return;

      // Load preference (default ON, but only plays after first user gesture)
      try {
        const stored = localStorage.getItem('zk-sound');
        if (stored === 'off') enabled = false;
      } catch (e) {}
      toggle.classList.toggle('muted', !enabled);

      function getCtx() {
        if (!audioCtx) {
          try {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) audioCtx = new AC();
          } catch (e) {}
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        return audioCtx;
      }

      // Synthesize a soft mechanical keyboard click
      function click() {
        if (!enabled || volumeMultiplier <= 0.02) return;
        const ctx = getCtx();
        if (!ctx) return;

        const now = ctx.currentTime;
        // Avoid overlapping clicks too fast
        if (now - lastClickTime < 0.035) return;
        lastClickTime = now;

        const baseVol = 0.045 * volumeMultiplier;

        // Tick: short noise burst with bandpass filter
        const bufferSize = ctx.sampleRate * 0.04;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800 + Math.random() * 800;
        filter.Q.value = 4;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(baseVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start(now);
        noise.stop(now + 0.05);

        // Tonal "thock"
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.frequency.value = 180 + Math.random() * 60;
        osc.type = 'triangle';
        oscGain.gain.setValueAtTime(baseVol * 0.5, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
        osc.connect(oscGain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
      }

      // Hook into the typewriter — observe text changes
      let lastText = '';
      const observer = new MutationObserver(() => {
        const cur = tw.textContent;
        if (cur.length > lastText.length) click();  // Only on add chars
        lastText = cur;
      });
      observer.observe(tw, { childList: true, characterData: true, subtree: true });

      // Volume fade based on typewriter position in viewport
      function updateVolume() {
        const rect = tw.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.bottom < 0 || rect.top > vh) {
          volumeMultiplier = 0;
          return;
        }
        // Fade out as it scrolls off
        const visibleTop    = Math.max(0, rect.top);
        const visibleBottom = Math.min(vh, rect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const fullHeight = rect.height;
        volumeMultiplier = Math.min(1, visibleHeight / fullHeight);
        // Extra fade for partial scroll-off near top
        if (rect.top < 0) {
          volumeMultiplier *= Math.max(0, 1 + rect.top / 200);
        }
      }
      window.addEventListener('scroll', updateVolume, { passive: true });
      updateVolume();

      // Show toggle button after first scroll or after 2s
      const showToggle = () => toggle.classList.add('show');
      setTimeout(showToggle, 2500);
      window.addEventListener('scroll', showToggle, { passive: true, once: true });

      // Activate audio context on first user gesture
      const unlock = () => {
        getCtx();
        document.removeEventListener('click', unlock);
        document.removeEventListener('touchstart', unlock);
        document.removeEventListener('keydown', unlock);
      };
      document.addEventListener('click', unlock);
      document.addEventListener('touchstart', unlock);
      document.addEventListener('keydown', unlock);

      // Toggle button click
      toggle.addEventListener('click', () => {
        enabled = !enabled;
        toggle.classList.toggle('muted', !enabled);
        try { localStorage.setItem('zk-sound', enabled ? 'on' : 'off'); } catch (e) {}
        if (enabled) getCtx();
      });
    })();

  });
})();
