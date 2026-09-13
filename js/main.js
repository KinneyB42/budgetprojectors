/* Budget Projectors — mobile nav + throw-distance room planner (vanilla JS) */
(function () {
  'use strict';

  /* Mobile nav toggle */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* Throw-distance room planner — per-model ratios from js/throw-data.js.
     16:9: width = diagonal * 0.8716, height = diagonal * 0.4903. */
  var WIDTH_FACTOR = 0.8716; // 16:9 width as fraction of diagonal
  var HEIGHT_FACTOR = 0.4903; // 16:9 height as fraction of diagonal
  var THROW = window.THROW_DATA || [];

  function fmt(n, digits) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }

  /* ---------- Model picker ---------- */
  var selectedModel = null; // {b, m, t:[min,max]}
  var modelInput = document.getElementById('calc-model');
  var suggest = document.getElementById('calc-suggest');
  var selectedLine = document.getElementById('calc-selected');
  var manualBox = document.getElementById('calc-manual');
  var manualToggle = document.getElementById('calc-manual-toggle');
  var ratioMinInput = document.getElementById('calc-ratio-min');
  var ratioMaxInput = document.getElementById('calc-ratio-max');
  var countSpan = document.getElementById('calc-model-count');
  if (countSpan) countSpan.textContent = THROW.length;

  function ratioLabel(t) {
    function r2(n) { return fmt(n, 2).replace(/\.?0+$/, ''); }
    if (t[0] === t[1]) return r2(t[0]) + ':1';
    return r2(t[0]) + '–' + r2(t[1]) + ':1';
  }

  function currentRatio() {
    if (manualBox && !manualBox.hidden) {
      var a = parseFloat(ratioMinInput.value, 10);
      var b = parseFloat(ratioMaxInput.value, 10);
      if (a > 0 && b > 0) return [Math.min(a, b), Math.max(a, b)];
      return null;
    }
    return selectedModel ? selectedModel.t : null;
  }

  function clearModelChips() {
    document.querySelectorAll('.calc__chip[data-model]').forEach(function (c) {
      c.classList.remove('chosen');
    });
  }

  function chooseModel(entry, chip) {
    selectedModel = entry;
    if (modelInput) modelInput.value = entry.b + ' ' + entry.m;
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    if (manualBox) manualBox.hidden = true;
    clearModelChips();
    if (chip) chip.classList.add('chosen');
    if (selectedLine) {
      selectedLine.hidden = false;
      selectedLine.textContent = 'Using ' + entry.b + ' ' + entry.m + ' · throw ' + ratioLabel(entry.t);
    }
    recalc();
  }

  function renderSuggest(q) {
    if (!suggest || !modelInput) return;
    if (q.length < 2) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    var matches = THROW.filter(function (x) {
      return (x.b + ' ' + x.m).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
    if (!matches.length) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    suggest.innerHTML = '';
    matches.forEach(function (x) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      var brand = document.createElement('span');
      brand.className = 'calc__suggest-brand';
      brand.textContent = x.b;
      btn.appendChild(brand);
      btn.appendChild(document.createTextNode(x.m + ' · ' + ratioLabel(x.t)));
      btn.addEventListener('click', function () { chooseModel(x, null); });
      suggest.appendChild(btn);
    });
    suggest.hidden = false;
    modelInput.setAttribute('aria-expanded', 'true');
  }

  if (modelInput) {
    modelInput.addEventListener('input', function () {
      selectedModel = null;
      if (selectedLine) selectedLine.hidden = true;
      clearModelChips();
      renderSuggest(modelInput.value.trim().toLowerCase());
      recalc();
    });
    modelInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && suggest) { suggest.hidden = true; }
    });
    document.addEventListener('click', function (e) {
      if (suggest && !suggest.hidden && !suggest.contains(e.target) && e.target !== modelInput) {
        suggest.hidden = true;
      }
    });
  }

  document.querySelectorAll('.calc__chip[data-model]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var want = chip.getAttribute('data-model');
      var found = null;
      THROW.forEach(function (x) {
        if ((x.b + ' ' + x.m) === want) found = x;
      });
      if (found) chooseModel(found, chip);
    });
  });

  if (manualToggle) {
    manualToggle.addEventListener('click', function () {
      selectedModel = null;
      if (modelInput) modelInput.value = '';
      if (selectedLine) selectedLine.hidden = true;
      clearModelChips();
      if (suggest) suggest.hidden = true;
      manualBox.hidden = !manualBox.hidden;
      recalc();
    });
  }
  [ratioMinInput, ratioMaxInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });

  /* ---------- Room planner ---------- */
  var ROOMS = {
    living: { label: 'Living Room', len: 18, wid: 14, ceil: 9,
      tip: 'Living rooms usually have some ambient light. A low-gain or ALR screen helps the image hold up with the lights on.' },
    bedroom: { label: 'Bedroom', len: 14, wid: 12, ceil: 8,
      tip: 'Smaller rooms suit short-throw models. Keep the projector ventilated and out of the walkway.' },
    dedicated: { label: 'Dedicated Space', len: 20, wid: 15, ceil: 9,
      tip: 'Light-controlled rooms get the most from any projector. Dark walls and ceiling boost perceived contrast.' },
    garage: { label: 'Garage', len: 22, wid: 20, ceil: 10,
      tip: 'Garages often have ambient light and light-colored walls, so brightness matters more than contrast here.' },
    outdoors: { label: 'Outdoors', len: 0, wid: 0, ceil: 0,
      tip: 'Outside there are no walls to bounce light, so lumens matter most. Plan for after dark and keep the projector dry.' }
  };
  var roomType = 'living';

  var lenInput = document.getElementById('calc-room-len');
  var widInput = document.getElementById('calc-room-wid');
  var ceilInput = document.getElementById('calc-room-ceil');
  var dimsBox = document.getElementById('calc-dims');
  var roomTip = document.getElementById('calc-room-tip');
  var sizeInput = document.getElementById('calc-size');
  var seatInput = document.getElementById('calc-seat');
  var planResult = document.getElementById('calc-plan-result');
  var svg = document.getElementById('calc-svg');

  function setRoom(type) {
    roomType = type;
    document.querySelectorAll('.calc__chip[data-room]').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-room') === type);
    });
    var R = ROOMS[type];
    var outdoor = type === 'outdoors';
    if (dimsBox) dimsBox.style.display = outdoor ? 'none' : '';
    if (!outdoor && R.len) {
      if (lenInput) lenInput.value = R.len;
      if (widInput) widInput.value = R.wid;
      if (ceilInput) ceilInput.value = R.ceil;
    }
    if (roomTip) roomTip.textContent = R.tip;
    recalc();
  }

  document.querySelectorAll('.calc__chip[data-room]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setRoom(chip.getAttribute('data-room'));
    });
  });

  [lenInput, widInput, ceilInput, sizeInput, seatInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });

  function fmtDist(inches) {
    var ft = inches / 12;
    if (inches < 36) return fmt(inches, 0) + ' in';
    return fmt(ft, 1) + ' ft';
  }

  function recalc() {
    if (!planResult || !svg) return;
    var r = currentRatio();
    var diag = sizeInput ? parseFloat(sizeInput.value, 10) : NaN;
    var seat = seatInput ? parseFloat(seatInput.value, 10) : NaN;
    var outdoor = roomType === 'outdoors';
    var L = outdoor ? 30 : (lenInput ? parseFloat(lenInput.value, 10) : NaN);
    var W = outdoor ? 24 : (widInput ? parseFloat(widInput.value, 10) : NaN);
    var H = outdoor ? 0 : (ceilInput ? parseFloat(ceilInput.value, 10) : NaN);
    if (!(L > 0)) L = 18; if (!(W > 0)) W = 14; if (!(H >= 0)) H = 9;

    drawViz({ L: L, W: W, H: H, outdoor: outdoor, diag: diag, r: r, seat: seat });

    if (!r) {
      planResult.innerHTML = '<strong>Pick your projector model</strong>' +
        '<span>Choose your model from the list above (or enter its throw ratio manually) and your room plan will appear here.</span>';
      return;
    }
    if (!(diag > 0)) {
      planResult.innerHTML = '<strong>Enter a screen size</strong>' +
        '<span>Type the screen diagonal you want and the planner will show throw distance, seating, and whether it fits your room.</span>';
      return;
    }

    var wIn = diag * WIDTH_FACTOR;
    var hIn = diag * HEIGHT_FACTOR;
    var near = wIn * r[0] / 12; // ft
    var far = wIn * r[1] / 12; // ft
    var ust = r[1] < 1;
    var modelName = selectedModel ? selectedModel.b + ' ' + selectedModel.m : 'throw ' + ratioLabel(r);

    // Reference viewing distance from viewing angle: 36 deg (immersive) to 30 deg (SMPTE minimum).
    var dClose = (wIn / 2) / Math.tan(18 * Math.PI / 180) / 12; // ft
    var dFarV = (wIn / 2) / Math.tan(15 * Math.PI / 180) / 12; // ft

    var bits = [];
    bits.push('Screen: ' + fmt(diag, 0) + '&Prime; 16:9 (' + fmt(wIn, 1) + '&Prime; wide).');
    bits.push('Reference seating: ' + fmt(dClose, 1) + '–' + fmt(dFarV, 1) +
      ' ft from the screen (30–36&deg; viewing angle, SMPTE/THX guidance).');
    if (seat > 0) {
      if (seat < dClose) bits.push('Your seating (' + fmt(seat, 1) + ' ft) is closer than the reference range: extra immersive.');
      else if (seat > dFarV) bits.push('Your seating (' + fmt(seat, 1) + ' ft) is farther than the reference range: the image may feel small.');
      else bits.push('Your seating (' + fmt(seat, 1) + ' ft) lands inside the reference range.');
    }
    if (!outdoor) {
      var maxW = Math.min(L * 12 / r[1], (W - 1) * 12);
      var maxDiag = maxW / WIDTH_FACTOR;
      if (far <= L && wIn / 12 <= W - 1) {
        bits.push('It fits your ' + ROOMS[roomType].label.toLowerCase() + '.');
      } else {
        bits.push('Too big for this room: the largest screen that fits is about ' +
          fmt(maxDiag, 0) + '&Prime;.');
      }
    } else {
      bits.push('No walls to worry about outdoors, just keep the throw path clear.');
    }
    if (ust) bits.push('Ultra-short-throw: measure from the wall, not the lens.');
    bits.push(ROOMS[roomType].tip);

    var throwStr = fmtDist(wIn * r[0]);
    var placeStr;
    if (r[0] === r[1]) {
      placeStr = 'Place the ' + modelName + ' ' + throwStr + ' from a ' +
        fmt(diag, 0) + '&Prime; screen. ';
    } else {
      throwStr += ' – ' + fmtDist(wIn * r[1]);
      placeStr = 'Place the ' + modelName + ' between ' + fmtDist(wIn * r[0]) + ' and ' +
        fmtDist(wIn * r[1]) + ' from a ' + fmt(diag, 0) + '&Prime; screen. ';
    }

    planResult.innerHTML =
      '<strong>' + throwStr + ' throw</strong>' +
      '<span>' + placeStr + bits.join(' ') + '</span>';
  }

  /* ---------- Isometric 3D room visualization (SVG) ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var NAVY = '#0c2244', MUTED = '#5c5c5c';

  function drawViz(o) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var VW = 660, VH = 440, pad = 34;
    var L = o.L, W = o.W, H = o.H;

    function raw(x, y, z) { return [(y - x) * 0.8660254, (x + y) * 0.5 - z]; }
    var corners = [[0,0,0],[L,0,0],[0,W,0],[L,W,0],[0,0,H],[L,0,H],[0,W,H],[L,W,H]];
    var rp = corners.map(function (c) { return raw(c[0], c[1], c[2]); });
    var xs = rp.map(function (p) { return p[0]; });
    var ys = rp.map(function (p) { return p[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var s = Math.min((VW - 2 * pad) / (maxX - minX), (VH - 2 * pad) / (maxY - minY));
    var ox = pad + (VW - 2 * pad - (maxX - minX) * s) / 2 - minX * s;
    var oy = pad + (VH - 2 * pad - (maxY - minY) * s) / 2 - minY * s;
    function P(x, y, z) { var q = raw(x, y, z); return [ox + q[0] * s, oy + q[1] * s]; }
    function el(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg.appendChild(e); return e;
    }
    function poly(pts3, fill, extra) {
      var a = { points: pts3.map(function (p) { var q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '), fill: fill, stroke: 'none' };
      if (extra) for (var k in extra) a[k] = extra[k];
      return el('polygon', a);
    }
    function txt(x, y, z, str, size) {
      var q = P(x, y, z);
      var t = el('text', { x: q[0].toFixed(1), y: q[1].toFixed(1), 'text-anchor': 'middle', 'font-size': size || 12, fill: MUTED });
      t.textContent = str; return t;
    }
    function box(cx, cy, cz, dx, dy, dz, cTop, cX, cY) {
      var x0 = cx - dx / 2, x1 = cx + dx / 2;
      var y0 = cy - dy / 2, y1 = cy + dy / 2;
      var z0 = cz - dz / 2, z1 = cz + dz / 2;
      poly([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], cTop); // top
      poly([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]], cX); // +x face
      poly([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], cY); // +y face
    }

    // Floor and walls
    poly([[0,0,0],[L,0,0],[L,W,0],[0,W,0]], o.outdoor ? '#e9e4d4' : '#efe9dc');
    if (H > 0) {
      poly([[0,0,0],[0,W,0],[0,W,H],[0,0,H]], '#e3dccb'); // screen wall (x=0)
      poly([[0,0,0],[L,0,0],[L,0,H],[0,0,H]], '#d8d0bc'); // side wall (y=0)
    }
    txt(L / 2, -0.6, 0, fmt(L, 0) + ' ft', 12);
    txt(-0.6, W / 2, 0, fmt(W, 0) + ' ft', 12);

    var hasScreen = o.diag > 0;
    var sw = 0, sh = 0, z0 = 2, zc = 3, yc = W / 2;
    if (hasScreen) {
      sw = o.diag * WIDTH_FACTOR / 12; // ft
      sh = o.diag * HEIGHT_FACTOR / 12; // ft
      z0 = 2;
      if (H > 0 && z0 + sh > H - 0.5) z0 = Math.max(0.5, H - sh - 0.5);
      zc = z0 + sh / 2;
      var yA = yc - sw / 2, yB = yc + sw / 2;
      // screen
      poly([[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]], '#ffffff', { stroke: NAVY, 'stroke-width': 2 });
      txt(0, yc, z0 + sh + 0.7, fmt(o.diag, 0) + '" screen', 12);
      if (o.outdoor) {
        // simple stand legs
        box(0.15, yA + 0.3, z0 / 2, 0.25, 0.25, z0, '#8a8474', '#7a7466', '#6e695c');
        box(0.15, yB - 0.3, z0 / 2, 0.25, 0.25, z0, '#8a8474', '#7a7466', '#6e695c');
      }
    }

    if (hasScreen && o.r) {
      var ust = o.r[1] < 1;
      var near = o.diag * WIDTH_FACTOR / 12 * o.r[0]; // ft
      var far = o.diag * WIDTH_FACTOR / 12 * o.r[1]; // ft
      // throw range zone on the floor
      poly([[near,yc-1.1,0.02],[far,yc-1.1,0.02],[far,yc+1.1,0.02],[near,yc+1.1,0.02]], NAVY, { opacity: 0.10 });
      // projector at the near end
      var zp = ust ? 1 : zc;
      box(near, yc, zp, 1.1, 0.9, 0.55, '#24406e', NAVY, '#081a38');
      txt(near, yc, zp + 0.9, 'projector', 11);
      var rangeLabel = fmtDist(o.diag * WIDTH_FACTOR * o.r[0]);
      if (o.r[1] !== o.r[0]) rangeLabel += '–' + fmtDist(o.diag * WIDTH_FACTOR * o.r[1]);
      txt((near + far) / 2, yc - 1.5, 0.05, rangeLabel, 11);
      // light cone: lens to screen corners
      var lens = [near, yc, zp];
      var sc = [[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]];
      for (var i = 0; i < 4; i++) {
        poly([lens, sc[i], sc[(i + 1) % 4]], NAVY, { opacity: 0.055 });
      }
      // seating
      if (o.seat > 0) {
        var sx = Math.min(o.seat, o.outdoor ? L - 1 : L - 0.5);
        box(sx, yc, 0.7, 1.7, 1.7, 1.4, '#9aa5bd', '#7c88a3', '#6b7690'); // seat
        box(sx + 0.95, yc, 1.6, 0.45, 1.7, 3.2, '#9aa5bd', '#7c88a3', '#6b7690'); // backrest
        txt(sx, yc, 3.9, fmt(o.seat, 1) + ' ft seating', 11);
      }
    } else if (!hasScreen) {
      txt(L / 2, W / 2, 1, o.r ? 'Enter a screen size to place the screen.' : 'Pick a model and enter a screen size.', 13);
    } else {
      txt(L / 2, W / 2, 1, 'Pick your projector model to place it in the room.', 13);
    }
  }

  // init
  setRoom('living');
})();
