/**
 * Shared site behaviour: nav, theme, scroll fx, toasts.
 * Loaded on every page. Page-specific behaviour lives in its own module.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initLoadingScreen();
    initNavigation();
    initSmoothScrolling();
    initThemeToggle();
    initScrollReveal();
    initSkillBars();
    initHeroEntrance();
    initScrollProgress();
    initBackToTop();
    initStatCounters();
  });

  function initLoadingScreen() {
    const screen = document.getElementById('loadingScreen');
    if (!screen) return;
    window.addEventListener('load', function () {
      setTimeout(function () {
        screen.classList.add('hidden');
      }, 350);
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

  function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', initial);

    if (!toggle) return;
    toggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
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

  function initHeroEntrance() {
    const el = document.querySelector('[data-hero-type]');
    if (!el) return;
    const text = el.textContent;
    el.textContent = '';
    el.style.opacity = '1';
    let i = 0;
    (function type() {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
        setTimeout(type, 55);
      }
    })();
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
