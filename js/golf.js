/* Budget Projectors — golf simulator calculator (vanilla JS, dependency-free).
   All element IDs are prefixed "golf-" so nothing collides with main.js. */
(function () {
  'use strict';

  var THROW = window.THROW_DATA || [];

  function $(id) { return document.getElementById(id); }

  function fmt(n, digits) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }
  function ft(n, digits) {
    return fmt(n, digits === undefined ? 1 : digits) + ' ft';
  }

  var ASPECTS = { '16:9': [16, 9], '16:10': [16, 10], '4:3': [4, 3], '1:1': [1, 1] };

  /* ---------- state ---------- */
  var selectedModel = null; // {b, m, t:[min,max], lm?, l?}
  var selectedLens = 0;
  var placement = 'ceiling';
  var opener = false;
  var roomType = 'garage';
  var device = 'pc';
  var shiftOn = false;
  var autoLumens = 0; // last auto-filled lumens value (user edits win)

  /* ---------- elements ---------- */
  var modelInput = $('golf-model');
  if (!modelInput) return; // golf section not on this page
  var suggest = $('golf-suggest');
  var selectedLine = $('golf-selected');
  var lensWrap = $('golf-lens-wrap');
  var lensSelect = $('golf-lens');
  var ratioMinInput = $('golf-ratio-min');
  var ratioMaxInput = $('golf-ratio-max');
  var lumensInput = $('golf-lumens');
  var screenW = $('golf-screen-w');
  var screenH = $('golf-screen-h');
  var aspectSel = $('golf-aspect');
  var roomLen = $('golf-room-len');
  var roomWid = $('golf-room-wid');
  var hitInput = $('golf-hit');
  var throwInput = $('golf-throw');
  var openerWrap = $('golf-opener-wrap');
  var openerBlock = $('golf-opener-block');
  var openerDist = $('golf-opener-dist');
  var deviceAdvice = $('golf-device-advice');
  var shiftChip = $('golf-shift-chip');
  var shiftWrap = $('golf-shift-wrap');
  var shiftInput = $('golf-shift');
  var shiftVal = $('golf-shift-val');
  var gainInput = $('golf-gain');
  var results = $('golf-results');
  var svgTop = $('golf-top');
  var svgFront = $('golf-front');

  /* ---------- model picker ---------- */
  function ratioLabel(t) {
    function r2(n) { return fmt(n, 2).replace(/\.?0+$/, ''); }
    if (t[0] === t[1]) return r2(t[0]) + ':1';
    return r2(t[0]) + '-' + r2(t[1]) + ':1';
  }

  function modelLenses(entry) {
    return (entry && entry.l && entry.l.length) ? entry.l : null;
  }

  function lensLumens(entry, idx) {
    var L = modelLenses(entry);
    if (L && L[idx] && L[idx][3] > 0) return L[idx][3];
    return 0;
  }

  function effectiveRatio(entry, idx) {
    if (!entry) return null;
    var L = modelLenses(entry);
    if (L && L[idx] && L[idx][1] > 0) return [L[idx][1], L[idx][2]];
    return entry.t;
  }

  function effectiveLumens() {
    var v = parseFloat(lumensInput.value, 10);
    if (v > 0) return v;
    var ll = lensLumens(selectedModel, selectedLens);
    if (ll > 0) return ll;
    if (selectedModel && selectedModel.lm > 0) return selectedModel.lm;
    return 0;
  }

  function currentRatio() {
    var a = parseFloat(ratioMinInput.value, 10);
    var b = parseFloat(ratioMaxInput.value, 10);
    if (a > 0 && b > 0) return [Math.min(a, b), Math.max(a, b)];
    return effectiveRatio(selectedModel, selectedLens);
  }

  function refreshSelectedLine() {
    if (!selectedModel) { selectedLine.hidden = true; return; }
    var txt = 'Using ' + selectedModel.b + ' ' + selectedModel.m;
    var L = modelLenses(selectedModel);
    if (L && L[selectedLens]) txt += ' - lens ' + L[selectedLens][0];
    var r = currentRatio();
    if (r) txt += ' - throw ' + ratioLabel(r);
    selectedLine.textContent = txt;
    selectedLine.hidden = false;
  }

  function syncLensPicker() {
    var L = modelLenses(selectedModel);
    if (!L) {
      lensWrap.hidden = true;
      lensSelect.innerHTML = '';
      selectedLens = 0;
      return;
    }
    if (selectedLens < 0 || selectedLens >= L.length) selectedLens = 0;
    lensSelect.innerHTML = '';
    L.forEach(function (x, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = x[0] + ' - ' + ratioLabel([x[1], x[2]]);
      if (i === selectedLens) opt.selected = true;
      lensSelect.appendChild(opt);
    });
    lensWrap.hidden = false;
  }

  function autoFillLumens() {
    var v = lensLumens(selectedModel, selectedLens);
    if (!(v > 0) && selectedModel) v = selectedModel.lm > 0 ? selectedModel.lm : 0;
    var cur = parseFloat(lumensInput.value, 10);
    if (lumensInput.value === '' || cur === autoLumens) {
      lumensInput.value = v > 0 ? Math.round(v) : '';
    }
    autoLumens = v > 0 ? Math.round(v) : 0;
  }

  function chooseModel(x) {
    selectedModel = x;
    selectedLens = 0;
    modelInput.value = x.b + ' ' + x.m;
    suggest.hidden = true;
    suggest.innerHTML = '';
    modelInput.setAttribute('aria-expanded', 'false');
    syncLensPicker();
    autoFillLumens();
    refreshSelectedLine();
    recalc();
  }

  function renderSuggest(q) {
    if (q.length < 2) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    var matches = THROW.filter(function (x) {
      return (x.b + ' ' + x.m).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 20);
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
      btn.appendChild(document.createTextNode(
        x.m + ' - ' + ratioLabel(x.t) + (modelLenses(x) ? ' - ' + x.l.length + ' lenses' : '')));
      btn.addEventListener('click', function () { chooseModel(x); });
      suggest.appendChild(btn);
    });
    suggest.hidden = false;
    modelInput.setAttribute('aria-expanded', 'true');
  }

  modelInput.addEventListener('input', function () {
    var cur = parseFloat(lumensInput.value, 10);
    if (lumensInput.value !== '' && cur === autoLumens) lumensInput.value = '';
    autoLumens = 0;
    selectedModel = null;
    selectedLens = 0;
    syncLensPicker();
    selectedLine.hidden = true;
    renderSuggest(modelInput.value.trim().toLowerCase());
    recalc();
  });
  modelInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') suggest.hidden = true;
  });
  document.addEventListener('click', function (e) {
    if (!suggest.hidden && !suggest.contains(e.target) && e.target !== modelInput) {
      suggest.hidden = true;
    }
  });

  lensSelect.addEventListener('change', function () {
    var oldAuto = lensLumens(selectedModel, selectedLens);
    if (!(oldAuto > 0) && selectedModel) oldAuto = selectedModel.lm > 0 ? selectedModel.lm : 0;
    selectedLens = parseInt(lensSelect.value, 10) || 0;
    var newAuto = lensLumens(selectedModel, selectedLens);
    if (!(newAuto > 0) && selectedModel) newAuto = selectedModel.lm > 0 ? selectedModel.lm : 0;
    var cur = parseFloat(lumensInput.value, 10);
    if (oldAuto > 0 && cur === Math.round(oldAuto)) {
      lumensInput.value = newAuto > 0 ? Math.round(newAuto) : '';
    }
    autoLumens = newAuto > 0 ? Math.round(newAuto) : 0;
    refreshSelectedLine();
    recalc();
  });

  /* ---------- screen aspect ---------- */
  var STD_ARS = [[16, 9], [16, 10], [4, 3], [1, 1]];

  function syncAspectFromDims() {
    var w = parseFloat(screenW.value, 10), h = parseFloat(screenH.value, 10);
    if (!(w > 0) || !(h > 0)) return;
    var ar = w / h, matched = 'custom';
    STD_ARS.forEach(function (s) {
      if (Math.abs(ar - s[0] / s[1]) / (s[0] / s[1]) < 0.005) matched = s[0] + ':' + s[1];
    });
    aspectSel.value = matched;
  }

  function applyAspect() {
    if (aspectSel.value === 'custom') return;
    var w = parseFloat(screenW.value, 10);
    if (!(w > 0)) return;
    var p = aspectSel.value.split(':');
    screenH.value = fmt(w * parseFloat(p[1], 10) / parseFloat(p[0], 10), 1);
  }

  aspectSel.addEventListener('change', function () { applyAspect(); recalc(); });
  screenW.addEventListener('input', function () { syncAspectFromDims(); recalc(); });
  screenH.addEventListener('input', function () { syncAspectFromDims(); recalc(); });

  /* ---------- chip groups ---------- */
  function chipGroup(containerId, attr, cb) {
    var box = $(containerId);
    box.querySelectorAll('.calc__chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        box.querySelectorAll('.calc__chip').forEach(function (c) {
          c.classList.toggle('chosen', c === chip);
        });
        cb(chip.getAttribute(attr));
        recalc();
      });
    });
  }

  var PLACE_LABEL = {
    'frame': 'Top of sim frame',
    'ceiling': 'Ceiling mount',
    'floor-left': 'Floor left',
    'floor-right': 'Floor right',
    'table-left': 'Table left of golfer',
    'table-right': 'Table right of golfer'
  };

  chipGroup('golf-placement', 'data-place', function (v) { placement = v; });
  chipGroup('golf-roomtype', 'data-roomtype', function (v) {
    roomType = v;
    if (openerBlock) openerBlock.hidden = (roomType !== 'garage');
    recalc();
  });
  chipGroup('golf-opener-chips', 'data-opener', function (v) {
    opener = (v === 'yes');
    openerWrap.hidden = !opener;
  });
  chipGroup('golf-device', 'data-device', function (v) {
    device = v;
    updateDeviceAdvice();
  });

  function updateDeviceAdvice() {
    if (device === 'pc') {
      deviceAdvice.textContent = "Tip: if your lens allows it, zoom the image past the screen edges and use your golf software's image scaling to fit the screen.";
    } else {
      deviceAdvice.textContent = 'Phones and tablets output different aspect ratios - the projector will default to its native aspect, so expect some unused screen area.';
    }
  }
  updateDeviceAdvice();

  /* ---------- lens shift ---------- */
  shiftChip.addEventListener('click', function () {
    shiftOn = !shiftOn;
    shiftChip.classList.toggle('chosen', shiftOn);
    shiftChip.setAttribute('aria-pressed', shiftOn ? 'true' : 'false');
    shiftWrap.hidden = !shiftOn;
    recalc();
  });
  shiftInput.addEventListener('input', function () {
    shiftVal.textContent = shiftInput.value + '%';
    recalc();
  });

  /* ---------- every other input recalcs ---------- */
  [ratioMinInput, ratioMaxInput, lumensInput, roomLen, roomWid,
   hitInput, throwInput, openerDist, gainInput].forEach(function (el) {
    el.addEventListener('input', recalc);
  });

  /* ---------- math + rendering ---------- */
  var NAVY = '#0c2244', MUTED = '#5c5c5c', IMG_FILL = '#d7e6f7', WARN = '#c0392b',
      OK = '#2e7d5b', AMBER = '#b7791f';

  function clearSvgs() {
    svgTop.innerHTML = '';
    svgFront.innerHTML = '';
  }

  function recalc() {
    var r = currentRatio();
    var sw = parseFloat(screenW.value, 10), sh = parseFloat(screenH.value, 10);
    var rl = parseFloat(roomLen.value, 10), rw = parseFloat(roomWid.value, 10);
    var hit = parseFloat(hitInput.value, 10);
    var td = parseFloat(throwInput.value, 10);
    var gain = parseFloat(gainInput.value, 10);
    if (!(gain > 0)) gain = 1;

    if (!r) {
      results.innerHTML = '<p>Pick a projector model or enter a throw ratio to see your simulator plan.</p>';
      clearSvgs();
      return;
    }
    if (!(sw > 0) || !(sh > 0)) {
      results.innerHTML = '<p>Enter your screen width and height.</p>';
      clearSvgs();
      return;
    }

    var out = [];
    var aKey = aspectSel.value !== 'custom' ? aspectSel.value : fmt(sw / sh, 2) + ':1';

    /* Image size. Min ratio = widest image. */
    var imgWide = 0, imgTele = 0, imgWideH = 0, imgTeleH = 0;
    if (td > 0) {
      imgWide = td / r[0];
      imgTele = td / r[1];
      imgWideH = imgWide * sh / sw;
      imgTeleH = imgTele * sh / sw;
      if (r[0] === r[1]) {
        out.push('<p><strong>Image:</strong> ' + ft(imgWide) + ' wide x ' + ft(imgWideH) + ' tall (' + aKey + ').</p>');
      } else {
        out.push('<p><strong>Image:</strong> ' + ft(imgWide) + ' to ' + ft(imgTele) +
          ' wide x ' + ft(imgWideH) + ' to ' + ft(imgTeleH) + ' tall (' + aKey + ').</p>');
      }
    } else {
      out.push('<p><strong>To fill a ' + ft(sw) + ' wide screen</strong>, put the lens ' +
        ft(sw * r[0]) + ' to ' + ft(sw * r[1]) + ' from the screen. Enter your throw distance below.</p>');
    }

    /* Which image width to draw / judge brightness on. */
    var drawW = 0, drawH = 0, unusedSide = 0, overflow = false;
    if (td > 0) {
      if (sw >= imgTele && sw <= imgWide) {
        drawW = sw; // golfer zooms to fit
      } else if (sw > imgWide) {
        drawW = imgWide;
        unusedSide = (sw - imgWide) / 2;
      } else {
        drawW = imgTele;
        overflow = true;
      }
      drawH = drawW * sh / sw;
    }

    /* Fit verdict. */
    if (td > 0) {
      if (sw >= imgTele && sw <= imgWide) {
        out.push('<p><strong>Fit:</strong> the zoom range covers your screen - zoom until the image fills the ' +
          ft(sw) + ' width.</p>');
      } else if (unusedSide > 0) {
        out.push('<p><strong>Fit:</strong> ' + ft(unusedSide * 2) + ' of screen stays blank (' +
          ft(unusedSide) + ' each side) - marked with an X in the front view.</p>');
      } else {
        out.push('<p><strong>Fit:</strong> the image overflows the screen by ' + ft(drawW - sw) +
          ' even at full zoom-out - move the projector closer.</p>');
      }
    }

    /* Brightness: foot-lamberts over the drawn image area. */
    var lumens = effectiveLumens();
    if (td > 0 && lumens > 0 && drawW > 0 && drawH > 0) {
      var fl = lumens * gain / (drawW * drawH);
      var note = fl < 12 ? 'dim, best in a fully dark room' :
        fl < 30 ? 'good with the lights off' :
        fl < 60 ? 'holds up with some ambient light' : 'bright enough for lights-on viewing';
      var color = fl < 12 ? WARN : fl < 30 ? AMBER : OK;
      out.push('<p><strong>Brightness:</strong> ~' + fmt(fl, 0) + ' fL - <span style="color:' + color + '">' +
        note + '</span>.</p>');
      if (fl < 30) {
        out.push('<p style="color:' + WARN + '"><strong>Heads up:</strong> on a grey golf screen with ambient ' +
          'light this will look dim - a brighter projector is worth it.</p>');
      }
    } else if (td > 0) {
      out.push('<p><strong>Brightness:</strong> enter lumens (or pick a model) to see the foot-lambert estimate.</p>');
    }

    /* Throw check: garage opener eats into the room for ceiling mounts. */
    var openerD = (roomType === 'garage' && opener) ? parseFloat(openerDist.value, 10) : 0;
    if (td > 0 && placement === 'ceiling' && rl > 0) {
      var avail = (opener && openerD > 0) ? rl - openerD : rl;
      if (opener && openerD > 0) {
        out.push('<p><strong>Room:</strong> ' + ft(rl) + ' minus the opener at ' + ft(openerD) +
          ' leaves ' + ft(avail) + ' of usable length for a ceiling mount.</p>');
      }
      if (td > avail) {
        out.push('<p style="color:' + WARN + '"><strong>Too far:</strong> a ' + ft(td) +
          ' throw needs more than the ' + ft(avail) + ' available - the projector would sit past the ' +
          (opener && openerD > 0 ? 'opener' : 'room') + '.</p>');
      }
    }

    results.innerHTML = out.join('');
    drawTop(r, sw, sh, rl, rw, hit, td, openerD);
    drawFront(sw, sh, drawW, drawH, unusedSide, overflow, td);
  }

  /* ---------- SVG A: top-down ---------- */
  function drawTop(r, sw, sh, rl, rw, hit, td, openerD) {
    if (!(rl > 0) || !(rw > 0)) { svgTop.innerHTML = ''; return; }
    var W = 620, H = 400, L = 64, T = 30, R = 16, B = 46;
    var plotW = W - L - R, plotH = H - T - B;
    var s = Math.min(plotW / rw, plotH / rl);
    var roomWpx = rw * s, roomHpx = rl * s;
    var x0 = L + (plotW - roomWpx) / 2, y0 = T + (plotH - roomHpx) / 2;
    var cx = x0 + roomWpx / 2;
    var scrY = y0;
    var parts = [];

    function txt(x, y, str, size, color, anchor, rot) {
      var a = anchor ? ' text-anchor="' + anchor + '"' : '';
      var tr = rot ? ' transform="rotate(-90 ' + x + ' ' + y + ')"' : '';
      parts.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + a + tr +
        ' font-size="' + (size || 12) + '" fill="' + (color || MUTED) +
        '" font-family="Poppins, sans-serif">' + str + '</text>');
    }

    // room (dashed outline when freestanding: no walls)
    var noWalls = (roomType === 'open');
    parts.push('<rect x="' + x0.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' +
      roomWpx.toFixed(1) + '" height="' + roomHpx.toFixed(1) +
      '" fill="' + (noWalls ? 'none' : '#fbfaf7') + '" stroke="' + NAVY + '" stroke-width="2"' +
      (noWalls ? ' stroke-dasharray="10 7"' : '') + '/>');
    if (noWalls) txt(x0 + roomWpx / 2, y0 - 8, 'Open area (no walls)', 12, MUTED, 'middle');
    // screen line
    var scrHalf = Math.min(sw * s, roomWpx) / 2;
    parts.push('<line x1="' + (cx - scrHalf).toFixed(1) + '" y1="' + scrY.toFixed(1) +
      '" x2="' + (cx + scrHalf).toFixed(1) + '" y2="' + scrY.toFixed(1) +
      '" stroke="' + NAVY + '" stroke-width="7" stroke-linecap="round"/>');
    txt(cx, scrY + 20, 'Screen ' + fmt(sw, 1) + ' x ' + fmt(sh, 1) + ' ft', 12, NAVY, 'middle');

    // garage opener strip
    if (opener && openerD > 0 && openerD < rl) {
      var oy = scrY + openerD * s;
      parts.push('<rect x="' + x0.toFixed(1) + '" y="' + (oy - 5).toFixed(1) + '" width="' +
        roomWpx.toFixed(1) + '" height="10" fill="' + AMBER + '" opacity="0.35"/>');
      txt(x0 + roomWpx - 6, oy - 10, 'Garage opener', 11, AMBER, 'end');
    }

    // hitting mat + golfer
    if (hit > 0 && hit < rl) {
      var my = scrY + hit * s;
      var mw = Math.min(2.2 * s, roomWpx * 0.3), mh = Math.max(10, 1.4 * s);
      parts.push('<rect x="' + (cx - mw / 2).toFixed(1) + '" y="' + (my - mh / 2).toFixed(1) +
        '" width="' + mw.toFixed(1) + '" height="' + mh.toFixed(1) +
        '" fill="#4a7c59" rx="2"/>');
      var gx = cx - mw / 2 - 16;
      parts.push('<circle cx="' + gx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="9" fill="' + NAVY + '"/>');
      parts.push('<text x="' + gx.toFixed(1) + '" y="' + (my + 4).toFixed(1) +
        '" text-anchor="middle" font-size="10" fill="#fff" font-family="Poppins, sans-serif">G</text>');
      txt(cx + mw / 2 + 8, my + 4, 'Hitting mat (' + ft(hit) + ')', 11, MUTED, 'start');
    }

    // projector
    if (td > 0 && td < rl + 2) {
      var px = cx, py = scrY + td * s, plabel = PLACE_LABEL[placement] || 'Projector';
      if (placement === 'floor-left' || placement === 'table-left') px = cx - Math.min(3, rw / 2 - 0.8) * s;
      if (placement === 'floor-right' || placement === 'table-right') px = cx + Math.min(3, rw / 2 - 0.8) * s;
      if (placement === 'frame') py = scrY + Math.max(6, 0.4 * s);
      // dashed throw line to screen center
      parts.push('<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) +
        '" x2="' + cx.toFixed(1) + '" y2="' + scrY.toFixed(1) +
        '" stroke="' + NAVY + '" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>');
      parts.push('<rect x="' + (px - 11).toFixed(1) + '" y="' + (py - 7).toFixed(1) +
        '" width="22" height="14" rx="2" fill="' + NAVY + '"/>');
      txt(px, py + 26, plabel, 11, NAVY, 'middle');
      var midx = (px + cx) / 2 + 8, midy = (py + scrY) / 2;
      txt(midx, midy, ft(td) + ' throw', 11, NAVY, 'start');
    }

    // room dimensions
    txt(22, y0 + roomHpx / 2, ft(rl) + ' long', 12, MUTED, 'middle', true);
    txt(x0 + roomWpx / 2, y0 + roomHpx + 28, ft(rw) + ' wide', 12, MUTED, 'middle');

    svgTop.innerHTML = parts.join('');
  }

  /* ---------- SVG B: front view from the hitting mat ---------- */
  function drawFront(sw, sh, drawW, drawH, unusedSide, overflow, td) {
    var W = 620, H = 400;
    var parts = [];
    parts.push('<defs><pattern id="golf-xhatch" width="12" height="12" patternUnits="userSpaceOnUse">' +
      '<path d="M0,0 L12,12 M12,0 L0,12" stroke="' + WARN + '" stroke-width="1.4" opacity="0.55"/>' +
      '</pattern></defs>');

    function txt(x, y, str, size, color, anchor) {
      parts.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" text-anchor="' + (anchor || 'middle') +
        '" font-size="' + (size || 12) + '" fill="' + (color || MUTED) +
        '" font-family="Poppins, sans-serif">' + str + '</text>');
    }

    var s = Math.min((W - 130) / sw, (H - 120) / sh);
    var scrWpx = sw * s, scrHpx = sh * s;
    var sx = (W - scrWpx) / 2, sy = (H - scrHpx) / 2 + 8;

    // screen
    parts.push('<rect x="' + sx.toFixed(1) + '" y="' + sy.toFixed(1) + '" width="' +
      scrWpx.toFixed(1) + '" height="' + scrHpx.toFixed(1) +
      '" fill="#ffffff" stroke="' + NAVY + '" stroke-width="2.5"/>');
    txt(W / 2, sy + scrHpx + 24, 'Screen ' + fmt(sw, 1) + ' x ' + fmt(sh, 1) + ' ft', 12, NAVY);

    if (td > 0 && drawW > 0 && drawH > 0) {
      var iwpx = drawW * s, ihpx = drawH * s;
      var ix = sx + (scrWpx - iwpx) / 2;
      var iy = sy + (scrHpx - ihpx) / 2;
      if (shiftOn) {
        var pct = parseFloat(shiftInput.value, 10) || 0;
        iy -= (pct / 100) * ihpx; // positive % raises the image
      }

      // unused side bands (marked with X)
      if (unusedSide > 0.02) {
        var bandPx = unusedSide * s;
        [[sx, 'l'], [sx + scrWpx - bandPx, 'r']].forEach(function (b) {
          parts.push('<rect x="' + b[0].toFixed(1) + '" y="' + sy.toFixed(1) + '" width="' +
            bandPx.toFixed(1) + '" height="' + scrHpx.toFixed(1) + '" fill="url(#golf-xhatch)"/>');
          txt(b[0] + bandPx / 2, sy + scrHpx / 2, 'X', 30, WARN);
        });
        txt(sx + bandPx / 2, sy + scrHpx + 44, ft(unusedSide) + ' unused', 11, WARN);
        txt(sx + scrWpx - bandPx / 2, sy + scrHpx + 44, ft(unusedSide) + ' unused', 11, WARN);
      }

      // unused top/bottom bands (follow lens shift)
      var topGap = iy - sy, botGap = (sy + scrHpx) - (iy + ihpx);
      if (topGap > 0.02 * s + 1) {
        parts.push('<rect x="' + sx.toFixed(1) + '" y="' + sy.toFixed(1) + '" width="' +
          scrWpx.toFixed(1) + '" height="' + topGap.toFixed(1) + '" fill="url(#golf-xhatch)"/>');
        txt(sx + scrWpx / 2, sy + topGap / 2, 'X  ' + ft(topGap / s) + ' unused', 13, WARN);
      }
      if (botGap > 0.02 * s + 1) {
        parts.push('<rect x="' + sx.toFixed(1) + '" y="' + (iy + ihpx).toFixed(1) + '" width="' +
          scrWpx.toFixed(1) + '" height="' + botGap.toFixed(1) + '" fill="url(#golf-xhatch)"/>');
        txt(sx + scrWpx / 2, iy + ihpx + botGap / 2, 'X  ' + ft(botGap / s) + ' unused', 13, WARN);
      }

      // image
      parts.push('<rect x="' + ix.toFixed(1) + '" y="' + iy.toFixed(1) + '" width="' +
        iwpx.toFixed(1) + '" height="' + ihpx.toFixed(1) +
        '" fill="' + IMG_FILL + '" stroke="' + NAVY + '" stroke-width="2"/>');
      if (ihpx > 40) {
        txt(ix + iwpx / 2, iy + ihpx / 2,
          'Image ' + fmt(drawW, 1) + ' x ' + fmt(drawH, 1) + ' ft', 13, NAVY);
      }
      if (overflow) {
        txt(W / 2, sy - 10, 'Image overflows the screen', 12, WARN);
      }
    } else {
      txt(W / 2, H / 2, 'Enter a throw distance to preview the image', 13, MUTED);
    }

    svgFront.innerHTML = parts.join('');
  }

  /* ---------- init ---------- */
  recalc();
})();
