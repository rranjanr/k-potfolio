/**
 * 404 page: fills in the missing path, draws ruler numbers, keeps the size
 * badge and baseline guide in sync, and lets visitors drag the 404 "layer".
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const canvas = document.getElementById('nfCanvas');
    const art = document.getElementById('nfArt');
    if (!canvas || !art) return;

    const digits = document.getElementById('nfDigits');
    const badge = document.getElementById('nfBadge');
    const guide = document.getElementById('nfGuideH');
    const rulerX = document.getElementById('nfRulerX');
    const rulerY = document.getElementById('nfRulerY');

    // The page the visitor asked for (textContent, so it is never parsed as HTML)
    let path = window.location.pathname || '/';
    try { path = decodeURIComponent(path); } catch (e) { /* keep raw */ }
    if (path.length > 60) path = path.slice(0, 57) + '...';
    document.querySelectorAll('.nf-path').forEach(function (el) { el.textContent = path; });

    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_not_found', { page_path: window.location.pathname, referrer: document.referrer || '(direct)' });
    }

    // ---- Rulers: a number every 100px, like a design tool
    function drawRulers() {
      [[rulerX, 'x'], [rulerY, 'y']].forEach(function (pair) {
        const ruler = pair[0];
        if (!ruler) return;
        const length = pair[1] === 'x' ? ruler.clientWidth : ruler.clientHeight;
        ruler.textContent = '';
        for (let n = 100; n < length; n += 100) {
          const label = document.createElement('span');
          label.textContent = n;
          if (pair[1] === 'x') label.style.left = n + 'px';
          else label.style.top = n + 'px';
          ruler.appendChild(label);
        }
      });
    }

    // ---- Size badge and the guide on the digits' baseline
    let offset = { x: 0, y: 0 };
    let dragging = false;

    function updateBadge() {
      if (!badge || !digits) return;
      if (offset.x || offset.y) {
        badge.textContent = 'X ' + Math.round(offset.x) + '  Y ' + Math.round(offset.y);
      } else {
        const r = digits.getBoundingClientRect();
        badge.textContent = 'W ' + Math.round(r.width) + '  H ' + Math.round(r.height);
      }
    }

    function placeGuide() {
      if (!guide || !digits) return;
      const c = canvas.getBoundingClientRect();
      const d = digits.getBoundingClientRect();
      canvas.style.setProperty('--nf-baseline', Math.round(d.bottom - c.top - offset.y) + 'px');
    }

    function refresh() { drawRulers(); updateBadge(); placeGuide(); }

    if ('ResizeObserver' in window) {
      new ResizeObserver(refresh).observe(canvas);
    } else {
      window.addEventListener('resize', refresh);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    refresh();

    // ---- Drag the 404 layer (pointer + keyboard), kept inside the canvas
    function clamp(next) {
      const c = canvas.getBoundingClientRect();
      const a = art.getBoundingClientRect();
      const baseLeft = a.left - offset.x;
      const baseTop = a.top - offset.y;
      const pad = 8;
      const ruler = parseFloat(getComputedStyle(canvas).getPropertyValue('--ruler')) || 24;
      return {
        x: Math.min(Math.max(next.x, c.left + ruler + pad - baseLeft), c.right - pad - (baseLeft + a.width)),
        y: Math.min(Math.max(next.y, c.top + ruler + pad - baseTop), c.bottom - pad - (baseTop + a.height))
      };
    }

    function moveTo(next) {
      offset = clamp(next);
      art.style.setProperty('--x', offset.x + 'px');
      art.style.setProperty('--y', offset.y + 'px');
      art.classList.toggle('is-moved', offset.x !== 0 || offset.y !== 0);
      updateBadge();
    }

    let start = null;
    art.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      start = { px: e.clientX, py: e.clientY, x: offset.x, y: offset.y };
      art.classList.add('is-dragging');
      art.setPointerCapture(e.pointerId);
    });

    art.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      moveTo({ x: start.x + e.clientX - start.px, y: start.y + e.clientY - start.py });
    });

    function endDrag() {
      dragging = false;
      art.classList.remove('is-dragging');
    }
    art.addEventListener('pointerup', endDrag);
    art.addEventListener('pointercancel', endDrag);

    art.addEventListener('dblclick', function () { moveTo({ x: 0, y: 0 }); });

    art.addEventListener('keydown', function (e) {
      const step = e.shiftKey ? 40 : 10;
      const moves = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step]
      };
      if (moves[e.key]) {
        e.preventDefault();
        moveTo({ x: offset.x + moves[e.key][0], y: offset.y + moves[e.key][1] });
      } else if (e.key === 'Escape') {
        moveTo({ x: 0, y: 0 });
      }
    });
  });
})();
