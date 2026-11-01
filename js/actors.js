/* The Lab Sims — actors.js
   The scientist sprite (walk / turn / sit / pipette / pour / inspect / type /
   clean / carry / wait), plus the assistant and the lab cat. */
(function () {
  const LS = window.LS, P = LS.P, W = LS.W, px = LS.px;
  const A = (LS.Actors = {});
  const T = 16;

  /* dir: 0 down, 1 left, 2 right, 3 up */
  A.make = function (tx, ty, look) {
    return {
      tx, ty, x: (tx + 0.5) * T, y: (ty + 0.9) * T,
      dir: 0, pose: 'idle', phase: 0, walking: false,
      path: null, wp: 0, carry: null, bubble: null, bubbleT: 0,
      look: Object.assign({ coat: P.coat, coatS: P.coatS, hair: P.hair, hairL: P.hairL, skin: P.skin, skinS: P.skinS, glove: P.glove, accent: P.teal }, look || {}),
      sitting: false, speedPx: 26,
    };
  };

  A.goto = function (a, tx, ty) {
    const [gx, gy] = W.nearestFree(tx, ty);
    const p = W.path(Math.round((a.x - T / 2) / T), Math.round((a.y - T * 0.9) / T), gx, gy);
    a.path = p && p.length ? p : null; a.wp = 0;
    a.goal = [gx, gy];
    return !!a.path || (Math.round((a.x - T / 2) / T) === gx && Math.round((a.y - T * 0.9) / T) === gy);
  };

  A.atGoal = function (a) { return !a.path; };

  A.step = function (a, dt, speedPx) {
    a.phase += dt;
    if (!a.path) { a.walking = false; return; }
    const spd = (speedPx || a.speedPx) * dt;
    let budget = spd;
    while (budget > 0 && a.path) {
      const [nx, ny] = a.path[a.wp];
      const tx = (nx + 0.5) * T, ty = (ny + 0.9) * T;
      const dx = tx - a.x, dy = ty - a.y;
      const d = Math.hypot(dx, dy);
      if (d <= budget) {
        a.x = tx; a.y = ty; budget -= d; a.wp++;
        if (a.wp >= a.path.length) { a.path = null; a.walking = false; break; }
      } else {
        a.x += (dx / d) * budget; a.y += (dy / d) * budget; budget = 0;
        if (Math.abs(dx) > Math.abs(dy)) a.dir = dx > 0 ? 2 : 1; else a.dir = dy > 0 ? 0 : 3;
      }
    }
    a.walking = !!a.path;
    if (a.walking) a.pose = 'walk';
  };

  A.say = function (a, text, dur) { a.bubble = text; a.bubbleT = dur || 3.4; };

  /* ---------------- sprite ---------------- */
  function arm(c, x, y, w, h, col, sh) { px(c, x, y, w, h, col); px(c, x, y, w, 1, sh); }

  A.draw = function (c, a, t) {
    const L = a.look;
    const X = Math.round(a.x), Y = Math.round(a.y);
    const walkT = a.walking ? Math.floor(a.phase * 8) % 4 : 0;
    const bob = a.walking ? (walkT === 1 || walkT === 3 ? -1 : 0) : (Math.sin(a.phase * 1.8) > 0.6 ? -1 : 0);
    const sit = a.pose === 'sit' || a.pose === 'type';

    // shadow
    c.fillStyle = 'rgba(30,38,50,0.22)';
    LS.ellipse(c, X, Y + 1, 6, 2, 'rgba(30,38,50,0.20)');

    const bodyY = Y - 17 + bob;   // top of coat
    const headY = Y - 24 + bob;   // top of head

    /* legs */
    if (!sit) {
      const sw = a.walking ? [0, 1, 0, -1][walkT] : 0;
      px(c, X - 4, Y - 6 + Math.max(0, sw), 3, 6 - Math.max(0, sw), '#49525e');
      px(c, X + 1, Y - 6 + Math.max(0, -sw), 3, 6 - Math.max(0, -sw), '#49525e');
      px(c, X - 4, Y - 1, 3, 1, '#2c333c'); px(c, X + 1, Y - 1, 3, 1, '#2c333c');
    } else {
      px(c, X - 4, Y - 5, 8, 4, '#49525e'); px(c, X - 4, Y - 1, 8, 1, '#2c333c');
    }

    /* coat */
    px(c, X - 5, bodyY, 10, 12, L.coat);
    px(c, X - 5, bodyY, 10, 1, '#ffffff');
    px(c, X + 4, bodyY, 1, 12, L.coatS);
    px(c, X - 5, bodyY + 11, 10, 1, L.coatS);
    if (a.dir === 0) {
      px(c, X - 1, bodyY + 1, 2, 5, L.coatS);          // lapel split
      px(c, X - 3, bodyY + 7, 2, 2, L.coatS);          // pocket
      px(c, X + 1, bodyY + 7, 2, 2, L.coatS);
      px(c, X, bodyY + 4, 1, 1, L.accent);             // badge
    } else if (a.dir === 3) {
      px(c, X - 4, bodyY + 2, 8, 1, L.coatS);
    } else {
      px(c, a.dir === 1 ? X - 5 : X + 2, bodyY + 6, 3, 2, L.coatS);
    }

    /* arms + pose-specific props */
    const ax1 = X - 7, ax2 = X + 5;
    const swing = a.walking ? [0, -1, 0, 1][walkT] : 0;
    let lArmY = bodyY + 2 + swing, rArmY = bodyY + 2 - swing;
    let lh = 8, rh = 8;
    const pose = a.pose;

    if (pose === 'pipette') {
      const cyc = Math.sin(a.phase * 7);
      rArmY = bodyY + (cyc > 0 ? 0 : 1); rh = 7;
      lArmY = bodyY + 4; lh = 6;
      arm(c, ax1, lArmY, 2, lh, L.coat, '#ffffff');
      arm(c, ax2, rArmY, 2, rh, L.coat, '#ffffff');
      px(c, ax1, lArmY + lh, 2, 2, L.glove); px(c, ax2, rArmY + rh, 2, 2, L.glove);
      // pipette in right hand
      const pyy = rArmY + rh + 1;
      px(c, ax2, pyy, 1, 6, '#4b5560'); px(c, ax2, pyy - 2, 1, 2, P.blue); px(c, ax2, pyy + 6, 1, 2, '#e8eef2');
      // tube being filled
      px(c, ax2 - 3, pyy + 5, 2, 5, P.glass); px(c, ax2 - 3, pyy + 8, 2, 2, P.media);
    } else if (pose === 'pour') {
      arm(c, ax1, bodyY + 4, 2, 6, L.coat, '#ffffff');
      arm(c, ax2, bodyY + 1, 2, 6, L.coat, '#ffffff');
      px(c, ax2, bodyY + 7, 2, 2, L.glove);
      c.save(); c.translate(ax2 + 3, bodyY + 7); c.rotate(-0.5 + Math.sin(a.phase * 2) * 0.12);
      px(c, 0, -3, 4, 7, P.glass); px(c, 0, -1, 4, 5, P.gel); c.restore();
      px(c, ax2 + 5, bodyY + 10, 1, 4, 'rgba(215,167,232,0.8)');
    } else if (pose === 'type') {
      arm(c, ax1, bodyY + 4, 2, 5, L.coat, '#ffffff');
      arm(c, ax2, bodyY + 4, 2, 5, L.coat, '#ffffff');
      const k = Math.sin(a.phase * 12) > 0 ? 0 : 1;
      px(c, ax1, bodyY + 9 + k, 2, 2, L.skin); px(c, ax2, bodyY + 9 + (1 - k), 2, 2, L.skin);
    } else if (pose === 'carry') {
      arm(c, ax1, bodyY + 3, 2, 5, L.coat, '#ffffff');
      arm(c, ax2, bodyY + 3, 2, 5, L.coat, '#ffffff');
      px(c, ax1, bodyY + 8, 2, 2, L.glove); px(c, ax2, bodyY + 8, 2, 2, L.glove);
    } else if (pose === 'inspect') {
      arm(c, ax2, bodyY - 2, 2, 7, L.coat, '#ffffff');
      arm(c, ax1, bodyY + 4, 2, 6, L.coat, '#ffffff');
      px(c, ax2, bodyY + 5, 2, 2, L.glove);
      px(c, ax2 + 1, bodyY - 5, 2, 7, P.glass); px(c, ax2 + 1, bodyY - 2, 2, 4, P.beet);
    } else if (pose === 'clean') {
      const sw2 = Math.round(Math.sin(a.phase * 5) * 3);
      arm(c, ax2 + sw2, bodyY + 3, 2, 6, L.coat, '#ffffff');
      arm(c, ax1, bodyY + 4, 2, 5, L.coat, '#ffffff');
      px(c, ax2 + sw2 - 1, bodyY + 9, 4, 3, '#9ad6e8');
    } else if (pose === 'coffee') {
      arm(c, ax2, bodyY - 1, 2, 6, L.coat, '#ffffff');
      arm(c, ax1, bodyY + 4, 2, 5, L.coat, '#ffffff');
      px(c, ax2 - 1, bodyY - 3, 4, 3, '#e8eef2'); px(c, ax2 - 1, bodyY - 3, 4, 1, '#6b4a33');
      if (Math.sin(a.phase * 3) > 0) px(c, ax2, bodyY - 6, 1, 2, 'rgba(255,255,255,0.5)');
    } else if (pose === 'open' || pose === 'load') {
      const rr = Math.sin(a.phase * 3) * 1;
      arm(c, ax1, bodyY + 2, 2, 7, L.coat, '#ffffff');
      arm(c, ax2, bodyY + 2 + rr, 2, 7, L.coat, '#ffffff');
      px(c, ax2, bodyY + 9 + rr, 2, 2, L.glove);
    } else if (pose === 'search') {
      const look = Math.sin(a.phase * 2.2) * 2;
      arm(c, ax1 + look, bodyY + 3, 2, 6, L.coat, '#ffffff');
      arm(c, ax2 + look, bodyY + 3, 2, 6, L.coat, '#ffffff');
    } else {
      arm(c, ax1, lArmY, 2, lh, L.coat, '#ffffff');
      arm(c, ax2, rArmY, 2, rh, L.coat, '#ffffff');
      px(c, ax1, lArmY + lh, 2, 2, L.skin); px(c, ax2, rArmY + rh, 2, 2, L.skin);
    }

    /* carried item (rack / tray / gel box) */
    if (a.carry && (pose === 'carry' || pose === 'walk' || pose === 'idle')) {
      const iy = bodyY + 7, ix = X - 5;
      if (a.dir !== 3) {
        if (a.carry === 'rack') { px(c, ix, iy, 10, 4, '#6e7a86'); for (let i = 0; i < 3; i++) px(c, ix + 1 + i * 3, iy - 3, 2, 4, P.media); }
        else if (a.carry === 'gel') { px(c, ix, iy, 10, 4, '#cfd8e0'); px(c, ix + 2, iy - 1, 6, 3, P.gel); }
        else if (a.carry === 'plate') { px(c, ix, iy, 10, 4, '#e7ecf1'); for (let i = 0; i < 4; i++) px(c, ix + 1 + i * 2, iy + 1, 1, 1, P.beet); }
        else if (a.carry === 'flask') { px(c, ix + 3, iy - 3, 4, 3, P.glass); px(c, ix + 2, iy, 6, 4, P.media); }
        else px(c, ix + 3, iy - 1, 4, 5, P.glass);
      }
    }

    /* head */
    px(c, X - 4, headY, 8, 8, L.skin);
    px(c, X - 4, headY + 7, 8, 1, L.skinS);
    px(c, X - 4, headY, 8, 3, L.hair);
    px(c, X - 5, headY + 1, 1, 5, L.hair); px(c, X + 4, headY + 1, 1, 5, L.hair);
    px(c, X - 4, headY, 8, 1, L.hairL);
    if (a.dir === 0) {
      px(c, X - 3, headY + 4, 1, 1, P.dark); px(c, X + 2, headY + 4, 1, 1, P.dark);
      if (Math.sin(a.phase * 0.9 + 1) > 0.985) { px(c, X - 3, headY + 4, 1, 1, L.skin); px(c, X + 2, headY + 4, 1, 1, L.skin); }
      px(c, X - 1, headY + 6, 2, 1, L.skinS);
      // goggles pushed up on the forehead
      px(c, X - 4, headY + 2, 8, 1, 'rgba(160,220,230,0.75)');
    } else if (a.dir === 1) {
      px(c, X - 3, headY + 4, 1, 1, P.dark); px(c, X - 4, headY + 5, 2, 1, L.skinS);
      px(c, X + 1, headY + 1, 4, 6, L.hair);
    } else if (a.dir === 2) {
      px(c, X + 2, headY + 4, 1, 1, P.dark); px(c, X + 2, headY + 5, 2, 1, L.skinS);
      px(c, X - 5, headY + 1, 4, 6, L.hair);
    } else {
      px(c, X - 4, headY, 8, 6, L.hair); px(c, X - 4, headY, 8, 1, L.hairL);
      px(c, X - 1, headY + 6, 2, 2, L.skin);
    }
    // ponytail
    if (a.dir !== 0) px(c, a.dir === 1 ? X + 3 : X - 5, headY + 3, 2, 5, L.hair);
    else px(c, X - 1, headY - 1, 2, 2, L.hairL);

    /* thought bubble */
    if (a.bubble && a.bubbleT > 0) A.bubble(c, X, headY - 4, a.bubble);
  };

  A.bubble = function (c, x, y, text) {
    const lines = String(text).split('|');
    const w = Math.max(...lines.map((l) => LS.textW(l, 1))) + 6;
    const h = lines.length * 7 + 4;
    const bx = Math.round(LS.clamp(x - w / 2, 2, W.W - w - 2)), by = y - h - 3;
    c.fillStyle = 'rgba(248,251,253,0.95)';
    c.fillRect(bx, by, w, h);
    c.fillRect(bx + 1, by - 1, w - 2, h + 2);
    c.fillStyle = 'rgba(120,132,148,0.9)';
    c.fillRect(bx, by - 1, w, 1); c.fillRect(bx, by + h, w, 1);
    c.fillStyle = 'rgba(248,251,253,0.95)';
    c.fillRect(x - 2, by + h, 3, 2); c.fillRect(x - 1, by + h + 2, 2, 2);
    lines.forEach((l, i) => LS.text(c, l, bx + 3, by + 3 + i * 7, '#39424e', 1));
  };

  /* ---------------- portrait bust ---------------- */
  A.bust = function (c, a, t, mood) {
    const L = a.look;
    c.clearRect(0, 0, 48, 48);
    px(c, 0, 0, 48, 48, '#1d2430');
    for (let i = 0; i < 48; i += 4) px(c, 0, i, 48, 1, 'rgba(255,255,255,0.015)');
    const X = 24, Y = 40, bob = Math.sin(t * 1.6) > 0.7 ? -1 : 0;
    // shoulders
    px(c, X - 14, Y - 10 + bob, 28, 12, L.coat);
    px(c, X - 14, Y - 10 + bob, 28, 2, '#ffffff');
    px(c, X - 3, Y - 10 + bob, 6, 12, L.coatS);
    px(c, X - 1, Y - 6 + bob, 2, 2, L.accent);
    // head
    const hy = Y - 30 + bob;
    px(c, X - 9, hy, 18, 20, L.skin);
    px(c, X - 9, hy + 18, 18, 2, L.skinS);
    px(c, X - 9, hy, 18, 6, L.hair); px(c, X - 11, hy + 2, 2, 13, L.hair); px(c, X + 9, hy + 2, 2, 13, L.hair);
    px(c, X - 9, hy, 18, 2, L.hairL);
    const blink = Math.sin(t * 0.8) > 0.97;
    px(c, X - 6, hy + 9, 3, blink ? 1 : 3, '#2a2f38'); px(c, X + 3, hy + 9, 3, blink ? 1 : 3, '#2a2f38');
    px(c, X - 6, hy + 8, 3, 1, L.hair); px(c, X + 3, hy + 8, 3, 1, L.hair);
    px(c, X - 1, hy + 13, 2, 2, L.skinS);
    // mouth by mood
    const m = mood || 'ok';
    if (m === 'good') { px(c, X - 3, hy + 16, 6, 1, '#8d5f52'); px(c, X - 4, hy + 15, 1, 1, '#8d5f52'); px(c, X + 3, hy + 15, 1, 1, '#8d5f52'); }
    else if (m === 'bad') { px(c, X - 3, hy + 16, 6, 1, '#8d5f52'); px(c, X - 4, hy + 17, 1, 1, '#8d5f52'); px(c, X + 3, hy + 17, 1, 1, '#8d5f52'); }
    else px(c, X - 2, hy + 16, 4, 1, '#8d5f52');
    // goggles on forehead
    px(c, X - 10, hy + 3, 20, 3, 'rgba(150,215,225,0.8)');
    px(c, X - 10, hy + 3, 20, 1, 'rgba(255,255,255,0.5)');
  };

  /* ---------------- lab cat ---------------- */
  A.makeCat = function (tx, ty) {
    return { x: (tx + 0.5) * T, y: (ty + 0.9) * T, dir: 2, path: null, wp: 0, phase: 0, active: false, naughty: 0 };
  };
  A.drawCat = function (c, k, t) {
    const X = Math.round(k.x), Y = Math.round(k.y);
    LS.ellipse(c, X, Y, 5, 2, 'rgba(30,38,50,0.18)');
    const bob = k.path ? (Math.floor(k.phase * 9) % 2 ? -1 : 0) : 0;
    const B = '#3d3a46', B2 = '#56525f';
    px(c, X - 5, Y - 6 + bob, 10, 5, B);
    px(c, X - 5, Y - 6 + bob, 10, 1, B2);
    px(c, X - 4, Y - 1 + bob, 2, 2, B); px(c, X + 2, Y - 1 + bob, 2, 2, B);
    const tw = Math.sin(t * 4) * 2;
    px(c, X + 4, Y - 9 + bob + tw, 2, 4, B);
    const hx = k.dir === 1 ? X - 7 : X + 3;
    px(c, hx, Y - 10 + bob, 5, 5, B);
    px(c, hx, Y - 11 + bob, 1, 2, B); px(c, hx + 4, Y - 11 + bob, 1, 2, B);
    px(c, hx + (k.dir === 1 ? 0 : 3), Y - 8 + bob, 1, 1, '#9ee6a0');
    px(c, hx + (k.dir === 1 ? 2 : 1), Y - 8 + bob, 1, 1, '#9ee6a0');
    if (k.bubble && k.bubbleT > 0) A.bubble(c, X, Y - 14, k.bubble);
  };

  /* ---------------- assistant ---------------- */
  A.makeAssistant = function (tx, ty) {
    const a = A.make(tx, ty, { coat: '#eaf0f5', coatS: '#ccd6df', hair: '#2f2a26', hairL: '#453c35', skin: '#c98f63', skinS: '#a9744c', accent: P.pink });
    a.speedPx = 22;
    return a;
  };
})();
