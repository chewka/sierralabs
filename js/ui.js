/* The Lab Sims — ui.js
   Panels, notebook, charts, modals. */
(function () {
  const LS = window.LS, W = LS.W, Sci = LS.Sci;
  const UI = (LS.UI = {});
  const $ = (id) => document.getElementById(id);

  /* Direction-of-finding statements. These are qualitative statements about
     the methodology the workflows are modelled on. No numeric values from any
     source are reproduced anywhere in this simulation. */
  const PUBLISHED = {
    A: [
      'Cells encapsulated in hydrogel can survive drying and storage and be revived.',
      'Protectant-treated gels recover more activity than untreated water controls.',
      'Recovery falls off as the storage period lengthens.',
    ],
    B: [
      'Encapsulated yeast can be reused across repeated production rounds.',
      'Output per round declines gradually as gels are reused.',
      'Gels can be preserved mid-campaign and production resumed after rehydration.',
    ],
    C: [
      'Splitting a pathway across cooperating modules can outperform one overloaded strain.',
      'The ratio between modules governs how much intermediate accumulates.',
      'Encapsulating the consortium allows it to be recovered and reused.',
    ],
    D: [
      'Engineered sensor strains respond to inflammation-associated signals in gut-like media.',
      'Fed and fasted media change both growth and the shape of the response.',
      'This is in-vitro laboratory research, not a demonstrated treatment.',
    ],
  };

  let G = null, portraitCtx = null, chartEl = null, lastLogLen = 0;

  UI.init = function (game) {
    G = game;
    portraitCtx = $('portrait').getContext('2d');
    portraitCtx.imageSmoothingEnabled = false;
    chartEl = $('chart');

    $('btnPlay').onclick = () => G.togglePlay();
    document.querySelectorAll('[data-speed]').forEach((b) => {
      b.onclick = () => { G.setSpeed(parseInt(b.dataset.speed, 10)); };
    });
    $('btnExp').onclick = () => openExp();
    $('btnChaos').onclick = () => $('chaosPanel').classList.toggle('open');
    $('chaosClose').onclick = () => $('chaosPanel').classList.remove('open');
    $('chaosEnable').onchange = (e) => { G.chaosOn = e.target.checked; renderChaos(); };
    $('chaosAuto').onchange = (e) => { G.autoChaos = e.target.checked; };
    $('btnAbout').onclick = () => $('about').classList.add('open');
    $('aboutClose').onclick = () => $('about').classList.remove('open');
    $('reportClose').onclick = () => { $('report').classList.remove('open'); };
    $('expClose').onclick = () => $('expModal').classList.remove('open');
    $('btnSound').onclick = () => { const on = G.toggleSound(); $('btnSound').classList.toggle('on', on); };
    document.querySelectorAll('[data-prov]').forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll('[data-prov]').forEach((x) => x.classList.remove('on'));
        b.classList.add('on'); G.prov = b.dataset.prov; UI.slow();
      };
    });
    $('seedBox').onchange = (e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) G.setSeed(v); };

    renderChaos();
    buildExpModal();

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); G.togglePlay(); }
      if (e.key === '1') G.setSpeed(1);
      if (e.key === '2') G.setSpeed(5);
      if (e.key === '3') G.setSpeed(20);
      if (e.key === '4') G.setSpeed(100);
      if (e.key === '0') G.setSpeed(0);
      if (e.key.toLowerCase() === 'c') $('chaosPanel').classList.toggle('open');
    });
  };

  /* ---------------- per-frame ---------------- */
  UI.frame = function (t) {
    const tm = LS.fmtTime(G.simMin);
    $('clock').textContent = 'Day ' + tm.day + ' · ' + tm.hhmm;
    $('action').textContent = G.action || 'Waiting';
    $('btnPlay').textContent = G.playing ? '❙❙ PAUSE' : '▶ PLAY';
    $('btnPlay').classList.toggle('on', G.playing);
    LS.Actors.bust(portraitCtx, G.agent, t, G.mood());
  };

  /* ---------------- 4 Hz ---------------- */
  UI.slow = function () {
    if (!G) return;
    $('mood').textContent = G.moodLabel();
    $('objective').textContent = G.objective || 'No experiment running';
    $('expName').textContent = G.exp ? G.exp.code + ' · ' + G.exp.title : 'No experiment selected';

    // needs
    const n = G.needs;
    $('needs').innerHTML = [
      bar('Energy', n.energy, '#f0a93b'), bar('Focus', n.focus, '#2fb8a8'),
      bar('Stress', n.stress, '#e2574c'), bar('Curiosity', n.curiosity, '#8a6bd6'),
      bar('Confidence', n.confidence, '#4a8fd4'),
    ].join('');

    // progress
    if (!G.steps.length) $('progress').innerHTML = '<div class="muted">Pick an experiment and press play.</div>';
    else {
      const from = Math.max(0, G.idx - 2);
      $('progress').innerHTML = G.steps.slice(from, from + 9).map((s, i) => {
        const k = from + i;
        const cls = k < G.idx ? 'done' : k === G.idx ? 'active' : '';
        const wait = k === G.idx && s.phase === 'wait'
          ? '<span class="tag">' + LS.fmtDur(Math.max(0, s.left)) + ' left</span>' : '';
        return '<div class="pstep ' + cls + '"><i></i><span>' + s.label + '</span>' + wait + '</div>';
      }).join('') + '<div class="muted sm">Step ' + Math.min(G.idx + 1, G.steps.length) + ' of ' + G.steps.length + '</div>';
    }

    // samples
    $('samples').innerHTML = G.samples.length
      ? G.samples.slice(-6).map((s) =>
        '<div class="row"><code>' + s.id + '</code><span>' + s.label + '</span>' +
        (s.contam ? '<b class="bad">contaminated</b>' : s.idDoubt ? '<b class="warn">identity ?</b>' : '<b class="ok">ok</b>') +
        '</div>').join('')
      : '<div class="muted">No samples yet.</div>';

    // instruments
    const busy = W.stations.filter((s) => s.s.active || s.s.offline || s.s.busy);
    $('instrument').innerHTML = busy.length
      ? busy.map((s) => '<div class="row"><span>' + s.name + '</span><b class="' + (s.s.offline ? 'bad' : s.s.busy ? 'warn' : 'ok') + '">' +
        (s.s.offline ? 'fault' : s.s.busy ? 'occupied' : 'running') + '</b></div>').join('')
      : '<div class="muted">All instruments idle.</div>';

    // results / provenance
    if (G.prov === 'pub') {
      const list = (G.exp && PUBLISHED[G.exp.id]) || [];
      $('results').innerHTML =
        '<div class="muted sm">Direction of finding in the methodology this workflow is modelled on. No numeric values from any source are reproduced here.</div>' +
        (list.length ? list.map((l) => '<div class="row pub"><span>' + l + '</span></div>').join('') : '<div class="muted">Select an experiment.</div>');
    } else {
      $('results').innerHTML = G.results.length
        ? '<div class="muted sm">Every value below is generated by this simulation.</div>' +
          G.results.slice(-7).map((r) =>
            '<div class="row"><span>' + r.label + '</span><b class="' + (r.good ? 'ok' : '') + '">' + r.value + ' ' + (r.unit || '') + '</b></div>' +
            (r.note ? '<div class="muted sm ind">' + r.note + '</div>' : '')).join('')
        : '<div class="muted">No measurements yet.</div>';
    }

    drawChart();
  };

  function bar(label, v, col) {
    return '<div class="need"><span>' + label + '</span><div class="track"><i style="width:' +
      LS.clamp(v, 0, 100).toFixed(0) + '%;background:' + col + '"></i></div><em>' + Math.round(v) + '</em></div>';
  }

  /* ---------------- chart ---------------- */
  function drawChart() {
    const cfg = G.chartCfg;
    if (!cfg) { const p = Sci.prep(chartEl); p.c.fillStyle = '#5c6677'; p.c.textAlign = 'center'; p.c.fillText('live data appears here', p.w / 2, p.h / 2); return; }
    if (cfg.kind === 'bar') Sci.barChart(chartEl, cfg);
    else if (cfg.kind === 'chrom') Sci.chromatogram(chartEl, cfg);
    else Sci.lineChart(chartEl, cfg);
  }
  UI.redrawChart = drawChart;

  /* ---------------- notebook ---------------- */
  UI.pushLog = function () {
    const list = $('bookList');
    while (lastLogLen < G.logs.length) {
      const e = G.logs[lastLogLen++];
      const d = document.createElement('div');
      d.className = 'entry' + (e.kind ? ' ' + e.kind : '');
      d.innerHTML = '<time>' + LS.fmtStamp(e.t) + '</time><span>' + e.text + '</span>';
      list.appendChild(d);
    }
    while (list.children.length > 220) list.removeChild(list.firstChild);
    list.scrollTop = list.scrollHeight;
  };
  UI.resetLog = function () { $('bookList').innerHTML = ''; lastLogLen = 0; };

  /* ---------------- inspector ---------------- */
  UI.inspect = function (obj) {
    const box = $('inspect');
    if (!obj) { box.innerHTML = '<div class="muted">Click the scientist, an instrument or a sample to inspect it.</div>'; return; }
    if (obj.kind === 'scientist') {
      box.innerHTML = '<h4>Dr. Wren Okafor</h4><div class="muted sm">Principal investigator, and the only person who ever refills the tip boxes.</div>' +
        '<div class="row"><span>Doing</span><b>' + G.action + '</b></div>' +
        '<div class="row"><span>Mood</span><b>' + G.moodLabel() + '</b></div>' +
        '<div class="row"><span>Carrying</span><b>' + (G.agent.carry || 'nothing') + '</b></div>';
    } else if (obj.kind === 'station') {
      const s = obj.st;
      box.innerHTML = '<h4>' + s.name + '</h4><div class="muted sm">' + s.desc + '</div>' +
        '<div class="row"><span>State</span><b class="' + (s.s.offline ? 'bad' : s.s.active ? 'ok' : '') + '">' +
        (s.s.offline ? 'fault' : s.s.busy ? 'occupied' : s.s.active ? 'running' : 'idle') + '</b></div>' +
        (s.s.active ? '<div class="row"><span>Progress</span><b>' + Math.round(s.s.prog * 100) + '%</b></div>' : '');
    } else if (obj.kind === 'cat') {
      box.innerHTML = '<h4>Unauthorised cat</h4><div class="muted sm">Not on the equipment inventory. Fictional event.</div>';
    } else if (obj.kind === 'assistant') {
      box.innerHTML = '<h4>Visiting colleague</h4><div class="muted sm">Needed the instrument. Will be done shortly.</div>';
    }
  };

  /* ---------------- chaos panel ---------------- */
  function renderChaos() {
    const mk = (kind) => LS.Chaos.events.filter((e) => e.kind === kind).map((e) =>
      '<button class="chaosBtn" data-ev="' + e.id + '"><b>' + e.name + '</b><span>' + e.blurb + '</span></button>').join('');
    $('chaosPlausible').innerHTML = mk('plausible');
    $('chaosSilly').innerHTML = mk('silly');
    document.querySelectorAll('[data-ev]').forEach((b) => { b.onclick = () => LS.Chaos.fire(b.dataset.ev, G); });
    $('chaosPanel').classList.toggle('disabled', !G.chaosOn);
  }

  /* ---------------- experiment modal ---------------- */
  function buildExpModal() {
    $('expList').innerHTML = LS.Experiments.map((e) => {
      const opts = e.options.map((o) =>
        '<label>' + o.label + '<select data-exp="' + e.id + '" data-opt="' + o.id + '">' +
        o.choices.map((c, i) => '<option value="' + c.id + '"' + (i === o.def ? ' selected' : '') + '>' + c.label + '</option>').join('') +
        '</select></label>').join('');
      return '<div class="expCard" style="--c:' + e.color + '">' +
        '<div class="eh"><b>' + e.code + '</b><h3>' + e.title + '</h3><em>' + e.sub + '</em></div>' +
        '<p>' + e.goal + '</p>' +
        (e.note ? '<p class="warnNote">' + e.note + '</p>' : '') +
        '<div class="opts">' + opts + '</div>' +
        '<button class="start" data-start="' + e.id + '">Run this experiment</button></div>';
    }).join('');
    document.querySelectorAll('[data-start]').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.start;
        const o = {};
        document.querySelectorAll('[data-exp="' + id + '"]').forEach((s) => { o[s.dataset.opt] = s.value; });
        $('expModal').classList.remove('open');
        G.startExperiment(id, o);
      };
    });
  }
  function openExp() { $('expModal').classList.add('open'); }
  UI.openExp = openExp;

  /* ---------------- report card ---------------- */
  UI.report = function (card) {
    $('reportTitle').textContent = card.verdict;
    $('reportHead').textContent = card.headline;
    $('reportBody').innerHTML = card.lines.map((l) => '<li>' + l + '</li>').join('');
    $('reportStamp').textContent = card.good ? 'RUN ACCEPTED' : 'RUN FLAGGED';
    $('reportStamp').className = card.good ? 'stamp good' : 'stamp bad';
    $('reportFoot').textContent = 'All figures above were generated by this simulation. They are not measurements and not published results.';
    $('report').classList.add('open');
  };

  UI.banner = function (text, kind) {
    const b = $('banner');
    b.textContent = text;
    b.className = 'show ' + (kind || '');
    clearTimeout(b._t);
    b._t = setTimeout(() => { b.className = ''; }, 2600);
  };

  UI.setSpeedUI = function (sp) {
    document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', parseInt(b.dataset.speed, 10) === sp));
  };
})();
