/* The Lab Sims — main.js
   Simulation clock, autonomous agent, task scheduler, render loop. */
(function () {
  const LS = window.LS, W = LS.W, Actors = LS.Actors, Art = LS.Art, UI = LS.UI;
  const T = 16;

  /* ---------------- game state ---------------- */
  const G = {
    seed: 1337, rng: new LS.Rng(1337),
    simMin: 8 * 60, speed: 1, playing: false, prov: 'sim',
    exp: null, opts: {}, steps: [], idx: 0, step: null,
    pending: [], task: null, timers: [],
    flags: {}, store: {}, samples: [], results: [], logs: [], sampleN: 0,
    chartCfg: null, microCfg: null, microT: 0,
    needs: { energy: 88, focus: 82, stress: 10, curiosity: 72, confidence: 62 },
    chaosOn: true, autoChaos: false, nextAuto: 0,
    action: 'Waiting to start', objective: '', madT: 0, celebrate: null,
    montage: 0, soundOn: false, running: false,
  };
  window.G = G;

  G.agent = Actors.make(11, 13);
  G.agent.name = 'Dr. Wren Okafor';
  G.cat = null; G.assistant = null;

  /* ---------------- helpers exposed to experiments / chaos ---------------- */
  G.log = function (text, kind) {
    G.logs.push({ t: G.simMin, text, kind });
    if (G.logs.length > 400) G.logs.shift();
  };
  G.chart = function (cfg) { G.chartCfg = cfg; };
  G.addResult = function (r) {
    G.results.push(r);
    G.needs.curiosity = LS.clamp(G.needs.curiosity + 3, 0, 100);
    if (r.good) G.needs.confidence = LS.clamp(G.needs.confidence + 5, 0, 100);
  };
  G.sample = function (label) {
    G.sampleN++;
    const s = { id: 'SMP-' + (G.exp ? G.exp.id : 'X') + '-' + String(G.sampleN).padStart(3, '0'), label, contam: !!G.flags.contaminated, idDoubt: !!G.flags.identityUncertain };
    G.samples.push(s); return s;
  };
  G.say = function (text) { Actors.say(G.agent, text, 4); };
  G.micro = function (cfg) { G.microCfg = cfg; G.microT = 7; };
  G.stress = function (n) { G.needs.stress = LS.clamp(G.needs.stress + n, 0, 100); G.needs.focus = LS.clamp(G.needs.focus - n * 0.35, 0, 100); };
  G.after = function (mins, fn) { G.timers.push({ at: G.simMin + mins, fn }); };
  G.mood = function () {
    if (G.needs.stress > 62) return 'bad';
    if (G.needs.confidence > 72 && G.needs.stress < 40) return 'good';
    return 'ok';
  };
  G.moodLabel = function () {
    const n = G.needs;
    if (n.stress > 70) return 'Frazzled';
    if (n.energy < 32) return 'Running on fumes';
    if (n.stress > 50) return 'Tense';
    if (n.confidence > 75 && n.stress < 35) return 'Buoyant';
    if (n.focus > 70) return 'Focused';
    if (n.curiosity > 80) return 'Curious';
    return 'Steady';
  };
  G.finish = function (card) {
    G.running = false;
    G.celebrate = { t: 3.4, good: card.good };
    G.log(card.good ? 'Run complete — ' + card.headline : 'Run complete with caveats — ' + card.headline, card.good ? 'good' : 'warn');
    G.needs.confidence = LS.clamp(G.needs.confidence + (card.good ? 14 : -8), 0, 100);
    G.playing = false;
    UI.report(card);
  };
  G.interrupt = function (tasks) {
    if (G.task && G.task.interruptible !== false && !G.task.priority) {
      // step work gets picked back up; odd jobs are simply dropped
      if (G.task.isStep) G.pending.unshift(Object.assign({}, G.task, { restarted: true }));
      G.task = null;
    }
    tasks.slice().reverse().forEach((t) => G.pending.unshift(Object.assign({ priority: true, dur: 10, anim: 'load' }, t)));
  };

  /* ---------------- cat & assistant ---------------- */
  G.spawnCat = function () {
    if (!G.cat) G.cat = Actors.makeCat(8, 13);
    G.cat.active = true; G.cat.until = G.simMin + 600;
    G.cat.bubble = 'mrrp'; G.cat.bubbleT = 2.5;
    catWander();
    G.after(60, () => {
      if (!G.cat || !G.cat.active) return;
      const st = W.byId[['bench', 'desk', 'reader', 'centrifuge'][G.rng.int(0, 3)]];
      st.s.busy = true; G.cat.perch = st;
      G.log('FICTIONAL EVENT — the cat has settled on the ' + st.short.toLowerCase() + '.');
      G.interrupt([{
        label: 'Shoo the cat off the ' + st.short.toLowerCase(), station: st.id, anim: 'open', dur: 9, ignoreBlocked: true,
        say: 'Off. Off! That is calibrated.',
        note: 'Cat removed from the ' + st.short.toLowerCase() + '. Surface wiped down.',
        fx: () => {
          st.s.busy = false;
          if (G.cat) { G.cat.perch = null; G.cat.active = false; }
          G.needs.stress = LS.clamp(G.needs.stress - 5, 0, 100);
          G.needs.confidence = LS.clamp(G.needs.confidence + 4, 0, 100);
        },
      }]);
    });
  };
  function catWander() {
    if (!G.cat || !G.cat.active || G.cat.perch) return;
    const t = W.freeTiles[G.rng.int(0, W.freeTiles.length - 1)];
    const p = W.path(Math.round((G.cat.x - T / 2) / T), Math.round((G.cat.y - T * 0.9) / T), t[0], t[1]);
    if (p && p.length) { G.cat.path = p; G.cat.wp = 0; }
  }
  G.spawnAssistant = function (st, mins) {
    if (!G.assistant) G.assistant = Actors.makeAssistant(8, 13);
    const a = G.assistant;
    a.active = true; a.x = 1.5 * T; a.y = 4.4 * T;
    Actors.goto(a, st.ax, st.ay);
    a.target = st; a.until = G.simMin + mins; a.pose = 'walk';
    st.s.busy = true;
    G.after(mins, () => {
      st.s.busy = false;
      if (G.assistant) { G.assistant.leaving = true; Actors.goto(G.assistant, 2, 4); }
      G.log('The ' + st.short.toLowerCase() + ' is free again.');
    });
  };

  /* ---------------- experiment control ---------------- */
  G.startExperiment = function (id, opts) {
    const e = LS.ExpById[id];
    if (!e) return;
    G.exp = e; G.opts = opts || {};
    e.options.forEach((o) => { if (!G.opts[o.id]) G.opts[o.id] = o.choices[o.def].id; });
    G.rng = new LS.Rng(G.seed);
    G.flags = {}; G.store = {}; G.samples = []; G.results = []; G.sampleN = 0;
    G.chartCfg = null; G.microCfg = null; G.pending = []; G.task = null; G.timers = [];
    G.idx = 0; G.step = null; G.running = true;
    W.stations.forEach((s) => { s.s.active = false; s.s.prog = 0; s.s.offline = 0; s.s.busy = false; s.s.alert = 0; s.s.door = 0; s.s.screenOff = false; });
    G.steps = e.build(G.opts, G);
    G.steps.forEach((s) => { s.phase = null; s.left = 0; s.total = s.wait || 0; });
    UI.resetLog();
    G.logs = [];
    G.log('Experiment started — ' + e.code + ': ' + e.title + '.');
    e.options.forEach((o) => {
      const c = o.choices.find((x) => x.id === G.opts[o.id]);
      if (c) G.log(o.label + ': ' + c.label + '.');
    });
    G.objective = G.steps[0] ? G.steps[0].label : '';
    UI.pushLog(); UI.slow();
    UI.banner(e.code + ' loaded — press play', '');
  };

  G.setSpeed = function (s) { G.speed = s; UI.setSpeedUI(s); if (s > 0 && !G.playing) G.playing = true; };
  G.togglePlay = function () {
    G.playing = !G.playing;
    if (G.playing && G.speed === 0) G.setSpeed(1);
    if (G.playing && !G.running && G.steps.length && G.idx >= G.steps.length) G.startExperiment(G.exp.id, G.opts);
    if (G.playing && !G.running) G.running = true;
  };
  G.setSeed = function (v) { G.seed = v; G.rng = new LS.Rng(v); UI.banner('Seed set to ' + v + ' — restart the experiment to use it'); };

  /* ---------------- scheduler ---------------- */
  function durOf(s) {
    let d = s.dur;
    if (G.flags.delivery && (s.station === 'gelprep' || s.station === 'bench')) d *= 1.4;
    if (G.needs.focus < 40) d *= 1.12;
    return d;
  }

  function startStep() {
    const s = G.steps[G.idx];
    if (!s) { endExperiment(); return; }
    G.step = s; s.phase = 'act';
    G.objective = s.label;
    G.pending.push({
      label: s.label, station: s.station, anim: s.anim, dur: durOf(s), carry: s.carry,
      note: s.note, isStep: true,
      onDone() {
        if (s.fx) s.fx(G);
        if (s.wait) {
          s.phase = 'wait'; s.left = s.wait; s.total = s.wait;
          if (s.equip !== 0) { const st = W.byId[s.station]; if (st) { st.s.active = true; st.s.prog = 0; } }
          if (s.montage) G.montage = 1;
        } else completeStep(s);
      },
    });
  }
  function completeStep(s) {
    const st = W.byId[s.station];
    if (st) { st.s.active = false; st.s.prog = 0; }
    G.montage = 0;
    G.idx++;
    G.step = null;
    if (G.idx >= G.steps.length) endExperiment();
    else if (G.steps[G.idx]) G.objective = G.steps[G.idx].label;
  }
  function endExperiment() {
    if (!G.running) return;
    G.running = false;
    G.objective = 'Experiment finished';
    G.log('Experiment finished.');
  }

  /* ---------------- filler behaviour ---------------- */
  const FILLERS = [
    { w: 3, label: 'Update the lab notebook', station: 'desk', anim: 'type', dur: 14, note: 'Notebook brought up to date.' },
    { w: 2, label: 'Clean down the bench', station: 'bench', anim: 'clean', dur: 12, note: 'Bench cleaned down between steps.' },
    { w: 2, label: 'Wash up glassware', station: 'sink', anim: 'clean', dur: 11 },
    { w: 2, label: 'Check the incubator', station: 'incubator', anim: 'open', dur: 6 },
    { w: 1, label: 'Tidy the waste station', station: 'waste', anim: 'open', dur: 8 },
    { w: 2, label: 'Check on the instruments', station: 'hplc', anim: 'inspect', dur: 9 },
    { w: 1, label: 'Restock pipette tips', station: 'bench', anim: 'load', dur: 9 },
    { w: 1, label: 'Look down the microscope', station: 'scope', anim: 'inspect', dur: 11 },
    { w: 1, label: 'Reorganise sample storage', station: 'store', anim: 'open', dur: 10 },
    { w: 1, label: 'Check the shaker speed', station: 'shaker', anim: 'inspect', dur: 7 },
  ];
  const THOUGHTS = {
    idle: ['These gels look promising!', 'Where did I put that tube rack?', 'Note to self: order more tips.', 'Forty-eight hours is a long time.', 'I should write this up properly.', 'Smells like medium in here.'],
    tired: ['I need a coffee.', 'Long day already.', 'One more step, then a sit down.'],
    stressed: ['Breathe. It is only a rerun.', 'Fine. Totally fine.', 'The controls will save me.'],
    happy: ['Oh, that is lovely data.', 'Look at that curve!', 'Worth the wait.'],
  };

  function makeFiller() {
    const n = G.needs;
    if (n.energy < 38) return { label: 'Get a coffee', station: 'coffee', anim: 'coffee', dur: 13, filler: true, fx: () => { n.energy = LS.clamp(n.energy + 26, 0, 100); n.stress = LS.clamp(n.stress - 6, 0, 100); }, say: 'Coffee. Then science.' };
    if (n.stress > 64) return { label: 'Take a short break', station: 'coffee', anim: 'sit', dur: 18, filler: true, fx: () => { n.stress = LS.clamp(n.stress - 22, 0, 100); n.focus = LS.clamp(n.focus + 12, 0, 100); }, say: 'Five minutes.' };
    let tot = 0; FILLERS.forEach((f) => (tot += f.w));
    let r = G.rng.next() * tot;
    for (const f of FILLERS) { r -= f.w; if (r <= 0) return Object.assign({ filler: true }, f); }
    return Object.assign({ filler: true }, FILLERS[0]);
  }

  /* ---------------- agent ---------------- */
  function walkSpeed() { return 32 * Math.sqrt(Math.max(1, G.speed)); }

  function pickTask() {
    for (let i = 0; i < G.pending.length; i++) {
      const t = G.pending[i];
      if (t.retryAt && t.retryAt > G.simMin) continue;
      G.pending.splice(i, 1);
      beginTask(t);
      return;
    }
    // nothing runnable right now: find something useful rather than freeze
    if (G.running && G.step && G.step.phase === 'wait') beginTask(makeFiller());
    else if (G.running && !G.step) startStep();
    else if (G.pending.length) beginTask(makeFiller());
  }

  function beginTask(t) {
    G.task = t; t.el = 0; t.er = 0; t.phase = 'go';
    const st = W.byId[t.station];
    G.agent.carry = t.carry || null;
    if (st) Actors.goto(G.agent, st.ax, st.ay);
    G.action = 'Walking to the ' + (st ? st.short.toLowerCase() : 'bench');
  }

  function finishTask() {
    const t = G.task;
    const st = W.byId[t.station];
    if (st) st.s.prog = 0;
    G.agent.carry = null;
    if (t.note && (!t.filler || G.rng.chance(0.3)) && !G.montage) G.log(t.note);
    if (t.fx) t.fx(G);
    if (t.onDone) t.onDone();
    G.task = null;
    G.needs.energy = LS.clamp(G.needs.energy - t.dur * 0.02, 0, 100);
  }

  function agentUpdate(dtReal, dtSim) {
    const a = G.agent;
    if (a.bubbleT > 0) a.bubbleT -= dtReal;
    if (!G.task) pickTask();
    if (!G.task) { a.pose = a.walking ? 'walk' : 'idle'; Actors.step(a, dtReal, walkSpeed()); G.action = G.running ? 'Thinking about the next step' : 'Idle'; return; }
    const t = G.task, st = W.byId[t.station];

    if (t.phase === 'go') {
      Actors.step(a, dtReal, walkSpeed());
      if (Actors.atGoal(a)) {
        // A repair task is the thing that clears the blockage, so it must be
        // allowed through it. Everything else waits — but only so many times,
        // so nothing can wedge the lab permanently.
        const blocked = st && (st.s.busy || st.s.offline > 0);
        if (blocked && !t.ignoreBlocked && (t.tries || 0) < 4) {
          t.tries = (t.tries || 0) + 1;
          t.retryAt = G.simMin + 25;
          G.pending.push(t); G.task = null;
          Actors.say(a, st.s.busy ? 'Someone is on the ' + st.short.toLowerCase() + '.' : st.short + ' is down.', 3);
          return;
        }
        t.phase = 'act'; a.pose = t.anim || 'load';
        if (st) a.dir = st.face;
        if (t.say) Actors.say(a, t.say, 3.6);
        G.action = t.label;
      }
      return;
    }

    // acting
    a.pose = t.anim || 'load';
    t.el += dtSim; t.er += dtReal;
    if (st) {
      st.s.prog = LS.clamp(t.el / t.dur, 0, 1);
      const wantsDoor = t.anim === 'open' || t.anim === 'load';
      st.s.door = LS.clamp(st.s.door + (wantsDoor ? 3 : -3) * dtReal, 0, 1);
    }
    if (t.el >= t.dur && t.er >= 0.34) finishTask();
  }

  /* ---------------- step driver ---------------- */
  function stepDriver(dtSim, dtReal) {
    const s = G.step;
    if (!s) return;
    if (s.phase !== 'wait') return;
    const st = W.byId[s.station];
    if (st && st.s.offline > 0) { s.stalled = true; return; }
    s.stalled = false;
    s.left -= dtSim;
    if (st) st.s.prog = LS.clamp(1 - s.left / s.total, 0, 1);
    s._acc = (s._acc || 0) + dtReal;
    if (s.wtick && s._acc > 0.22) { s._acc = 0; try { s.wtick(G, LS.clamp(1 - s.left / s.total, 0, 1)); } catch (e) { } }
    if (s.left <= 0) {
      if (s.wtick) { try { s.wtick(G, 1); } catch (e) { } }
      if (s.waitNote) G.log(s.waitNote);
      if (s.wfx) { try { s.wfx(G); } catch (e) { console.error(e); } }
      if (st) { st.s.active = false; st.s.prog = 0; }
      beep();
      completeStep(s);
    }
  }

  /* ---------------- needs & ambience ---------------- */
  function needsUpdate(dtSim) {
    const n = G.needs;
    n.energy = LS.clamp(n.energy - dtSim * 0.028, 0, 100);
    n.stress = LS.clamp(n.stress - dtSim * 0.012 + (G.flags.contaminated ? dtSim * 0.004 : 0), 0, 100);
    n.focus = LS.clamp(n.focus + (n.energy > 55 ? dtSim * 0.004 : -dtSim * 0.012) - n.stress * dtSim * 0.00012, 0, 100);
    n.curiosity = LS.clamp(n.curiosity - dtSim * 0.002, 10, 100);
  }

  let thoughtT = 0;
  function thoughts(dtReal) {
    thoughtT -= dtReal;
    if (thoughtT > 0 || G.agent.bubbleT > 0 || !G.playing) return;
    thoughtT = 9 + G.rng.next() * 12;
    const n = G.needs;
    let pool = THOUGHTS.idle;
    if (n.energy < 40) pool = THOUGHTS.tired;
    else if (n.stress > 58) pool = THOUGHTS.stressed;
    else if (n.confidence > 76) pool = THOUGHTS.happy;
    if (G.rng.chance(0.75)) Actors.say(G.agent, pool[G.rng.int(0, pool.length - 1)], 3.6);
  }

  /* ---------------- extras ---------------- */
  function extrasUpdate(dtReal, dtSim) {
    // timers
    for (let i = G.timers.length - 1; i >= 0; i--) {
      if (G.simMin >= G.timers[i].at) { const f = G.timers[i].fn; G.timers.splice(i, 1); try { f(); } catch (e) { } }
    }
    // cat
    const k = G.cat;
    if (k && k.active) {
      k.phase += dtReal;
      if (k.bubbleT > 0) k.bubbleT -= dtReal;
      if (k.perch) { k.x = (k.perch.x + k.perch.w / 2) * T; k.y = (k.perch.y + k.perch.h) * T - 2; }
      else if (k.path) {
        let budget = 34 * dtReal;
        while (budget > 0 && k.path) {
          const [nx, ny] = k.path[k.wp];
          const tx = (nx + 0.5) * T, ty = (ny + 0.9) * T;
          const dx = tx - k.x, dy = ty - k.y, d = Math.hypot(dx, dy);
          if (d <= budget) { k.x = tx; k.y = ty; budget -= d; k.wp++; if (k.wp >= k.path.length) { k.path = null; } }
          else { k.x += (dx / d) * budget; k.y += (dy / d) * budget; budget = 0; k.dir = dx > 0 ? 2 : 1; }
        }
      } else if (G.rng.chance(dtReal * 0.8)) catWander();
    }
    // assistant
    const as = G.assistant;
    if (as && as.active) {
      Actors.step(as, dtReal, 20);
      as.pose = as.walking ? 'walk' : as.leaving ? 'walk' : 'type';
      if (as.leaving && !as.walking) { as.active = false; as.leaving = false; }
      if (!as.walking && as.target) as.dir = as.target.face;
    }
    if (G.madT > 0) G.madT -= dtReal;
    if (G.microT > 0) G.microT -= dtReal;
    if (G.celebrate) { G.celebrate.t -= dtReal; if (G.celebrate.t <= 0) G.celebrate = null; }
    // auto chaos
    if (G.autoChaos && G.chaosOn && G.playing) {
      G.nextAuto -= dtSim;
      if (G.nextAuto <= 0) { G.nextAuto = 600 + G.rng.next() * 1400; LS.Chaos.randomPlausible(G); }
    }
  }

  /* ---------------- sound ---------------- */
  let actx = null, hum = null;
  G.toggleSound = function () {
    G.soundOn = !G.soundOn;
    if (G.soundOn) {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        if (!hum) {
          hum = actx.createGain(); hum.gain.value = 0.015; hum.connect(actx.destination);
          const o1 = actx.createOscillator(); o1.type = 'sine'; o1.frequency.value = 58; o1.connect(hum); o1.start();
          const o2 = actx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 87; const g2 = actx.createGain(); g2.gain.value = 0.4; o2.connect(g2); g2.connect(hum); o2.start();
        } else hum.gain.value = 0.015;
      } catch (e) { G.soundOn = false; }
    } else if (hum) hum.gain.value = 0;
    return G.soundOn;
  };
  function beep() {
    if (!G.soundOn || !actx) return;
    try {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'square'; o.frequency.value = 880; g.gain.value = 0.0001;
      o.connect(g); g.connect(actx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.03, actx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.22);
      o.stop(actx.currentTime + 0.24);
    } catch (e) { }
  }

  /* ---------------- rate ---------------- */
  function rate() {
    if (!G.playing || G.speed === 0) return 0;
    const s = G.step;
    if (s && s.phase === 'wait' && !s.stalled) {
      if (s.montage) return (s.total / s.montage) * Math.max(1, Math.sqrt(G.speed));
      // long unattended runs play as a time-lapse so waiting stays watchable
      const boost = LS.clamp(s.total / 240, 1, 12);
      return 2 * G.speed * boost;
    }
    // hands-on work never blurs past the point of being watchable
    return Math.min(2 * G.speed, 4 + G.speed * 0.9);
  }

  /* ---------------- render ---------------- */
  const cv = document.getElementById('stage');
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  function render(t) {
    Art.drawStatic(ctx);
    const items = [];
    W.stations.forEach((st) => items.push({ y: (st.y + st.h) * T, f: () => Art.drawStation(ctx, st, t) }));
    items.push({ y: G.agent.y + 0.5, f: () => Actors.draw(ctx, G.agent, t) });
    if (G.cat && G.cat.active) items.push({ y: G.cat.y + 0.4, f: () => Actors.drawCat(ctx, G.cat, t) });
    if (G.assistant && G.assistant.active) items.push({ y: G.assistant.y + 0.3, f: () => Actors.draw(ctx, G.assistant, t) });
    items.sort((a, b) => a.y - b.y).forEach((i) => i.f());

    Art.lighting(ctx, G.simMin);

    if (G.microT > 0 && G.microCfg) Art.microInset(ctx, t, G.microCfg);

    // montage overlay
    if (G.montage && G.step && G.step.phase === 'wait') {
      ctx.fillStyle = 'rgba(16,22,34,0.45)'; ctx.fillRect(0, W.H / 2 - 20, W.W, 40);
      LS.textC(ctx, 'TIME PASSES IN STORAGE', W.W / 2, W.H / 2 - 12, '#e6edf5', 2);
      const pct = Math.round(LS.clamp(1 - G.step.left / G.step.total, 0, 1) * 100);
      LS.textC(ctx, pct + '%', W.W / 2, W.H / 2 + 6, '#f0a93b', 1);
    }

    // mad science flash
    if (G.madT > 0) {
      const a = Math.max(0, Math.sin(G.madT * 11)) * 0.45;
      ctx.fillStyle = 'rgba(170,140,255,' + a.toFixed(3) + ')';
      ctx.fillRect(0, 0, W.W, W.H);
      const r = new LS.Rng(Math.floor(G.madT * 9));
      for (let i = 0; i < 5; i++) {
        let x = r.int(20, W.W - 20), y = 0;
        ctx.fillStyle = '#efe6ff';
        while (y < W.H * 0.6) { ctx.fillRect(x, y, 1, 4); x += r.int(-2, 2); y += 4; }
      }
    }

    // celebration / slump sparkles
    if (G.celebrate) {
      const a = G.agent, n = G.celebrate.good ? 14 : 5;
      const r = new LS.Rng(42);
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * Math.PI * 2 + (3.4 - G.celebrate.t) * 2;
        const rad = (3.4 - G.celebrate.t) * 16 + 6;
        LS.px(ctx, a.x + Math.cos(ang) * rad, a.y - 16 + Math.sin(ang) * rad * 0.6, 2, 2, G.celebrate.good ? ['#f0a93b', '#2fb8a8', '#e06b8b'][i % 3] : '#6b7480');
      }
    }

    // chaos flash banner inside the scene
    if (G.lastChaos && G.lastChaos.t > 0) {
      G.lastChaos.t -= 1 / 60;
      const txt = (G.lastChaos.kind === 'silly' ? 'FICTIONAL: ' : 'CHAOS: ') + G.lastChaos.name;
      const w = LS.textW(txt, 1) + 8;
      ctx.fillStyle = 'rgba(20,24,34,0.85)'; ctx.fillRect(W.W / 2 - w / 2, 20, w, 11);
      LS.textC(ctx, txt, W.W / 2, 23, G.lastChaos.kind === 'silly' ? '#b79bf0' : '#f0a93b', 1);
    }
  }

  /* ---------------- loop ---------------- */
  let last = performance.now(), slowAcc = 0, logAcc = 0, tt = 0;
  function loop(now) {
    let dtReal = Math.min(0.05, (now - last) / 1000);
    last = now; tt += dtReal;
    const r = rate();
    const dtSim = r * dtReal;
    if (G.playing) {
      G.simMin += dtSim;
      needsUpdate(dtSim);
      stepDriver(dtSim, dtReal);
      agentUpdate(dtReal, dtSim);
      extrasUpdate(dtReal, dtSim);
      thoughts(dtReal);
    } else {
      Actors.step(G.agent, dtReal, 0);
      G.agent.phase += dtReal;
      extrasUpdate(dtReal, 0);
    }
    render(tt);
    UI.frame(tt);
    slowAcc += dtReal; logAcc += dtReal;
    if (slowAcc > 0.25) { slowAcc = 0; UI.slow(); }
    if (logAcc > 0.4) { logAcc = 0; UI.pushLog(); }
    requestAnimationFrame(loop);
  }

  /* ---------------- click to inspect ---------------- */
  cv.addEventListener('click', (e) => {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W.W;
    const y = ((e.clientY - r.top) / r.height) * W.H;
    if (Math.hypot(x - G.agent.x, y - (G.agent.y - 12)) < 14) return UI.inspect({ kind: 'scientist' });
    if (G.cat && G.cat.active && Math.hypot(x - G.cat.x, y - (G.cat.y - 6)) < 12) return UI.inspect({ kind: 'cat' });
    if (G.assistant && G.assistant.active && Math.hypot(x - G.assistant.x, y - (G.assistant.y - 12)) < 14) return UI.inspect({ kind: 'assistant' });
    const st = W.stationAt(Math.floor(x / T), Math.floor(y / T));
    UI.inspect(st ? { kind: 'station', st } : null);
  });

  /* ---------------- boot ---------------- */
  Art.initStatic();
  UI.init(G);
  UI.setSpeedUI(1);
  UI.inspect(null);
  G.startExperiment('A', {});
  G.playing = false;
  G.log('Lab ready. Press play and the scientist will take it from here.');
  UI.pushLog();
  requestAnimationFrame(loop);
})();
