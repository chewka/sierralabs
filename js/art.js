/* The Lab Sims — art.js
   Pixel-art rendering of the laboratory: floor, walls, props and all
   equipment, each with its own silhouette and animated states. */
(function () {
  const LS = window.LS, P = LS.P, W = LS.W, px = LS.px;
  const Art = (LS.Art = {});
  const T = 16;

  /* ---------------- shared pieces ---------------- */
  function shadow(c, x, y, w, h) {
    c.fillStyle = 'rgba(42,34,26,0.34)'; c.fillRect(x, y, w, h + 1);
    c.fillStyle = 'rgba(42,34,26,0.17)'; c.fillRect(x - 1, y + h + 1, w + 2, 2);
  }
  function outline(c, X, Y, Wd, H) {
    px(c, X, Y, Wd, 1, P.edge); px(c, X, Y + H - 1, Wd, 1, P.edge);
    px(c, X, Y, 1, H, P.edge); px(c, X + Wd - 1, Y, 1, H, P.edge);
  }

  function body3d(c, X, Y, Wd, H, faceH, top, topL, face, faceD, edge) {
    const th = H - faceH;
    px(c, X, Y, Wd, th, top);                       // top surface
    px(c, X + 1, Y + 1, Wd - 2, 1, topL);           // back highlight
    px(c, X, Y + th, Wd, faceH, face);              // front face
    px(c, X, Y + th, Wd, 1, faceD);                 // lip shade
    px(c, X + 1, Y + H - 2, Wd - 2, 1, edge || P.edgeS);
    outline(c, X, Y, Wd, H);
  }

  function screen(c, x, y, w, h, on, col) {
    px(c, x - 1, y - 1, w + 2, h + 2, P.dark);
    px(c, x, y, w, h, on ? (col || '#132a2c') : '#14171c');
    if (on) for (let i = 1; i < h; i += 2) px(c, x, y + i, w, 1, 'rgba(0,0,0,0.16)');
  }

  function led(c, x, y, col, on) { px(c, x, y, 2, 2, on ? col : '#4a515c'); if (on) px(c, x, y, 1, 1, '#ffffff'); }

  function flask(c, x, y, col) {
    px(c, x + 2, y, 2, 2, P.glassL);
    px(c, x + 1, y + 2, 4, 1, P.glassD);
    px(c, x, y + 3, 6, 4, P.glass);
    px(c, x, y + 5, 6, 2, col);
    px(c, x, y + 6, 6, 1, P.wallTrim);
  }
  function tube(c, x, y, col) {
    px(c, x, y, 2, 6, P.glass); px(c, x, y + 3, 2, 3, col); px(c, x, y, 2, 1, '#e8eef2');
  }
  function rack(c, x, y, n, col) {
    px(c, x, y + 4, n * 3 + 1, 3, '#6e7a86'); px(c, x, y + 4, n * 3 + 1, 1, '#8d99a5');
    for (let i = 0; i < n; i++) tube(c, x + 1 + i * 3, y, col || P.media);
  }
  function bottle(c, x, y, col) {
    px(c, x + 1, y, 2, 2, P.glassD); px(c, x, y + 2, 4, 6, P.glass);
    px(c, x, y + 4, 4, 4, col); px(c, x, y + 4, 4, 1, 'rgba(255,255,255,0.3)');
  }
  function tipbox(c, x, y, col) {
    px(c, x, y, 7, 5, col); px(c, x, y, 7, 1, '#ffffff33');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) px(c, x + 1 + i * 2, y + 1 + j * 2, 1, 1, '#2b3038');
  }
  function plate96(c, x, y, cols, fills) {
    px(c, x - 1, y - 1, cols * 2 + 3, 9, '#e9eef2'); px(c, x - 1, y - 1, cols * 2 + 3, 1, '#ffffff');
    for (let i = 0; i < cols; i++) for (let j = 0; j < 3; j++) {
      const f = fills && fills[(j * cols + i) % fills.length];
      px(c, x + i * 2, y + j * 2 + 1, 1, 1, f || '#b9c3cc');
    }
  }
  function pipette(c, x, y) { px(c, x, y, 1, 5, '#4b5560'); px(c, x, y, 1, 2, P.blue); px(c, x, y + 5, 1, 2, '#dfe6ec'); }
  function chair(c, x, y) {
    px(c, x + 1, y + 5, 6, 2, '#6b7580'); px(c, x + 3, y + 7, 2, 3, '#555e68');
    px(c, x + 1, y + 9, 6, 1, '#555e68'); px(c, x + 1, y, 6, 5, '#7b8691'); px(c, x + 1, y, 6, 1, '#929da8');
  }
  function gel(c, x, y, tone, glow) {
    px(c, x, y + 1, 5, 3, tone); px(c, x + 1, y, 3, 1, tone);
    px(c, x + 1, y + 1, 2, 1, 'rgba(255,255,255,0.35)');
    if (glow > 0) { c.fillStyle = 'rgba(242,194,62,' + (0.25 * glow).toFixed(2) + ')'; c.fillRect(x - 2, y - 2, 9, 8); }
  }

  /* ---------------- static layer (floor, walls, posters) ---------------- */
  let staticCv = null;
  Art.initStatic = function () {
    staticCv = document.createElement('canvas');
    staticCv.width = W.W; staticCv.height = W.H;
    const c = staticCv.getContext('2d');
    const rng = new LS.Rng(99);

    // floor tiles
    for (let y = 0; y < W.ROWS; y++) for (let x = 0; x < W.COLS; x++) {
      const base = (x + y) % 2 ? P.floor : P.floorB;
      px(c, x * T, y * T, T, T, base);
      px(c, x * T, y * T, T, 1, P.grout); px(c, x * T, y * T, 1, T, P.grout);
      if (rng.chance(0.1)) px(c, x * T + rng.int(2, 12), y * T + rng.int(2, 12), 1, 1, P.scuff);
    }
    // aisle marked with tape rather than paint
    const tape = (x, y, w, h) => {
      px(c, x, y, w, h, 'rgba(240,169,59,0.5)');
      px(c, x, y, w, 1, 'rgba(255,214,140,0.5)');
    };
    tape(T, 12.5 * T, 30 * T, 2); tape(T, 13.5 * T, 30 * T, 2);
    tape(7.5 * T, 4 * T, 2, 8.5 * T); tape(8.5 * T - 2, 4 * T, 2, 8.5 * T);

    // cable runs from the bottom instruments toward the wall
    const cable = (x, y1, y2) => { px(c, x, y1, 2, y2 - y1, 'rgba(45,55,70,0.35)'); px(c, x, y1, 1, y2 - y1, 'rgba(70,82,100,0.35)'); };
    cable(10 * T + 6, 14.2 * T, 16 * T); cable(15 * T + 6, 14.2 * T, 16 * T);
    cable(22 * T + 8, 14.2 * T, 16 * T);
    px(c, 10 * T + 6, 14.2 * T, 12 * T + 4, 2, 'rgba(45,55,70,0.28)');

    // walls
    px(c, 0, 0, W.W, T, P.wallFace);
    px(c, 0, 0, W.W, 4, P.wallTop);
    for (let x = 0; x < W.W; x += 10) px(c, x, 4, 1, T - 6, 'rgba(0,0,0,0.07)');
    for (let y = 7; y < T - 2; y += 5) px(c, 0, y, W.W, 1, 'rgba(0,0,0,0.05)');
    px(c, 0, T - 3, W.W, 3, P.wallTrim);
    px(c, 0, T, W.W, 1, 'rgba(0,0,0,0.18)');
    for (let y = 0; y < W.ROWS; y++) { px(c, 0, y * T, T, T, P.wallFace); px(c, (W.COLS - 1) * T, y * T, T, T, P.wallFace); }
    px(c, 0, 0, 5, W.H, P.wallTrim); px(c, W.W - 5, 0, 5, W.H, P.wallTrim);
    px(c, 5, 0, 1, W.H, 'rgba(0,0,0,0.16)'); px(c, W.W - 6, 0, 1, W.H, 'rgba(0,0,0,0.16)');
    px(c, 0, (W.ROWS - 1) * T, W.W, T, P.wallFace);
    px(c, 0, (W.ROWS - 1) * T, W.W, 3, P.wallTrim);

    // door on the left wall + mat
    px(c, 1, 3 * T, 14, 2 * T - 2, '#4b3f35');
    px(c, 2, 3 * T + 1, 12, 2 * T - 4, '#7d6854');
    px(c, 2, 3 * T + 1, 12, 1, '#947d66');
    px(c, 4, 3 * T + 4, 8, 9, 'rgba(190,230,226,0.5)');
    px(c, 11, 4 * T, 2, 3, P.amber);
    px(c, 1 * T, 3 * T + 4, 2 * T, 1.6 * T, 'rgba(60,70,84,0.22)');
    px(c, 1 * T, 3 * T + 4, 2 * T, 1, 'rgba(255,255,255,0.1)');

    // --- wall furniture -------------------------------------------------
    const poster = (x, col, col2) => {
      px(c, x - 1, 1, 15, 13, P.edge);
      px(c, x, 2, 13, 11, '#f6f8fa');
      px(c, x + 1, 3, 11, 5, col);
      for (let i = 0; i < 4; i++) px(c, x + 1, 9 + (i % 2), 11 - i * 2, 1, col2);
    };
    poster(34, P.teal, '#9aa6b4');
    poster(243, P.violet, '#9aa6b4');
    poster(389, P.pink, '#9aa6b4');

    // fire extinguisher
    px(c, 148, 4, 6, 10, '#b8342c'); px(c, 149, 5, 4, 1, '#e2574c');
    px(c, 150, 1, 2, 3, '#55606d'); px(c, 153, 3, 2, 1, '#55606d');
    px(c, 145, 14, 12, 1, P.edge);

    // green safety / eyewash signs
    px(c, 192, 3, 10, 10, P.green); px(c, 193, 4, 8, 8, '#e9f6ea'); px(c, 195, 5, 4, 6, P.green);
    px(c, 296, 4, 11, 8, '#2f8f52'); px(c, 297, 5, 9, 6, '#e6f5ea');
    px(c, 299, 6, 2, 2, '#2f8f52'); px(c, 303, 6, 2, 2, '#2f8f52');

    // clock
    LS.circle(c, 326, 8, 6, P.edge); LS.circle(c, 326, 8, 5, '#f3f7fa');
    px(c, 326, 4, 1, 5, '#3a414c'); px(c, 326, 8, 4, 1, '#3a414c');

    // whiteboard with scribbles
    px(c, 419, 2, 62, 12, P.edge); px(c, 420, 3, 60, 10, '#f7fafc');
    const rr = new LS.Rng(5);
    for (let i = 0; i < 7; i++) {
      const lx = 422 + rr.int(0, 12), ly = 5 + i % 4 * 2;
      px(c, lx, ly, rr.int(8, 26), 1, ['#4a8fd4', '#e2574c', '#3a414c'][i % 3]);
    }
    px(c, 456, 5, 18, 6, 'rgba(47,184,168,0.5)');
    px(c, 476, 12, 4, 1, '#b03b35');

    // shelf with boxes over the sink area (left wall is thin, so put it top-right)
    px(c, 350, 11, 30, 2, '#8a7560');
    px(c, 352, 4, 8, 7, '#d9c7a8'); px(c, 361, 6, 7, 5, '#c9d6e3'); px(c, 369, 3, 9, 8, '#e3d6ef');
    px(c, 352, 4, 8, 1, '#eadcc0'); px(c, 369, 3, 9, 1, '#f0e6fb');

    // power strip + sockets
    px(c, 100, T - 7, 20, 5, '#b7c0c9'); px(c, 100, T - 7, 20, 1, '#d6dde4');
    for (let i = 0; i < 4; i++) px(c, 103 + i * 5, T - 5, 2, 2, '#55606d');

    // floor drain + hazard corner + a stray stool
    LS.circle(c, 8 * T, 15 * T, 4, '#7f8b96'); LS.circle(c, 8 * T, 15 * T, 3, '#6b7681');
    for (let i = -2; i <= 2; i++) px(c, 8 * T - 3, 15 * T + i, 7, 1, i % 2 ? '#56606b' : '#8e99a4');
    // scuffed drag-marks where the cart gets shoved back and forth
    for (let i = 0; i < 3; i++) px(c, 6 * T + i * 3, 7 * T + 6 + i, 10, 1, 'rgba(120,110,96,0.4)');
  };

  /* ---------------- station painters ---------------- */
  const D = {};

  D.ppe = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 10, P.steel, P.steelL, P.white, P.whiteD);
    px(c, X + 3, Y + 4, 7, 14, P.coat); px(c, X + 3, Y + 4, 7, 1, '#ffffff');
    px(c, X + 6, Y + 6, 1, 10, P.coatSS);
    px(c, X + 14, Y + 6, 10, 5, '#2a2f38'); px(c, X + 15, Y + 7, 3, 3, P.glass); px(c, X + 19, Y + 7, 4, 3, P.glass);
    px(c, X + 14, Y + 13, 11, 6, P.blue); px(c, X + 15, Y + 14, 3, 3, '#cfe6ff');
  };

  D.bsc = (c, X, Y, Wd, H, s, t) => {
    px(c, X, Y, Wd, H - 12, P.edge);
    px(c, X + 1, Y + 1, Wd - 2, H - 16, P.white);
    // sash glass
    const sash = Math.round(6 * (s.active ? 1 : 0.55));
    px(c, X + 3, Y + 3, Wd - 6, 12 - sash, 'rgba(190,230,226,0.75)');
    px(c, X + 3, Y + 14 - sash, Wd - 6, 2, P.steelD);
    px(c, X + 2, Y + 2, Wd - 4, 1, P.steelL);
    // interior working surface
    px(c, X + 3, Y + 16, Wd - 6, 6, P.epoxy);
    px(c, X + 3, Y + 16, Wd - 6, 1, P.epoxyL);
    rack(c, X + 5, Y + 13, 3, P.media);
    plate96(c, X + 18, Y + 15, 6, s.active ? ['#f2c23e', '#e9c86a', '#d7a7e8'] : null);
    // front
    px(c, X, Y + H - 12, Wd, 12, P.whiteD); px(c, X, Y + H - 12, Wd, 1, P.white);
    px(c, X + 2, Y + H - 9, 30, 6, P.dark);
    LS.text(c, s.active ? 'FLOW ON' : 'STANDBY', X + 3, Y + H - 8, s.active ? P.tealL : '#6b7480', 1);
    led(c, X + Wd - 6, Y + H - 8, P.green, s.active);
    if (s.active) { c.fillStyle = 'rgba(140,220,210,0.10)'; c.fillRect(X + 3, Y + 3, Wd - 6, 18); }
    outline(c, X, Y, Wd, H);
  };

  D.bench = (c, X, Y, Wd, H, s, t) => {
    // black epoxy-resin worktop over pale cabinets — the real thing, and it
    // gives every piece of glassware something to read against
    body3d(c, X, Y, Wd, H, 12, P.epoxy, P.epoxyL, '#dde4ea', '#b4bec8');
    px(c, X + 1, Y + H - 13, Wd - 2, 1, P.epoxyD);
    // backsplash shelf with bottles
    bottle(c, X + 3, Y - 6, P.media); bottle(c, X + 9, Y - 6, P.teal); bottle(c, X + 15, Y - 6, P.pink);
    px(c, X + 1, Y - 1, Wd - 2, 2, '#aeb8c2');
    // bench top items
    tipbox(c, X + 4, Y + 4, P.blue); tipbox(c, X + 13, Y + 4, P.teal);
    rack(c, X + 24, Y + 2, 5, P.media);
    flask(c, X + 42, Y + 2, P.media); flask(c, X + 52, Y + 2, P.gel);
    pipette(c, X + 39, Y + 3); pipette(c, X + 41, Y + 3);
    plate96(c, X + 62, Y + 3, 8, s.active ? ['#f2c23e', '#e9c86a'] : null);
    if (s.active) { px(c, X + 70, Y + 1, 1, 2, '#ffffff'); }
    // drawers
    for (let i = 0; i < 4; i++) { px(c, X + 3 + i * 22, Y + H - 9, 18, 7, '#b7c0ca'); px(c, X + 9 + i * 22, Y + H - 6, 6, 1, '#7c8794'); }
  };

  D.gelprep = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 12, P.epoxy, P.epoxyL, '#d7dee5', '#aeb8c2');
    px(c, X + 1, Y + H - 13, Wd - 2, 1, P.epoxyD);
    // chilled stir plate
    px(c, X + 3, Y + 3, 16, 10, P.white); px(c, X + 3, Y + 3, 16, 1, '#ffffff');
    px(c, X + 5, Y + 5, 12, 6, '#8e99a4');
    const spin = s.active ? (Math.sin(t * 14) * 3) | 0 : 0;
    px(c, X + 10 + spin, Y + 7, 3, 1, '#d9e1e8');
    flask(c, X + 8, Y + 1, s.active ? P.gel : P.glass);
    led(c, X + 16, Y + 11, P.blue, s.active);
    // balance
    px(c, X + 23, Y + 5, 14, 8, P.white); px(c, X + 25, Y + 3, 10, 3, P.steelL);
    screen(c, X + 25, Y + 8, 10, 4, true, '#16302a');
    LS.text(c, s.active ? '0 42' : '0 00', X + 26, Y + 9, P.tealL, 1);
    // powder tubs + spatula
    px(c, X + 41, Y + 5, 7, 8, '#e6d6b8'); px(c, X + 41, Y + 5, 7, 1, '#f3e8d2');
    px(c, X + 50, Y + 5, 7, 8, '#dfe6ec'); px(c, X + 50, Y + 5, 7, 1, '#f1f5f8');
    px(c, X + 59, Y + 8, 5, 1, '#9aa5b0');
    for (let i = 0; i < 3; i++) px(c, X + 4 + i * 20, Y + H - 8, 16, 6, '#b2bcc6');
  };

  D.printer = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 10, '#cfd7df', '#e8eef3', '#b6c0ca', '#9ba5b0');
    // frame
    px(c, X + 2, Y - 8, 2, 20, P.steelD); px(c, X + Wd - 4, Y - 8, 2, 20, P.steelD);
    px(c, X + 2, Y - 9, Wd - 4, 2, P.steel);
    // gantry + print head
    const hx = s.active ? X + 5 + ((Math.sin(t * 3.1) * 0.5 + 0.5) * (Wd - 16)) : X + 5;
    px(c, X + 4, Y - 5, Wd - 8, 2, P.steelL);
    px(c, hx | 0, Y - 6, 6, 6, '#5a6472'); px(c, (hx | 0) + 2, Y, 2, 3, '#7c8794');
    if (s.active) px(c, (hx | 0) + 2, Y + 3, 2, 2, P.gel);
    // print bed with deposited gels
    px(c, X + 4, Y + 4, Wd - 8, 8, '#aeb8c2'); px(c, X + 4, Y + 4, Wd - 8, 1, '#c9d2da');
    const n = Math.min(3, Math.floor(s.prog * 4));
    for (let i = 0; i < n; i++) gel(c, X + 6 + i * 10, Y + 6, P.gel, 0);
    screen(c, X + 4, Y + H - 8, 14, 5, true, '#1b2430');
    LS.text(c, s.active ? 'PRINT' : 'IDLE', X + 5, Y + H - 7, s.active ? P.amber : '#687180', 1);
  };

  D.uv = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 10, '#c7cfd8', '#e2e8ee', '#aeb8c2', '#949ea9');
    px(c, X + 3, Y + 2, Wd - 6, 11, '#3a3050');
    px(c, X + 4, Y + 3, Wd - 8, 9, s.active ? '#6a4fb0' : '#4a4060');
    if (s.active) {
      const a = 0.35 + 0.3 * Math.sin(t * 9);
      c.fillStyle = 'rgba(183,155,240,' + a.toFixed(2) + ')';
      c.fillRect(X + 4, Y + 3, Wd - 8, 9);
      c.fillStyle = 'rgba(138,107,214,0.16)'; c.fillRect(X - 6, Y - 6, Wd + 12, H + 12);
      px(c, X + 5, Y + 4, Wd - 10, 1, '#d9ccff');
    }
    gel(c, X + 10, Y + 8, P.gel, s.active ? 1 : 0);
    px(c, X + 3, Y + 13, Wd - 6, 2, P.steelD);
    led(c, X + 5, Y + H - 7, P.violetL, s.active);
    LS.text(c, 'UV', X + 10, Y + H - 8, s.active ? P.violetL : '#6b7480', 1);
  };

  D.incubator = (c, X, Y, Wd, H, s, t) => {
    px(c, X, Y, Wd, H, P.edge);
    px(c, X + 1, Y + 1, Wd - 2, H - 2, P.white);
    const open = s.door;
    // interior
    px(c, X + 3, Y + 6, Wd - 6, H - 12, '#4e5864');
    for (let i = 0; i < 3; i++) {
      px(c, X + 4, Y + 9 + i * 10, Wd - 8, 1, '#9aa5b0');
      if (s.active) { flask(c, X + 6, Y + 3 + i * 10, P.media); px(c, X + 18, Y + 6 + i * 10, 10, 3, '#e9eef2'); }
    }
    if (s.active) { c.fillStyle = 'rgba(240,169,59,0.14)'; c.fillRect(X + 3, Y + 6, Wd - 6, H - 12); }
    // door (glass) slides open
    const dw = Math.round((Wd - 6) * (1 - open));
    px(c, X + 3, Y + 6, dw, H - 12, 'rgba(178,216,212,0.2)');
    px(c, X + 3, Y + 6, dw, 1, '#dff2ef');
    px(c, X + 4, Y + 8, Math.max(0, dw - 8), 1, 'rgba(255,255,255,0.3)');
    px(c, X + 3 + dw - 2, Y + 6, 2, H - 12, P.edge);
    if (dw > 8) { px(c, X + dw - 1, Y + 16, 2, 11, '#59636f'); px(c, X + dw - 2, Y + 16, 1, 11, '#9aa5b0'); }
    outline(c, X + 3, Y + 6, Wd - 6, H - 12);
    // control head
    screen(c, X + 4, Y + 2, Wd - 10, 5, true, s.alert > 0 ? '#3a1c1c' : '#132a2c');
    LS.text(c, s.alert > 0 ? 'SERVICE' : '30 0 C', X + 5, Y + 3, s.alert > 0 ? '#ff9a8f' : P.tealL, 1);
    led(c, X + Wd - 5, Y + 3, s.alert > 0 ? P.red : P.green, true);
    px(c, X, Y + H - 3, Wd, 3, P.steelD);
  };

  D.shaker = (c, X, Y, Wd, H, s, t) => {
    px(c, X, Y + 8, Wd, H - 8, P.edge);
    px(c, X + 1, Y + 9, Wd - 2, H - 10, '#b6c0ca');
    const o = s.active ? Math.round(Math.sin(t * 11) * 2) : 0;
    const o2 = s.active ? Math.round(Math.cos(t * 11) * 1) : 0;
    px(c, X + 2 + o, Y + 2 + o2, Wd - 4, 9, '#59636f');
    px(c, X + 2 + o, Y + 2 + o2, Wd - 4, 1, '#79838f');
    flask(c, X + 5 + o, Y + o2, s.active ? P.media : P.glass);
    flask(c, X + 14 + o, Y + o2, s.active ? P.media : P.glass);
    flask(c, X + 23 + o, Y + o2, s.active ? P.teal : P.glass);
    screen(c, X + 3, Y + H - 7, 13, 5, true, '#132a2c');
    LS.text(c, s.active ? '220' : 'OFF', X + 5, Y + H - 6, s.active ? P.tealL : '#687180', 1);
    led(c, X + Wd - 5, Y + H - 6, P.amber, s.active);
  };

  D.reader = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 9, '#dfe5eb', '#f1f5f8', '#c6cfd7', '#a9b3bd');
    px(c, X + 2, Y + 2, Wd - 4, 11, '#e7ecf1'); px(c, X + 2, Y + 2, Wd - 4, 1, '#ffffff');
    // tray slides out while measuring
    const tr = Math.round(10 * s.prog * (s.active ? 1 : 0));
    px(c, X + 4, Y + 9, Wd - 8, 4, '#394350');
    px(c, X + 5 - tr, Y + 9, 18, 4, '#8e99a4');
    plate96(c, X + 6 - tr, Y + 8, 7, s.active ? ['#f2c23e', '#e9c86a', '#f7dd8a'] : ['#c3ccd4']);
    screen(c, X + 3, Y + 3, Wd - 8, 5, true, '#132a2c');
    LS.text(c, s.active ? 'READ' : 'READY', X + 5, Y + 4, s.active ? P.tealL : '#6d7784', 1);
    led(c, X + Wd - 5, Y + 4, P.teal, s.active);
    if (s.active) px(c, X + 4, Y + 14, Math.round((Wd - 8) * s.prog), 2, P.teal);
  };

  D.scope = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 8, '#d3dbe2', '#eef2f6', '#bcc6cf', '#9fa9b4');
    // microscope silhouette
    px(c, X + 6, Y + 11, 12, 3, '#59636f');
    px(c, X + 10, Y + 2, 3, 10, '#6d7884');
    px(c, X + 8, Y + 1, 7, 2, '#59636f');
    px(c, X + 11, Y + 7, 2, 4, '#4b5560');
    px(c, X + 7, Y + 8, 9, 1, '#8e99a4');
    px(c, X + 13, Y - 2, 2, 4, '#4b5560');
    if (s.active) { c.fillStyle = 'rgba(111,224,210,0.22)'; c.fillRect(X + 7, Y + 7, 9, 4); }
    // monitor
    screen(c, X + 20, Y + 3, 12, 9, true, '#0f1d22');
    if (s.active) {
      const r = new LS.Rng(7);
      for (let i = 0; i < 9; i++) {
        const cx = X + 21 + r.int(0, 9), cy = Y + 4 + r.int(0, 6);
        px(c, cx, cy, 2, 2, i % 3 ? P.tealL : P.beet);
      }
    }
    led(c, X + Wd - 4, Y + H - 6, P.teal, s.active);
  };

  D.fridge = (c, X, Y, Wd, H, s, t) => appliance(c, X, Y, Wd, H, s, t, '#e8eef3', P.glass, '4 0 C', P.blue);
  D.freezer = (c, X, Y, Wd, H, s, t) => appliance(c, X, Y, Wd, H, s, t, '#dfe9f2', '#cfe6f5', '-80 C', '#7fc8ee');

  function appliance(c, X, Y, Wd, H, s, t, shell, inner, label, accent) {
    px(c, X, Y, Wd, H, P.edge);
    px(c, X + 1, Y + 1, Wd - 2, H - 2, shell);
    // interior
    px(c, X + 2, Y + 7, Wd - 4, H - 10, '#515c68');
    for (let i = 0; i < 3; i++) px(c, X + 3, Y + 11 + i * 9, Wd - 6, 1, '#8e99a4');
    if (s.door > 0.05) {
      rack(c, X + 4, Y + 7, 2, P.media);
      px(c, X + 4, Y + 18, 10, 4, '#cfd8e0');
    }
    const dw = Math.round((Wd - 4) * (1 - s.door));
    px(c, X + 2, Y + 7, dw, H - 10, shell);
    px(c, X + 2, Y + 7, dw, 1, '#ffffff');
    if (dw > 6) {
      outline(c, X + 2, Y + 7, dw, H - 10);                      // door seal
      px(c, X + 3, Y + 8, dw - 2, 1, 'rgba(255,255,255,0.6)');
      px(c, X + dw - 3, Y + 13, 2, 10, '#59636f');               // handle
      px(c, X + dw - 4, Y + 13, 1, 10, '#8d97a1');
      px(c, X + dw - 3, Y + 12, 2, 1, '#454e59');
      px(c, X + 4, Y + H - 7, 10, 2, accent);                    // colour band
    }
    screen(c, X + 3, Y + 2, Wd - 8, 4, true, '#101c24');
    LS.text(c, label, X + 4, Y + 3, accent, 1);
    px(c, X, Y + H - 2, Wd, 2, P.steelD);
    if (s.door > 0.05) { c.fillStyle = 'rgba(190,225,245,0.18)'; c.fillRect(X + 2, Y + 7, Wd - 4, H - 10); }
  }

  D.ln2 = (c, X, Y, Wd, H, s, t) => {
    px(c, X + 3, Y + 4, Wd - 6, H - 6, '#c2cfda');
    outline(c, X + 3, Y + 4, Wd - 6, H - 6);
    px(c, X + 4, Y + 5, Wd - 8, 2, '#dde8f2');
    px(c, X + 2, Y + 2, Wd - 4, 3, P.edge);
    px(c, X + 5, Y + 8, Wd - 10, 1, '#8e9ba8');
    LS.text(c, 'LN', X + 7, Y + 13, '#5e6a77', 1);
    if (s.active) {
      const a = 0.25 + 0.2 * Math.sin(t * 5);
      c.fillStyle = 'rgba(224,240,250,' + a.toFixed(2) + ')';
      c.fillRect(X + 1, Y - 6 + Math.sin(t * 2) * 2, Wd - 2, 9);
      c.fillRect(X + 4, Y - 11, Wd - 8, 6);
    }
  };

  D.sink = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 9, P.epoxy, P.epoxyL, '#cfd8e0', '#aab4be');
    px(c, X + 3, Y + 4, Wd - 6, 10, '#8c97a2'); px(c, X + 4, Y + 5, Wd - 8, 8, '#a7b1bb');
    px(c, X + Wd - 8, Y, 2, 6, '#9aa5b0'); px(c, X + Wd - 12, Y, 6, 2, '#9aa5b0');
    if (s.active) { px(c, X + Wd - 11, Y + 2, 1, 9, '#bfe4f5'); px(c, X + 6, Y + 9, 8, 3, 'rgba(160,210,235,0.6)'); }
    px(c, X + 4, Y + 11, 2, 2, '#7f8a95');
  };

  D.centrifuge = (c, X, Y, Wd, H, s, t) => {
    // squat benchtop body
    const by = Y + 15, bh = H - 17;
    px(c, X + 2, by, Wd - 4, bh, '#8e99a5');
    px(c, X + 3, by + 1, Wd - 6, bh - 4, '#c6d0d9');
    px(c, X + 3, by + 1, Wd - 6, 2, '#e8eef3');
    outline(c, X + 2, by, Wd - 4, bh);
    px(c, X + 2, Y + H - 3, Wd - 4, 2, '#5d6671');
    // big circular lid taking the left two thirds
    const lcx = X + 23, lcy = Y + 14, lr = 19;
    LS.ellipse(c, lcx, lcy + 3, lr, 10, 'rgba(42,34,26,0.22)');
    LS.ellipse(c, lcx, lcy, lr, 11, '#78838f');
    LS.ellipse(c, lcx, lcy - 1, lr - 2, 10, '#b6c0ca');
    LS.ellipse(c, lcx, lcy - 3, lr - 6, 6, '#39414b');
    if (s.active) {
      const a = t * 26;
      for (let i = 0; i < 6; i++) {
        const ang = a + (i * Math.PI) / 3;
        px(c, lcx + Math.cos(ang) * 8 - 1, lcy - 3 + Math.sin(ang) * 4, 3, 3, i % 2 ? '#dfe6ec' : '#94a0ac');
      }
      LS.ellipse(c, lcx, lcy - 3, lr - 6, 6, 'rgba(190,225,235,0.14)');
      px(c, lcx - lr + 5, lcy - 7, 8, 1, 'rgba(255,255,255,0.35)');
    } else {
      // lid up: you can see the empty rotor buckets
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        px(c, lcx + Math.cos(ang) * 8 - 1, lcy - 3 + Math.sin(ang) * 4, 3, 3, '#8e99a4');
      }
      LS.ellipse(c, lcx, lcy - 14, lr - 3, 4, '#9aa5b0');
      LS.ellipse(c, lcx, lcy - 15, lr - 5, 3, '#c3ccd5');
      px(c, lcx - 2, lcy - 12, 4, 4, '#78838f');
    }
    // control panel on the right shoulder
    screen(c, X + Wd - 25, Y + 20, 21, 7, true, '#132a2c');
    LS.text(c, s.active ? '14000' : 'READY', X + Wd - 24, Y + 22, s.active ? P.tealL : '#6d7784', 1);
    px(c, X + Wd - 24, Y + 30, 9, 2, '#8d97a1');
    led(c, X + Wd - 7, Y + 30, P.green, s.active);
  };

  D.coffee = (c, X, Y, Wd, H, s, t) => {
    const cx = X + Wd / 2 + 5, cy = Y + H / 2 + 1;
    chair(c, X + 9, Y + H - 12);                       // chair tucked in behind
    px(c, cx - 2, cy + 4, 4, 11, '#7c5d3e');           // pedestal
    px(c, cx - 8, cy + 14, 16, 3, '#5f4830');
    LS.ellipse(c, cx, cy + 4, 21, 13, 'rgba(42,34,26,0.24)');
    LS.ellipse(c, cx, cy, 21, 13, '#8d6c4a');          // table rim
    LS.ellipse(c, cx, cy - 2, 20, 12, '#caa073');      // table top
    LS.ellipse(c, cx, cy - 3, 16, 9, '#d6ae83');
    // clutter on the table
    px(c, cx - 8, cy - 4, 5, 4, '#e8eef2'); px(c, cx - 3, cy - 3, 1, 2, '#e8eef2');
    px(c, cx - 8, cy - 4, 5, 1, '#6b4a33');
    px(c, cx + 1, cy - 5, 9, 6, '#c9d6e3'); px(c, cx + 1, cy - 5, 9, 1, '#e3ecf4');
    px(c, cx + 3, cy - 3, 5, 1, '#8c99a8');
    px(c, cx - 2, cy + 2, 6, 3, '#d9c7a8');            // biscuit tin
    // coffee machine on its own little counter
    px(c, X + 1, Y + 8, 14, 7, '#b8c1cb'); outline(c, X + 1, Y + 8, 14, 7);
    px(c, X + 3, Y - 1, 10, 10, '#434d59'); outline(c, X + 3, Y - 1, 10, 10);
    px(c, X + 4, Y, 8, 4, '#262c34');
    px(c, X + 6, Y + 5, 4, 3, '#e8e2d6');
    px(c, X + 5, Y + 8, 6, 1, '#6b4a33');
    led(c, X + 10, Y + 1, s.active ? P.green : P.red, true);
    if (s.active) {
      const a = 0.3 + 0.2 * Math.sin(t * 6);
      c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
      c.fillRect(X + 7, Y - 5, 2, 5); c.fillRect(X + 8, Y - 8, 2, 3);
    }
  };

  D.lyo = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 14, '#9aa5b0', '#c3ccd5', '#b0bac4', '#95a0aa');
    // glass drying chamber with vials racked inside
    LS.ellipse(c, X + Wd / 2, Y + 13, 15, 12, '#5f6a76');
    LS.ellipse(c, X + Wd / 2, Y + 12, 14, 11, 'rgba(206,238,234,0.85)');
    LS.ellipse(c, X + Wd / 2, Y + 11, 12, 9, 'rgba(232,248,246,0.92)');
    px(c, X + Wd / 2 - 11, Y + 13, 22, 1, '#9fb4b6');
    for (let i = 0; i < 5; i++) px(c, X + Wd / 2 - 10 + i * 4, Y + 8, 3, 5, '#eef3f6');
    for (let i = 0; i < 4; i++) px(c, X + Wd / 2 - 8 + i * 4, Y + 14, 3, 4, '#eef3f6');
    px(c, X + Wd / 2 - 2, Y - 1, 4, 3, '#78838f');
    if (s.active) {
      const a = 0.3 + 0.25 * Math.sin(t * 2.6);
      c.fillStyle = 'rgba(230,245,255,' + a.toFixed(2) + ')';
      LS.ellipse(c, X + Wd / 2, Y + 9, 9, 7, 'rgba(235,248,255,' + a.toFixed(2) + ')');
    }
    // vacuum gauge
    LS.circle(c, X + 8, Y + H - 8, 4, '#eef3f7');
    const ang = -2.2 + (s.active ? 1.6 : 0) + Math.sin(t * 1.3) * 0.08;
    px(c, X + 8 + Math.cos(ang) * 3, Y + H - 8 + Math.sin(ang) * 3, 1, 1, P.red);
    screen(c, X + 14, Y + H - 11, 32, 7, true, '#101c24');
    LS.text(c, s.active ? 'VAC -50C' : 'STANDBY', X + 15, Y + H - 9, s.active ? '#9fd8ee' : '#6d7784', 1);
  };

  D.store = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 16, '#cbd4dc', '#e9eff4', '#b5bfc9', '#9aa4ae');
    for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) {
      const bx = X + 4 + i * 13, by = Y + 2 + r * 9;
      px(c, bx, by, 11, 7, '#dfe6ec'); px(c, bx, by, 11, 1, '#f4f8fa');
      px(c, bx + 1, by + 1, 9, 3, r ? '#e3d6ef' : '#efe0c0');
      px(c, bx + 3, by + 5, 5, 1, '#9aa5b0');
      if (s.active && r === 0 && i === 0) px(c, bx + 1, by + 1, 9, 3, P.gel);
    }
    px(c, X + 2, Y + H - 13, Wd - 4, 2, '#a7b1bb');
    LS.text(c, 'DRY', X + 5, Y + H - 10, '#6d7784', 1);
    LS.text(c, 'STORE', X + 22, Y + H - 10, '#6d7784', 1);
  };

  D.hplc = (c, X, Y, Wd, H, s, t) => instrument(c, X, Y, Wd, H, s, t, 'HPLC', P.teal);
  D.lcms = (c, X, Y, Wd, H, s, t) => instrument(c, X, Y, Wd, H, s, t, 'LC-MS', P.violet);

  function instrument(c, X, Y, Wd, H, s, t, label, accent) {
    body3d(c, X, Y, Wd, H, 16, '#cfd7df', '#eaeff4', '#bac4cd', '#9fa9b4');
    // stacked modules, each banded in the instrument's colour
    for (let i = 0; i < 3; i++) {
      const my = Y + 1 + i * 6;
      px(c, X + 2, my, Wd - 18, 5, i === 1 ? '#dde4ea' : '#eaeff4');
      px(c, X + 2, my, Wd - 18, 1, '#f8fafc');
      px(c, X + 2, my + 4, Wd - 18, 1, P.edge);
      px(c, X + 2, my + 1, 2, 3, accent);
      led(c, X + Wd - 20, my + 2, i === 0 ? P.green : accent, s.active);
    }
    px(c, X + 1, Y, Wd - 16, 1, P.edge);
    // solvent bottles on top
    bottle(c, X + 4, Y - 8, '#cfe6f5'); bottle(c, X + 10, Y - 8, '#e4d7f2');
    // detector screen
    screen(c, X + Wd - 16, Y + 2, 13, 14, true, '#0f1d22');
    if (s.active) {
      const o = (t * 18) % 13;
      for (let i = 0; i < 13; i++) {
        const tt = i + o, v = 1.5 + 5 * Math.exp(-Math.pow((tt % 13) - 7, 2) / 2.2);
        px(c, X + Wd - 16 + i, Y + 14 - v, 1, Math.max(1, v | 0), accent);
      }
    } else {
      px(c, X + Wd - 15, Y + 13, 11, 1, '#2c3a44');
    }
    LS.text(c, label, X + 4, Y + H - 11, s.active ? accent : '#6d7784', 1);
    if (s.active) px(c, X + 4, Y + H - 5, Math.round((Wd - 8) * s.prog), 2, accent);
  }

  D.desk = (c, X, Y, Wd, H, s, t) => {
    body3d(c, X, Y, Wd, H, 12, '#c9a87a', '#ddc49c', '#a98a60', '#8d7150');
    // dual monitors
    const mon = (mx, w, on, draw) => {
      px(c, mx, Y - 2, w, 13, '#3b434e'); screen(c, mx + 1, Y - 1, w - 2, 11, on, '#0e1b22');
      px(c, mx + w / 2 - 2, Y + 11, 4, 3, '#4b5560'); px(c, mx + w / 2 - 5, Y + 14, 10, 1, '#5b6570');
      if (on && draw) draw(mx + 2, Y);
    };
    mon(X + 5, 24, !s.screenOff, (sx, sy) => {
      // little live plot
      for (let i = 0; i < 20; i++) {
        const v = 4 + 4 * Math.sin(i * 0.5 + t * 1.2) * (s.active ? 1 : 0.4);
        px(c, sx + i, sy + 7 - v / 2, 1, 1, P.tealL);
      }
      px(c, sx, sy + 8, 20, 1, '#2d4650');
    });
    mon(X + 34, 22, !s.screenOff, (sx, sy) => {
      for (let i = 0; i < 6; i++) LS.text(c, i % 2 ? '0 42' : 'DATA', sx, sy - 1 + i * 2, i === 0 ? P.amber : '#49646d', 1);
    });
    // keyboard, mouse, notebook, mug
    px(c, X + 14, Y + 14, 20, 5, '#dfe6ec'); px(c, X + 14, Y + 14, 20, 1, '#f2f6f9');
    for (let i = 0; i < 6; i++) px(c, X + 16 + i * 3, Y + 16, 2, 1, '#9aa5b0');
    px(c, X + 37, Y + 15, 4, 4, '#dfe6ec');
    px(c, X + 44, Y + 13, 10, 7, '#c9d6e3'); px(c, X + 44, Y + 13, 10, 1, '#e3ecf4');
    px(c, X + 62, Y + 14, 5, 4, '#e8eef2'); px(c, X + 62, Y + 14, 5, 1, '#6b4a33');
    chair(c, X + Wd / 2 - 4, Y + H + 2);
  };

  D.waste = (c, X, Y, Wd, H, s, t) => {
    const bin = (bx, col, lid) => {
      px(c, bx, Y + 6, 12, H - 8, col); px(c, bx + 1, Y + 7, 10, 1, 'rgba(255,255,255,0.35)');
      outline(c, bx, Y + 6, 12, H - 8);
      px(c, bx - 1, Y + 3, 14, 3, lid); px(c, bx + 4, Y + 1, 4, 2, lid);
      px(c, bx + 2, Y + 12, 8, 1, 'rgba(0,0,0,0.18)');
    };
    bin(X + 1, '#d9b4b4', '#b98f8f');
    bin(X + 16, '#bfd0c0', '#95ab97');
  };

  /* ---------------- decor furniture ---------------- */
  D.cart = (c, X, Y, Wd, H, s, t) => {
    px(c, X + 1, Y + 4, Wd - 2, 3, '#8c96a1'); outline(c, X + 1, Y + 4, Wd - 2, 3);
    px(c, X + 1, Y + 16, Wd - 2, 3, '#7e8893'); outline(c, X + 1, Y + 16, Wd - 2, 3);
    px(c, X + 3, Y + 6, 2, 11, '#5d6671'); px(c, X + Wd - 5, Y + 6, 2, 11, '#5d6671');
    // top shelf: tip boxes and a bottle
    tipbox(c, X + 3, Y - 1, P.blue); tipbox(c, X + 12, Y - 1, P.teal);
    bottle(c, X + 22, Y - 4, P.media);
    // lower shelf: a crate
    px(c, X + 4, Y + 11, 13, 5, '#c9b893'); px(c, X + 4, Y + 11, 13, 1, '#ddcfae');
    px(c, X + 19, Y + 12, 8, 4, '#cfd8e0');
    // castors
    px(c, X + 3, Y + 19, 3, 2, '#3f4852'); px(c, X + Wd - 6, Y + 19, 3, 2, '#3f4852');
  };
  D.shelf = (c, X, Y, Wd, H, s, t) => {
    for (let i = 0; i < 3; i++) {
      const sy = Y + 3 + i * 9;
      px(c, X + 1, sy, Wd - 2, 2, '#9aa5b0'); px(c, X + 1, sy, Wd - 2, 1, '#bcc6d0');
      outline(c, X + 1, sy, Wd - 2, 2);
    }
    px(c, X + 2, Y + 3, 2, H - 5, '#5d6671'); px(c, X + Wd - 4, Y + 3, 2, H - 5, '#5d6671');
    px(c, X + 6, Y - 3, 10, 6, '#c9b893'); px(c, X + 6, Y - 3, 10, 1, '#ddcfae');
    px(c, X + 18, Y - 2, 9, 5, '#d3c3e2');
    px(c, X + 5, Y + 7, 12, 5, '#cfd8e0'); px(c, X + 5, Y + 7, 12, 1, '#e6ecf2');
    flask(c, X + 20, Y + 5, P.media); flask(c, X + 29, Y + 5, P.teal);
    px(c, X + 7, Y + 16, 14, 5, '#b9c3cc');
  };
  D.cyl = (c, X, Y, Wd, H, s, t) => {
    const cyl = (cx, col) => {
      px(c, cx, Y + 2, 7, 13, col); px(c, cx + 1, Y + 3, 1, 11, 'rgba(255,255,255,0.3)');
      outline(c, cx, Y + 2, 7, 13);
      px(c, cx + 1, Y - 2, 5, 4, '#8d97a1'); px(c, cx + 2, Y - 5, 3, 3, '#6d7883');
      px(c, cx, Y + 6, 7, 2, '#e8c24a'); // hazard band
    };
    cyl(X + 2, '#4d7c6a'); cyl(X + 13, '#5c6f8c');
    px(c, X + 1, Y + 7, Wd - 2, 1, '#454e59'); // retaining chain
    px(c, X + 1, Y + 15, Wd - 2, 2, 'rgba(28,36,48,0.22)');
  };

  /* ---------------- main draw ---------------- */
  Art.drawStatic = function (c) { if (staticCv) c.drawImage(staticCv, 0, 0); };

  Art.drawStation = function (c, st, t) {
    const X = st.x * T, Y = st.y * T, Wd = st.w * T, H = st.h * T;
    shadow(c, X + 1, Y + H - 1, Wd - 2, 3);
    (D[st.id] || ((cc) => LS.bevel(cc, X, Y, Wd, H, P.steel, P.steelL, P.steelD)))(c, X, Y, Wd, H, st.s, t);
    if (st.s.offline > 0) {
      c.fillStyle = 'rgba(226,87,76,0.16)'; c.fillRect(X, Y, Wd, H);
      const blink = Math.sin(t * 6) > 0;
      if (blink) { px(c, X + Wd / 2 - 5, Y - 9, 10, 8, P.red); LS.text(c, '!', X + Wd / 2 - 1, Y - 7, '#fff', 1); }
    }
    if (st.s.busy) {
      px(c, X + Wd / 2 - 7, Y - 10, 14, 8, 'rgba(26,32,41,0.85)');
      LS.text(c, 'BUSY', X + Wd / 2 - 6, Y - 8, P.amber, 1);
    }
  };

  Art.drawAll = function (c, t) { W.stations.forEach((s) => Art.drawStation(c, s, t)); };

  /* ---------------- lighting ---------------- */
  Art.lighting = function (c, simMin) {
    const h = (simMin % 1440) / 60;
    let dark = 0;
    if (h < 6) dark = 1; else if (h < 8) dark = 1 - (h - 6) / 2;
    else if (h < 18) dark = 0; else if (h < 21) dark = (h - 18) / 3; else dark = 1;
    if (dark <= 0.01) return 0;
    c.fillStyle = 'rgba(24,32,64,' + (0.42 * dark).toFixed(3) + ')';
    c.fillRect(0, 0, W.W, W.H);
    // ceiling lamp pools stay lit
    c.globalCompositeOperation = 'lighter';
    [[7, 4], [16, 4], [25, 4], [7, 12], [16, 12], [25, 12]].forEach(([lx, ly]) => {
      const g = c.createRadialGradient(lx * T, ly * T, 4, lx * T, ly * T, 62);
      g.addColorStop(0, 'rgba(255,226,170,' + (0.17 * dark).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,226,170,0)');
      c.fillStyle = g; c.fillRect(lx * T - 64, ly * T - 64, 128, 128);
    });
    c.globalCompositeOperation = 'source-over';
    return dark;
  };

  /* ---------------- microscope inset ---------------- */
  Art.microInset = function (c, t, cfg) {
    const w = 86, h = 62, x = W.W - w - 6, y = 22;
    px(c, x - 2, y - 2, w + 4, h + 4, '#1b2026');
    px(c, x - 1, y - 1, w + 2, h + 2, '#39424e');
    px(c, x, y, w, h, '#0b1416');
    const rng = new LS.Rng(cfg.seed || 12);
    const n = Math.round(6 + (cfg.density || 0.5) * 26);
    for (let i = 0; i < n; i++) {
      const cx = x + 4 + rng.range(0, w - 8), cy = y + 4 + rng.range(0, h - 8);
      const r = 1 + Math.round(rng.range(0, 1.6));
      const drift = Math.sin(t * 0.7 + i) * 1.2;
      LS.ellipse(c, cx + drift, cy, r + 1, r, 'rgba(120,150,160,0.5)');
      LS.ellipse(c, cx + drift, cy, r, r, cfg.glow > rng.next() ? P.beet : '#7f949b');
    }
    if (cfg.glow > 0) { c.fillStyle = 'rgba(242,194,62,' + (0.1 * cfg.glow).toFixed(2) + ')'; c.fillRect(x, y, w, h); }
    px(c, x, y, w, 1, '#2a3840'); px(c, x, y + h - 1, w, 1, '#2a3840');
    LS.text(c, cfg.label || 'LIVE CELLS', x + 3, y + h - 8, '#6fe0d2', 1);
    LS.text(c, '40X', x + w - 14, y + 3, '#4d6168', 1);
  };
})();
