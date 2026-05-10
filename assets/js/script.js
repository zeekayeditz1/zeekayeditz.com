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

    // ─── Card Tilt on Hover (subtle) ─────────────────────────────
    if (!reduceMotion && window.matchMedia('(hover: hover)').matches && window.innerWidth > 991) {
      $$('.card, .service-card, .port-card').forEach(card => {
        card.addEventListener('mousemove', e => {
          if (window.innerWidth <= 991) { card.style.transform = ''; return; }
          const rect = card.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = `translateY(-4px) rotateX(${-y * 4}deg) rotateY(${x * 4}deg)`;
        });
        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
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
        }
      }, 100);
    });

  }); // DOMContentLoaded
})();
