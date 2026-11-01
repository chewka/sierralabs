/* The Lab Sims — util.js
   Seeded RNG, palette, pixel drawing helpers, 3x5 bitmap font, time formatting. */
(function () {
  const LS = (window.LS = window.LS || {});

  /* ---------- seeded RNG ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  LS.Rng = class {
    constructor(seed) { this.reset(seed); }
    reset(seed) { if (seed !== undefined) this.seed = seed >>> 0; this.f = mulberry32(this.seed); }
    next() { return this.f(); }
    range(a, b) { return a + (b - a) * this.f(); }
    int(a, b) { return Math.floor(a + (b - a + 1) * this.f()); }
    pick(a) { return a[Math.floor(this.f() * a.length) % a.length]; }
    chance(p) { return this.f() < p; }
    norm(mu, sd) {
      const u = 1 - this.f(), v = this.f();
      return mu + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
  };

  /* ---------- math ---------- */
  LS.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  LS.lerp = (a, b, t) => a + (b - a) * t;
  LS.ease = (t) => t * t * (3 - 2 * t);
  LS.round1 = (v) => Math.round(v * 10) / 10;
  LS.round2 = (v) => Math.round(v * 100) / 100;

  /* ---------- palette ---------- */
  LS.P = {
    /* warm taupe vinyl floor: the cool white equipment and the lab coat both
       read as objects against it instead of dissolving into it */
    floor: '#b3a898', floorB: '#aba091', grout: '#978c7c', scuff: '#a1968a',
    epoxy: '#373e48', epoxyL: '#4b5460', epoxyD: '#272d35',
    wallTop: '#77838f', wallFace: '#66717d', wallTrim: '#4d5663', wallTile: '#8e9aa7',
    edge: '#434d59', edgeS: '#59646f',
    steel: '#c2cbd3', steelD: '#8d97a1', steelL: '#e3e9ee', steelXL: '#f2f5f8',
    white: '#f1f4f7', whiteD: '#d2d9e0', whiteDD: '#aab3bc',
    dark: '#2a2f38', dark2: '#3a414c', black: '#1b1f26',
    glass: '#bfe4e0', glassD: '#8cc6c1', glassL: '#e3f6f3',
    amber: '#f0a93b', amberD: '#c8832a', teal: '#2fb8a8', tealL: '#6fe0d2',
    pink: '#e06b8b', violet: '#8a6bd6', violetL: '#b79bf0',
    green: '#5fbf61', greenD: '#3d8c47', red: '#e2574c', redD: '#b03b35',
    blue: '#4a8fd4', blueD: '#2f6aa8', yellow: '#f2d55c',
    coat: '#f5f8fa', coatS: '#dbe3ea', coatSS: '#bfc8d2',
    skin: '#e3b08a', skinS: '#c58f6b', hair: '#45302a', hairL: '#5d4138',
    glove: '#7fd6e8', gloveS: '#56b2c6',
    media: '#e9c86a', mediaD: '#c9a53f', gel: '#d7a7e8', gelD: '#b47fc9',
    beet: '#f2c23e', beetD: '#cf9a1f',
    shadow: 'rgba(24,30,40,0.18)',
  };

  /* ---------- pixel drawing ---------- */
  const px = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(0, w | 0), Math.max(0, h | 0)); };
  LS.px = px;
  LS.box = function (c, x, y, w, h, fill, edge) {
    px(c, x, y, w, h, fill);
    if (edge) {
      px(c, x, y, w, 1, edge); px(c, x, y + h - 1, w, 1, edge);
      px(c, x, y, 1, h, edge); px(c, x + w - 1, y, 1, h, edge);
    }
  };
  LS.bevel = function (c, x, y, w, h, fill, lt, dk) {
    px(c, x, y, w, h, fill);
    px(c, x, y, w, 1, lt); px(c, x, y, 1, h, lt);
    px(c, x, y + h - 1, w, 1, dk); px(c, x + w - 1, y, 1, h, dk);
  };
  LS.dot = (c, x, y, col) => px(c, x, y, 1, 1, col);
  LS.hline = (c, x, y, w, col) => px(c, x, y, w, 1, col);
  LS.vline = (c, x, y, h, col) => px(c, x, y, 1, h, col);
  LS.circle = function (c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      c.fillRect((cx - dx) | 0, (cy + dy) | 0, dx * 2 + 1, 1);
    }
  };
  LS.ellipse = function (c, cx, cy, rx, ry, col) {
    c.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      c.fillRect((cx - dx) | 0, (cy + dy) | 0, dx * 2 + 1, 1);
    }
  };

  /* ---------- 3x5 bitmap font ---------- */
  const F = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101011', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '111001011001111',
    4: '101101111001001', 5: '111100110001110', 6: '011100110101010', 7: '111001010010010',
    8: '010101010101010', 9: '010101011001110',
    ' ': '000000000000000', '.': '000000000000010', '-': '000000111000000', ':': '000010000010000',
    '/': '001001010100100', '%': '101001010100101', '+': '000010111010000', '°': '010101010000000',
    '(': '001010010010001', ')': '100010010010100', '!': '010010010000010', '?': '110001010000010',
    '>': '100010001010100', '<': '001010100010001', '×': '000101010101000', '=': '000111000111000',
    '[': '011010010010011', ']': '110010010010110', ',': '000000000010100', "'": '010010000000000',
    '#': '101111101111101', '*': '000101010101000', '_': '000000000000111',
  };
  LS.textW = (s, sc = 1) => s.length * 4 * sc - sc;
  LS.text = function (c, s, x, y, col, sc = 1) {
    s = String(s).toUpperCase();
    c.fillStyle = col;
    for (let i = 0; i < s.length; i++) {
      const g = F[s[i]]; if (!g) continue;
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) {
        if (g[r * 3 + q] === '1') c.fillRect((x + i * 4 * sc + q * sc) | 0, (y + r * sc) | 0, sc, sc);
      }
    }
  };
  LS.textC = function (c, s, cx, y, col, sc = 1) { LS.text(c, s, cx - LS.textW(s, sc) / 2, y, col, sc); };

  /* ---------- time ---------- */
  LS.fmtTime = function (m) {
    m = Math.max(0, Math.floor(m));
    const day = Math.floor(m / 1440) + 1;
    const hh = Math.floor((m % 1440) / 60), mm = m % 60;
    return { day, hh, mm, hhmm: String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') };
  };
  LS.fmtStamp = function (m) { const t = LS.fmtTime(m); return 'Day ' + t.day + ', ' + t.hhmm; };
  LS.fmtDur = function (m) {
    if (m < 60) return Math.round(m) + ' min';
    if (m < 1440) return LS.round1(m / 60) + ' h';
    return LS.round1(m / 1440) + ' d';
  };
  LS.sci = function (v, digits = 2) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 10000 || a < 0.01) {
      const e = Math.floor(Math.log10(a));
      return (v / Math.pow(10, e)).toFixed(1) + 'E' + e;
    }
    return v.toFixed(digits);
  };
})();
