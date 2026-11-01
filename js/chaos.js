/* The Lab Sims — chaos.js
   Optional disruptions. The simulation runs perfectly with all of this off.
   Scientifically plausible nuisances are kept separate from the openly silly
   ones, nothing here is hazardous, and no event rewards unsafe practice. */
(function () {
  const LS = window.LS, W = LS.W;

  const pick = (G, ids) => {
    const live = ids.filter((i) => W.byId[i]);
    return W.byId[live[Math.floor(G.rng.next() * live.length)]];
  };

  const EV = [
    {
      id: 'rack', name: 'Knock over a tube rack', kind: 'plausible', blurb: 'An empty rack goes over. Tubes everywhere.',
      fire(G) {
        const st = pick(G, ['bench', 'bsc', 'gelprep']);
        G.log('An empty tube rack went over on the ' + st.short.toLowerCase() + '.');
        G.stress(7);
        G.interrupt([{ label: 'Pick up the spilled rack', station: st.id, anim: 'clean', dur: 13, note: 'Rack and tubes picked up and re-racked.', say: 'Right. Nothing broken.' }]);
      },
    },
    {
      id: 'notebook', name: 'Misplace the notebook', kind: 'plausible', blurb: 'The lab notebook is not where it should be.',
      fire(G) {
        G.log('The lab notebook is not on the bench where it should be.');
        G.stress(5); G.needs.focus = LS.clamp(G.needs.focus - 9, 0, 100);
        const a = pick(G, ['coffee', 'desk', 'bench', 'hplc']);
        const b = pick(G, ['sink', 'store', 'bsc', 'scope']);
        G.interrupt([
          { label: 'Look for the notebook', station: a.id, anim: 'search', dur: 7, say: 'Where did I put that?' },
          { label: 'Keep looking for the notebook', station: b.id, anim: 'search', dur: 8, say: 'Not here either.' },
          { label: 'Find the notebook', station: 'coffee', anim: 'inspect', dur: 5, note: 'Notebook found by the break table. Entries brought back up to date.', say: 'Of course. Coffee table.' },
        ]);
      },
    },
    {
      id: 'software', name: 'Instrument software error', kind: 'plausible', blurb: 'A harmless control-software fault. Needs a restart.',
      fire(G) {
        const st = pick(G, ['hplc', 'lcms', 'reader', 'centrifuge']);
        st.s.offline = 1;
        G.log(st.name + ' threw a control-software error.');
        G.stress(8);
        G.interrupt([{
          label: 'Restart ' + st.short + ' software', station: st.id, anim: 'type', dur: 16, ignoreBlocked: true, say: 'Turn it off and on again.',
          note: st.name + ' software restarted; instrument back online.',
          fx: () => { st.s.offline = 0; },
        }]);
      },
    },
    {
      id: 'contam', name: 'Sample contamination', kind: 'plausible', blurb: 'A culture looks wrong. Results from this run become unreliable.',
      fire(G) {
        G.flags.contaminated = true;
        G.samples.forEach((s) => { if (!s.done) s.contam = true; });
        G.log('Contamination suspected — the affected samples are flagged and results from them are unreliable.');
        G.stress(18); G.needs.confidence = LS.clamp(G.needs.confidence - 12, 0, 100);
        G.interrupt([
          { label: 'Inspect the suspect culture', station: 'scope', anim: 'inspect', dur: 11, say: 'That is... not supposed to be there.' },
          { label: 'Discard affected material', station: 'waste', anim: 'open', dur: 9, note: 'Affected material discarded to waste.' },
          { label: 'Decontaminate the cabinet', station: 'bsc', anim: 'clean', dur: 22, note: 'Cabinet decontaminated and the run marked as compromised.' },
        ]);
      },
    },
    {
      id: 'delivery', name: 'Delayed reagent delivery', kind: 'plausible', blurb: 'A reagent is late. Preparation steps take longer.',
      fire(G) {
        G.flags.delivery = true;
        G.log('A reagent delivery is late — preparation steps will run long until it arrives.');
        G.stress(6);
        G.interrupt([{ label: 'Chase the delivery', station: 'desk', anim: 'type', dur: 10, say: 'It said out for delivery two days ago.' }]);
        G.after(900, () => { G.flags.delivery = false; G.log('The late reagent finally arrived.'); });
      },
    },
    {
      id: 'temp', name: 'Room temperature shift', kind: 'plausible', blurb: 'The room drifts warm. Growth and recovery suffer a little.',
      fire(G) {
        G.flags.tempDrift = true;
        G.log('Room temperature has drifted upward; incubator control is working harder.');
        G.stress(7);
        G.interrupt([{
          label: 'Check incubator temperature', station: 'incubator', anim: 'open', dur: 12, ignoreBlocked: true, say: 'It is reading two degrees high.',
          note: 'Incubator setpoint checked and corrected as far as possible.',
          fx: (G2) => { if (G2.rng.chance(0.5)) { G2.flags.tempDrift = false; G2.log('Temperature brought back under control.'); } },
        }]);
      },
    },
    {
      id: 'incalert', name: 'Incubator maintenance alert', kind: 'plausible', blurb: 'The incubator locks itself out for a service check.',
      fire(G) {
        const st = W.byId.incubator;
        st.s.alert = 1; st.s.offline = 1;
        G.log('Incubator raised a maintenance alert and locked itself out.');
        G.stress(10);
        G.interrupt([{
          label: 'Clear the incubator alert', station: 'incubator', anim: 'open', dur: 18, ignoreBlocked: true, note: 'Maintenance alert cleared; incubator back in service.',
          say: 'Service cycle. Of all the times.',
          fx: () => { st.s.alert = 0; st.s.offline = 0; },
        }]);
      },
    },
    {
      id: 'labels', name: 'Mix up sample labels', kind: 'plausible', blurb: 'Two non-hazardous labels get swapped. Traceability is in doubt.',
      fire(G) {
        G.flags.identityUncertain = true;
        G.samples.forEach((s) => { if (!s.done) s.idDoubt = true; });
        G.log('Two sample labels were swapped — sample identity is now uncertain.');
        G.stress(12);
        G.interrupt([{
          label: 'Re-label and reconcile samples', station: 'bench', anim: 'pipette', dur: 24,
          note: 'Samples re-labelled against the notebook; identity recorded as uncertain for this run.',
          say: 'Traceability first, feelings later.',
        }]);
      },
    },
    {
      id: 'monitor', name: 'Switch off a monitor', kind: 'plausible', blurb: 'Someone turns off the analysis screen.',
      fire(G) {
        W.byId.desk.s.screenOff = true;
        G.log('The workstation monitor was switched off.');
        G.interrupt([{
          label: 'Switch the monitor back on', station: 'desk', anim: 'open', dur: 4, ignoreBlocked: true, say: 'Who turned this off?',
          fx: () => { W.byId.desk.s.screenOff = false; },
        }]);
      },
    },
    {
      id: 'assistant', name: 'Assistant takes an instrument', kind: 'plausible', blurb: 'A colleague needs the same instrument for a while.',
      fire(G) {
        const st = pick(G, ['reader', 'centrifuge', 'hplc', 'shaker', 'scope']);
        G.spawnAssistant(st, 380);
        G.log('A colleague needs the ' + st.short.toLowerCase() + ' for a while.');
        G.stress(6);
      },
    },
    {
      id: 'cat', name: 'Release the lab cat', kind: 'silly', blurb: 'A cat that should not be here, being somewhere it should not be.',
      fire(G) {
        G.spawnCat();
        G.log('FICTIONAL EVENT — a cat has got into the lab.');
      },
    },
    {
      id: 'mad', name: 'Mad science event', kind: 'silly', blurb: 'Purely fictional. Lightning, glassware, no data consequences.',
      fire(G) {
        G.madT = 2.6;
        G.log('FICTIONAL EVENT — thunder, impossible lightning, and one flask glowing for no defensible reason.');
        G.needs.confidence = LS.clamp(G.needs.confidence + 9, 0, 100);
        G.needs.curiosity = LS.clamp(G.needs.curiosity + 12, 0, 100);
        G.interrupt([{ label: 'Investigate the glowing flask', station: 'bench', anim: 'inspect', dur: 9, say: 'That is not in the protocol.', note: 'Glowing flask investigated. Nothing in the data changed; morale improved.' }]);
      },
    },
  ];

  LS.Chaos = {
    events: EV,
    byId: EV.reduce((m, e) => ((m[e.id] = e), m), {}),
    fire(id, G) {
      const e = LS.Chaos.byId[id];
      if (!e || !G.chaosOn) return;
      e.fire(G);
      G.lastChaos = { name: e.name, t: 3.2, kind: e.kind };
    },
    randomPlausible(G) {
      const list = EV.filter((e) => e.kind === 'plausible');
      LS.Chaos.fire(list[Math.floor(G.rng.next() * list.length)].id, G);
    },
  };
})();
