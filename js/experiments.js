/* The Lab Sims — experiments.js
   Four workflows, each a data-driven list of tasks the scientist executes on
   their own. Durations, task order and dependencies are the gameplay model;
   all measured-looking values come from science.js and are simulated. */
(function () {
  const LS = window.LS, Sci = LS.Sci;

  /* step schema -----------------------------------------------------------
     { label, station, anim, dur, carry, note,
       wait, waitNote, timelapse, equip, wtick(G,frac), fx(G), wfx(G) }      */

  const S = (o) => Object.assign({ anim: 'load', dur: 10 }, o);

  /* =======================================================================
     A — Long-term hydrogel preservation
     ======================================================================= */
  const A = {
    id: 'A', code: 'EXP-A', title: 'Long-Term Hydrogel Preservation',
    sub: 'Chapter 2 workflow', color: '#8a6bd6',
    goal: 'Encapsulate engineered yeast in hydrogel, preserve the gels by lyophilisation, then rehydrate and measure how much activity comes back.',
    options: [
      { id: 'prot', label: 'Protectant', choices: Sci.PROTECTANTS.map((p) => ({ id: p.id, label: p.label })), def: 3 },
      { id: 'stor', label: 'Storage period', choices: Sci.STORAGE.map((p) => ({ id: p.id, label: p.label })), def: 1 },
    ],
    build(o, G) {
      const prot = Sci.PROTECTANTS.find((p) => p.id === o.prot);
      const stor = Sci.STORAGE.find((p) => p.id === o.stor);
      return [
        S({ label: 'Gown up and check the bench', station: 'ppe', anim: 'open', dur: 5, note: 'Gowned up; bench and cabinet checked before starting.' }),
        S({ label: 'Retrieve engineered yeast stock', station: 'fridge', anim: 'open', dur: 9, carry: 'rack', note: 'Collected the engineered yeast working stock from the 4 °C refrigerator.', fx: (G) => { G.sample('Yeast working stock'); } }),
        S({ label: 'Prepare F127-BUM hydrogel precursor', station: 'gelprep', anim: 'pour', dur: 32, equip: 1, note: 'Hydrogel precursor prepared and held chilled on the prep station.' }),
        S({ label: 'Combine cells with the precursor', station: 'bsc', anim: 'pipette', dur: 19, equip: 1, carry: 'rack', note: 'Cells combined with the hydrogel precursor inside the cabinet.', fx: (G) => { G.sample('Cell–gel mixture'); G.say('Nice and homogeneous.'); } }),
        S({ label: 'Hand-extrude the gel constructs', station: 'printer', anim: 'load', dur: 24, equip: 1, note: 'Constructs hand-extruded onto the print bed.' }),
        S({ label: 'UV-cure the constructs', station: 'uv', anim: 'load', dur: 6, wait: 5, equip: 1, note: 'Constructs loaded into the UV enclosure.', waitNote: 'Photo-crosslinking finished; gels handle cleanly.', wfx: (G) => { G.sample('Cured gels (n=12)'); } }),
        S({ label: 'Transfer gels into culture medium', station: 'bench', anim: 'pipette', dur: 13, carry: 'gel', note: 'Gels transferred into fresh culture medium.' }),
        S({
          label: 'Grow gels — 48 h at 30 °C', station: 'incubator', anim: 'open', dur: 7, wait: 2880, equip: 1, carry: 'gel',
          note: 'Gels loaded into the 30 °C incubator for a 48 h growth phase.',
          waitNote: '48 h growth complete. Gels look evenly colonised.',
          wtick: (G, f) => { G.store.growth = Sci.growth(48 * f, !G.flags.tempDrift, new LS.Rng(G.seed + 11), Math.max(2, Math.round(20 * f))); G.chart({ kind: 'line', title: 'Gel growth (simulated OD-equivalent)', xlab: 'h', series: [{ name: 'gel density', pts: G.store.growth }] }); },
          wfx: (G) => { G.micro({ density: 0.85, glow: 0.45, label: 'ENCAPSULATED CELLS' }); },
        }),
        S({ label: 'Collect supernatant sample', station: 'incubator', anim: 'pipette', dur: 11, carry: 'rack', note: 'Supernatant sampled from each gel culture.', fx: (G) => { G.sample('Pre-preservation supernatant'); } }),
        S({ label: 'Clarify the sample', station: 'centrifuge', anim: 'load', dur: 5, wait: 11, equip: 1, note: 'Samples spun down to clear cells and debris.', waitNote: 'Spin finished; clear supernatant recovered.' }),
        S({
          label: 'Read pre-preservation fluorescence', station: 'reader', anim: 'load', dur: 15, wait: 7, equip: 1, carry: 'plate',
          note: 'Plate loaded for the pre-preservation betaxanthin fluorescence read.',
          waitNote: 'Baseline fluorescence recorded.',
          wfx: (G) => {
            const base = G.rng.norm(10400, 650);
            G.store.pre = base;
            G.addResult({ label: 'Pre-preservation fluorescence', value: Math.round(base), unit: 'AU', note: 'baseline, simulated' });
            G.chart({ kind: 'bar', title: 'Betaxanthin fluorescence (simulated)', bars: [{ label: 'pre', v: base, color: '#f0a93b' }] });
            G.say('Good strong baseline.');
          },
        }),
        S({ label: 'Rinse gels and assign protectant', station: 'sink', anim: 'clean', dur: 21, note: 'Gels rinsed; protectant condition assigned: ' + prot.label + '.', fx: (G) => { G.sample('Gels in ' + prot.label); } }),
        S({ label: 'Equilibrate in protectant', station: 'bench', anim: 'wait', dur: 5, wait: 60, note: 'Gels left to equilibrate in protectant solution.', waitNote: 'One-hour equilibration complete.' }),
        S({ label: 'Flash-freeze the gels', station: 'ln2', anim: 'load', dur: 7, wait: 10, equip: 1, carry: 'gel', note: 'Gels transferred to the dewar for rapid freezing.', waitNote: 'Gels fully frozen and ready for the dryer.' }),
        S({ label: 'Load the freeze dryer', station: 'lyo', anim: 'load', dur: 9, wait: 1440, equip: 1, carry: 'gel', note: 'Frozen gels loaded into the freeze dryer.', waitNote: 'Lyophilisation cycle finished after ~24 h.', wfx: (G) => G.say('Dry as a biscuit.') }),
        S({ label: 'Seal gels with desiccant', station: 'store', anim: 'load', dur: 13, carry: 'gel', note: 'Preserved gels sealed into desiccated storage.', fx: (G) => { G.sample('Preserved gels (sealed)'); } }),
        S({
          label: 'Storage period — ' + stor.label, station: 'store', anim: 'wait', dur: 3, wait: stor.months * 43200, montage: 11, equip: 1,
          note: 'Storage period started: ' + stor.label + '.',
          waitNote: 'Storage period complete (' + stor.label + ').',
        }),
        S({ label: 'Retrieve and rehydrate a gel', station: 'store', anim: 'open', dur: 15, carry: 'gel', note: 'One stored gel retrieved and rehydrated in fresh growth medium.', fx: (G) => { G.sample('Rehydrated gel'); G.micro({ density: 0.35, glow: 0.08, label: 'JUST REHYDRATED' }); } }),
        S({
          label: 'Regrow and monitor', station: 'incubator', anim: 'open', dur: 7, wait: 5760, equip: 1, carry: 'gel',
          note: 'Rehydrated gel returned to the incubator to regrow.',
          waitNote: 'Regrowth monitoring finished after 4 days.',
          wtick: (G, f) => {
            const r = new LS.Rng(G.seed + 23);
            const pts = [];
            const rec = G.store.recPreview || (G.store.recPreview = Sci.recovery(o.prot, o.stor, G.flags, new LS.Rng(G.seed + 5)));
            const n = Math.max(2, Math.round(16 * f));
            for (let i = 0; i <= n; i++) { const d = (4 * f * i) / n; pts.push([d, G.store.pre * rec * (1 - Math.exp(-d / 1.2)) * r.norm(1, 0.02)]); }
            G.store.regrow = pts;
            G.chart({ kind: 'line', title: 'Regrowth fluorescence (simulated)', xlab: 'days', series: [{ name: 'rehydrated', pts, color: '#2fb8a8' }] });
            G.micro({ density: 0.3 + 0.6 * f, glow: 0.1 + 0.5 * f, label: 'REGROWING' });
          },
        }),
        S({
          label: 'Read post-rehydration fluorescence', station: 'reader', anim: 'load', dur: 15, wait: 7, equip: 1, carry: 'plate',
          note: 'Plate loaded for the post-rehydration read.',
          waitNote: 'Post-rehydration fluorescence recorded.',
          wfx: (G) => {
            const rec = G.store.recPreview || Sci.recovery(o.prot, o.stor, G.flags, new LS.Rng(G.seed + 5));
            const post = G.store.pre * rec;
            G.store.post = post; G.store.rec = rec;
            G.addResult({ label: 'Post-rehydration fluorescence', value: Math.round(post), unit: 'AU', note: 'simulated' });
            G.chart({ kind: 'bar', title: 'Fluorescence, pre vs post (simulated)', bars: [{ label: 'pre', v: G.store.pre, color: '#f0a93b' }, { label: 'post', v: post, color: '#2fb8a8' }] });
          },
        }),
        S({
          label: 'Write up relative recovery', station: 'desk', anim: 'type', dur: 20,
          note: 'Results written up at the workstation.',
          fx: (G) => {
            const pct = G.store.rec * 100;
            G.addResult({ label: 'Relative recovery', value: LS.round1(pct), unit: '%', note: prot.label + ', ' + stor.label, good: pct > 40 });
            G.finish({
              headline: LS.round1(pct) + '% relative recovery',
              verdict: pct > 55 ? 'Strong recovery' : pct > 25 ? 'Partial recovery' : 'Poor recovery',
              lines: [
                'Protectant: ' + prot.label,
                'Storage: ' + stor.label,
                'Pre: ' + Math.round(G.store.pre) + ' AU → post: ' + Math.round(G.store.post) + ' AU',
                G.flags.contaminated ? 'Contamination flagged — treat this run as unreliable.' : 'No contamination flagged.',
                G.flags.identityUncertain ? 'Sample identity was disturbed during the run.' : 'Sample chain of custody intact.',
              ],
              good: pct > 40 && !G.flags.contaminated,
            });
          },
        }),
      ];
    },
  };

  /* =======================================================================
     B — Bio-POD protein factory
     ======================================================================= */
  const B = {
    id: 'B', code: 'EXP-B', title: 'The Bio-POD Protein Factory',
    sub: 'Chapter 3 workflow', color: '#2fb8a8',
    goal: 'Produce a protein from yeast encapsulated in reusable hydrogels, washing and reusing the same gels over several production rounds.',
    options: [
      { id: 'prot', label: 'Protein project', choices: Sci.PROTEINS.map((p) => ({ id: p.id, label: p.label })), def: 0 },
      { id: 'rounds', label: 'Production rounds', choices: [{ id: '2', label: '2 rounds' }, { id: '3', label: '3 rounds' }, { id: '4', label: '4 rounds' }], def: 1 },
      { id: 'lyo', label: 'Preserve mid-run', choices: [{ id: 'no', label: 'No' }, { id: 'yes', label: 'Lyophilise, then resume' }], def: 0 },
    ],
    build(o, G) {
      const prot = Sci.PROTEINS.find((p) => p.id === o.prot);
      const rounds = parseInt(o.rounds, 10);
      const steps = [
        S({ label: 'Gown up and plan the run', station: 'ppe', anim: 'open', dur: 5, note: 'Gowned up for the production run.' }),
        S({ label: 'Set up the ' + prot.label + ' project', station: 'desk', anim: 'type', dur: 8, note: 'Project set up: ' + prot.label + ' production, ' + rounds + ' reuse rounds.' }),
        S({ label: 'Screen candidate yeast strains', station: 'bench', anim: 'pipette', dur: 38, equip: 1, note: 'Candidate production strains plated out for screening.', fx: (G) => { G.store.cands = Sci.strainScreen(G.rng); G.sample('Strain screening plate'); } }),
        S({
          label: 'Read the screening plate', station: 'reader', anim: 'load', dur: 11, wait: 9, equip: 1, carry: 'plate',
          note: 'Screening plate read.', waitNote: 'Screen complete; best candidate selected.',
          wfx: (G) => {
            const best = G.store.cands.slice().sort((a, b) => b.score - a.score)[0];
            G.store.strain = best;
            G.chart({ kind: 'bar', title: 'Strain screen (simulated)', bars: G.store.cands.map((s) => ({ label: s.name.replace('YS-', ''), v: s.score, color: s === best ? '#f0a93b' : '#2fb8a8' })) });
            G.addResult({ label: 'Selected strain', value: best.name, unit: '', note: 'relative score ' + LS.round2(best.score) });
            G.say(best.name + ' is the one.');
          },
        }),
        S({ label: 'Collect the production strain', station: 'fridge', anim: 'open', dur: 9, carry: 'rack', note: 'Selected production strain collected from the refrigerator.' }),
        S({ label: 'Prepare gel ink with the strain', station: 'gelprep', anim: 'pour', dur: 30, equip: 1, note: 'Hydrogel ink prepared with the production strain.' }),
        S({ label: 'Print the hydrogel constructs', station: 'printer', anim: 'load', dur: 26, equip: 1, note: 'Constructs printed.' }),
        S({ label: 'UV-cure the constructs', station: 'uv', anim: 'load', dur: 6, wait: 5, equip: 1, note: 'Constructs loaded for curing.', waitNote: 'Curing complete.', wfx: (G) => G.sample('Bio-POD gels') }),
        S({ label: 'Transfer to growth medium', station: 'bench', anim: 'pipette', dur: 11, carry: 'gel', note: 'Gels moved into growth medium.' }),
        S({
          label: 'Cell expansion — 24 h', station: 'incubator', anim: 'open', dur: 7, wait: 1440, equip: 1, carry: 'gel',
          note: 'Gels incubated for the 24 h expansion phase.', waitNote: 'Expansion phase complete.',
          wtick: (G, f) => { G.chart({ kind: 'line', title: 'Expansion (simulated)', xlab: 'h', series: [{ name: 'density', pts: Sci.growth(24 * f, !G.flags.tempDrift, new LS.Rng(G.seed + 31), Math.max(2, Math.round(14 * f))) }] }); },
        }),
        S({ label: 'Exchange into induction medium', station: 'bench', anim: 'pipette', dur: 15, note: 'Gels exchanged into induction medium.' }),
      ];
      G.store.titers = [];
      for (let r = 1; r <= rounds; r++) {
        const mid = o.lyo === 'yes' && r === Math.ceil(rounds / 2) + 1;
        if (o.lyo === 'yes' && r === Math.ceil(rounds / 2) + 1) {
          steps.push(S({ label: 'Flash-freeze gels for preservation', station: 'ln2', anim: 'load', dur: 7, wait: 10, equip: 1, carry: 'gel', note: 'Production paused — gels frozen for preservation.', waitNote: 'Gels frozen.' }));
          steps.push(S({ label: 'Lyophilise the gels', station: 'lyo', anim: 'load', dur: 9, wait: 1440, equip: 1, carry: 'gel', note: 'Gels loaded into the freeze dryer mid-run.', waitNote: 'Lyophilisation complete.' }));
          steps.push(S({ label: 'Rehydrate and resume production', station: 'bench', anim: 'pipette', dur: 18, note: 'Gels rehydrated; production resumed.', fx: (G) => { G.flags.rehydrated = true; G.say('Let us see if they wake up.'); } }));
        }
        steps.push(S({
          label: 'Production round ' + r, station: 'shaker', anim: 'load', dur: 7, wait: 1440, equip: 1, carry: 'gel',
          note: 'Round ' + r + ' production started on the shaker.', waitNote: 'Round ' + r + ' production phase finished.',
        }));
        steps.push(S({ label: 'Collect round ' + r + ' supernatant', station: 'shaker', anim: 'pipette', dur: 11, carry: 'rack', note: 'Supernatant collected from round ' + r + '.', fx: (G) => G.sample('Round ' + r + ' supernatant') }));
        steps.push(S({
          label: prot.assay + ' — round ' + r, station: prot.station, anim: prot.station === 'reader' ? 'load' : 'pipette', dur: 22, wait: 11, equip: 1, carry: 'plate',
          note: prot.assay + ' set up for round ' + r + '.', waitNote: 'Round ' + r + ' assay read out.',
          wfx: (G) => {
            const t = Sci.proteinRound(o.prot, r, G.store.strain ? G.store.strain.score : 1, G.flags, G.rng);
            G.store.titers.push({ round: r, v: t.value });
            G.addResult({ label: 'Round ' + r + ' titer', value: LS.round2(t.value), unit: t.unit, note: 'simulated' });
            G.chart({ kind: 'bar', title: prot.label + ' per round (simulated, ' + t.unit + ')', bars: G.store.titers.map((x) => ({ label: 'R' + x.round, v: x.v, color: '#2fb8a8' })) });
          },
        }));
        if (r < rounds) steps.push(S({ label: 'Wash gels into fresh medium', station: 'sink', anim: 'clean', dur: 17, note: 'Gels washed and transferred into fresh medium for the next round.' }));
      }
      steps.push(S({
        label: 'Compare production across rounds', station: 'desk', anim: 'type', dur: 22, note: 'Round-to-round comparison written up.',
        fx: (G) => {
          const ts = G.store.titers;
          const first = ts[0] ? ts[0].v : 0, last = ts[ts.length - 1] ? ts[ts.length - 1].v : 0;
          const retain = first ? (last / first) * 100 : 0;
          G.addResult({ label: 'Retained output, final round', value: LS.round1(retain), unit: '%', note: 'vs round 1', good: retain > 70 });
          G.finish({
            headline: LS.round1(retain) + '% of round-1 output retained',
            verdict: retain > 80 ? 'Gels reused well' : retain > 55 ? 'Usable decline across rounds' : 'Output fell away quickly',
            lines: [
              'Protein: ' + prot.label + ' (' + prot.assay + ')',
              'Strain: ' + (G.store.strain ? G.store.strain.name : '—'),
              'Rounds run: ' + rounds + (o.lyo === 'yes' ? ', with a preservation pause' : ''),
              ...ts.map((t) => '  round ' + t.round + ': ' + LS.round2(t.v) + ' ' + prot.unit),
              G.flags.contaminated ? 'Contamination flagged during the run.' : 'No contamination flagged.',
            ],
            good: retain > 60 && !G.flags.contaminated,
          });
        },
      }));
      return steps;
    },
  };

  /* =======================================================================
     C — Three-strain phenylpropene production
     ======================================================================= */
  const C = {
    id: 'C', code: 'EXP-C', title: 'Three-Strain Phenylpropene Production',
    sub: 'Chapter 4 workflow', color: '#f0a93b',
    goal: 'Split a biosynthetic route across three engineered modules, mix them at a chosen ratio and see how much final product versus intermediate comes out.',
    options: [
      { id: 'ratio', label: 'Module ratio I:II:III', choices: [{ id: '1-1-1', label: '1 : 1 : 1' }, { id: '2-1-1', label: '2 : 1 : 1' }, { id: '1-1-2', label: '1 : 1 : 2' }, { id: '1-2-3', label: '1 : 2 : 3' }, { id: '3-2-1', label: '3 : 2 : 1' }], def: 0 },
      { id: 'enc', label: 'Format', choices: [{ id: 'free', label: 'Free cells' }, { id: 'gel', label: 'Encapsulated, reusable' }], def: 0 },
    ],
    build(o, G) {
      const ratio = o.ratio.split('-').map(Number);
      const enc = o.enc === 'gel';
      const steps = [
        S({ label: 'Gown up and label three culture sets', station: 'ppe', anim: 'open', dur: 6, note: 'Gowned up; three module culture sets labelled.' }),
        S({ label: 'Collect Module I, II and III strains', station: 'fridge', anim: 'open', dur: 11, carry: 'rack', note: 'Module I, II and III strains collected.', fx: (G) => { G.sample('Module I culture'); G.sample('Module II culture'); G.sample('Module III culture'); } }),
        S({ label: 'Inoculate separate cultures', station: 'bsc', anim: 'pipette', dur: 21, equip: 1, note: 'Each module inoculated into its own labelled culture.' }),
        S({
          label: 'Overnight growth', station: 'shaker', anim: 'load', dur: 6, wait: 840, equip: 1, carry: 'flask',
          note: 'Cultures placed on the shaker to grow overnight.', waitNote: 'Overnight cultures are up and turbid.',
          wtick: (G, f) => {
            const r = new LS.Rng(G.seed + 41);
            G.chart({ kind: 'line', title: 'Overnight growth (simulated OD600)', xlab: 'h', series: [1, 2, 3].map((m, i) => ({ name: 'Mod ' + 'I'.repeat(m), pts: Sci.growth(14 * f, !G.flags.tempDrift, new LS.Rng(G.seed + 41 + i), Math.max(2, Math.round(12 * f))) })) });
          },
        }),
        S({ label: 'Subculture into fresh medium', station: 'bench', anim: 'pipette', dur: 15, note: 'Each module subcultured into fresh medium.' }),
        S({
          label: 'Measure OD600', station: 'reader', anim: 'load', dur: 9, wait: 5, equip: 1, carry: 'plate',
          note: 'OD600 measured for all three modules.', waitNote: 'OD600 values recorded.',
          wfx: (G) => {
            const ods = [1, 2, 3].map(() => LS.round2(G.rng.norm(0.52, 0.06)));
            G.store.ods = ods;
            G.chart({ kind: 'bar', title: 'OD600 at induction (simulated)', bars: ods.map((v, i) => ({ label: ['I', 'II', 'III'][i], v, color: ['#2fb8a8', '#f0a93b', '#8a6bd6'][i] })) });
            G.addResult({ label: 'OD600 I / II / III', value: ods.join(' / '), unit: '', note: 'simulated' });
          },
        }),
        S({ label: 'Induce the three modules', station: 'bench', anim: 'pipette', dur: 13, note: 'All three modules induced.' }),
        S({ label: '5 h induction stage', station: 'shaker', anim: 'load', dur: 5, wait: 300, equip: 1, note: 'Induction stage running on the shaker.', waitNote: 'Five-hour induction stage finished.' }),
        S({ label: 'Combine modules at ' + ratio.join(':'), station: 'bsc', anim: 'pipette', dur: 17, equip: 1, note: 'Modules combined at a ' + ratio.join(':') + ' ratio.', fx: (G) => { G.sample('Consortium ' + ratio.join(':')); G.say('Ratio ' + ratio.join(' to ') + '. Fingers crossed.'); } }),
        S({ label: 'Pellet and resuspend in production medium', station: 'centrifuge', anim: 'load', dur: 7, wait: 13, equip: 1, note: 'Consortium pelleted for the medium exchange.', waitNote: 'Cells resuspended in production medium.' }),
      ];
      if (enc) steps.push(S({ label: 'Encapsulate the consortium', station: 'printer', anim: 'load', dur: 26, equip: 1, note: 'Consortium encapsulated into reusable gel constructs.' }));
      steps.push(S({
        label: 'Production phase — 63 h', station: 'shaker', anim: 'load', dur: 7, wait: 3780, equip: 1, carry: 'flask',
        note: 'Production phase started (63 h).', waitNote: 'Production phase complete.',
        wtick: (G, f) => {
          const d = Sci.consortium(ratio, enc, G.flags, new LS.Rng(G.seed + 57));
          const n = Math.max(2, Math.round(14 * f));
          const mk = (end) => { const p = []; for (let i = 0; i <= n; i++) { const t = (63 * f * i) / n; p.push([t, end * (1 - Math.exp(-t / 22))]); } return p; };
          G.chart({
            kind: 'line', title: 'Titer over production (simulated, mg/L)', xlab: 'h',
            series: [
              { name: 'eugenol', pts: mk(d.eugenol), color: '#f0a93b' },
              { name: 'ferulic', pts: mk(d.ferulic), color: '#2fb8a8' },
              { name: 'p-coumaric', pts: mk(d.coumaric), color: '#8a6bd6' },
            ],
          });
        },
      }));
      steps.push(S({ label: 'Collect supernatant samples', station: 'shaker', anim: 'pipette', dur: 12, carry: 'rack', note: 'Supernatant samples collected from the production culture.', fx: (G) => G.sample('Production supernatant') }));
      steps.push(S({ label: 'Prepare samples for analysis', station: 'bench', anim: 'pipette', dur: 19, note: 'Samples filtered and prepared for chromatography.' }));
      steps.push(S({
        label: 'Run HPLC gradient', station: 'hplc', anim: 'load', dur: 9, wait: 28, equip: 1, carry: 'rack',
        note: 'Samples injected onto the HPLC.', waitNote: 'HPLC run finished; peaks integrated.',
        wtick: (G, f) => {
          const d = G.store.cons || (G.store.cons = Sci.consortium(ratio, enc, G.flags, new LS.Rng(G.seed + 57)));
          G.chart({ kind: 'chrom', title: 'HPLC (simulated)', peaks: Sci.chromPeaks('C', d, G.rng), progress: f, tmax: 10, color: '#2fb8a8' });
        },
        wfx: (G) => {
          const d = G.store.cons;
          G.addResult({ label: 'Eugenol', value: LS.round1(d.eugenol), unit: 'mg/L', note: 'simulated', good: true });
          G.addResult({ label: 'Ferulic acid left over', value: LS.round1(d.ferulic), unit: 'mg/L', note: 'intermediate' });
          G.addResult({ label: 'p-Coumaric acid left over', value: LS.round1(d.coumaric), unit: 'mg/L', note: 'intermediate' });
        },
      }));
      steps.push(S({
        label: 'Confirm identity by LC-MS', station: 'lcms', anim: 'load', dur: 9, wait: 22, equip: 1,
        note: 'Samples submitted to LC-MS for confirmation.', waitNote: 'Product identity confirmed against expected masses.',
        wtick: (G, f) => { G.chart({ kind: 'chrom', title: 'LC-MS extracted trace (simulated)', peaks: Sci.chromPeaks('C', G.store.cons, new LS.Rng(G.seed + 61)), progress: f, tmax: 10, color: '#8a6bd6' }); },
      }));
      steps.push(S({
        label: 'Compare intermediates and product', station: 'desk', anim: 'type', dur: 22, note: 'Pathway balance written up at the workstation.',
        fx: (G) => {
          const d = G.store.cons;
          const conv = (d.eugenol / Math.max(0.01, d.eugenol + d.ferulic + d.coumaric)) * 100;
          G.chart({ kind: 'bar', title: 'Where the carbon ended up (simulated)', bars: [{ label: 'eugenol', v: d.eugenol, color: '#f0a93b' }, { label: 'ferulic', v: d.ferulic, color: '#2fb8a8' }, { label: 'coumaric', v: d.coumaric, color: '#8a6bd6' }] });
          G.addResult({ label: 'Share as final product', value: LS.round1(conv), unit: '%', good: conv > 45 });
          G.finish({
            headline: LS.round1(d.eugenol) + ' mg/L eugenol (simulated)',
            verdict: conv > 55 ? 'Well-balanced consortium' : conv > 30 ? 'Intermediates piling up' : 'Bottleneck downstream',
            lines: [
              'Ratio I:II:III — ' + ratio.join(' : ') + (enc ? ', encapsulated' : ', free cells'),
              'Eugenol ' + LS.round1(d.eugenol) + ' mg/L',
              'Ferulic acid left over ' + LS.round1(d.ferulic) + ' mg/L',
              'p-Coumaric acid left over ' + LS.round1(d.coumaric) + ' mg/L',
              conv > 55 ? 'Little intermediate accumulation — the modules are matched.' : 'Try weighting the later modules more heavily.',
            ],
            good: conv > 45 && !G.flags.contaminated,
          });
        },
      }));
      return steps;
    },
  };

  /* =======================================================================
     D — Living gut biosensor
     ======================================================================= */
  const D = {
    id: 'D', code: 'EXP-D', title: 'The Living Gut Biosensor',
    sub: 'Chapter 5 workflow — simplified',
    color: '#e06b8b',
    goal: 'Run an engineered probiotic sensor strain in simulated gut media, follow its fluorescence response to a nitric-oxide-related stimulus, and finish with an in-vitro cell test.',
    note: 'Laboratory research and in-vitro testing only — not a treatment, and not evidence of one. The source does not give a full fabrication protocol for this section, so the gel-handling steps here are an openly simplified stand-in.',
    options: [
      { id: 'state', label: 'Medium state', choices: [{ id: 'fed', label: 'Fed state' }, { id: 'fast', label: 'Fasted state' }], def: 0 },
      { id: 'stim', label: 'Stimulus level', choices: [{ id: 'none', label: 'None (control)' }, { id: 'low', label: 'Low' }, { id: 'mid', label: 'Medium' }, { id: 'high', label: 'High' }], def: 2 },
    ],
    build(o, G) {
      const fed = o.state === 'fed';
      const stim = { none: 0, low: 0.12, mid: 0.4, high: 0.9 }[o.stim];
      return [
        S({ label: 'Gown up and prepare the cabinet', station: 'ppe', anim: 'open', dur: 5, note: 'Gowned up for sterile work.' }),
        S({ label: 'Collect the sensor strains', station: 'fridge', anim: 'open', dur: 9, carry: 'rack', note: 'Engineered sensor strains collected.', fx: (G) => { G.sample('Sensor strain'); G.sample('Control strain'); } }),
        S({ label: 'Prepare overnight cultures', station: 'bsc', anim: 'pipette', dur: 17, equip: 1, note: 'Overnight cultures set up in the cabinet.' }),
        S({ label: 'Overnight growth', station: 'shaker', anim: 'load', dur: 5, wait: 780, equip: 1, carry: 'flask', note: 'Cultures growing overnight.', waitNote: 'Overnight cultures ready.' }),
        S({ label: 'Prepare simulated ' + (fed ? 'fed-state' : 'fasted-state') + ' medium', station: 'gelprep', anim: 'pour', dur: 26, equip: 1, note: 'Simulated intestinal medium prepared in the ' + (fed ? 'fed' : 'fasted') + ' state.' }),
        S({ label: 'Dispense cultures into the assay plate', station: 'bsc', anim: 'pipette', dur: 19, equip: 1, carry: 'plate', note: 'Cultures and controls dispensed into the assay plate.', fx: (G) => G.sample('Assay plate') }),
        S({ label: 'Introduce the stimulus', station: 'bench', anim: 'pipette', dur: 11, note: 'Nitric-oxide-related stimulus added at the ' + o.stim + ' level.', fx: (G) => G.say(stim ? 'Now we watch.' : 'Control plate — no stimulus.') }),
        S({
          label: 'Kinetic read every 15 min', station: 'reader', anim: 'load', dur: 9, wait: 360, equip: 1, carry: 'plate',
          note: 'Kinetic fluorescence and OD600 read started, 15-minute intervals.',
          waitNote: 'Six-hour kinetic read complete.',
          wtick: (G, f) => {
            const pts = Math.max(2, Math.round(24 * f));
            const k = Sci.biosensor(stim, fed, G.flags, new LS.Rng(G.seed + 71), pts);
            G.store.kin = k;
            G.chart({ kind: 'line', title: 'Sensor response (simulated)', xlab: 'h', series: [{ name: 'fluorescence', pts: k.fl, color: '#e06b8b' }, { name: 'OD600 ×1000', pts: k.od.map(([x, y]) => [x, y * 1000]), color: '#4a8fd4' }] });
            G.micro({ density: 0.5 + 0.4 * f, glow: stim * f, label: 'SENSOR CELLS' });
          },
          wfx: (G) => {
            const k = G.store.kin;
            const peak = k.fl.length ? k.fl[k.fl.length - 1][1] : 0;
            G.addResult({ label: 'Endpoint fluorescence', value: Math.round(peak), unit: 'AU', note: o.stim + ' stimulus, simulated', good: stim > 0 });
          },
        }),
        S({ label: 'Sample for metabolite analysis', station: 'reader', anim: 'pipette', dur: 11, carry: 'rack', note: 'Wells sampled for metabolite analysis.' }),
        S({ label: 'Clarify the samples', station: 'centrifuge', anim: 'load', dur: 5, wait: 11, equip: 1, note: 'Samples spun down.', waitNote: 'Clarified samples ready for injection.' }),
        S({
          label: 'HPLC — tryptamine / β-carboline', station: 'hplc', anim: 'load', dur: 9, wait: 32, equip: 1, carry: 'rack',
          note: 'Samples injected for metabolite analysis.', waitNote: 'Metabolite run finished.',
          wtick: (G, f) => {
            const d = G.store.met || (G.store.met = { tryptamine: G.rng.range(18, 52) * (fed ? 1.2 : 1), carboline: G.rng.range(4, 26) * (0.5 + stim) });
            G.chart({ kind: 'chrom', title: 'HPLC metabolites (simulated)', peaks: Sci.chromPeaks('D', d, new LS.Rng(G.seed + 77)), progress: f, tmax: 11, color: '#e06b8b' });
          },
          wfx: (G) => {
            G.addResult({ label: 'Tryptamine', value: LS.round1(G.store.met.tryptamine), unit: 'rel. units', note: 'simulated' });
            G.addResult({ label: 'β-carboline', value: LS.round1(G.store.met.carboline), unit: 'rel. units', note: 'simulated' });
          },
        }),
        S({ label: 'Image the sensor cells', station: 'scope', anim: 'inspect', dur: 16, equip: 1, note: 'Sensor cells imaged on the microscope.', fx: (G) => G.micro({ density: 0.9, glow: Math.max(0.15, stim), label: 'SENSOR CELLS 40X' }) }),
        S({ label: 'Set up the in-vitro cell test', station: 'bsc', anim: 'pipette', dur: 24, equip: 1, note: 'In-vitro cell-culture test plated out — simplified, simulated stand-in.', fx: (G) => G.sample('Cell-culture test plate') }),
        S({ label: 'Treatment incubation', station: 'incubator', anim: 'open', dur: 7, wait: 1080, equip: 1, carry: 'plate', note: 'Treatment plates incubated.', waitNote: 'Treatment incubation complete.' }),
        S({
          label: 'Viability / marker readout', station: 'reader', anim: 'load', dur: 15, wait: 9, equip: 1, carry: 'plate',
          note: 'Viability and inflammatory-marker readout started.', waitNote: 'Readout complete.',
          wfx: (G) => {
            const ctrl = Sci.viability(false, G.flags, G.rng), tr = Sci.viability(true, G.flags, G.rng);
            G.store.viab = { ctrl, tr };
            G.chart({ kind: 'bar', title: 'Cell viability (simulated, %)', bars: [{ label: 'control', v: ctrl, color: '#4a8fd4' }, { label: 'treated', v: tr, color: '#e06b8b' }] });
            G.addResult({ label: 'Viability, treated', value: LS.round1(tr), unit: '%', note: 'vs ' + LS.round1(ctrl) + '% control', good: tr > 80 });
          },
        }),
        S({
          label: 'Compare controls and treatments', station: 'desk', anim: 'type', dur: 22, note: 'Conditions compared and written up.',
          fx: (G) => {
            const k = G.store.kin, peak = k && k.fl.length ? k.fl[k.fl.length - 1][1] : 0;
            G.finish({
              headline: Math.round(peak) + ' AU endpoint sensor signal',
              verdict: stim === 0 ? 'Control — no stimulus given' : peak > 700 ? 'Clear dose response' : 'Weak response',
              lines: [
                'Medium: simulated ' + (fed ? 'fed' : 'fasted') + ' state',
                'Stimulus: ' + o.stim,
                'Viability treated ' + LS.round1(G.store.viab.tr) + '% vs control ' + LS.round1(G.store.viab.ctrl) + '%',
                'Tryptamine ' + LS.round1(G.store.met.tryptamine) + ', β-carboline ' + LS.round1(G.store.met.carboline) + ' (relative units)',
                'In-vitro research only — nothing here is a clinical result.',
              ],
              good: stim > 0 && peak > 500 && !G.flags.contaminated,
            });
          },
        }),
      ];
    },
  };

  LS.Experiments = [A, B, C, D];
  LS.ExpById = { A, B, C, D };
})();
