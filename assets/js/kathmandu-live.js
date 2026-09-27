/**
 * Kathmandu Valley, live.
 * A procedural <canvas> scene driven by the real position of the sun over Kathmandu
 * (27.72 N, 85.32 E, Nepal time UTC+5:45). Sky, sun, moon phase, stars, alpenglow,
 * city lights and valley fog follow the actual clock; prayer flags, clouds, pigeons,
 * smoke, a plane and (in Dashain season) kites animate. Visitors can scrub the day.
 * Static layers are cached and only rebuilt when the time changes; animation pauses
 * off-screen and is replaced by a still frame under prefers-reduced-motion.
 */
(function () {
  'use strict';

  const root = document.getElementById('kvScene');
  if (!root) return;
  const canvas = root.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const range = document.getElementById('kvRange');
  const backBtn = document.getElementById('kvBack');
  const timeEl = document.getElementById('kvTime');
  const phaseEl = document.getElementById('kvPhase');
  const nextEl = document.getElementById('kvNext');
  const modeEl = document.getElementById('kvMode');
  const riseMark = document.getElementById('kvRise');
  const setMark = document.getElementById('kvSet');

  const LAT = 27.7172;
  const LON = 85.324;
  const NPT_MS = 5.75 * 3600 * 1000;           // Nepal Time, no daylight saving
  const PAD = 22;                               // overscan for parallax
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmtTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kathmandu' });

  // ------------------------------------------------------------------ helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const rad = (d) => d * Math.PI / 180;
  const deg = (r) => r * 180 / Math.PI;
  function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  function rgba(c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')'; }
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function makeNoise(seed) {
    const r = mulberry32(seed);
    const p = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) p[i] = r();
    return function (x) {
      const i = Math.floor(x);
      const f = x - i;
      return lerp(p[i & 1023], p[(i + 1) & 1023], smooth(f));
    };
  }
  function fbm(n, x, oct) {
    let s = 0, a = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * n(x * f); norm += a; a *= 0.5; f *= 2.03; }
    return s / norm;
  }

  // ------------------------------------------------------------------ astronomy
  // NOAA solar position (accurate to well under a degree for our purposes)
  function solar(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545) / 36525;
    const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
    const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    const Mr = rad(M);
    const C = Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) + Math.sin(3 * Mr) * 0.000289;
    const omega = 125.04 - 1934.136 * T;
    const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(rad(omega));
    const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    const eps = eps0 + 0.00256 * Math.cos(rad(omega));
    const decl = Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda)));
    const y = Math.pow(Math.tan(rad(eps) / 2), 2);
    const L0r = rad(L0);
    const eqTime = 4 * deg(y * Math.sin(2 * L0r) - 2 * e * Math.sin(Mr) + 4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) - 0.5 * y * y * Math.sin(4 * L0r) - 1.25 * e * e * Math.sin(2 * Mr));
    const utcMin = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
    const tst = utcMin + eqTime + 4 * LON;
    const ha = (((tst / 4 - 180) % 360) + 540) % 360 - 180;
    return { decl: decl, ha: ha, elev: elevation(ha, decl) };
  }
  function elevation(haDeg, decl) {
    const latr = rad(LAT);
    const cosZ = Math.sin(latr) * Math.sin(decl) + Math.cos(latr) * Math.cos(decl) * Math.cos(rad(haDeg));
    return 90 - deg(Math.acos(clamp(cosZ, -1, 1)));
  }
  function moonAt(date, sun) {
    const synodic = 29.530588853;
    let age = ((date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86400000) % synodic;
    if (age < 0) age += synodic;
    const phase = age / synodic;                  // 0 new, 0.5 full
    let ha = sun.ha - phase * 360;                // the moon lags the sun by its age
    ha = ((ha % 360) + 540) % 360 - 180;
    return { phase: phase, ha: ha, elev: elevation(ha, sun.decl) };
  }

  // Nepal-time helpers
  function nptParts(date) {
    const d = new Date(date.getTime() + NPT_MS);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
  }
  function dateAtNptMinute(ref, minute) {
    const p = nptParts(ref);
    return new Date(Date.UTC(p.y, p.m, p.d) - NPT_MS + minute * 60000);
  }
  function sunEvents(ref) {
    let rise = null, set = null, prev = null;
    for (let m = 0; m <= 1440; m += 2) {
      const e = solar(dateAtNptMinute(ref, m)).elev;
      if (prev !== null) {
        if (prev < -0.833 && e >= -0.833 && rise === null) rise = m;
        if (prev >= -0.833 && e < -0.833 && set === null) set = m;
      }
      prev = e;
    }
    return { rise: rise, set: set };
  }

  // ------------------------------------------------------------------ palette by sun elevation
  const SKY = [
    [-18, '#050818', '#0a1030', '#131b40', '#28325c', 0.1],
    [-10, '#0a1232', '#1b2556', '#34386b', '#4a5282', 0.2],
    [-5, '#17255c', '#4a4683', '#c9776f', '#c07a92', 0.34],
    [-1, '#28427e', '#7b6ea6', '#ffa274', '#ff8e76', 0.48],
    [3, '#3a62a8', '#9ab3da', '#ffc98f', '#ffc39a', 0.66],
    [10, '#3b77c6', '#8dbde8', '#e7eff3', '#fff1df', 0.88],
    [35, '#2c6ec4', '#79b3e6', '#d0e6f4', '#ffffff', 1]
  ].map(function (k) { return { e: k[0], top: hex(k[1]), mid: hex(k[2]), hor: hex(k[3]), light: hex(k[4]), amb: k[5] }; });

  function palette(elev) {
    if (elev <= SKY[0].e) return SKY[0];
    if (elev >= SKY[SKY.length - 1].e) return SKY[SKY.length - 1];
    let i = 0;
    while (SKY[i + 1].e < elev) i++;
    const a = SKY[i], b = SKY[i + 1];
    const t = smooth((elev - a.e) / (b.e - a.e));
    return { top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), hor: mix(a.hor, b.hor, t), light: mix(a.light, b.light, t), amb: lerp(a.amb, b.amb, t) };
  }

  function envAt(date) {
    const sun = solar(date);
    const p = palette(sun.elev);
    const parts = nptParts(date);
    const hour = parts.min / 60;
    const moon = moonAt(date, sun);
    const night = clamp((-sun.elev - 1) / 11, 0, 1);
    const glow = clamp(1 - Math.abs(sun.elev - 1.5) / 7.5, 0, 1);           // alpenglow strength
    const fog = clamp(1 - Math.abs(hour - 6.6) / 2.8, 0, 1) * 0.85 + 0.15;  // valley fog peaks at dawn
    const kites = (parts.m === 8 && parts.d >= 15) || parts.m === 9 || (parts.m === 10 && parts.d <= 10);
    const moonLight = moon.elev > 0 ? clamp(1 - Math.abs(moon.phase - 0.5) * 2, 0.15, 1) * night : 0;
    return { date: date, sun: sun, p: p, hour: hour, moon: moon, night: night, glow: glow, fog: fog, kites: kites, moonLight: moonLight };
  }

  // ------------------------------------------------------------------ geometry (seeded, rebuilt on resize)
  let W = 0, H = 0, S = 0, dpr = 1;
  let geo = null;
  const layers = { sky: null, far: null, hills: null, city: null };

  // el/er: steepness of the left and right faces (asymmetric, like real ridges)
  const PEAKS = [
    { x: 0.03, h: 0.17, w: 0.09, el: 1.3, er: 1.6 },
    { x: 0.14, h: 0.29, w: 0.13, el: 1.05, er: 1.55, name: 'Ganesh Himal', m: '7,422 m' },
    { x: 0.22, h: 0.2, w: 0.06, el: 1.5, er: 1.2 },
    { x: 0.37, h: 0.35, w: 0.13, el: 1.45, er: 1.02, name: 'Langtang Lirung', m: '7,234 m' },
    { x: 0.47, h: 0.22, w: 0.07, el: 1.2, er: 1.5 },
    { x: 0.58, h: 0.26, w: 0.12, el: 1.15, er: 1.45, name: 'Dorje Lakpa', m: '6,966 m' },
    { x: 0.66, h: 0.2, w: 0.06, el: 1.6, er: 1.3 },
    { x: 0.83, h: 0.3, w: 0.11, el: 0.98, er: 1.5, name: 'Gauri Shankar', m: '7,134 m' },
    { x: 0.95, h: 0.2, w: 0.09, el: 1.4, er: 1.2 }
  ];
  const HOUSE_COLORS = ['#d9a38f', '#e8d2a6', '#b9c7d6', '#e6e1d3', '#c9b08f', '#d7b6b6', '#a9b8a3', '#e3c9a0', '#c4b5cf'].map(hex);
  const LUNGTA = ['#2f6fd8', '#f4f1e8', '#d8392b', '#2e9e5b', '#f2c230'].map(hex);

  function buildGeo() {
    const R = mulberry32(20260927);
    const n1 = makeNoise(11), n2 = makeNoise(29), n3 = makeNoise(47), n4 = makeNoise(83), n5 = makeNoise(101);
    const g = { base: H * 0.585 };

    // Himalaya ridge
    g.far = [];
    for (let x = -PAD; x <= W + PAD; x += 2) {
      let h = H * 0.05 + fbm(n1, x / W * 6, 4) * H * 0.05;
      for (let i = 0; i < PEAKS.length; i++) {
        const pk = PEAKS[i];
        const d = (x / W - pk.x) / pk.w;
        const ad = Math.abs(d);
        if (ad < 1) h = Math.max(h, pk.h * H * Math.pow(1 - ad, d < 0 ? pk.el : pk.er));
      }
      const k = clamp(h / (H * 0.25), 0.25, 1.2);
      const jag = ((fbm(n2, x / W * 17, 3) - 0.5) * 0.05 + (fbm(n2, x / W * 62 + 9, 2) - 0.5) * 0.016) * H * k;
      g.far.push([x, g.base - h - jag]);
    }
    g.apex = PEAKS.map(function (pk) {
      let best = null;
      for (let i = 0; i < g.far.length; i++) {
        const pt = g.far[i];
        if (Math.abs(pt[0] / W - pk.x) < pk.w * 0.35 && (!best || pt[1] < best[1])) best = pt;
      }
      return { pk: pk, x: best ? best[0] : pk.x * W, y: best ? best[1] : g.base - pk.h * H };
    });
    g.snowline = function (x) { return g.base - H * (0.115 + (fbm(n3, x / W * 22, 3) - 0.5) * 0.06); };
    g.streaks = [];
    g.apex.forEach(function (a) {
      if (!a.pk.name) return;
      for (let k = 0; k < 7; k++) {
        const dir = k % 2 ? 1 : -1;
        const sx = a.x + dir * (4 + R() * a.pk.w * W * 0.35);
        g.streaks.push({ x: sx, len: H * (0.05 + R() * 0.08), lean: dir * (0.25 + R() * 0.5) });
      }
    });

    // foothills
    g.hill1 = []; g.hill2 = [];
    for (let x = -PAD; x <= W + PAD; x += 3) {
      g.hill1.push([x, H * 0.615 - fbm(n4, x / W * 3.2, 4) * H * 0.075]);
      g.hill2.push([x, H * 0.675 - fbm(n5, x / W * 2.3 + 7, 4) * H * 0.085]);
    }

    // Boudhanath
    S = Math.min(H, W * 0.62);
    const st = { cx: W * 0.64, gy: H * 0.985 };
    st.terraceH = S * 0.02;
    st.domeCy = st.gy - st.terraceH * 3;
    st.rx = S * 0.235; st.ry = S * 0.15;
    st.hw = S * 0.045; st.hh = S * 0.062;
    st.hTop = st.domeCy - st.ry - st.hh;
    st.spireH = S * 0.23;
    st.top = st.hTop - st.spireH - S * 0.035;
    g.stupa = st;

    // houses in three depth rows
    const rows = [
      { base: 0.745, hmin: 0.03, hmax: 0.07, wmin: 0.02, wmax: 0.042, d: 0.55 },
      { base: 0.86, hmin: 0.05, hmax: 0.12, wmin: 0.028, wmax: 0.055, d: 0.75 },
      { base: 1.0, hmin: 0.08, hmax: 0.18, wmin: 0.042, wmax: 0.075, d: 1 }
    ];
    g.houses = [];
    g.tvs = [];
    rows.forEach(function (row, ri) {
      let x = -PAD;
      while (x < W + PAD) {
        const w = S * lerp(row.wmin, row.wmax, R());
        const skipStupa = ri === 2 && Math.abs(x + w / 2 - st.cx) < st.rx * 1.75 + w / 2;
        const skipTower = ri === 1 && Math.abs(x + w / 2 - W * 0.3) < S * 0.02;
        if (!skipStupa && !skipTower) {
          const h = S * lerp(row.hmin, row.hmax, R());
          const house = { x: x, w: w, h: h, by: H * row.base, d: row.d, c: HOUSE_COLORS[(R() * HOUSE_COLORS.length) | 0], tank: R() < 0.55, setback: R() < 0.3, win: [] };
          const cols = Math.max(1, Math.floor(w / (S * 0.016)));
          const rowsN = Math.max(1, Math.floor(h / (S * 0.026)));
          const ww = w / (cols * 2 + 1), wh = h / (rowsN * 2 + 1);
          for (let r = 0; r < rowsN; r++) {
            for (let c = 0; c < cols; c++) {
              const win = { x: x + ww * (1 + c * 2), y: house.by - h + wh * (1 + r * 2), w: ww, h: wh * 1.1, t: lerp(-9, 2.5, R()), late: R() < 0.5 };
              house.win.push(win);
              if (row.d === 1 && R() < 0.05 && g.tvs.length < 6) g.tvs.push(win);
            }
          }
          g.houses.push(house);
        }
        x += w + S * 0.002 * R();
      }
    });

    // prayer-flag strings from the spire down to the terrace edges
    g.strings = [];
    for (let side = -1; side <= 1; side += 2) {
      for (let k = 0; k < 4; k++) {
        const ax = st.cx + side * (st.rx * 1.1 + S * (0.05 + k * 0.13));
        g.strings.push({ x0: st.cx, y0: st.top + S * 0.015, x1: ax, y1: st.gy - st.terraceH * (2.6 - k * 0.5) - S * 0.01 * (3 - k), sag: S * (0.03 + k * 0.018), ph: R() * 6 });
      }
    }

    // stars, clouds, birds, lamps, smoke
    g.stars = [];
    for (let i = 0; i < 220; i++) g.stars.push({ x: R() * W, y: Math.pow(R(), 1.4) * H * 0.55, r: R() < 0.08 ? 1.3 : 0.4 + R() * 0.7, tw: 0.6 + R() * 2.4, ph: R() * 6 });
    g.clouds = [];
    for (let i = 0; i < 7; i++) g.clouds.push({ s: i % 3, x: R() * (W + 400) - 200, y: H * (0.06 + R() * 0.3), sc: 0.6 + R() * 0.9, v: 4 + R() * 9 });
    g.birds = [];
    for (let i = 0; i < 14; i++) g.birds.push({ a: R() * 6.28, r: S * (0.22 + R() * 0.3), v: 0.25 + R() * 0.35, cy: st.hTop - S * (0.02 + R() * 0.16), ph: R() * 6, sz: S * (0.008 + R() * 0.006) });
    g.lamps = [];
    for (let i = 0; i < 26; i++) {
      const u = i / 25;
      g.lamps.push({ x: st.cx - st.rx * 1.45 + u * st.rx * 2.9, y: st.gy - st.terraceH * 1.05, ph: R() * 6 });
    }
    g.smoke = [];
    geo = g;
  }

  // ------------------------------------------------------------------ sprites (clouds)
  let cloudBase = [];
  function makeCloudSprites() {
    const R = mulberry32(7);
    cloudBase = [0, 1, 2].map(function (k) {
      const w = 360, h = 150;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const g = c.getContext('2d');
      const n = 16 + k * 4;
      for (let i = 0; i < n; i++) {
        const x = w * (0.18 + 0.64 * R()), y = h * (0.42 + 0.3 * R()), r = h * (0.16 + 0.26 * R());
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, 'rgba(255,255,255,0.85)');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      }
      return c;
    });
  }
  let cloudTinted = [];
  function tintClouds(env) {
    const p = env.p;
    const top = mix(p.light, [255, 255, 255], 0.35 * (1 - env.night));
    const under = mix(mix(p.hor, p.mid, 0.4), [40, 45, 70], env.night * 0.7);
    cloudTinted = cloudBase.map(function (src) {
      const c = document.createElement('canvas');
      c.width = src.width; c.height = src.height;
      const g = c.getContext('2d');
      g.drawImage(src, 0, 0);
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, 0, c.height);
      gr.addColorStop(0.2, rgba(mul(top, lerp(1, 0.35, env.night))));
      gr.addColorStop(1, rgba(under));
      g.fillStyle = gr;
      g.fillRect(0, 0, c.width, c.height);
      return c;
    });
  }

  // ------------------------------------------------------------------ static layers
  function newLayer() {
    const c = document.createElement('canvas');
    c.width = Math.ceil((W + PAD * 2) * dpr);
    c.height = Math.ceil((H + PAD * 2) * dpr);
    const g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, PAD * dpr, PAD * dpr);
    return { c: c, g: g };
  }

  function bodyX(ha) { return W * (0.5 - ha / 190); }
  function bodyY(elev) { return H * (0.6 - clamp(elev, -10, 75) / 70 * 0.55); }

  function drawSky(env) {
    const L = newLayer(), g = L.g, p = env.p;
    const gr = g.createLinearGradient(0, -PAD, 0, H * 0.72);
    gr.addColorStop(0, rgba(p.top));
    gr.addColorStop(0.55, rgba(p.mid));
    gr.addColorStop(1, rgba(p.hor));
    g.fillStyle = gr;
    g.fillRect(-PAD, -PAD, W + PAD * 2, H + PAD * 2);

    // Milky Way in deep night
    if (env.night > 0.55 && env.moonLight < 0.5) {
      const a = (env.night - 0.55) * 0.9 * (1 - env.moonLight);
      const R = mulberry32(3);
      g.save();
      g.translate(W * 0.55, H * 0.1);
      g.rotate(-0.55);
      for (let i = 0; i < 420; i++) {
        const x = (R() - 0.5) * W * 1.3, y = (R() + R() + R() - 1.5) * H * 0.07;
        g.fillStyle = 'rgba(210,215,255,' + (a * R() * 0.5).toFixed(3) + ')';
        g.fillRect(x, y, 1, 1);
      }
      const band = g.createLinearGradient(0, -H * 0.12, 0, H * 0.12);
      band.addColorStop(0, 'rgba(160,170,255,0)');
      band.addColorStop(0.5, 'rgba(170,175,255,' + (a * 0.12).toFixed(3) + ')');
      band.addColorStop(1, 'rgba(160,170,255,0)');
      g.fillStyle = band;
      g.fillRect(-W, -H * 0.12, W * 2, H * 0.24);
      g.restore();
    }

    // city light pollution
    if (env.night > 0) {
      const lp = g.createRadialGradient(W * 0.5, H * 1.05, 0, W * 0.5, H * 1.05, H * 0.8);
      lp.addColorStop(0, 'rgba(255,160,90,' + (0.22 * env.night).toFixed(3) + ')');
      lp.addColorStop(1, 'rgba(255,160,90,0)');
      g.fillStyle = lp;
      g.fillRect(-PAD, 0, W + PAD * 2, H + PAD);
    }

    // moon with the real phase
    const m = env.moon;
    if (m.elev > -2 && env.night > 0.05) {
      const mx = bodyX(m.ha), my = bodyY(m.elev), mr = S * 0.028;
      const halo = g.createRadialGradient(mx, my, 0, mx, my, mr * 7);
      halo.addColorStop(0, 'rgba(230,235,255,' + (0.28 * env.night * (0.3 + env.moonLight)).toFixed(3) + ')');
      halo.addColorStop(1, 'rgba(230,235,255,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(mx, my, mr * 7, 0, 7); g.fill();
      g.save();
      g.beginPath(); g.arc(mx, my, mr, 0, 7); g.clip();
      g.fillStyle = rgba(mix(p.top, [30, 35, 60], 0.3), 0.85);
      g.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      // phase: light the sunward half, then add or remove the terminator ellipse
      const ph = m.phase;
      const waxing = ph < 0.5;
      const k = Math.cos(ph * Math.PI * 2);                  // 1 new, 0 quarter, -1 full
      const lit = 'rgba(244,240,222,' + (0.6 + 0.4 * env.night).toFixed(3) + ')';
      const dark = rgba(mix(p.top, [30, 35, 60], 0.3), 1);
      g.fillStyle = lit;
      g.beginPath();
      if (waxing) g.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, false);
      else g.arc(mx, my, mr, Math.PI / 2, Math.PI * 1.5, false);
      g.closePath();
      g.fill();
      g.fillStyle = k > 0 ? dark : lit;                      // crescent: carve; gibbous: extend
      g.beginPath();
      g.ellipse(mx, my, Math.abs(k) * mr + 0.2, mr, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(160,150,130,0.18)';                 // maria
      [[-0.3, -0.2, 0.28], [0.25, 0.15, 0.22], [-0.05, 0.35, 0.16]].forEach(function (s) {
        g.beginPath(); g.arc(mx + s[0] * mr, my + s[1] * mr, s[2] * mr, 0, 7); g.fill();
      });
      g.restore();
    }

    // sun
    const s = env.sun;
    if (s.elev > -3) {
      const sx = bodyX(s.ha), sy = bodyY(s.elev);
      const warm = mix([255, 244, 214], [255, 150, 90], clamp(1 - s.elev / 12, 0, 1));
      const glow = g.createRadialGradient(sx, sy, 0, sx, sy, S * 0.5);
      glow.addColorStop(0, rgba(warm, 0.55));
      glow.addColorStop(0.18, rgba(warm, 0.18));
      glow.addColorStop(1, rgba(warm, 0));
      g.fillStyle = glow;
      g.beginPath(); g.arc(sx, sy, S * 0.5, 0, 7); g.fill();
      g.fillStyle = rgba(mix(warm, [255, 255, 255], 0.5));
      g.beginPath(); g.arc(sx, sy, S * 0.026, 0, 7); g.fill();
    }
    return L;
  }

  function strokeRidge(g, pts) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  }
  function fillRidge(g, pts, bottom) {
    strokeRidge(g, pts);
    g.lineTo(pts[pts.length - 1][0], bottom);
    g.lineTo(pts[0][0], bottom);
    g.closePath();
  }

  function drawFar(env) {
    const L = newLayer(), g = L.g, p = env.p, base = geo.base;
    const sunSide = env.sun.elev > -4 ? (bodyX(env.sun.ha) > W / 2 ? 1 : -1) : 0;
    const amb = p.amb;
    const rock = mix(mix(mix(p.hor, p.mid, 0.55), [66, 76, 104], 0.5), [20, 24, 44], env.night * 0.55);
    const alpen = mix([255, 150, 140], [255, 190, 150], 0.5);
    let snow = mix([236, 242, 250], p.light, 0.35);
    snow = mix(snow, alpen, env.glow * 0.55);
    snow = mix(snow, mix([70, 82, 120], [170, 180, 215], env.moonLight), env.night);

    g.save();
    fillRidge(g, geo.far, base + H * 0.05);
    g.fillStyle = rgba(rock);
    g.fill();
    g.clip();

    // snowfields above a jagged snowline
    g.beginPath();
    const pts = geo.far;
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], Math.max(pts[i][1], geo.snowline(pts[i][0])));
    g.closePath();
    const sg = g.createLinearGradient(0, base - H * 0.36, 0, base - H * 0.08);
    sg.addColorStop(0, rgba(snow));
    sg.addColorStop(1, rgba(mix(snow, rock, 0.35)));
    g.fillStyle = sg;
    g.fill();

    // sun-side and shadow faces per peak
    geo.apex.forEach(function (a) {
      const w = a.pk.w * W;
      if (sunSide !== 0) {
        g.fillStyle = rgba(mix(p.light, alpen, env.glow * 0.6), 0.22 * (1 - env.night));
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + sunSide * w, base); g.lineTo(a.x + sunSide * w * 0.08, base); g.closePath(); g.fill();
      }
      g.fillStyle = rgba([18, 22, 48], lerp(0.22, 0.1, env.night));
      const sh = sunSide || 1;
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x - sh * w, base); g.lineTo(a.x - sh * w * 0.06, base); g.closePath(); g.fill();
    });

    // couloirs and rock bands
    g.strokeStyle = rgba([30, 36, 64], 0.2);
    g.lineWidth = 1;
    geo.streaks.forEach(function (s) {
      const top = ridgeYAt(s.x) + 3;
      g.beginPath(); g.moveTo(s.x, top);
      g.quadraticCurveTo(s.x + s.lean * s.len * 0.3, top + s.len * 0.5, s.x + s.lean * s.len * 0.5, top + s.len);
      g.stroke();
    });

    // atmospheric haze toward the valley
    const hz = g.createLinearGradient(0, base - H * 0.24, 0, base + H * 0.02);
    hz.addColorStop(0, rgba(p.hor, 0));
    hz.addColorStop(1, rgba(p.hor, lerp(0.62, 0.35, env.night)));
    g.fillStyle = hz;
    g.fillRect(-PAD, base - H * 0.3, W + PAD * 2, H * 0.4);
    g.restore();

    // rim light along the crest
    strokeRidge(g, geo.far);
    g.strokeStyle = rgba(mix(p.light, alpen, env.glow), lerp(0.45, 0.12, env.night));
    g.lineWidth = 1;
    g.stroke();

    // peak labels
    if (W >= 560) {
      g.font = '600 ' + (W >= 900 ? 11 : 10) + 'px Archivo, system-ui, sans-serif';
      g.textAlign = 'center';
      geo.apex.forEach(function (a) {
        if (!a.pk.name) return;
        const y = a.y - 12;
        g.strokeStyle = rgba([12, 14, 30], 0.35);
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(a.x, a.y - 3); g.lineTo(a.x, y + 3); g.stroke();
        g.fillStyle = rgba([255, 255, 255], lerp(0.92, 0.6, env.night));
        g.shadowColor = 'rgba(10,12,30,0.55)';
        g.shadowBlur = 4;
        g.fillText(a.pk.name, a.x, y - 12);
        g.font = '500 ' + (W >= 900 ? 10 : 9) + 'px Archivo, system-ui, sans-serif';
        g.fillText(a.pk.m, a.x, y);
        g.font = '600 ' + (W >= 900 ? 11 : 10) + 'px Archivo, system-ui, sans-serif';
        g.shadowBlur = 0;
      });
    }
    return L;
  }
  function ridgeYAt(x) {
    const pts = geo.far;
    const i = clamp(Math.round((x + PAD) / 2), 0, pts.length - 1);
    return pts[i][1];
  }

  function drawHills(env) {
    const L = newLayer(), g = L.g, p = env.p;
    const green1 = mix(mix([62, 92, 88], p.mid, 0.45), [16, 20, 36], env.night * 0.8);
    const green2 = mix(mix([46, 78, 62], p.hor, 0.18), [12, 14, 26], env.night * 0.85);
    fillRidge(g, geo.hill1, H + PAD);
    g.fillStyle = rgba(mul(green1, lerp(0.7, 1, p.amb)));
    g.fill();
    // Swayambhunath on the western hill
    const swx = W * 0.085, swy = ridgeAt(geo.hill2, swx) - 1;
    fillRidge(g, geo.hill2, H + PAD);
    const hg = g.createLinearGradient(0, H * 0.56, 0, H * 0.8);
    hg.addColorStop(0, rgba(mul(green2, lerp(0.75, 1.05, p.amb))));
    hg.addColorStop(1, rgba(mul(green2, 0.6)));
    g.fillStyle = hg;
    g.fill();
    // tree canopy along the near ridge
    g.fillStyle = rgba(mul(green2, lerp(0.6, 0.85, p.amb)));
    for (let i = 0; i < geo.hill2.length; i += 2) {
      const pt = geo.hill2[i];
      g.beginPath(); g.arc(pt[0], pt[1] + 1.5, 2.2 + ((i * 7) % 5) * 0.4, 0, 7); g.fill();
    }
    // terraced fields: faint contour lines following the hillside
    g.save();
    fillRidge(g, geo.hill2, H + PAD);
    g.clip();
    g.strokeStyle = rgba(mix(green2, [255, 240, 200], 0.25), lerp(0.18, 0.05, env.night));
    g.lineWidth = 1;
    for (let r = 1; r <= 9; r++) {
      g.beginPath();
      for (let i = 0; i < geo.hill2.length; i += 3) {
        const pt = geo.hill2[i];
        const y = pt[1] + r * H * 0.009 + Math.sin(pt[0] * 0.05 + r) * 1.2;
        i ? g.lineTo(pt[0], y) : g.moveTo(pt[0], y);
      }
      g.stroke();
    }
    g.restore();
    drawMiniStupa(g, swx, swy, S * 0.045, env);
    return L;
  }
  function ridgeAt(pts, x) {
    for (let i = 1; i < pts.length; i++) if (pts[i][0] >= x) return pts[i][1];
    return pts[pts.length - 1][1];
  }
  function drawMiniStupa(g, x, y, s, env) {
    const white = mix([240, 236, 226], [70, 74, 96], env.night * 0.75);
    g.fillStyle = rgba(white);
    g.fillRect(x - s * 0.7, y - s * 0.12, s * 1.4, s * 0.12);
    g.beginPath(); g.ellipse(x, y - s * 0.12, s * 0.5, s * 0.36, 0, Math.PI, 0); g.fill();
    g.fillStyle = rgba(mix([214, 164, 65], [120, 96, 50], env.night * 0.6));
    g.beginPath(); g.moveTo(x - s * 0.12, y - s * 0.48); g.lineTo(x + s * 0.12, y - s * 0.48); g.lineTo(x, y - s * 1.05); g.closePath(); g.fill();
    if (env.night > 0.3) {
      const gl = g.createRadialGradient(x, y - s * 0.4, 0, x, y - s * 0.4, s * 1.6);
      gl.addColorStop(0, 'rgba(255,190,110,' + (0.35 * env.night).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(255,190,110,0)');
      g.fillStyle = gl;
      g.beginPath(); g.arc(x, y - s * 0.4, s * 1.6, 0, 7); g.fill();
    }
  }

  function litWindow(win, env) {
    if (env.sun.elev >= win.t) return false;
    const h = env.hour;
    if ((h >= 23.3 || h < 4.8) && win.late) return false;   // late-night lights go out
    return true;
  }

  function drawHouse(g, hs, env, lightDir) {
    const p = env.p;
    const shade = lerp(0.35, 1, p.amb);
    let col = mix(mul(hs.c, shade), p.hor, 0.18 * (1 - hs.d));
    col = mix(col, [24, 26, 44], env.night * 0.72);
    const top = hs.by - hs.h;
    g.fillStyle = rgba(col);
    g.fillRect(hs.x, top, hs.w, hs.h);
    // side shade for depth
    g.fillStyle = rgba([10, 12, 28], 0.16 + 0.1 * env.night);
    const sw = hs.w * 0.2;
    g.fillRect(lightDir > 0 ? hs.x : hs.x + hs.w - sw, top, sw, hs.h);
    // parapet
    g.fillStyle = rgba(mix(col, [255, 255, 255], 0.2));
    g.fillRect(hs.x - 1, top - 2, hs.w + 2, 2);
    if (hs.setback) {
      g.fillStyle = rgba(mix(col, [0, 0, 0], 0.08));
      g.fillRect(hs.x + hs.w * 0.2, top - hs.h * 0.18, hs.w * 0.45, hs.h * 0.18);
    }
    if (hs.tank) {                                             // black rooftop water tank
      const tx = hs.x + hs.w * (hs.setback ? 0.72 : 0.55), tw = Math.max(3, hs.w * 0.16), th = tw * 1.1;
      g.fillStyle = rgba(mix([22, 22, 26], p.mid, 0.12));
      g.fillRect(tx, top - th - 1, tw, th);
      g.fillRect(tx - 1, top - th - 2, tw + 2, 1.5);
    }
    for (let i = 0; i < hs.win.length; i++) {
      const w = hs.win[i];
      if (litWindow(w, env)) {
        g.fillStyle = 'rgba(255,208,128,' + (0.75 + 0.25 * env.night).toFixed(3) + ')';
        g.fillRect(w.x, w.y, w.w, w.h);
        if (hs.d === 1 && env.night > 0.4) {
          g.fillStyle = 'rgba(255,190,110,0.08)';
          g.fillRect(w.x - w.w, w.y - w.h * 0.6, w.w * 3, w.h * 2.2);
        }
      } else {
        g.fillStyle = rgba(mix(mix(p.mid, [30, 34, 54], 0.55), [12, 14, 26], env.night * 0.6), 0.85);
        g.fillRect(w.x, w.y, w.w, w.h);
      }
    }
  }

  function drawPagoda(g, x, by, s, tiers, env) {
    const night = env.night, amb = env.p.amb;
    const brick = mix(mul([150, 70, 48], lerp(0.45, 1, amb)), [40, 22, 26], night * 0.6);
    const roof = mix([58, 38, 30], [18, 16, 22], night * 0.5);
    const gold = mix([222, 170, 70], [120, 90, 40], night * 0.5);
    g.fillStyle = rgba(mix(brick, [230, 220, 200], 0.25));
    g.fillRect(x - s * 0.62, by - s * 0.1, s * 1.24, s * 0.1);
    g.fillRect(x - s * 0.52, by - s * 0.2, s * 1.04, s * 0.1);
    let y = by - s * 0.2;
    let bw = s * 0.36;
    for (let t = 0; t < tiers; t++) {
      const bh = s * 0.24;
      g.fillStyle = rgba(brick);
      g.fillRect(x - bw, y - bh, bw * 2, bh);
      g.fillStyle = rgba([20, 14, 12], 0.6);
      g.fillRect(x - bw * 0.25, y - bh * 0.8, bw * 0.5, bh * 0.8);
      y -= bh;
      const rw = bw * 2.1, rh = s * 0.17;
      g.fillStyle = rgba(roof);
      g.beginPath(); g.moveTo(x - rw, y + rh * 0.35); g.quadraticCurveTo(x - rw * 0.6, y - rh * 0.1, x - bw * 0.7, y - rh); g.lineTo(x + bw * 0.7, y - rh); g.quadraticCurveTo(x + rw * 0.6, y - rh * 0.1, x + rw, y + rh * 0.35); g.closePath(); g.fill();
      g.strokeStyle = rgba(gold, 0.85); g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(x - rw, y + rh * 0.35); g.quadraticCurveTo(x - rw * 0.6, y - rh * 0.1, x - bw * 0.7, y - rh); g.stroke();
      g.beginPath(); g.moveTo(x + rw, y + rh * 0.35); g.quadraticCurveTo(x + rw * 0.6, y - rh * 0.1, x + bw * 0.7, y - rh); g.stroke();
      y -= rh;
      bw *= 0.72;
    }
    g.fillStyle = rgba(gold);
    g.beginPath(); g.moveTo(x - s * 0.05, y); g.lineTo(x + s * 0.05, y); g.lineTo(x, y - s * 0.28); g.closePath(); g.fill();
    g.beginPath(); g.arc(x, y - s * 0.06, s * 0.05, 0, 7); g.fill();
  }

  function drawDharahara(g, x, by, s, env) {
    const night = env.night, amb = env.p.amb;
    const white = mix(mul([238, 234, 224], lerp(0.55, 1, amb)), [60, 64, 88], night * 0.7);
    const h = s * 0.3, wb = s * 0.024, wt = s * 0.015;
    g.fillStyle = rgba(white);
    g.fillRect(x - s * 0.04, by - s * 0.025, s * 0.08, s * 0.025);
    g.beginPath(); g.moveTo(x - wb, by - s * 0.025); g.lineTo(x - wt, by - h); g.lineTo(x + wt, by - h); g.lineTo(x + wb, by - s * 0.025); g.closePath(); g.fill();
    g.fillStyle = rgba([10, 12, 28], 0.15);
    g.beginPath(); g.moveTo(x + wb * 0.2, by - s * 0.025); g.lineTo(x + wt * 0.2, by - h); g.lineTo(x + wt, by - h); g.lineTo(x + wb, by - s * 0.025); g.closePath(); g.fill();
    g.fillStyle = rgba(mix(white, [0, 0, 0], 0.18));
    for (let i = 1; i < 6; i++) g.fillRect(x - lerp(wb, wt, i / 6) - 1, by - h * i / 6, lerp(wb, wt, i / 6) * 2 + 2, 1.5);
    const balY = by - h * 0.86;
    g.fillStyle = rgba(white);
    g.fillRect(x - wt * 2, balY, wt * 4, s * 0.007);
    g.beginPath(); g.ellipse(x, by - h, wt * 1.25, wt * 1.4, 0, Math.PI, 0); g.fill();
    g.fillStyle = rgba(mix([222, 170, 70], [110, 86, 40], night * 0.6));
    g.fillRect(x - 0.8, by - h - wt * 1.4 - s * 0.03, 1.6, s * 0.03);
    if (night > 0.35) {
      const gl = g.createRadialGradient(x, balY, 0, x, balY, s * 0.03);
      gl.addColorStop(0, 'rgba(255,214,150,' + (0.7 * night).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(255,214,150,0)');
      g.fillStyle = gl;
      g.beginPath(); g.arc(x, balY, s * 0.03, 0, 7); g.fill();
    }
  }

  function drawStupa(g, env) {
    const st = geo.stupa, p = env.p, night = env.night;
    const sunSide = env.sun.elev > -4 ? (bodyX(env.sun.ha) > st.cx ? 1 : -1) : 1;
    // Boudha is floodlit after dark, so it stays warm and bright at night
    const white = mix(mul([246, 243, 234], lerp(0.55, 1, p.amb)), [206, 186, 150], night * 0.85);
    const gold = mix([226, 172, 64], [214, 150, 58], night * 0.5);
    const goldDark = mul(gold, 0.68);

    // three mandala terraces
    for (let i = 0; i < 3; i++) {
      const w = st.rx * (1.75 - i * 0.18), y = st.gy - st.terraceH * (i + 1);
      g.fillStyle = rgba(mul(white, 0.94 - i * 0.02));
      g.fillRect(st.cx - w, y, w * 2, st.terraceH);
      g.fillStyle = rgba([20, 24, 48], 0.14);
      g.fillRect(st.cx - w, y + st.terraceH - 2, w * 2, 2);
      g.fillStyle = rgba(mix(white, [255, 255, 255], 0.3));
      g.fillRect(st.cx - w, y, w * 2, 1.2);
    }

    // dome with light from the sun side
    const dg = g.createRadialGradient(st.cx + sunSide * st.rx * 0.45, st.domeCy - st.ry * 0.7, st.rx * 0.1, st.cx, st.domeCy, st.rx * 1.2);
    dg.addColorStop(0, rgba(mix(white, [255, 255, 255], 0.4)));
    dg.addColorStop(0.6, rgba(white));
    dg.addColorStop(1, rgba(mul(white, 0.72)));
    g.fillStyle = dg;
    g.beginPath(); g.ellipse(st.cx, st.domeCy, st.rx, st.ry, 0, Math.PI, 0); g.closePath(); g.fill();

    // saffron water arcs (lotus petals) painted over the dome
    g.save();
    g.beginPath(); g.ellipse(st.cx, st.domeCy, st.rx, st.ry, 0, Math.PI, 0); g.closePath(); g.clip();
    const saffron = mix([242, 168, 34], [196, 122, 40], night * 0.5);
    g.lineWidth = Math.max(1.3, S * 0.0045);
    g.strokeStyle = rgba(saffron, 0.85);
    const petals = 9;
    const topY = st.domeCy - st.ry + 1;
    for (let k = 0; k < petals; k++) {
      const u0 = k / petals, u1 = (k + 1) / petals;
      const a0 = Math.PI + u0 * Math.PI, a1 = Math.PI + u1 * Math.PI;
      const x0 = st.cx + Math.cos(a0) * st.rx * 0.98, x1 = st.cx + Math.cos(a1) * st.rx * 0.98;
      const tx0 = st.cx + (u0 - 0.5) * st.hw * 2.6, tx1 = st.cx + (u1 - 0.5) * st.hw * 2.6;
      const depth = st.ry * (0.72 - Math.abs(u0 + 0.5 / petals - 0.5) * 0.5);
      g.beginPath();                                           // one petal: a loop from the top ring down the dome
      g.moveTo(tx0, topY);
      g.bezierCurveTo(lerp(tx0, x0, 0.4), topY + depth * 0.4, lerp(x0, x1, 0.2), topY + depth, (x0 + x1) / 2, topY + depth);
      g.bezierCurveTo(lerp(x0, x1, 0.8), topY + depth, lerp(tx1, x1, 0.4), topY + depth * 0.4, tx1, topY);
      g.stroke();
    }
    g.fillStyle = rgba(saffron, 0.18);                         // soft saffron wash near the top
    g.beginPath(); g.ellipse(st.cx, topY, st.hw * 1.9, st.ry * 0.3, 0, 0, Math.PI); g.fill();
    g.restore();

    // harmika with the Buddha eyes
    const hx = st.cx - st.hw, hy = st.hTop;
    g.fillStyle = rgba(mix(gold, white, 0.2));
    g.fillRect(hx - 3, st.domeCy - st.ry - 3, st.hw * 2 + 6, 4);
    g.fillStyle = rgba(white);
    g.fillRect(hx, hy, st.hw * 2, st.hh);
    const eyeY = hy + st.hh * 0.48, ex = st.hw * 0.45, ew = st.hw * 0.34, eh = st.hh * 0.13;
    [-1, 1].forEach(function (side) {
      const cx = st.cx + side * ex;
      g.fillStyle = rgba(mix([30, 40, 90], [12, 14, 30], night * 0.4));
      g.beginPath(); g.ellipse(cx, eyeY, ew, eh, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = rgba(mix([250, 248, 240], white, 0.3));
      g.beginPath(); g.ellipse(cx, eyeY + eh * 0.1, ew * 0.78, eh * 0.62, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(18,20,40,0.95)';
      g.beginPath(); g.arc(cx + side * ew * 0.1, eyeY + eh * 0.12, eh * 0.5, 0, 7); g.fill();
      g.strokeStyle = 'rgba(18,20,40,0.85)'; g.lineWidth = Math.max(1, S * 0.003);
      g.beginPath(); g.moveTo(cx - ew, eyeY - eh * 1.6); g.quadraticCurveTo(cx, eyeY - eh * 3, cx + ew, eyeY - eh * 1.4); g.stroke();
    });
    g.strokeStyle = 'rgba(190,40,40,0.9)';                       // the curled "nose" (Nepali numeral one)
    g.lineWidth = Math.max(1.1, S * 0.0035);
    g.beginPath();
    g.moveTo(st.cx - st.hw * 0.08, eyeY + eh * 0.9);
    g.bezierCurveTo(st.cx + st.hw * 0.22, eyeY + eh * 0.6, st.cx + st.hw * 0.2, eyeY + eh * 2.4, st.cx, eyeY + eh * 2.2);
    g.quadraticCurveTo(st.cx - st.hw * 0.05, eyeY + eh * 3.2, st.cx + st.hw * 0.02, eyeY + eh * 3.6);
    g.stroke();

    // thirteen gold rings
    const rings = 13, ringH = st.spireH / rings;
    for (let i = 0; i < rings; i++) {
      const t = i / rings;
      const w = lerp(st.hw * 0.95, st.hw * 0.34, t);
      const y = hy - (i + 1) * ringH;
      const rg = g.createLinearGradient(st.cx - w, 0, st.cx + w, 0);
      rg.addColorStop(0, rgba(goldDark));
      rg.addColorStop(sunSide > 0 ? 0.7 : 0.3, rgba(mix(gold, [255, 236, 170], 0.45)));
      rg.addColorStop(1, rgba(goldDark));
      g.fillStyle = rg;
      g.fillRect(st.cx - w, y + 0.5, w * 2, ringH - 1);
    }
    // parasol and pinnacle
    const py = hy - st.spireH;
    g.fillStyle = rgba(gold);
    g.beginPath(); g.moveTo(st.cx - st.hw * 0.75, py); g.quadraticCurveTo(st.cx, py - S * 0.03, st.cx + st.hw * 0.75, py); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(st.cx - S * 0.006, py - S * 0.012); g.quadraticCurveTo(st.cx, py - S * 0.05, st.cx + S * 0.006, py - S * 0.012); g.closePath(); g.fill();
    if (night > 0.3) {
      const gl = g.createRadialGradient(st.cx, st.domeCy - st.ry * 0.3, 0, st.cx, st.domeCy - st.ry * 0.3, st.rx * 1.8);
      gl.addColorStop(0, 'rgba(255,196,120,' + (0.28 * night).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(255,196,120,0)');
      g.fillStyle = gl;
      g.fillRect(st.cx - st.rx * 2, st.domeCy - st.rx * 2, st.rx * 4, st.rx * 3);
    }
  }

  // The kora: paved circuit around Boudha, ringed by a low wall of prayer wheels
  function drawPlaza(g, env) {
    const st = geo.stupa, p = env.p, night = env.night;
    const half = st.rx * 1.75 + S * 0.075;
    const x0 = st.cx - half, x1 = st.cx + half;
    const wallY = st.gy - st.terraceH * 3.4;
    const stone = mix(mul([198, 188, 170], lerp(0.5, 1, p.amb)), [96, 84, 70], night * 0.75);
    const pg = g.createLinearGradient(0, wallY, 0, H + PAD);
    pg.addColorStop(0, rgba(mul(stone, 0.92)));
    pg.addColorStop(1, rgba(mul(stone, 0.7)));
    g.fillStyle = pg;
    g.fillRect(x0, wallY, x1 - x0, H + PAD - wallY);
    g.strokeStyle = rgba([40, 32, 30], 0.1);                   // paving joints
    g.lineWidth = 1;
    for (let y = wallY + S * 0.02; y < H + PAD; y += S * 0.018) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }
    const wallH = S * 0.03;                                    // prayer-wheel wall behind the plaza edge
    const brick = mix(mul([140, 64, 44], lerp(0.5, 1, p.amb)), [70, 36, 30], night * 0.6);
    g.fillStyle = rgba(brick);
    g.fillRect(x0, wallY - wallH, x1 - x0, wallH);
    g.fillStyle = rgba(mix(brick, [255, 255, 255], 0.25));
    g.fillRect(x0, wallY - wallH, x1 - x0, 2);
    const wheel = mix([214, 164, 64], [170, 120, 50], night * 0.4);
    const step = S * 0.016;
    for (let x = x0 + step; x < x1 - step * 0.5; x += step) {  // gold prayer wheels in their niches
      g.fillStyle = rgba([30, 16, 14], 0.55);
      g.fillRect(x - step * 0.36, wallY - wallH * 0.8, step * 0.72, wallH * 0.66);
      const wg = g.createLinearGradient(x - step * 0.25, 0, x + step * 0.25, 0);
      wg.addColorStop(0, rgba(mul(wheel, 0.7)));
      wg.addColorStop(0.5, rgba(mix(wheel, [255, 236, 170], 0.4)));
      wg.addColorStop(1, rgba(mul(wheel, 0.7)));
      g.fillStyle = wg;
      g.fillRect(x - step * 0.25, wallY - wallH * 0.74, step * 0.5, wallH * 0.54);
    }
  }

  function drawCity(env) {
    const L = newLayer(), g = L.g, p = env.p;
    const lightDir = env.sun.elev > -4 ? (bodyX(env.sun.ha) > W / 2 ? 1 : -1) : 1;
    const st = geo.stupa;
    // valley floor
    const fg = g.createLinearGradient(0, H * 0.7, 0, H + PAD);
    fg.addColorStop(0, rgba(mix(mul([92, 88, 80], p.amb), [16, 18, 30], env.night * 0.8)));
    fg.addColorStop(1, rgba(mix(mul([48, 44, 44], p.amb), [8, 9, 16], env.night)));
    g.fillStyle = fg;
    g.fillRect(-PAD, H * 0.72, W + PAD * 2, H * 0.3 + PAD);

    const back = geo.houses.filter(function (h) { return h.d < 0.7; });
    const mid = geo.houses.filter(function (h) { return h.d > 0.7 && h.d < 1; });
    const front = geo.houses.filter(function (h) { return h.d === 1; });
    back.forEach(function (h) { drawHouse(g, h, env, lightDir); });
    // haze between depth rows
    const hz = g.createLinearGradient(0, H * 0.66, 0, H * 0.8);
    hz.addColorStop(0, rgba(p.hor, 0.28 * (1 - env.night * 0.6)));
    hz.addColorStop(1, rgba(p.hor, 0));
    g.fillStyle = hz;
    g.fillRect(-PAD, H * 0.66, W + PAD * 2, H * 0.14);
    drawPagoda(g, W * 0.47, H * 0.8, S * 0.13, 2, env);
    mid.forEach(function (h) { drawHouse(g, h, env, lightDir); });
    drawPagoda(g, W * 0.13, H * 0.9, S * 0.17, 3, env);
    drawDharahara(g, W * 0.3, H * 0.85, S, env);
    drawPlaza(g, env);
    drawStupa(g, env);
    front.forEach(function (h) { drawHouse(g, h, env, lightDir); });
    // ground contact shadow under the stupa
    const cs = g.createRadialGradient(st.cx, st.gy, 0, st.cx, st.gy, st.rx * 2);
    cs.addColorStop(0, 'rgba(10,10,20,0.22)');
    cs.addColorStop(1, 'rgba(10,10,20,0)');
    g.fillStyle = cs;
    g.fillRect(st.cx - st.rx * 2, st.gy - st.rx * 0.2, st.rx * 4, st.rx * 0.4);
    return L;
  }

  // ------------------------------------------------------------------ state, time and rebuild
  let env = null;
  let scrub = null;              // null = live, otherwise minutes since Nepal midnight
  let builtKey = '';
  let events = { rise: null, set: null };

  function currentDate() { return scrub === null ? new Date() : dateAtNptMinute(new Date(), scrub); }

  function rebuild(force) {
    if (!W || !H) return;
    const date = currentDate();
    const key = Math.floor(date.getTime() / 60000) + ':' + W + 'x' + H;
    if (!force && key === builtKey) return;
    builtKey = key;
    env = envAt(date);
    layers.sky = drawSky(env);
    layers.far = drawFar(env);
    layers.hills = drawHills(env);
    layers.city = drawCity(env);
    tintClouds(env);
    updateHud(date);
    if (!running) render(0);
  }

  function phaseName(e, h) {
    const am = h < 12;
    if (e >= 6) return 'Daylight';
    if (e >= 0) return 'Golden hour';
    if (e >= -4) return am ? 'Sunrise glow' : 'Sunset glow';
    if (e >= -8) return 'Blue hour';
    return 'Night';
  }
  function fmtMin(m) { return m === null ? '' : fmtTime.format(dateAtNptMinute(new Date(), m)); }

  function updateHud(date) {
    const e = env.sun.elev;
    const nowMin = nptParts(date).min;
    if (timeEl) { timeEl.textContent = fmtTime.format(date); timeEl.setAttribute('datetime', date.toISOString()); }
    if (phaseEl) phaseEl.textContent = phaseName(e, env.hour);
    if (nextEl) {
      let txt = '';
      if (events.rise !== null && nowMin < events.rise) txt = 'Sunrise ' + fmtMin(events.rise);
      else if (events.set !== null && nowMin < events.set) txt = 'Sunset ' + fmtMin(events.set);
      else if (events.rise !== null) txt = 'Sunrise ' + fmtMin(events.rise);
      nextEl.textContent = txt;
    }
    if (modeEl) modeEl.textContent = scrub === null ? 'Live' : 'Preview';
    root.classList.toggle('is-scrubbed', scrub !== null);
    if (backBtn) backBtn.hidden = scrub === null;
    if (range && scrub === null) range.value = String(nowMin);
    if (range) range.setAttribute('aria-valuetext', fmtTime.format(date) + ' in Kathmandu, ' + phaseName(e, env.hour).toLowerCase());
    canvas.setAttribute('aria-label', 'Illustration of Kathmandu Valley at ' + fmtTime.format(date) + ' Nepal time (' + phaseName(e, env.hour).toLowerCase() + '): the Himalaya from Ganesh Himal to Gauri Shankar, Swayambhunath on its hill, pagoda temples, the Dharahara tower and Boudhanath stupa with prayer flags.');
  }

  // Scrubber track painted with today's real sky colours, sunrise/sunset marked
  function paintTrack() {
    if (!range) return;
    const ref = new Date();
    events = sunEvents(ref);
    const stops = [];
    for (let i = 0; i <= 48; i++) {
      const m = i * 30;
      const pal = palette(solar(dateAtNptMinute(ref, Math.min(m, 1439))).elev);
      stops.push(rgba(mix(pal.mid, pal.hor, 0.45)) + ' ' + (i / 48 * 100).toFixed(2) + '%');
    }
    root.style.setProperty('--kv-track', 'linear-gradient(90deg,' + stops.join(',') + ')');
    if (riseMark && events.rise !== null) { riseMark.style.left = (events.rise / 1440 * 100) + '%'; riseMark.textContent = 'Sunrise ' + fmtMin(events.rise); }
    if (setMark && events.set !== null) { setMark.style.left = (events.set / 1440 * 100) + '%'; setMark.textContent = 'Sunset ' + fmtMin(events.set); }
  }

  // ------------------------------------------------------------------ per-frame animation
  let t = 0;
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  let plane = { next: 6, x: 0, active: false, y: 0 };

  function drawLayer(L, k) {
    if (!L) return;
    ctx.drawImage(L.c, -PAD + par.x * k * 14, -PAD + par.y * k * 8, W + PAD * 2, H + PAD * 2);
  }

  function drawStars() {
    if (!env || env.night <= 0.05) return;
    const a0 = env.night * (1 - env.moonLight * 0.5);
    for (let i = 0; i < geo.stars.length; i++) {
      const s = geo.stars[i];
      const a = a0 * (0.45 + 0.55 * Math.sin(t * s.tw + s.ph));
      if (a <= 0.02) continue;
      ctx.fillStyle = 'rgba(235,238,255,' + a.toFixed(3) + ')';
      ctx.fillRect(s.x + par.x * 0.5, s.y, s.r * 1.6, s.r * 1.6);
    }
  }

  function drawClouds(dt) {
    const alpha = lerp(0.9, 0.35, env.night);
    for (let i = 0; i < geo.clouds.length; i++) {
      const c = geo.clouds[i];
      c.x += c.v * dt;
      const spr = cloudTinted[c.s];
      if (!spr) continue;
      const w = spr.width * c.sc * (S / 520), h = spr.height * c.sc * (S / 520);
      if (c.x > W + 40) c.x = -w - 40;
      ctx.globalAlpha = alpha;
      ctx.drawImage(spr, c.x + par.x * 3, c.y, w, h);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlane(dt) {
    plane.next -= dt;
    if (!plane.active && plane.next <= 0) { plane.active = true; plane.x = -40; plane.y = H * (0.1 + Math.random() * 0.12); }
    if (!plane.active) return;
    plane.x += dt * W / 22;
    const x = plane.x, y = plane.y - (x / W) * H * 0.03;
    if (env.night < 0.5) {
      ctx.fillStyle = rgba(mix([60, 66, 90], env.p.mid, 0.3), 0.8);
      ctx.fillRect(x - 7, y - 1, 14, 2);
      ctx.fillRect(x - 2, y - 4, 3, 8);
      ctx.fillRect(x - 7, y - 3, 2, 3);
    }
    const blink = (t * 1.4) % 1 < 0.12;
    ctx.fillStyle = 'rgba(255,70,70,' + (blink ? 1 : 0.35) + ')';
    ctx.fillRect(x - 1, y - 5, 2, 2);
    ctx.fillStyle = 'rgba(80,255,140,0.6)';
    ctx.fillRect(x - 1, y + 3, 2, 2);
    if ((t * 1.4 + 0.5) % 1 < 0.06) { ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fillRect(x + 6, y - 1, 2, 2); }
    if (x > W + 40) { plane.active = false; plane.next = 28 + Math.random() * 30; }
  }

  function drawFog() {
    const a = env.fog * lerp(0.42, 0.22, env.night);
    const col = mix(env.p.hor, [255, 255, 255], 0.25 * (1 - env.night));
    for (let k = 0; k < 2; k++) {
      const y = H * (0.66 + k * 0.08);
      const off = Math.sin(t * 0.05 + k * 2) * W * 0.06 + par.x * 6;
      const gr = ctx.createLinearGradient(0, y - H * 0.05, 0, y + H * 0.05);
      gr.addColorStop(0, rgba(col, 0));
      gr.addColorStop(0.5, rgba(col, a * (1 - k * 0.35)));
      gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr;
      ctx.fillRect(-W * 0.1 + off, y - H * 0.05, W * 1.2, H * 0.1);
    }
  }

  function drawKites() {
    if (!env.kites || env.sun.elev < 3) return;
    const kites = [[0.2, 0.26, [220, 50, 60], 0.26, 0.82], [0.86, 0.2, [245, 190, 40], 0.9, 0.78]];
    kites.forEach(function (k, i) {
      const kx = W * k[0] + Math.sin(t * 0.7 + i) * 9 + par.x * 5;
      const ky = H * k[1] + Math.cos(t * 0.9 + i * 2) * 6;
      const ax = W * k[3] + par.x * 12, ay = H * k[4];
      ctx.strokeStyle = 'rgba(40,40,50,0.35)';
      ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + kx) / 2 + 20, (ay + ky) / 2 + 40, kx, ky + 8); ctx.stroke();
      const s = S * 0.022, rot = Math.sin(t * 1.3 + i) * 0.25;
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(rot);
      ctx.fillStyle = rgba(mul(k[2], lerp(0.6, 1, env.p.amb)));
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s * 0.8, 0); ctx.lineTo(0, s); ctx.lineTo(-s * 0.8, 0); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.8, 0); ctx.lineTo(s * 0.8, 0); ctx.stroke();
      ctx.fillStyle = rgba(mul(k[2], 0.8));
      for (let j = 0; j < 3; j++) {
        const tx = Math.sin(t * 3 + j) * 2;
        ctx.beginPath(); ctx.arc(tx, s + 3 + j * 4, 1.3, 0, 7); ctx.fill();
      }
      ctx.restore();
    });
  }

  function flagPoint(s, u, ox, oy) {
    const x0 = s.x0 + ox, y0 = s.y0 + oy, x1 = s.x1 + ox, y1 = s.y1 + oy;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + s.sag;
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * x0 + b * cx + c * x1, a * y0 + b * cy + c * y1];
  }

  function drawFlags() {
    const ox = par.x * 14, oy = par.y * 8;
    const shade = lerp(0.4, 1, env.p.amb) * (1 - env.night * 0.55);
    const fh = S * 0.019, gap = S * 0.017;
    for (let si = 0; si < geo.strings.length; si++) {
      const s = geo.strings[si];
      const len = Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
      const n = Math.max(6, Math.floor(len / gap));
      ctx.strokeStyle = 'rgba(40,36,40,0.45)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const pt = flagPoint(s, i / 24, ox, oy); i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); }
      ctx.stroke();
      for (let i = 1; i < n; i++) {
        const u0 = i / n, u1 = (i + 0.72) / n;
        const p0 = flagPoint(s, u0, ox, oy), p1 = flagPoint(s, Math.min(u1, 1), ox, oy);
        const wave = Math.sin(t * 3.1 + i * 0.55 + s.ph);
        const flutter = Math.sin(t * 7.3 + i * 1.7) * 0.25;
        const dx = (wave * 0.55 + flutter) * fh;
        const drop = fh * (0.85 + 0.15 * Math.cos(t * 2.3 + i));
        ctx.fillStyle = rgba(mul(LUNGTA[i % 5], shade), 0.95);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p1[0] + dx, p1[1] + drop);
        ctx.lineTo(p0[0] + dx * 0.8, p0[1] + drop);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  function drawLampsAndTv() {
    const ox = par.x * 14, oy = par.y * 8;
    if (env.night > 0.25) {
      for (let i = 0; i < geo.lamps.length; i++) {
        const l = geo.lamps[i];
        const f = 0.6 + 0.4 * Math.sin(t * 9 + l.ph) * Math.sin(t * 5.3 + l.ph * 2);
        const a = env.night * f;
        const r = S * 0.02;
        const gr = ctx.createRadialGradient(l.x + ox, l.y + oy, 0, l.x + ox, l.y + oy, r);
        gr.addColorStop(0, 'rgba(255,226,160,' + a.toFixed(3) + ')');
        gr.addColorStop(0.25, 'rgba(255,190,100,' + (a * 0.6).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(l.x + ox - r, l.y + oy - r, r * 2, r * 2);
      }
      for (let i = 0; i < geo.tvs.length; i++) {
        const w = geo.tvs[i];
        if (!litWindow(w, env)) continue;
        const f = 0.35 + 0.35 * Math.abs(Math.sin(t * 6 + i * 3) * Math.sin(t * 2.7 + i));
        ctx.fillStyle = 'rgba(120,170,255,' + f.toFixed(3) + ')';
        ctx.fillRect(w.x + ox, w.y + oy, w.w, w.h);
      }
    }
  }

  function drawSmoke(dt) {
    const st = geo.stupa;
    const sx = st.cx - st.rx * 1.35, sy = st.gy - st.terraceH * 3.2;
    if (geo.smoke.length < 26 && Math.random() < dt * 9) geo.smoke.push({ x: sx, y: sy, r: S * 0.006, life: 0 });
    const ox = par.x * 14, oy = par.y * 8;
    const col = mix([210, 210, 205], [110, 115, 135], env.night);
    for (let i = geo.smoke.length - 1; i >= 0; i--) {
      const q = geo.smoke[i];
      q.life += dt;
      q.y -= dt * S * 0.03;
      q.x += dt * S * (0.012 + 0.01 * Math.sin(t + q.life * 2));
      q.r += dt * S * 0.006;
      const a = 0.22 * (1 - q.life / 5);
      if (a <= 0) { geo.smoke.splice(i, 1); continue; }
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath(); ctx.arc(q.x + ox, q.y + oy, q.r, 0, 7); ctx.fill();
    }
  }

  function drawBirds(dt) {
    if (env.night > 0.55) return;
    const st = geo.stupa, ox = par.x * 14, oy = par.y * 8;
    ctx.strokeStyle = rgba(mix([30, 30, 40], env.p.mid, 0.15), 0.85);
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (let i = 0; i < geo.birds.length; i++) {
      const b = geo.birds[i];
      b.a += dt * b.v;
      const x = st.cx + Math.cos(b.a) * b.r + ox;
      const y = b.cy + Math.sin(b.a) * b.r * 0.22 + Math.sin(t * 1.3 + b.ph) * S * 0.01 + oy;
      const flap = Math.sin(t * 11 + b.ph) * b.sz * 0.9;
      ctx.beginPath();
      ctx.moveTo(x - b.sz * 1.4, y - flap);
      ctx.quadraticCurveTo(x - b.sz * 0.5, y - flap * 0.2 - b.sz * 0.2, x, y);
      ctx.quadraticCurveTo(x + b.sz * 0.5, y - flap * 0.2 - b.sz * 0.2, x + b.sz * 1.4, y - flap);
      ctx.stroke();
    }
  }

  function render(dt) {
    if (!env || !layers.sky) return;
    par.x = lerp(par.x, par.tx, 0.06);
    par.y = lerp(par.y, par.ty, 0.06);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawLayer(layers.sky, 0);
    drawStars();
    if (!reduceMotion) drawPlane(dt);
    drawClouds(dt);
    drawLayer(layers.far, 0.25);
    drawLayer(layers.hills, 0.5);
    drawFog();
    drawKites();
    drawLayer(layers.city, 1);
    drawLampsAndTv();
    drawSmoke(dt);
    drawFlags();
    drawBirds(dt);
  }

  // ------------------------------------------------------------------ loop, sizing, input
  let running = false, raf = 0, last = 0, inView = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    t += dt;
    render(dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running || reduceMotion || !inView || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() { running = false; cancelAnimationFrame(raf); }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const nw = Math.round(r.width), nh = Math.round(r.height);
    if (!nw || !nh || (nw === W && nh === H)) return;
    W = nw; H = nh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    buildGeo();
    rebuild(true);
  }

  function init() {
    makeCloudSprites();
    paintTrack();
    resize();
    root.classList.add('is-ready');
    if ('ResizeObserver' in window) new ResizeObserver(function () { resize(); }).observe(canvas);
    else window.addEventListener('resize', resize);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        inView = entries[0].isIntersecting;
        if (inView) start(); else stop();
      }, { rootMargin: '80px' }).observe(root);
    } else { inView = true; start(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    // live clock: rebuild static layers when the minute changes
    setInterval(function () {
      if (scrub === null) rebuild(false);
      if (nptParts(new Date()).min === 0) paintTrack();
    }, 10000);

    if (range) {
      let pending = false;
      range.addEventListener('input', function () {
        scrub = parseInt(range.value, 10);
        if (pending) return;
        pending = true;
        requestAnimationFrame(function () { pending = false; rebuild(true); });
      });
    }
    if (backBtn) backBtn.addEventListener('click', function () { scrub = null; rebuild(true); range && range.focus(); });

    if (!reduceMotion) {
      root.addEventListener('pointermove', function (e) {
        const r = root.getBoundingClientRect();
        par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        par.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      root.addEventListener('pointerleave', function () { par.tx = 0; par.ty = 0; });
    }
  }

  const go = function () {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 600 }); else setTimeout(go, 60);
})();
