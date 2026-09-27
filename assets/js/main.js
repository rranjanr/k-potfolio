/**
 * Shared site behaviour: nav, theme, scroll fx, toasts.
 * Loaded on every page. Page-specific behaviour lives in its own module.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initNavigation();
    initSmoothScrolling();
    initThemeToggle();
    initScrollReveal();
    initSkillBars();
    initScrollProgress();
    initBackToTop();
    initStatCounters();
    initLeadTracking();
  });

  // GA4 events for the actions that count as leads: WhatsApp, email and phone clicks.
  function initLeadTracking() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href]');
      if (!link || typeof window.gtag !== 'function') return;
      const href = link.getAttribute('href');
      let method = '';
      if (href.indexOf('wa.me/') !== -1) method = 'whatsapp';
      else if (href.indexOf('mailto:') === 0) method = 'email';
      else if (href.indexOf('tel:') === 0) method = 'phone';
      if (!method) return;
      window.gtag('event', 'contact_click', {
        method: method,
        link_text: (link.textContent || '').trim().slice(0, 60),
        page_path: window.location.pathname
      });
    });
  }

  function initNavigation() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    const navbar = document.querySelector('.navbar');

    if (hamburger && navMenu) {
      hamburger.addEventListener('click', function () {
        const isOpen = navMenu.classList.toggle('active');
        hamburger.classList.toggle('active', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
      });

      navLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          navMenu.classList.remove('active');
          hamburger.classList.remove('active');
          hamburger.setAttribute('aria-expanded', 'false');
        });
      });
    }

    if (navbar) {
      let ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          navbar.style.boxShadow = window.scrollY > 40
            ? '0 12px 30px -12px rgba(20, 16, 13, 0.25)'
            : 'none';
          ticking = false;
        });
      });
    }
  }

  function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || targetId.length < 2) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        const offsetTop = target.getBoundingClientRect().top + window.pageYOffset - 84;
        window.scrollTo({ top: offsetTop, behavior: 'smooth' });
      });
    });
  }

  // The theme itself is applied by a tiny inline script in <head> before first paint
  // (no flash). This handles the toggle: a circular reveal from the button where the
  // View Transitions API exists, a colour cross-fade elsewhere, instant with reduced motion.
  const THEME_MS = 1300;                              // theme reveal duration
  const THEME_EASE = 'cubic-bezier(0.6, 0, 0.3, 1)';  // slow start (the circle's area grows fast), gentle landing
  const FEATHER = 140;                                // soft edge width of the reveal, px

  // The feathered reveal animates a registered custom property; fall back to a
  // hard-edged clip-path circle where that is not supported.
  let maskReady = null;
  function canAnimateMask() {
    if (maskReady !== null) return maskReady;
    maskReady = false;
    if (window.CSS && typeof CSS.registerProperty === 'function' && CSS.supports('mask-image', 'radial-gradient(#000, transparent)')) {
      try {
        CSS.registerProperty({ name: '--vt-r', syntax: '<length>', inherits: true, initialValue: '0px' });
        maskReady = true;
      } catch (e) {
        maskReady = e && e.name === 'InvalidModificationError'; // already registered
      }
    }
    return maskReady;
  }

  function initThemeToggle() {
    const root = document.documentElement;
    const toggle = document.getElementById('themeToggle');
    if (!root.getAttribute('data-theme')) {
      let stored = null;
      try { stored = localStorage.getItem('theme'); } catch (e) { /* storage blocked */ }
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', stored || (prefersDark ? 'dark' : 'light'));
    }
    if (!toggle) return;

    function syncButton() {
      const dark = root.getAttribute('data-theme') === 'dark';
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
      toggle.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#131117' : '#f5f1e6');
    }

    function apply(next) {
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
      syncButton();
    }

    syncButton();

    let busy = false;
    toggle.addEventListener('click', function () {
      if (busy) return;
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        apply(next);
        return;
      }

      if (typeof document.startViewTransition === 'function') {
        const r = toggle.getBoundingClientRect();
        const x = r.left + r.width / 2;
        const y = r.top + r.height / 2;
        const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
        const soft = canAnimateMask();
        busy = true;
        root.style.setProperty('--vt-x', x + 'px');
        root.style.setProperty('--vt-y', y + 'px');
        root.classList.add('theme-vt');
        if (soft) root.classList.add('theme-vt-soft');
        const transition = document.startViewTransition(function () { apply(next); });
        transition.ready.then(function () {
          const timing = { duration: THEME_MS, easing: THEME_EASE, pseudoElement: '::view-transition-new(root)', fill: 'both' };
          if (soft) {
            // A circle with a feathered edge grows from the toggle (radial mask)
            root.animate({ '--vt-r': [-FEATHER + 'px', (radius + FEATHER) + 'px'] }, timing);
          } else {
            root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] }, timing);
          }
        }).catch(function () { /* transition skipped: theme is already applied */ });
        transition.finished.finally(function () {
          root.classList.remove('theme-vt', 'theme-vt-soft');
          busy = false;
        });
        return;
      }

      // Fallback: cross-fade every colour
      root.classList.add('theme-fade');
      apply(next);
      window.setTimeout(function () { root.classList.remove('theme-fade'); }, 760);
    });
  }

  function initScrollReveal() {
    const els = document.querySelectorAll('.reveal-on-scroll');
    if (!els.length) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    els.forEach(function (el) { observer.observe(el); });
  }

  function initSkillBars() {
    const bars = document.querySelectorAll('.skill-bar-fill');
    if (!bars.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const bar = entry.target;
          bar.style.width = bar.getAttribute('data-level') + '%';
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.4 });

    bars.forEach(function (bar) { observer.observe(bar); });
  }

  function initScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    if (!bar) return;
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        const pct = height > 0 ? (window.scrollY / height) * 100 : 0;
        bar.style.width = pct + '%';
        ticking = false;
      });
    });
  }

  function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('visible', window.scrollY > 400);
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initStatCounters() {
    const counters = document.querySelectorAll('[data-count-to]');
    if (!counters.length || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-count-to'), 10);
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 1200;
        const start = performance.now();

        function step(now) {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(function (el) { observer.observe(el); });
  }

  window.showToast = function showToast(message, type) {
    type = type || 'info';
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(function () { toast.remove(); }, 250);
    }, 3800);
  };

  window.downloadCV = function downloadCV() {
    try {
      const link = document.createElement('a');
      link.href = '/assets/documents/vaishali-sharma-cv.pdf';
      link.download = 'Vaishali-Sharma-CV.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.showToast('CV download started!', 'success');
    } catch (err) {
      window.showToast('Download failed. Please try again.', 'error');
    }
  };
})();
