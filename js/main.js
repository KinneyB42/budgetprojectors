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

  /* ---------- Golf simulator mode ---------- */
  var golfMode = false;
  var golfToggle = document.getElementById('calc-golf-toggle');
  var golfWrap = document.getElementById('calc-golf-wrap');
  var diagWrap = document.getElementById('calc-diag-wrap');
  var wInput = document.getElementById('calc-screen-w');
  var hInput = document.getElementById('calc-screen-h');
  var aspectSel = document.getElementById('calc-aspect');
  var PROJ_AR = 16 / 9; // projector native aspect
  var STD_ARS = [[16, 9], [16, 10], [4, 3], [1, 1]];

  function aspectLabel(wIn, hIn) {
    if (aspectSel && aspectSel.value !== 'custom') return aspectSel.value;
    return fmt(wIn / hIn, 2) + ':1';
  }

  function syncAspectFromDims() {
    if (!aspectSel || !wInput || !hInput) return;
    var w = parseFloat(wInput.value, 10), h = parseFloat(hInput.value, 10);
    if (!(w > 0) || !(h > 0)) return;
    var ar = w / h, matched = 'custom';
    STD_ARS.forEach(function (s) {
      if (Math.abs(ar - s[0] / s[1]) / (s[0] / s[1]) < 0.005) matched = s[0] + ':' + s[1];
    });
    aspectSel.value = matched;
  }

  function applyAspect() {
    if (!aspectSel || !wInput || !hInput || aspectSel.value === 'custom') return;
    var w = parseFloat(wInput.value, 10);
    if (!(w > 0)) return;
    var parts = aspectSel.value.split(':');
    hInput.value = fmt(w * parseFloat(parts[1], 10) / parseFloat(parts[0], 10), 1);
  }

  if (golfToggle) {
    golfToggle.addEventListener('click', function () {
      golfMode = !golfMode;
      golfToggle.classList.toggle('chosen', golfMode);
      golfToggle.setAttribute('aria-pressed', golfMode ? 'true' : 'false');
      if (golfWrap) golfWrap.hidden = !golfMode;
      if (diagWrap) diagWrap.style.display = golfMode ? 'none' : '';
      var seatLabel = document.getElementById('calc-seat-label');
      if (seatLabel) seatLabel.textContent = golfMode ? 'Hitting distance from screen (ft)' : 'Seating distance (ft)';
      var vizTitle = document.getElementById('calc-viz-title');
      if (vizTitle) vizTitle.textContent = golfMode ? 'Simulator preview' : 'Room preview';
      recalc();
    });
  }

  /* ---------- Golf-sim projector placement ---------- */
  var placement = 'ceiling';
  document.querySelectorAll('#calc-placement .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      placement = chip.getAttribute('data-place');
      document.querySelectorAll('#calc-placement .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c === chip);
      });
      recalc();
    });
  });
  if (aspectSel) aspectSel.addEventListener('change', function () { applyAspect(); recalc(); });
  [wInput, hInput].forEach(function (el) {
    if (el) el.addEventListener('input', function () { syncAspectFromDims(); recalc(); });
  });

  /* ---------- Lights on/off for the 3D preview ---------- */
  var lightsOn = true;
  var lightsToggle = document.getElementById('calc-lights-toggle');
  if (lightsToggle) {
    lightsToggle.addEventListener('click', function () {
      lightsOn = !lightsOn;
      lightsToggle.textContent = lightsOn ? 'Lights: On' : 'Lights: Off';
      lightsToggle.setAttribute('aria-pressed', lightsOn ? 'true' : 'false');
      recalc();
    });
  }

  /* ---------- Sunlight toggle: warm daytime scene + ALR advice ---------- */
  var sunOn = false;
  var sunToggle = document.getElementById('calc-sun-toggle');
  if (sunToggle) {
    sunToggle.addEventListener('click', function () {
      sunOn = !sunOn;
      sunToggle.textContent = sunOn ? 'Sunlight: On' : 'Sunlight: Off';
      sunToggle.setAttribute('aria-pressed', sunOn ? 'true' : 'false');
      recalc();
    });
  }

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

    if (!r) {
      drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: null, seat: seat, room: roomType, golf: golfMode });
      planResult.innerHTML = '<strong>Pick your projector model</strong>' +
        '<span>Choose your model from the list above (or enter its throw ratio manually) and your room plan will appear here.</span>';
      return;
    }

    // Screen size: diagonal in standard mode, width x height in golf-sim mode.
    var scrWIn = 0, scrHIn = 0, imgWIn = 0, arWarn = '', scrLabel = '';
    if (golfMode) {
      var wFt = wInput ? parseFloat(wInput.value, 10) : NaN;
      var hFt = hInput ? parseFloat(hInput.value, 10) : NaN;
      if (!(wFt > 0) || !(hFt > 0)) {
        drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType, golf: golfMode });
        planResult.innerHTML = '<strong>Enter your screen dimensions</strong>' +
          '<span>Type the screen width and height for your golf simulator and the planner will do the rest.</span>';
        return;
      }
      scrWIn = wFt * 12; scrHIn = hFt * 12;
      var scrAR = scrWIn / scrHIn;
      var aLabel = aspectLabel(scrWIn, scrHIn);
      scrLabel = fmt(wFt, 1) + ' x ' + fmt(hFt, 1) + ' ft (' + aLabel + ')';
      if (Math.abs(scrAR - PROJ_AR) / PROJ_AR < 0.01) {
        imgWIn = scrWIn;
      } else if (scrAR < PROJ_AR) {
        // Narrower screen (4:3, 1:1): 16:9 image fills the width, height is reduced.
        imgWIn = scrWIn;
        var imgH = scrWIn / PROJ_AR;
        arWarn = 'Heads up: a 16:9 projector on a ' + aLabel + ' screen will not fill the full height. ' +
          'The picture will be ' + fmt(imgH, 1) + '&Prime; tall on a ' + fmt(scrHIn, 1) +
          '&Prime; tall screen, with black bars top and bottom.';
      } else {
        // Wider screen: image fills the height, width is reduced.
        imgWIn = scrHIn * PROJ_AR;
        arWarn = 'Heads up: a 16:9 projector on a ' + aLabel + ' screen will not fill the full width. ' +
          'The picture will be ' + fmt(imgWIn, 1) + '&Prime; wide on a ' + fmt(scrWIn, 1) +
          '&Prime; wide screen, with black bars on the sides.';
      }
    } else {
      if (!(diag > 0)) {
        drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType, golf: golfMode });
        planResult.innerHTML = '<strong>Enter a screen size</strong>' +
          '<span>Type the screen diagonal you want and the planner will show throw distance, seating, and whether it fits your room.</span>';
        return;
      }
      scrWIn = diag * WIDTH_FACTOR; scrHIn = diag * HEIGHT_FACTOR;
      imgWIn = scrWIn;
      scrLabel = fmt(diag, 0) + '&Prime; 16:9';
    }

    drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: scrWIn / 12, shFt: scrHIn / 12,
      scrLabel: scrLabel, imgWIn: imgWIn, r: r, seat: seat, room: roomType, golf: golfMode,
      px: px, py: py, pz: pz, pmount: pmount });

    var near = imgWIn * r[0] / 12; // ft
    var far = imgWIn * r[1] / 12; // ft
    var ust = r[1] < 1;
    var modelName = selectedModel ? selectedModel.b + ' ' + selectedModel.m : 'throw ' + ratioLabel(r);

    // Golf-sim projector placement (also drives the 3D projector position).
    var hitD = seat; // hitting distance from the screen, ft
    var px = near, py = W / 2, pz = ust ? 1 : 3, pmount = false;
    if (golfMode) {
      if (placement === 'ceiling') {
        px = near; pz = H > 0 ? Math.max(H - 0.9, 2) : 6; pmount = H > 0;
      } else if (placement === 'floor') {
        px = near; pz = 0.6;
      } else { // next to golfer
        px = Math.min(hitD > 0 ? hitD : near, L - 0.5);
        py = Math.min(W / 2 + 2.8, W - 1);
        pz = 0.6;
      }
    }

    // Reference viewing distance from viewing angle: 36 deg (immersive) to 30 deg (SMPTE minimum).
    var dClose = (imgWIn / 2) / Math.tan(18 * Math.PI / 180) / 12; // ft
    var dFarV = (imgWIn / 2) / Math.tan(15 * Math.PI / 180) / 12; // ft

    var bits = [];
    bits.push('Screen: ' + scrLabel + '.');
    if (sunOn) bits.push('With sunlight in the room, use an ALR (ambient light rejecting) screen. ' +
      'A standard white screen washes out in daylight, while an ALR screen preserves contrast and brightness.');
    if (arWarn) bits.push(arWarn);
    bits.push('Reference seating: ' + fmt(dClose, 1) + '–' + fmt(dFarV, 1) +
      ' ft from the screen (30–36&deg; viewing angle, SMPTE/THX guidance).');
    if (seat > 0 && !golfMode) {
      if (seat < dClose) bits.push('Your seating (' + fmt(seat, 1) + ' ft) is closer than the reference range: extra immersive.');
      else if (seat > dFarV) bits.push('Your seating (' + fmt(seat, 1) + ' ft) is farther than the reference range: the image may feel small.');
      else bits.push('Your seating (' + fmt(seat, 1) + ' ft) lands inside the reference range.');
    }
    if (!outdoor) {
      var maxW = Math.min(L * 12 / r[1], (W - 1) * 12);
      if (far <= L && scrWIn / 12 <= W - 1) {
        bits.push('It fits your ' + ROOMS[roomType].label.toLowerCase() + '.');
      } else if (golfMode) {
        bits.push('Too big for this room: the widest screen that fits is about ' + fmt(maxW / 12, 1) + ' ft wide.');
      } else {
        bits.push('Too big for this room: the largest screen that fits is about ' +
          fmt(maxW / WIDTH_FACTOR, 0) + '&Prime;.');
      }
    } else {
      bits.push('No walls to worry about outdoors, just keep the throw path clear.');
    }
    if (ust) bits.push('Ultra-short-throw: measure from the wall, not the lens.');
    bits.push(ROOMS[roomType].tip);

    var imgRef = golfMode ? 'the ' + fmt(imgWIn, 1) + '&Prime;-wide image' : 'a ' + fmt(diag, 0) + '&Prime; screen';
    var throwStr = fmtDist(imgWIn * r[0]);
    var placeStr;
    if (golfMode && placement === 'golfer') {
      if (hitD > 0 && hitD >= near - 0.05 && hitD <= far + 0.05) {
        placeStr = 'The ' + modelName + ' works next to the golfer: set it beside the hitting mat, about ' +
          fmt(hitD, 1) + ' ft from the screen. ';
      } else if (hitD > 0) {
        placeStr = 'Heads up: at a ' + fmt(hitD, 1) + ' ft hitting distance the ' + modelName + ' needs ' +
          fmt(near, 1) + '–' + fmt(far, 1) + ' ft of throw, so it will not focus properly next to the golfer. ';
      } else {
        placeStr = 'Enter your hitting distance to check the next-to-golfer placement. ';
      }
    } else if (golfMode) {
      var how = placement === 'ceiling' ? 'Ceiling-mount' : 'Place on the floor';
      if (r[0] === r[1]) {
        placeStr = how + ' the ' + modelName + ' ' + throwStr + ' from ' + imgRef + '. ';
      } else {
        throwStr += ' – ' + fmtDist(imgWIn * r[1]);
        placeStr = how + ' the ' + modelName + ' between ' + fmtDist(imgWIn * r[0]) + ' and ' +
          fmtDist(imgWIn * r[1]) + ' from ' + imgRef + '. ';
      }
      if (placement === 'floor') placeStr += 'Keep it behind the hitting area and shielded from errant shots. ';
    } else if (r[0] === r[1]) {
      placeStr = 'Place the ' + modelName + ' ' + throwStr + ' from ' + imgRef + '. ';
    } else {
      throwStr += ' – ' + fmtDist(imgWIn * r[1]);
      placeStr = 'Place the ' + modelName + ' between ' + fmtDist(imgWIn * r[0]) + ' and ' +
        fmtDist(imgWIn * r[1]) + ' from ' + imgRef + '. ';
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

    // Palette: sunlight wins over the lights switch.
    var scene = sunOn ? 'sun' : (lightsOn ? 'day' : 'night');
    var pal = scene === 'night' ? {
      bg: '#0e1320', floor: o.outdoor ? '#1c2233' : '#1a2133', wallA: '#232c44', wallB: '#1d2438',
      beam: '#d6e4ff', coneOp: 0.22, zone: '#ffffff', zoneOp: 0.13,
      proj: ['#3b5a94', '#24406e', '#16294d'], seat: ['#5c6a8c', '#4a5878', '#3d4a66'],
      label: '#aab4c8', stand: ['#5a5f73', '#4c5165', '#424757']
    } : scene === 'sun' ? {
      bg: null, floor: o.outdoor ? '#f0e6cc' : '#f5ecd9', wallA: '#f9f1de', wallB: '#f0e3c6',
      beam: NAVY, coneOp: 0.04, zone: NAVY, zoneOp: 0.08,
      proj: ['#24406e', NAVY, '#081a38'], seat: ['#b09a72', '#9d8660', '#8a7452'],
      label: '#7a6a4f', stand: ['#8a8474', '#7a7466', '#6e695c']
    } : {
      bg: null, floor: o.outdoor ? '#e9e4d4' : '#efe9dc', wallA: '#e3dccb', wallB: '#d8d0bc',
      beam: NAVY, coneOp: 0.055, zone: NAVY, zoneOp: 0.10,
      proj: ['#24406e', NAVY, '#081a38'], seat: ['#9aa5bd', '#7c88a3', '#6b7690'],
      label: MUTED, stand: ['#8a8474', '#7a7466', '#6e695c']
    };
    // Golf simulator: turf floor instead of room flooring.
    if (o.golf) {
      pal.floor = scene === 'night' ? '#243024' : (scene === 'sun' ? '#93a94e' : '#79b356');
    }

    function raw(x, y, z) { return [(y - x) * 0.8660254, (x + y) * 0.5 - z]; }
    var corners = [[0,0,0],[L,0,0],[0,W,0],[L,W,0],[0,0,H],[L,0,H],[0,W,H],[L,W,H]];
    if (scene === 'sun' && H > 0) {
      // make room in the frame for the sun icon outside the side wall
      var sunFx = L * 0.5, sunFz = H * 0.52;
      [[sunFx - 2.6, -4.8, sunFz], [sunFx + 2.6, -4.8, sunFz],
       [sunFx, -4.8, sunFz + 2.8], [sunFx, -4.8, sunFz - 2.8]].forEach(function (c) {
        corners.push(c);
      });
    }
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
      var t = el('text', { x: q[0].toFixed(1), y: q[1].toFixed(1), 'text-anchor': 'middle', 'font-size': size || 12, fill: pal.label });
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
    if (pal.bg) el('rect', { x: 0, y: 0, width: VW, height: VH, fill: pal.bg });
    // soft-glow filter (screen glow at night, lamp glow with lights on)
    var defs = el('defs', {});
    var filt = document.createElementNS(NS, 'filter');
    filt.setAttribute('id', 'calc-glow');
    filt.setAttribute('x', '-60%'); filt.setAttribute('y', '-60%');
    filt.setAttribute('width', '220%'); filt.setAttribute('height', '220%');
    var blur = document.createElementNS(NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '10');
    filt.appendChild(blur); defs.appendChild(filt);
    poly([[0,0,0],[L,0,0],[L,W,0],[0,W,0]], pal.floor);
    if (H > 0) {
      poly([[0,0,0],[0,W,0],[0,W,H],[0,0,H]], pal.wallA); // screen wall (x=0)
      poly([[0,0,0],[L,0,0],[L,0,H],[0,0,H]], pal.wallB); // side wall (y=0)
    }
    if (scene === 'sun' && H > 0) {
      var wx0 = L * 0.36, wx1 = L * 0.64, wz0 = H * 0.32, wz1 = H * 0.72;
      var wxm = (wx0 + wx1) / 2, wzm = (wz0 + wz1) / 2;
      // window on the side wall, glowing with daylight
      poly([[wx0,0,wz0],[wx1,0,wz0],[wx1,0,wz1],[wx0,0,wz1]], '#ffedb0', { opacity: 0.55, filter: 'url(#calc-glow)' });
      poly([[wx0,0,wz0],[wx1,0,wz0],[wx1,0,wz1],[wx0,0,wz1]], '#fffbe8', { stroke: '#b89b5e', 'stroke-width': 2 });
      poly([[wxm-0.09,0,wz0],[wxm+0.09,0,wz0],[wxm+0.09,0,wz1],[wxm-0.09,0,wz1]], '#b89b5e'); // mullion V
      poly([[wx0,0,wzm-0.09],[wx1,0,wzm-0.09],[wx1,0,wzm+0.09],[wx0,0,wzm+0.09]], '#b89b5e'); // mullion H
      // sun icon outside the room
      var sunx = L * 0.5, suny = -3.4, sunz = wzm;
      var scp = P(sunx, suny, sunz);
      el('ellipse', { cx: scp[0].toFixed(1), cy: scp[1].toFixed(1), rx: 15, ry: 15, fill: '#ffd94d', stroke: '#e0a92e', 'stroke-width': 2 });
      for (var ri = 0; ri < 8; ri++) {
        var ra = ri * Math.PI / 4;
        var r1x = Math.cos(ra) * 1.35, r1z = Math.sin(ra) * 1.35;
        var r2x = Math.cos(ra) * 2.15, r2z = Math.sin(ra) * 2.15;
        var qx = -Math.sin(ra) * 0.12, qz = Math.cos(ra) * 0.12;
        poly([[sunx+r1x+qx, suny, sunz+r1z+qz],[sunx+r1x-qx, suny, sunz+r1z-qz],
              [sunx+r2x-qx, suny, sunz+r2z-qz],[sunx+r2x+qx, suny, sunz+r2z+qz]], '#ffd94d');
      }
      // arrow from the sun to the window
      box(sunx, (suny - 0.8) / 2, sunz, 0.18, (-0.8) - suny, 0.18, '#e0a92e', '#c99a2e', '#c99a2e');
      poly([[sunx - 0.5, -0.8, sunz],[sunx + 0.5, -0.8, sunz],[sunx, 0.05, sunz]], '#e0a92e');
      txt(sunx, suny, sunz + 2.9, 'sunlight', 11);
      // beams from the window slanting across the room toward the screen
      for (var b = 0; b < 3; b++) {
        var bwx = L * (0.40 + b * 0.10);
        poly([[bwx, 0, wz1 - 0.2],[bwx + 1.5, 0, wz1 - 0.2],[bwx - 2.4, 2.6, 0.05],[bwx - 3.9, 2.6, 0.05]], '#ffd76a', { opacity: 0.14 });
      }
    }
    txt(L / 2, -0.6, 0, fmt(L, 0) + ' ft', 12);
    txt(-0.6, W / 2, 0, fmt(W, 0) + ' ft', 12);

    var hasScreen = o.swFt > 0 && o.shFt > 0;
    var sw = 0, sh = 0, z0 = 2, zc = 3, yc = W / 2;
    if (hasScreen) {
      sw = o.swFt; // ft
      sh = o.shFt; // ft
      z0 = 2;
      if (H > 0 && z0 + sh > H - 0.5) z0 = Math.max(0.5, H - sh - 0.5);
      zc = z0 + sh / 2;
      var yA = yc - sw / 2, yB = yc + sw / 2;
      // screen (with a glow when the lights are off)
      if (scene === 'night') {
        poly([[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]], '#bcd0ff', { opacity: 0.5, filter: 'url(#calc-glow)' });
      }
      poly([[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]], '#ffffff', { stroke: NAVY, 'stroke-width': 2 });
      txt(0, yc, z0 + sh + 0.7, o.scrLabel || 'screen', 12);
      if (o.outdoor) {
        // simple stand legs
        box(0.15, yA + 0.3, z0 / 2, 0.25, 0.25, z0, pal.stand[0], pal.stand[1], pal.stand[2]);
        box(0.15, yB - 0.3, z0 / 2, 0.25, 0.25, z0, pal.stand[0], pal.stand[1], pal.stand[2]);
      }
    }

    if (hasScreen && o.r) {
      var ust = o.r[1] < 1;
      var imgWIn = o.imgWIn || o.swFt * 12;
      var near = imgWIn / 12 * o.r[0]; // ft
      var far = imgWIn / 12 * o.r[1]; // ft
      // throw range zone on the floor
      poly([[near,yc-1.1,0.02],[far,yc-1.1,0.02],[far,yc+1.1,0.02],[near,yc+1.1,0.02]], pal.zone, { opacity: pal.zoneOp });
      // projector (position follows golf-sim placement)
      var pxx = (o.px != null) ? o.px : near;
      var pyy = (o.py != null) ? o.py : yc;
      var pzz = (o.pz != null) ? o.pz : (ust ? 1 : zc);
      if (o.pmount && H > 0) {
        box(pxx, pyy, (pzz + H) / 2, 0.18, 0.18, H - pzz, pal.stand[0], pal.stand[1], pal.stand[2]); // mount pole
      }
      box(pxx, pyy, pzz, 1.1, 0.9, 0.55, pal.proj[0], pal.proj[1], pal.proj[2]);
      txt(pxx, pyy, pzz + 0.9, 'projector', 11);
      var rangeLabel = fmtDist(imgWIn * o.r[0]);
      if (o.r[1] !== o.r[0]) rangeLabel += '–' + fmtDist(imgWIn * o.r[1]);
      txt((near + far) / 2, yc - 1.5, 0.05, rangeLabel, 11);
      // light cone: lens to screen corners
      var lens = [pxx, pyy, pzz];
      var sc = [[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]];
      for (var i = 0; i < 4; i++) {
        poly([lens, sc[i], sc[(i + 1) % 4]], pal.beam, { opacity: pal.coneOp });
      }
      // seating furniture per room (a golfer in golf-sim mode)
      if (o.seat > 0) {
        var sx = Math.min(o.seat, o.outdoor ? L - 1 : L - 0.5);
        var kind = o.golf ? 'golfer' : ({ living: 'couch', bedroom: 'bed', outdoors: 'campchair' }[o.room] || 'seat');
        var S = pal.seat, fname = 'seat', fz = 3.9;
        if (kind === 'couch') {
          fname = 'couch'; fz = 4.1;
          box(sx, yc, 0.75, 2.6, 7, 1.5, S[0], S[1], S[2]); // base
          box(sx, yc, 1.6, 2.4, 6.6, 0.35, S[0], S[1], S[2]); // cushions
          box(sx + 1.35, yc, 1.7, 0.7, 7, 3.4, S[0], S[1], S[2]); // backrest
          box(sx, yc - 3.55, 1.15, 2.6, 0.7, 2.3, S[0], S[1], S[2]); // armrest
          box(sx, yc + 3.55, 1.15, 2.6, 0.7, 2.3, S[0], S[1], S[2]); // armrest
        } else if (kind === 'bed') {
          fname = 'bed'; fz = 5.2;
          box(sx, yc, 1.0, 7, 5.5, 2.0, S[0], S[1], S[2]); // frame
          box(sx - 0.8, yc, 2.15, 4.2, 5.3, 0.3, S[1], S[2], S[1]); // blanket
          box(sx + 2.3, yc, 2.35, 1.4, 4.6, 0.7, S[0], S[1], S[2]); // pillow
          box(sx + 3.6, yc, 2.2, 0.5, 5.5, 4.4, S[0], S[1], S[2]); // headboard
        } else if (kind === 'campchair') {
          fname = 'camp chair'; fz = 4.1;
          box(sx, yc, 0.9, 1.9, 1.9, 0.25, S[0], S[1], S[2]); // seat
          poly([[sx + 0.85, yc - 0.95, 1.0], [sx + 0.85, yc + 0.95, 1.0], [sx + 1.55, yc + 0.95, 3.4], [sx + 1.55, yc - 0.95, 3.4]], S[0], { stroke: S[2], 'stroke-width': 1 }); // backrest
          box(sx - 0.7, yc - 0.7, 0.5, 0.16, 0.16, 1.0, S[1], S[2], S[1]);
          box(sx - 0.7, yc + 0.7, 0.5, 0.16, 0.16, 1.0, S[1], S[2], S[1]);
          box(sx + 0.7, yc - 0.7, 0.5, 0.16, 0.16, 1.0, S[1], S[2], S[1]);
          box(sx + 0.7, yc + 0.7, 0.5, 0.16, 0.16, 1.0, S[1], S[2], S[1]);
        } else if (kind === 'golfer') {
          fname = 'golfer'; fz = 6.4;
          poly([[sx - 3.1, yc - 1, 0.03], [sx - 1, yc - 1, 0.03], [sx - 1, yc + 1.4, 0.03], [sx - 3.1, yc + 1.4, 0.03]], '#3a8f5d', { opacity: 0.85 }); // hitting mat
          box(sx, yc - 0.35, 1.4, 0.35, 0.35, 2.8, S[0], S[1], S[2]); // legs
          box(sx, yc + 0.35, 1.4, 0.35, 0.35, 2.8, S[0], S[1], S[2]);
          box(sx, yc, 3.6, 0.9, 1.1, 2.2, S[0], S[1], S[2]); // torso
          var hc = P(sx, yc, 5.4);
          el('ellipse', { cx: hc[0].toFixed(1), cy: hc[1].toFixed(1), rx: 9, ry: 11, fill: S[0], stroke: S[2], 'stroke-width': 1 }); // head
          poly([[sx - 0.9, yc + 0.25, 2.6], [sx - 0.7, yc + 0.25, 2.6], [sx - 1.9, yc + 0.25, 0.12], [sx - 2.1, yc + 0.25, 0.12]], '#8a6f4d'); // club
          var bc = P(sx - 2.3, yc + 0.25, 0.18);
          el('ellipse', { cx: bc[0].toFixed(1), cy: bc[1].toFixed(1), rx: 4, ry: 3, fill: '#ffffff' }); // ball
        } else {
          box(sx, yc, 0.7, 1.7, 1.7, 1.4, S[0], S[1], S[2]); // seat
          box(sx + 0.95, yc, 1.6, 0.45, 1.7, 3.2, S[0], S[1], S[2]); // backrest
        }
        txt(sx, yc, fz, fname + ' · ' + fmt(o.seat, 1) + ' ft', 11);
      }
      // floor lamp in the back corner: green when the lights are on, red when off
      if (hasScreen && !o.outdoor) {
        var lx = L - 1.3, ly = W - 1.3;
        var lampOn = lightsOn;
        var lampColor = lampOn ? '#3fae5a' : '#c0392b';
        if (lampOn && scene !== 'sun') {
          poly([[lx - 2.2, ly - 2.2, 0.03], [lx + 2.2, ly - 2.2, 0.03], [lx + 2.2, ly + 2.2, 0.03], [lx - 2.2, ly + 2.2, 0.03]], '#ffdf9e', { opacity: 0.20 });
        }
        box(lx, ly, 0.1, 0.7, 0.7, 0.2, pal.stand[0], pal.stand[1], pal.stand[2]); // base
        box(lx, ly, 2.4, 0.18, 0.18, 4.6, pal.stand[0], pal.stand[1], pal.stand[2]); // pole
        poly([[lx - 0.75, ly, 5.3], [lx + 0.75, ly, 5.3], [lx + 0.45, ly, 4.35], [lx - 0.45, ly, 4.35]],
          lampColor, { stroke: pal.label, 'stroke-width': 1 }); // shade
        if (lampOn && scene !== 'sun') {
          var lc = P(lx, ly, 4.8);
          el('ellipse', { cx: lc[0].toFixed(1), cy: lc[1].toFixed(1), rx: 34, ry: 40, fill: '#bff0c8', opacity: 0.55, filter: 'url(#calc-glow)' });
        }
        txt(lx, ly, 6.1, 'lamp', 11);
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
