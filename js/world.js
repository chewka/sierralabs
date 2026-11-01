/* The Lab Sims — world.js
   Tile grid, station table, walkability, A* navigation. */
(function () {
  const LS = window.LS;

  const COLS = 32, ROWS = 20, T = 16;

  /* x,y,w,h in tiles (footprint). anchor = tile the scientist stands on. face = direction they turn. */
  const STATIONS = [
    { id: 'ppe', name: 'PPE Station', short: 'PPE', x: 1, y: 1, w: 2, h: 2, ax: 2, ay: 3, face: 3, desc: 'Lab coats, gloves and safety glasses.' },
    { id: 'bsc', name: 'Biosafety Cabinet', short: 'BSC', x: 4, y: 1, w: 4, h: 3, ax: 5, ay: 4, face: 3, desc: 'Class II cabinet for sterile handling of cultures.' },
    { id: 'bench', name: 'Main Workbench', short: 'Bench', x: 9, y: 1, w: 6, h: 2, ax: 11, ay: 3, face: 3, desc: 'Pipettes, tip boxes, tube racks, flasks and reagent bottles.' },
    { id: 'gelprep', name: 'Hydrogel Prep', short: 'Gel prep', x: 16, y: 1, w: 4, h: 2, ax: 17, ay: 3, face: 3, desc: 'Stirrer, balance and chilled mixing station for hydrogel precursor.' },
    { id: 'printer', name: 'Extrusion Printer', short: 'Printer', x: 21, y: 1, w: 3, h: 2, ax: 22, ay: 3, face: 3, desc: 'Extrusion print head for depositing gel constructs.' },
    { id: 'uv', name: 'UV Curing Enclosure', short: 'UV cure', x: 25, y: 1, w: 3, h: 2, ax: 26, ay: 3, face: 3, desc: 'Interlocked enclosure that photo-crosslinks printed constructs.' },
    { id: 'incubator', name: 'Incubator (30 °C)', short: 'Incubator', x: 28, y: 5, w: 3, h: 3, ax: 27, ay: 6, face: 2, desc: 'Temperature-controlled incubator for growth and induction.' },
    { id: 'shaker', name: 'Orbital Shaker', short: 'Shaker', x: 28, y: 9, w: 3, h: 2, ax: 27, ay: 9, face: 2, desc: 'Orbital platform for shaking flask and plate cultures.' },
    { id: 'reader', name: 'Microplate Reader', short: 'Plate reader', x: 28, y: 12, w: 3, h: 2, ax: 27, ay: 12, face: 2, desc: 'Absorbance, fluorescence and luminescence plate reader.' },
    { id: 'scope', name: 'Microscope & Imaging', short: 'Microscope', x: 28, y: 15, w: 3, h: 2, ax: 27, ay: 15, face: 2, desc: 'Imaging station with camera and live cell view.' },
    { id: 'fridge', name: 'Refrigerator (4 °C)', short: 'Fridge', x: 1, y: 5, w: 2, h: 3, ax: 3, ay: 6, face: 1, desc: 'Media, reagents and working stocks at 4 °C.' },
    { id: 'freezer', name: 'Freezer (−80 °C)', short: 'Freezer', x: 1, y: 9, w: 2, h: 3, ax: 3, ay: 10, face: 1, desc: 'Long-term frozen strain and sample storage.' },
    { id: 'ln2', name: 'Flash-Freeze Dewar', short: 'Dewar', x: 5, y: 9, w: 2, h: 2, ax: 5, ay: 11, face: 3, desc: 'Insulated dewar used for rapid freezing of gel samples.' },
    { id: 'sink', name: 'Sink & Wash-Up', short: 'Sink', x: 1, y: 13, w: 2, h: 2, ax: 3, ay: 13, face: 1, desc: 'Rinsing, washing and bench clean-down.' },
    { id: 'centrifuge', name: 'Centrifuge', short: 'Centrifuge', x: 10, y: 8, w: 4, h: 3, ax: 11, ay: 11, face: 3, desc: 'Benchtop centrifuge for clarifying samples.' },
    { id: 'coffee', name: 'Break Table', short: 'Break table', x: 18, y: 8, w: 4, h: 3, ax: 19, ay: 11, face: 3, desc: 'Coffee, a chair, and somewhere to think.' },
    { id: 'lyo', name: 'Freeze Dryer', short: 'Freeze dryer', x: 1, y: 16, w: 3, h: 3, ax: 2, ay: 15, face: 0, desc: 'Lyophiliser — removes water from frozen samples under vacuum.' },
    { id: 'store', name: 'Sample Storage', short: 'Storage', x: 5, y: 16, w: 3, h: 3, ax: 6, ay: 15, face: 0, desc: 'Sealed, desiccated storage for preserved samples.' },
    { id: 'hplc', name: 'HPLC', short: 'HPLC', x: 9, y: 16, w: 4, h: 3, ax: 10, ay: 15, face: 0, desc: 'High-performance liquid chromatography with diode-array detection.' },
    { id: 'lcms', name: 'LC-MS', short: 'LC-MS', x: 14, y: 16, w: 4, h: 3, ax: 15, ay: 15, face: 0, desc: 'Liquid chromatography coupled to mass spectrometry.' },
    { id: 'desk', name: 'Computer Workstation', short: 'Workstation', x: 20, y: 16, w: 5, h: 3, ax: 22, ay: 15, face: 0, desc: 'Data analysis, plotting and the electronic lab notebook.' },
    { id: 'waste', name: 'Waste Containers', short: 'Waste', x: 26, y: 16, w: 2, h: 3, ax: 26, ay: 15, face: 0, desc: 'Segregated sharps, biological and solvent waste.' },
    /* decor: solid furniture the scientist walks around but never uses */
    { id: 'cart', name: 'Supply Cart', short: 'Cart', x: 4, y: 6, w: 2, h: 2, decor: 1, desc: 'A wheeled trolley of consumables that lives wherever it was last pushed.' },
    { id: 'shelf', name: 'Wire Shelving', short: 'Shelving', x: 23, y: 12, w: 3, h: 2, decor: 1, desc: 'Spare glassware, boxes of tips and a crate nobody has opened in a year.' },
    { id: 'cyl', name: 'Gas Cylinders', short: 'Cylinders', x: 19, y: 4, w: 2, h: 1, decor: 1, desc: 'Chained to the rack, as they should be.' },
  ];

  const byId = {};
  STATIONS.forEach((s) => {
    byId[s.id] = s;
    s.s = { active: false, prog: 0, door: 0, glow: 0, alert: 0, busy: false, offline: 0, screenOff: false, note: '' };
  });

  const grid = new Uint8Array(COLS * ROWS); // 0 walkable, 1 blocked
  function idx(x, y) { return y * COLS + x; }
  function build() {
    grid.fill(0);
    for (let x = 0; x < COLS; x++) { grid[idx(x, 0)] = 1; grid[idx(x, ROWS - 1)] = 1; }
    for (let y = 0; y < ROWS; y++) { grid[idx(0, y)] = 1; grid[idx(COLS - 1, y)] = 1; }
    STATIONS.forEach((s) => {
      for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) {
        if (x >= 0 && y >= 0 && x < COLS && y < ROWS) grid[idx(x, y)] = 1;
      }
    });
  }
  build();

  function walkable(x, y) {
    return x >= 0 && y >= 0 && x < COLS && y < ROWS && grid[idx(x, y)] === 0;
  }
  function stationAt(tx, ty) {
    for (const s of STATIONS) if (tx >= s.x && tx < s.x + s.w && ty >= s.y && ty < s.y + s.h) return s;
    return null;
  }

  /* ---------- A* (4-neighbour) ---------- */
  function path(sx, sy, gx, gy) {
    if (sx === gx && sy === gy) return [];
    if (!walkable(gx, gy)) return null;
    const N = COLS * ROWS;
    const came = new Int32Array(N).fill(-1);
    const g = new Float32Array(N).fill(Infinity);
    const open = [];
    const h = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);
    const s0 = idx(sx, sy);
    g[s0] = 0; open.push([h(sx, sy), s0]);
    const seen = new Uint8Array(N);
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
      const [, cur] = open.splice(bi, 1)[0];
      if (seen[cur]) continue;
      seen[cur] = 1;
      const cx = cur % COLS, cy = (cur / COLS) | 0;
      if (cx === gx && cy === gy) {
        const out = [];
        let n = cur;
        while (n !== s0) { out.push([n % COLS, (n / COLS) | 0]); n = came[n]; }
        return out.reverse();
      }
      const nb = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
      for (const [nx, ny] of nb) {
        if (!walkable(nx, ny)) continue;
        const ni = idx(nx, ny), ng = g[cur] + 1;
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; open.push([ng + h(nx, ny), ni]); }
      }
    }
    return null;
  }

  /* nearest walkable tile to a target, for robustness */
  function nearestFree(tx, ty) {
    if (walkable(tx, ty)) return [tx, ty];
    for (let r = 1; r < 8; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
        if (walkable(tx + dx, ty + dy)) return [tx + dx, ty + dy];
      }
    }
    return [2, 12];
  }

  /* free tiles the cat / assistant can wander to */
  const freeTiles = [];
  for (let y = 1; y < ROWS - 1; y++) for (let x = 1; x < COLS - 1; x++) if (walkable(x, y)) freeTiles.push([x, y]);

  LS.W = {
    COLS, ROWS, T, W: COLS * T, H: ROWS * T,
    stations: STATIONS, byId, grid, walkable, stationAt, path, nearestFree, freeTiles,
    cx(s) { return (s.x + s.w / 2) * T; },
    cy(s) { return (s.y + s.h / 2) * T; },
    anchorPx(s) { return [(s.ax + 0.5) * T, (s.ay + 0.9) * T]; },
  };
})();
