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
  var ASPECTS = { '16:9': [16, 9], '16:10': [16, 10], '2.35:1': [2.35, 1], '4:3': [4, 3], '1:1': [1, 1] };
  var stdAspect = '16:9';
  function stdWidthFactor() {
    var a = ASPECTS[stdAspect] || ASPECTS['16:9'];
    return a[0] / Math.sqrt(a[0] * a[0] + a[1] * a[1]);
  }
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
    return effectiveRatio(selectedModel, selectedLens);
  }

  /* ---------- Interchangeable lenses ---------- */
  // Entries may carry l: [[lensName, throwMin, throwMax, lumens?], ...].
  // The optional 4th element is a per-lens published lumen output, used when
  // a lens limits the body's brightness (e.g. long-throw lenses).
  var selectedLens = 0;
  var lensWrap = document.getElementById('calc-lens-wrap');
  var lensSelect = document.getElementById('calc-lens');

  function modelLenses(entry) {
    return (entry && entry.l && entry.l.length) ? entry.l : null;
  }

  function lensLumens(entry, lensIdx) {
    var lenses = modelLenses(entry);
    if (lenses && lenses[lensIdx] && lenses[lensIdx][3] > 0) return lenses[lensIdx][3];
    return 0;
  }

  function effectiveRatio(entry, lensIdx) {
    if (!entry) return null;
    var lenses = modelLenses(entry);
    if (lenses && lenses[lensIdx] && lenses[lensIdx][1] > 0) {
      return [lenses[lensIdx][1], lenses[lensIdx][2]];
    }
    return entry.t;
  }

  function selectedLensName() {
    var lenses = modelLenses(selectedModel);
    return (lenses && lenses[selectedLens]) ? lenses[selectedLens][0] : null;
  }

  function refreshSelectedLine() {
    if (!selectedLine || !selectedModel) return;
    var txt = 'Using ' + selectedModel.b + ' ' + selectedModel.m;
    var lname = selectedLensName();
    if (lname) txt += ' · lens ' + lname;
    var r = currentRatio();
    if (r) txt += ' · throw ' + ratioLabel(r);
    selectedLine.textContent = txt;
  }

  function syncLensPicker() {
    var lenses = modelLenses(selectedModel);
    if (!lensWrap || !lensSelect) return;
    if (!lenses) {
      lensWrap.hidden = true;
      lensSelect.innerHTML = '';
      selectedLens = 0;
      return;
    }
    if (selectedLens < 0 || selectedLens >= lenses.length) selectedLens = 0;
    lensSelect.innerHTML = '';
    lenses.forEach(function (L, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = L[0] + ' · ' + ratioLabel([L[1], L[2]]);
      if (i === selectedLens) opt.selected = true;
      lensSelect.appendChild(opt);
    });
    lensWrap.hidden = false;
  }

  if (lensSelect) {
    lensSelect.addEventListener('change', function () {
      // If the lumens box still shows the previous auto-filled value (the user
      // hasn't typed their own), refresh it for the newly selected lens.
      var oldAuto = lensLumens(selectedModel, selectedLens);
      if (!(oldAuto > 0) && selectedModel) oldAuto = selectedModel.lm > 0 ? selectedModel.lm : 0;
      selectedLens = parseInt(lensSelect.value, 10) || 0;
      var newAuto = lensLumens(selectedModel, selectedLens);
      if (!(newAuto > 0) && selectedModel) newAuto = selectedModel.lm > 0 ? selectedModel.lm : 0;
      if (lumensInput && oldAuto > 0 && parseFloat(lumensInput.value, 10) === Math.round(oldAuto)) {
        lumensInput.value = newAuto > 0 ? Math.round(newAuto) : '';
      }
      resetZoom();
      if (lockMode === 'projector') needLockCapture = true;
      refreshSelectedLine();
      recalc();
    });
  }

  /* ---------- Lens zoom slider ---------- */
  // Zoom-lens models (throw ratio is a range): the slider picks where in the
  // zoom range the projector sits. 0 = wide (min throw), 100 = tele (max throw).
  var zoomWrap = document.getElementById('calc-zoom-wrap');
  var zoomInput = document.getElementById('calc-zoom');
  var zoomNum = document.getElementById('calc-zoom-num');

  function zoomFrac() {
    if (!zoomInput) return 0;
    var v = parseFloat(zoomInput.value, 10);
    if (!(v >= 0)) return 0;
    return Math.min(v, 100) / 100;
  }
  function zoomThrowFt(r, imgWIn) {
    return imgWIn / 12 * (r[0] + zoomFrac() * (r[1] - r[0]));
  }
  function resetZoom() { if (zoomInput) zoomInput.value = 0; }
  function setZoomPercent(pct) {
    if (!zoomInput) return;
    zoomInput.value = Math.max(0, Math.min(100, Math.round(pct)));
  }
  function dispThrow(dFt) { return unit === 'm' ? fmt(dFt * M_PER_FT, 2) : fmt(dFt, 1); }
  function syncZoomNum(r, imgWIn) {
    if (!zoomNum) return;
    if (document.activeElement === zoomNum) return; // don't clobber typing
    var near = imgWIn * r[0] / 12, far = imgWIn * r[1] / 12;
    zoomNum.min = dispThrow(near);
    zoomNum.max = dispThrow(far);
    zoomNum.value = dispThrow(zoomThrowFt(r, imgWIn));
  }
  function syncZoom(r, imgWIn) {
    if (!zoomWrap || !zoomInput) return;
    var show = !!r && r[1] > r[0] && !reverseMode && !golfMode && imgWIn > 0;
    zoomWrap.hidden = !show;
    if (zoomLockRow) zoomLockRow.hidden = !show;
    if (imageLockRow) imageLockRow.hidden = !show;
    if (!show && lockMode !== 'off') setLockMode('off'); // locks only make sense with a zoom model
    if (show) syncZoomNum(r, imgWIn);
  }

  if (zoomInput) {
    zoomInput.addEventListener('input', function () { lastMoved = 'zoom'; recalc(); });
  }
  if (zoomNum) {
    // Manual throw distance: typing a number places the projector there directly.
    zoomNum.addEventListener('input', function () {
      var v = parseFloat(zoomNum.value, 10);
      if (!(v > 0)) return;
      var r = currentRatio();
      var dg = sizeInput ? parseFloat(sizeInput.value, 10) : NaN;
      if (!r || r[1] <= r[0] || !(dg > 0)) return;
      var imgWIn = dg * widthFactor();
      var near = imgWIn * r[0] / 12, far = imgWIn * r[1] / 12;
      var c = Math.min(far, Math.max(near, toFt(v)));
      setZoomPercent((c - near) / (far - near) * 100);
      if (lockMode === 'projector') { lockedD = c; lastMoved = null; } // explicit placement moves the locked point
      else lastMoved = 'zoom';
      recalc();
    });
  }

  /* ---------- Image size / zoom lock ---------- */
  // Two mutually exclusive locks:
  // - Lock projector position: the throw distance stays fixed; dragging the screen
  //   size slider drives the zoom slider to compensate, and vice versa.
  // - Lock image size: the screen size is frozen; the zoom slider only moves the projector.
  var zoomLockRow = document.getElementById('calc-zoom-lockrow');
  var imageLockRow = document.getElementById('calc-image-lockrow');
  var zoomLockBtn = document.getElementById('calc-zoom-lock');
  var imageLockBtn = document.getElementById('calc-image-lock');
  var lockMode = 'off'; // 'off' | 'projector' | 'image'
  var lockedD = 0;      // throw distance held fixed while projector-locked, ft
  var lastMoved = null; // 'size' | 'zoom' — which slider the user just dragged
  var needLockCapture = false;

  function widthFactor() {
    var a = ASPECTS[stdAspect] || ASPECTS['16:9'];
    var ad = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
    return a[0] / ad; // image-width inches per diagonal inch
  }
  function setLockMode(mode) {
    lockMode = mode;
    var proj = mode === 'projector', img = mode === 'image';
    if (zoomLockBtn) {
      zoomLockBtn.classList.toggle('chosen', proj);
      zoomLockBtn.setAttribute('aria-pressed', proj ? 'true' : 'false');
    }
    if (imageLockBtn) {
      imageLockBtn.classList.toggle('chosen', img);
      imageLockBtn.setAttribute('aria-pressed', img ? 'true' : 'false');
    }
    // Locking the image size freezes the screen-size controls.
    if (sizeInput) sizeInput.disabled = img;
    if (sizeNum) sizeNum.disabled = img;
    if (proj) needLockCapture = true; // capture the current throw distance on next recalc
  }
  if (zoomLockBtn) {
    zoomLockBtn.addEventListener('click', function () {
      setLockMode(lockMode === 'projector' ? 'off' : 'projector');
      recalc();
    });
  }
  if (imageLockBtn) {
    imageLockBtn.addEventListener('click', function () {
      setLockMode(lockMode === 'image' ? 'off' : 'image');
      recalc();
    });
  }

  function clearModelChips() {
    document.querySelectorAll('.calc__chip[data-model]').forEach(function (c) {
      c.classList.remove('chosen');
    });
  }

  function clearModel() {
    selectedModel = null;
    selectedLens = 0;
    syncLensPicker();
    if (modelInput) modelInput.value = '';
    if (lumensInput) lumensInput.value = '';
    if (selectedLine) selectedLine.hidden = true;
    clearModelChips();
    if (suggest) suggest.hidden = true;
    recalc();
  }

  function chooseModel(entry, chip) {
    selectedModel = entry;
    selectedLens = 0;
    resetZoom();
    if (lockMode === 'projector') needLockCapture = true; // re-lock at the new model's position
    if (modelInput) modelInput.value = entry.b + ' ' + entry.m;
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    if (manualBox) manualBox.hidden = true;
    clearModelChips();
    if (chip) chip.classList.add('chosen');
    syncLensPicker();
    if (selectedLine) selectedLine.hidden = false;
    refreshSelectedLine();
    // Auto-fill the published lumen output so it never has to be typed by hand;
    // the box stays editable as a manual override. A lens with its own published
    // output (a brightness-limiting lens) wins over the body's rating.
    var autoLm = (entry.lm > 0) ? entry.lm : 0;
    var entryLensLm = lensLumens(entry, selectedLens);
    if (entryLensLm > 0) autoLm = entryLensLm;
    if (lumensInput) lumensInput.value = autoLm > 0 ? Math.round(autoLm) : '';
    recalc();
  }

  function renderSuggest(q) {
    if (!suggest || !modelInput) return;
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
      btn.appendChild(document.createTextNode(x.m + ' · ' + ratioLabel(x.t) + (modelLenses(x) ? ' · ' + x.l.length + ' lenses' : '')));
      btn.addEventListener('click', function () { chooseModel(x, null); });
      suggest.appendChild(btn);
    });
    suggest.hidden = false;
    modelInput.setAttribute('aria-expanded', 'true');
  }

  if (modelInput) {
    modelInput.addEventListener('input', function () {
      selectedModel = null;
      selectedLens = 0;
      syncLensPicker();
      if (selectedLine) selectedLine.hidden = true;
      clearModelChips();
      if (lumensInput) lumensInput.value = '';
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
      if (chip.classList.contains('chosen')) {
        clearModel();
        return;
      }
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
      clearModel();
      manualBox.hidden = !manualBox.hidden;
    });
  }
  [ratioMinInput, ratioMaxInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });

  /* ---------- Room planner ---------- */
  // Room types carry no measurements: the user enters their own room size.
  var ROOMS = {
    living: { label: 'Living Room',
      tip: 'Living rooms usually have some ambient light. A low-gain or ALR screen helps the image hold up with the lights on.' },
    bedroom: { label: 'Bedroom',
      tip: 'Smaller rooms suit short-throw models. Keep the projector ventilated and out of the walkway.' },
    dedicated: { label: 'Dedicated Space',
      tip: 'Light-controlled rooms get the most from any projector. Dark walls and ceiling boost perceived contrast.' },
    garage: { label: 'Garage',
      tip: 'Garages often have ambient light and light-colored walls, so brightness matters more than contrast here.' },
    outdoors: { label: 'Outdoors',
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
  var lumensInput = document.getElementById('calc-lumens');
  var gainInput = document.getElementById('calc-gain');
  var planResult = document.getElementById('calc-plan-result');
  var svg = document.getElementById('calc-svg');
  var planSummary = null; // plain-text snapshot of the current plan, used by the image exporter

  function setRoom(type) {
    roomType = type;
    document.querySelectorAll('.calc__chip[data-room]').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-room') === type);
    });
    var R = ROOMS[type];
    var outdoor = type === 'outdoors';
    if (dimsBox) dimsBox.style.display = outdoor ? 'none' : '';
    if (roomTip) roomTip.textContent = R.tip;
    recalc();
  }

  document.querySelectorAll('.calc__chip[data-room]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var type = chip.getAttribute('data-room');
      setRoom(type);
      // Prompt for the room size: jump to the length field when it is still empty.
      if (type !== 'outdoors' && lenInput && lenInput.value === '') {
        try { lenInput.focus(); } catch (e) {}
      }
    });
  });

  /* ---------- Golf simulator mode ---------- */
  var golfMode = false;
  var golfWrap = document.getElementById('calc-golf-wrap');
  var diagWrap = document.getElementById('calc-diag-wrap');
  var aspectStdWrap = document.getElementById('calc-aspect-std-wrap');
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

  function setGolfMode(on) {
    golfMode = on;
    document.querySelectorAll('#calc-golf-chips .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', (c.getAttribute('data-golf') === 'yes') === on);
    });
    if (golfWrap) golfWrap.hidden = !on;
    if (diagWrap) diagWrap.style.display = on ? 'none' : '';
    if (aspectStdWrap) aspectStdWrap.style.display = on ? 'none' : '';
    syncUnitLabels();
    var vizTitle = document.getElementById('calc-viz-title');
    if (vizTitle) vizTitle.textContent = on ? 'Simulator preview' : 'Room preview';
    recalc();
  }
  document.querySelectorAll('#calc-golf-chips .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setGolfMode(chip.getAttribute('data-golf') === 'yes');
    });
  });

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

  /* ---------- Units: feet or meters (all internal math stays in feet) ---------- */
  var M_PER_FT = 0.3048;
  var unit = 'ft';
  try { unit = localStorage.getItem('calc-unit') || 'ft'; } catch (e) { unit = 'ft'; }
  if (unit !== 'm') unit = 'ft';
  function toFt(v) { return unit === 'm' ? v / M_PER_FT : v; }
  function dispDist(ft) { return unit === 'm' ? fmt(ft * M_PER_FT, 2) + ' m' : fmt(ft, 1) + ' ft'; }
  function dispShort(ft) { return unit === 'm' ? fmt(ft * M_PER_FT, 1) + ' m' : fmt(ft, 0) + ' ft'; }
  var DIM_INPUTS = [ // id, min, max, step in feet
    ['calc-room-len', 6, 100, 0.5],
    ['calc-room-wid', 6, 100, 0.5],
    ['calc-room-ceil', 7, 30, 0.5],
    ['calc-seat', 2, 60, 0.5],
    ['calc-screen-w', 4, 40, 0.5],
    ['calc-screen-h', 3, 20, 0.5],
    ['calc-throwdist', 1, 100, 0.5]
  ];
  function syncUnitLabels() {
    var m = unit === 'm';
    var u = m ? 'm' : 'ft';
    var map = [
      ['calc-room-len', 'Room length', m ? 'e.g. 5.5' : 'e.g. 18'],
      ['calc-room-wid', 'Room width', m ? 'e.g. 4.3' : 'e.g. 14'],
      ['calc-room-ceil', 'Ceiling height', m ? 'e.g. 2.7' : 'e.g. 9'],
      ['calc-seat', golfMode ? 'Hitting distance from screen' : 'Seating distance', m ? 'e.g. 3' : 'e.g. 10'],
      ['calc-screen-w', 'Screen width', m ? 'e.g. 3' : 'e.g. 10'],
      ['calc-screen-h', 'Screen height', m ? 'e.g. 2.3' : 'e.g. 7.5'],
      ['calc-throwdist', 'Throw distance', m ? 'e.g. 3.7' : 'e.g. 12'],
      ['calc-zoom', 'Lens zoom', null]
    ];
    map.forEach(function (row) {
      var lab = document.querySelector('label[for="' + row[0] + '"]');
      if (lab) lab.textContent = row[1] + ' (' + u + ')';
      if (row[2]) {
        var inp = document.getElementById(row[0]);
        if (inp) inp.placeholder = row[2];
      }
    });
    DIM_INPUTS.forEach(function (d) {
      var inp = document.getElementById(d[0]);
      if (!inp) return;
      if (m) {
        inp.min = fmt(d[1] * M_PER_FT, 1);
        inp.max = fmt(d[2] * M_PER_FT, 0);
        inp.step = '0.1';
      } else {
        inp.min = d[1]; inp.max = d[2]; inp.step = d[3];
      }
    });
  }
  function setUnit(u, convert) {
    if (u !== 'ft' && u !== 'm') return;
    if (convert && u !== unit) {
      var toM = (u === 'm');
      [lenInput, widInput, ceilInput, seatInput, wInput, hInput, throwDistInput].forEach(function (el) {
        if (!el || el.value === '') return;
        var v = parseFloat(el.value, 10);
        if (!(v >= 0)) return;
        el.value = toM ? fmt(v * M_PER_FT, 2) : fmt(v / M_PER_FT, 2);
      });
    }
    unit = u;
    try { localStorage.setItem('calc-unit', u); } catch (e) {}
    document.querySelectorAll('#calc-units .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-unit') === u);
    });
    syncUnitLabels();
    recalc();
  }
  document.querySelectorAll('#calc-units .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setUnit(chip.getAttribute('data-unit'), true); });
  });

  /* ---------- Projector position (standard mode) ---------- */
  var projPos = 'behind';
  var projposWrap = document.getElementById('calc-projpos-wrap');
  document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      projPos = chip.getAttribute('data-pos');
      document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c === chip);
      });
      recalc();
    });
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

  /* ---------- Shareable links: encode the whole setup in the URL hash ---------- */
  function buildShareLink() {
    var parts = [];
    function enc(k, v) {
      if (v === null || v === undefined || v === '') return;
      parts.push(k + '=' + encodeURIComponent(v));
    }
    function inFt(el) { return el ? toFt(parseFloat(el.value, 10)) : NaN; }
    function r2(v) { return Math.round(v * 100) / 100; }
    if (selectedModel) {
      enc('m', selectedModel.b + ' ' + selectedModel.m);
      if (modelLenses(selectedModel)) enc('ml', selectedLens);
    } else if (manualBox && !manualBox.hidden) {
      var a = parseFloat(ratioMinInput.value, 10), b = parseFloat(ratioMaxInput.value, 10);
      if (a > 0 && b > 0) enc('mr', Math.min(a, b) + ',' + Math.max(a, b));
    }
    enc('r', roomType);
    enc('g', golfMode ? '1' : '0');
    if (!golfMode && sizeInput && parseFloat(sizeInput.value, 10) > 0) enc('sz', Math.round(parseFloat(sizeInput.value, 10)));
    enc('ar', stdAspect);
    enc('dir', reverseMode ? '1' : '0');
    if (reverseMode && !golfMode) { var td = inFt(throwDistInput); if (td > 0) enc('td', r2(td)); }
    if (compareB) { enc('cb', compareB.b + ' ' + compareB.m); if (modelLenses(compareB)) enc('cbl', compareLens.b); }
    if (compareC) { enc('cc', compareC.b + ' ' + compareC.m); if (modelLenses(compareC)) enc('ccl', compareLens.c); }
    var seat = inFt(seatInput); if (seat > 0) enc('seat', r2(seat));
    enc('pp', projPos);
    if (golfMode) {
      enc('gp', placement);
      var gw = inFt(wInput); if (gw > 0) enc('gw', r2(gw));
      var gh = inFt(hInput); if (gh > 0) enc('gh', r2(gh));
      if (aspectSel) enc('ga', aspectSel.value);
    } else if (roomType !== 'outdoors') {
      var L = inFt(lenInput); if (L > 0) enc('L', r2(L));
      var Wd = inFt(widInput); if (Wd > 0) enc('W', r2(Wd));
      var H = inFt(ceilInput); if (H > 0) enc('H', r2(H));
    }
    enc('u', unit);
    if (lumensInput && parseFloat(lumensInput.value, 10) > 0) enc('lm', Math.round(parseFloat(lumensInput.value, 10)));
    if (gainInput && parseFloat(gainInput.value, 10) > 0) enc('gn', parseFloat(gainInput.value, 10));
    if (zoomFrac() > 0) enc('z', Math.round(zoomFrac() * 100));
    if (lockMode !== 'off') enc('lk', lockMode === 'projector' ? '1' : '2');
    enc('li', lightsOn ? '1' : '0');
    enc('sun', sunOn ? '1' : '0');
    return window.location.href.split('#')[0] + '#calc=' + parts.join(';');
  }

  function copyText(t, done) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = t;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
      done();
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(done, fallback);
    } else {
      fallback();
    }
  }

  var shareBtn = document.getElementById('calc-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', function () {
      var link = buildShareLink();
      try { history.replaceState(null, '', '#calc=' + link.split('#calc=')[1]); } catch (e) {}
      copyText(link, function () {
        var old = shareBtn.textContent;
        shareBtn.textContent = 'Copied!';
        setTimeout(function () { shareBtn.textContent = old; }, 1600);
      });
    });
  }

  function applyShareHash() {
    var h = window.location.hash || '';
    if (h.indexOf('#calc=') !== 0) return;
    var p = {};
    h.substring(6).split(';').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) {
        try { p[kv.substring(0, i)] = decodeURIComponent(kv.substring(i + 1)); } catch (e) {}
      }
    });
    function num(k) { var v = parseFloat(p[k], 10); return v >= 0 ? v : NaN; }
    function toDisp(ft) { return unit === 'm' ? fmt(ft * M_PER_FT, 2) : String(Math.round(ft * 100) / 100); }
    // Links carrying advanced-only settings open in Advanced mode.
    if (p.g === '1' || p.dir === '1' || p.cb || p.cc || p.cbl || p.ccl || p.lm || p.gn || p.pp || p.gp || p.gw || p.gh || p.ga) setAdvMode(true);
    if (p.u === 'm' || p.u === 'ft') setUnit(p.u, false);
    if (p.m) {
      var found = null;
      THROW.forEach(function (x) { if ((x.b + ' ' + x.m) === p.m) found = x; });
      if (found) {
        chooseModel(found, null);
        var li = parseInt(p.ml, 10);
        if (!isNaN(li) && modelLenses(found) && li >= 0 && li < found.l.length) {
          selectedLens = li;
          syncLensPicker();
          refreshSelectedLine();
        }
      }
    } else if (p.mr && manualToggle && ratioMinInput && ratioMaxInput) {
      if (manualBox.hidden) manualToggle.click();
      var mm = p.mr.split(',');
      ratioMinInput.value = mm[0] || '';
      ratioMaxInput.value = mm[1] || mm[0] || '';
    }
    if (p.r && ROOMS[p.r]) setRoom(p.r);
    if (!isNaN(num('L')) && lenInput) lenInput.value = toDisp(num('L'));
    if (!isNaN(num('W')) && widInput) widInput.value = toDisp(num('W'));
    if (!isNaN(num('H')) && ceilInput) ceilInput.value = toDisp(num('H'));
    setGolfMode(p.g === '1');
    if (p.dir === '1') setDirection('throw');
    if (!isNaN(num('sz')) && sizeInput) { sizeInput.value = Math.round(num('sz')); syncSizeVal(); }
    if (!isNaN(num('td')) && throwDistInput) throwDistInput.value = toDisp(num('td'));
    if (p.cb || p.cc) {
      if (!compareOn && compareToggle) compareToggle.click();
      [['b', p.cb, p.cbl], ['c', p.cc, p.ccl]].forEach(function (q) {
        if (!q[1]) return;
        var found = null;
        THROW.forEach(function (x) { if ((x.b + ' ' + x.m) === q[1]) found = x; });
        if (found) {
          setCompare(q[0], found);
          var cli = parseInt(q[2], 10);
          if (!isNaN(cli) && modelLenses(found) && cli >= 0 && cli < found.l.length) {
            compareLens[q[0]] = cli;
            syncCompareLens(q[0]);
          }
          var ci = document.getElementById(q[0] === 'b' ? 'calc-model-b' : 'calc-model-c');
          if (ci) ci.value = q[1];
        }
      });
    }
    if (p.ar && ASPECTS[p.ar]) {
      stdAspect = p.ar;
      document.querySelectorAll('#calc-aspect-std .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-ar') === p.ar);
      });
    }
    if (!isNaN(num('seat')) && seatInput) seatInput.value = toDisp(num('seat'));
    if (p.pp) {
      projPos = p.pp;
      document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-pos') === p.pp);
      });
    }
    if (p.gp) {
      placement = p.gp;
      document.querySelectorAll('#calc-placement .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-place') === p.gp);
      });
    }
    if (!isNaN(num('gw')) && wInput) wInput.value = toDisp(num('gw'));
    if (!isNaN(num('gh')) && hInput) hInput.value = toDisp(num('gh'));
    if (p.ga && aspectSel) aspectSel.value = p.ga;
    if (!isNaN(num('lm')) && lumensInput) lumensInput.value = Math.round(num('lm'));
    if (!isNaN(num('gn')) && gainInput) gainInput.value = p.gn;
    if (!isNaN(num('z')) && zoomInput) zoomInput.value = Math.max(0, Math.min(100, Math.round(num('z'))));
    if (p.lk === '1') setLockMode('projector'); else if (p.lk === '2') setLockMode('image');
    if (p.li === '0' && lightsOn && lightsToggle) lightsToggle.click();
    if (p.li === '1' && !lightsOn && lightsToggle) lightsToggle.click();
    if (p.sun === '1' && !sunOn && sunToggle) sunToggle.click();
    if (p.sun === '0' && sunOn && sunToggle) sunToggle.click();
    recalc();
  }

  /* ---------- Export: baked PNG/JPG with measurements on the left, 3D on the right ---------- */
  function downloadBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 800);
  }

  function exportImage(kind) {
    if (!svg || !planSummary) return;
    var mime = kind === 'jpg' ? 'image/jpeg' : 'image/png';
    var clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '1320');
    clone.setAttribute('height', '880');
    var st = document.createElementNS(NS, 'style');
    st.textContent = 'text{font-family:Arial,Helvetica,sans-serif}';
    clone.insertBefore(st, clone.firstChild);
    var svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
    var img = new Image();
    img.onload = function () {
      try {
        var CW = 1600, CH = 900, PW = 540;
        var cv = document.createElement('canvas');
        cv.width = CW; cv.height = CH;
        var cx = cv.getContext('2d');
        // left measurements panel
        cx.fillStyle = '#0c2244';
        cx.fillRect(0, 0, PW, CH);
        // right side backdrop matches the scene
        var night = !sunOn && !lightsOn;
        cx.fillStyle = night ? '#0e1320' : '#ffffff';
        cx.fillRect(PW, 0, CW - PW, CH);
        var s = Math.min((CW - PW) / 660, CH / 440);
        var dw = 660 * s, dh = 440 * s;
        cx.drawImage(img, PW + ((CW - PW) - dw) / 2, (CH - dh) / 2, dw, dh);
        // measurements text
        var S = planSummary;
        function row(label, value, y) {
          cx.fillStyle = '#8fa3c8';
          cx.font = '600 13px Arial,sans-serif';
          cx.fillText(label.toUpperCase(), 48, y);
          cx.fillStyle = '#ffffff';
          cx.font = '400 23px Arial,sans-serif';
          cx.fillText(String(value).substring(0, 40), 48, y + 30);
        }
        cx.fillStyle = '#8fa3c8';
        cx.font = '600 15px Arial,sans-serif';
        cx.fillText('BUDGETPROJECTORS.ORG', 48, 64);
        cx.fillStyle = '#ffffff';
        cx.font = '700 42px Arial,sans-serif';
        cx.fillText('Room Plan', 48, 114);
        cx.strokeStyle = 'rgba(255,255,255,0.18)';
        cx.lineWidth = 1;
        cx.beginPath(); cx.moveTo(48, 140); cx.lineTo(PW - 48, 140); cx.stroke();
        var y = 184;
        if (S.model) { row('Projector', S.model, y); y += 74; }
        if (S.throw) { row('Throw distance', S.throw, y); y += 74; }
        if (S.screen) { row('Screen', S.screen, y); y += 74; }
        if (S.room) { row('Room', S.room, y); y += 74; }
        if (S.seat) { row('Seating', S.seat, y); y += 74; }
        if (S.bright) { row('Brightness', S.bright, y); y += 74; }
        if (S.verdict) {
          cx.fillStyle = '#ffd94d';
          cx.font = '600 20px Arial,sans-serif';
          cx.fillText(String(S.verdict).substring(0, 38), 48, CH - 58);
        }
        cx.fillStyle = '#8fa3c8';
        cx.font = '400 13px Arial,sans-serif';
        cx.fillText('Made with the BudgetProjectors throw-distance calculator', 48, CH - 28);
        cv.toBlob(function (blob) {
          if (blob) downloadBlob(blob, 'budgetprojectors-room-plan.' + kind);
          URL.revokeObjectURL(svgUrl);
        }, mime, 0.92);
      } catch (e) {
        URL.revokeObjectURL(svgUrl);
      }
    };
    img.onerror = function () { URL.revokeObjectURL(svgUrl); };
    img.src = svgUrl;
  }

  var pngBtn = document.getElementById('calc-export-png');
  if (pngBtn) pngBtn.addEventListener('click', function () { exportImage('png'); });
  var jpgBtn = document.getElementById('calc-export-jpg');
  if (jpgBtn) jpgBtn.addEventListener('click', function () { exportImage('jpg'); });

  var sizeNum = document.getElementById('calc-size-num');
  function syncSizeVal() {
    // Don't clobber the field while the user is typing in it.
    if (sizeInput && sizeNum && document.activeElement !== sizeNum) sizeNum.value = sizeInput.value;
  }
  [lenInput, widInput, ceilInput, seatInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });
  if (sizeInput) {
    sizeInput.addEventListener('input', function () { lastMoved = 'size'; syncSizeVal(); recalc(); });
    syncSizeVal();
  }
  if (sizeNum) {
    // Manual screen size: typing a number moves the slider there directly.
    sizeNum.addEventListener('input', function () {
      var v = parseFloat(sizeNum.value, 10);
      if (!(v > 0) || !sizeInput) return;
      sizeInput.value = Math.max(0, Math.min(300, Math.round(v)));
      lastMoved = 'size';
      recalc();
    });
  }
  [lumensInput, gainInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });
  document.querySelectorAll('#calc-aspect-std .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      stdAspect = chip.getAttribute('data-ar');
      document.querySelectorAll('#calc-aspect-std .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c === chip);
      });
      recalc();
    });
  });

  /* ---------- Direction: screen size -> throw, or throw distance -> screen size ---------- */
  var reverseMode = false;
  var throwDistInput = document.getElementById('calc-throwdist');
  var screenModeWrap = document.getElementById('calc-screenmode-wrap');
  var throwModeWrap = document.getElementById('calc-throwmode-wrap');
  function setDirection(dir) {
    reverseMode = dir === 'throw';
    document.querySelectorAll('#calc-dir-chips .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-dir') === dir);
    });
    if (screenModeWrap) screenModeWrap.hidden = reverseMode;
    if (throwModeWrap) throwModeWrap.hidden = !reverseMode;
    recalc();
  }
  document.querySelectorAll('#calc-dir-chips .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setDirection(chip.getAttribute('data-dir')); });
  });
  if (throwDistInput) throwDistInput.addEventListener('input', recalc);

  /* ---------- Head-to-head model comparison ---------- */
  var compareOn = false, compareB = null, compareC = null;
  var compareLens = { b: 0, c: 0 };
  var compareToggle = document.getElementById('calc-compare-toggle');
  var compareWrap = document.getElementById('calc-compare-wrap');
  function compareEntry(which) { return which === 'b' ? compareB : compareC; }
  function compareRatio(which) {
    return effectiveRatio(compareEntry(which), compareLens[which] || 0);
  }
  function compareLensName(which) {
    var lenses = modelLenses(compareEntry(which));
    var i = compareLens[which] || 0;
    return (lenses && lenses[i]) ? lenses[i][0] : null;
  }
  function compareFullName(which) {
    var e = compareEntry(which);
    if (!e) return '';
    var ln = compareLensName(which);
    return e.b + ' ' + e.m + (ln ? ' · ' + ln : '');
  }
  function syncCompareLens(which) {
    var sel = document.getElementById(which === 'b' ? 'calc-lens-b' : 'calc-lens-c');
    if (!sel) return;
    var lenses = modelLenses(compareEntry(which));
    if (!lenses) {
      sel.hidden = true; sel.innerHTML = '';
      compareLens[which] = 0;
      return;
    }
    var idx = compareLens[which] || 0;
    if (idx < 0 || idx >= lenses.length) idx = 0;
    compareLens[which] = idx;
    sel.innerHTML = '';
    lenses.forEach(function (L, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = L[0] + ' · ' + ratioLabel([L[1], L[2]]);
      if (i === idx) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.hidden = false;
  }
  function setCompare(which, entry) {
    if (which === 'b') compareB = entry; else compareC = entry;
    compareLens[which] = 0;
    syncCompareLens(which);
  }
  ['b', 'c'].forEach(function (which) {
    var sel = document.getElementById(which === 'b' ? 'calc-lens-b' : 'calc-lens-c');
    if (sel) sel.addEventListener('change', function () {
      compareLens[which] = parseInt(sel.value, 10) || 0;
      recalc();
    });
  });
  function bindCompareInput(inputId, suggestId, which) {
    var inp = document.getElementById(inputId), sug = document.getElementById(suggestId);
    if (!inp || !sug) return;
    inp.addEventListener('input', function () {
      setCompare(which, null);
      var q = inp.value.trim().toLowerCase();
      if (q.length < 2) { sug.hidden = true; sug.innerHTML = ''; recalc(); return; }
      var matches = THROW.filter(function (x) {
        return (x.b + ' ' + x.m).toLowerCase().indexOf(q) !== -1;
      }).slice(0, 20);
      sug.innerHTML = '';
      matches.forEach(function (x) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = x.b + ' ' + x.m + ' · ' + ratioLabel(x.t);
        btn.addEventListener('click', function () {
          inp.value = x.b + ' ' + x.m;
          sug.hidden = true; sug.innerHTML = '';
          setCompare(which, x);
          recalc();
        });
        sug.appendChild(btn);
      });
      sug.hidden = !matches.length;
      recalc();
    });
  }
  bindCompareInput('calc-model-b', 'calc-suggest-b', 'b');
  bindCompareInput('calc-model-c', 'calc-suggest-c', 'c');
  if (compareToggle) {
    compareToggle.addEventListener('click', function () {
      compareOn = !compareOn;
      if (compareWrap) compareWrap.hidden = !compareOn;
      compareToggle.textContent = compareOn ? 'Hide comparison' : 'Compare multiple models';
      if (!compareOn) {
        compareB = compareC = null;
        compareLens.b = compareLens.c = 0;
        ['calc-model-b', 'calc-model-c'].forEach(function (id) {
          var i = document.getElementById(id); if (i) i.value = '';
        });
        ['calc-lens-b', 'calc-lens-c'].forEach(function (id) {
          var s = document.getElementById(id); if (s) { s.hidden = true; s.innerHTML = ''; }
        });
      }
      recalc();
    });
  }

  /* ---------- Basic / Advanced mode ---------- */
  var advMode = false;
  function setAdvMode(on) {
    advMode = on;
    document.querySelectorAll('#calc-mode-chips .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-mode') === (on ? 'advanced' : 'basic'));
    });
    var root = document.querySelector('.calc');
    if (root) {
      root.classList.toggle('calc--basic', !on);
      root.classList.toggle('calc--advanced', on);
    }
    if (!on) {
      if (golfMode) setGolfMode(false);
      if (reverseMode) setDirection('screen');
    }
    try { localStorage.setItem('calc-mode', on ? 'advanced' : 'basic'); } catch (e) {}
    recalc();
  }
  document.querySelectorAll('#calc-mode-chips .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setAdvMode(chip.getAttribute('data-mode') === 'advanced'); });
  });

  function fmtDist(inches) {
    if (unit === 'm') {
      if (inches < 36) return fmt(inches * 2.54, 0) + ' cm';
      return fmt(inches * 0.0254, 2) + ' m';
    }
    var ft = inches / 12;
    if (inches < 36) return fmt(inches, 0) + ' in';
    return fmt(ft, 1) + ' ft';
  }

  function recalc() {
    if (!planResult || !svg) return;
    var r = currentRatio();
    var diag = sizeInput ? parseFloat(sizeInput.value, 10) : NaN;
    var seat = seatInput ? toFt(parseFloat(seatInput.value, 10)) : NaN;
    var outdoor = roomType === 'outdoors';
    var L = outdoor ? 30 : (lenInput ? toFt(parseFloat(lenInput.value, 10)) : NaN);
    var W = outdoor ? 24 : (widInput ? toFt(parseFloat(widInput.value, 10)) : NaN);
    var H = outdoor ? 0 : (ceilInput ? toFt(parseFloat(ceilInput.value, 10)) : NaN);
    // No hidden preset: without user-entered dims the fit simply cannot be judged.
    var dimsKnown = outdoor || (L > 0 && W > 0);

    // Zoom lock: hold the projector's throw distance fixed by driving the other slider.
    // The lock is absolute: the projector never moves while locked. If the requested
    // size runs past the zoom range, the zoom pegs at its limit and the verdict says so.
    var lockPegged = false;
    if (lockMode === 'projector' && lockedD > 0 && !reverseMode && !golfMode && lastMoved && sizeInput) {
      if (r && r[1] > r[0]) {
        if (lastMoved === 'size') {
          var dgL = parseFloat(sizeInput.value, 10);
          if (dgL > 0) {
            var wFtS = dgL * widthFactor() / 12;
            var rNeed = lockedD / wFtS;
            var rc = Math.min(r[1], Math.max(r[0], rNeed));
            setZoomPercent((rc - r[0]) / (r[1] - r[0]) * 100);
            if (rc !== rNeed) lockPegged = true;
          }
        } else if (lastMoved === 'zoom') {
          var rSel = r[0] + zoomFrac() * (r[1] - r[0]);
          var diagNeed = (lockedD / rSel * 12) / widthFactor();
          var dc = Math.min(300, Math.max(20, diagNeed));
          sizeInput.value = Math.round(dc);
          syncSizeVal();
          if (dc !== diagNeed) lockPegged = true;
        }
      }
      lastMoved = null;
      diag = sizeInput ? parseFloat(sizeInput.value, 10) : NaN; // re-read: the lock may have moved it
    }

    if (!r) {
      drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: null, seat: seat, room: roomType, golf: golfMode });
      planResult.innerHTML = '<strong>Pick your projector model</strong>' +
        '<span>Choose your model from the list above (or enter its throw ratio manually) and your room plan will appear here.</span>';
      syncZoom(null, 0);
      return;
    }

    // Screen size: diagonal in standard mode, width x height in golf-sim mode.
    // Reverse mode: throw distance in, screen-size range out.
    var scrWIn = 0, scrHIn = 0, imgWIn = 0, arWarn = '', scrLabel = '';
    var tdFt = NaN, dMin = NaN, dMax = NaN, dRange = '';
    if (golfMode) {
      var wFt = wInput ? toFt(parseFloat(wInput.value, 10)) : NaN;
      var hFt = hInput ? toFt(parseFloat(hInput.value, 10)) : NaN;
      if (!(wFt > 0) || !(hFt > 0)) {
        drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType, golf: golfMode });
        planResult.innerHTML = '<strong>Enter your screen dimensions</strong>' +
          '<span>Type the screen width and height for your golf simulator and the planner will do the rest.</span>';
        syncZoom(null, 0);
        return;
      }
      scrWIn = wFt * 12; scrHIn = hFt * 12;
      var scrAR = scrWIn / scrHIn;
      var aLabel = aspectLabel(scrWIn, scrHIn);
      scrLabel = dispDist(wFt) + ' x ' + dispDist(hFt) + ' (' + aLabel + ')';
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
    } else if (reverseMode) {
      tdFt = throwDistInput ? toFt(parseFloat(throwDistInput.value, 10)) : NaN;
      if (!(tdFt > 0)) {
        drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType, golf: golfMode });
        planResult.innerHTML = '<strong>Enter a throw distance</strong>' +
          '<span>Type how far back the projector will sit and the planner will show the screen sizes it can fill.</span>';
        syncZoom(null, 0);
        return;
      }
      var ra = ASPECTS[stdAspect] || ASPECTS['16:9'];
      var rwf = ra[0] / Math.sqrt(ra[0] * ra[0] + ra[1] * ra[1]);
      dMin = tdFt * 12 / r[1] / rwf;
      dMax = tdFt * 12 / r[0] / rwf;
      scrWIn = dMax * rwf; scrHIn = scrWIn * ra[1] / ra[0];
      imgWIn = scrWIn;
      dRange = fmt(dMin, 0) + (Math.abs(dMax - dMin) < 0.5 ? '' : '&ndash;' + fmt(dMax, 0));
      scrLabel = dRange + '&Prime; ' + stdAspect;
    } else {
      if (!(diag > 0)) {
        drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType, golf: golfMode });
        planResult.innerHTML = '<strong>Enter a screen size</strong>' +
          '<span>Type the screen diagonal you want and the planner will show throw distance, seating, and whether it fits your room.</span>';
        syncZoom(null, 0);
        return;
      }
      var a = ASPECTS[stdAspect] || ASPECTS['16:9'];
      var ad = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
      scrWIn = diag * a[0] / ad; scrHIn = diag * a[1] / ad;
      imgWIn = scrWIn;
      scrLabel = fmt(diag, 0) + '&Prime; ' + stdAspect;
    }

    var ust = r[1] < 1;
    if (projposWrap) projposWrap.hidden = golfMode || ust;

    var near = imgWIn * r[0] / 12; // ft
    var far = imgWIn * r[1] / 12; // ft
    // Projector position on the zoom slider; the slider only applies in standard screen-size mode.
    var throwD = (reverseMode || golfMode) ? near : near + zoomFrac() * (far - near); // ft
    if (needLockCapture) { lockedD = throwD; needLockCapture = false; }
    // Absolute projector lock: the projector never moves while locked, even when the
    // zoom pegs at its limit (the verdict below names what the lens can actually fill).
    if (lockMode === 'projector' && lockedD > 0 && !reverseMode && !golfMode) throwD = lockedD;
    var modelName = selectedModel ? selectedModel.b + ' ' + selectedModel.m + (selectedLensName() ? ' · ' + selectedLensName() : '') : 'throw ' + ratioLabel(r);

    // Golf-sim projector placement (also drives the 3D projector position).
    var hitD = seat; // hitting distance from the screen, ft
    var px = throwD, py = W / 2, pz = ust ? 1 : 3, pmount = false;
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

    // Head-to-head: extra projectors drawn at their own throw distances for the same screen.
    var extraProj = [];
    if (compareOn && advMode && !reverseMode && (compareB || compareC)) {
      [['B', compareB], ['C', compareC]].forEach(function (q) {
        var entry = q[1];
        if (!entry) return;
        var t = compareRatio(q[0].toLowerCase()), xust = t[1] < 1;
        var nX = imgWIn * t[0] / 12;
        var sp = {
          tag: q[0], ust: xust,
          dist: fmtDist(imgWIn * t[0]) + (t[1] !== t[0] ? '–' + fmtDist(imgWIn * t[1]) : '')
        };
        if (golfMode) {
          sp.py = W / 2;
          if (placement === 'ceiling') { sp.px = nX; sp.pz = H > 0 ? Math.max(H - 0.9, 2) : 6; sp.pmount = H > 0; }
          else if (placement === 'floor') { sp.px = nX; sp.pz = 0.6; }
          else { sp.px = px; sp.py = Math.min(py + 1.8, W - 1); sp.pz = 0.6; }
        } else {
          sp.px = Math.min(nX, L - 0.8);
          sp.py = W / 2;
          sp.pos = xust ? 'behind' : projPos;
          sp.pz = sp.pos === 'table' ? 2.475 : null;
        }
        extraProj.push(sp);
      });
    }

    // Effective lumens for brightness: manual input wins, then the selected
    // lens's published output, then the model's published output.
    var effLumens = lumensInput ? parseFloat(lumensInput.value, 10) : NaN;
    if (!(effLumens > 0)) {
      var selLensLm = lensLumens(selectedModel, selectedLens);
      if (selLensLm > 0) effLumens = selLensLm;
      else if (selectedModel && selectedModel.lm > 0) effLumens = selectedModel.lm;
    }

    syncZoom(r, imgWIn);
    var zoomPct = (zoomWrap && !zoomWrap.hidden) ? Math.round(zoomFrac() * 100) : -1;
    drawViz({ L: L, W: W, H: H, outdoor: outdoor, swFt: scrWIn / 12, shFt: scrHIn / 12,
      scrLabel: scrLabel, imgWIn: imgWIn, r: r, seat: seat, room: roomType, golf: golfMode,
      px: px, py: py, pz: pz, pmount: pmount, projPos: projPos, extraProj: extraProj,
      throwD: throwD, zpct: zoomPct, projLocked: lockMode === 'projector',
      lumens: effLumens > 0 ? effLumens : 0 });

    // Reference viewing distance from viewing angle: 36 deg (immersive) to 30 deg (SMPTE minimum).
    var dClose = (imgWIn / 2) / Math.tan(18 * Math.PI / 180) / 12; // ft
    var dFarV = (imgWIn / 2) / Math.tan(15 * Math.PI / 180) / 12; // ft

    var bits = [];
    bits.push('Screen: ' + scrLabel + '.');
    if (sunOn) bits.push('With sunlight in the room, use an ALR (ambient light rejecting) screen. ' +
      'A standard white screen washes out in daylight, while an ALR screen preserves contrast and brightness.');
    if (arWarn) bits.push(arWarn);
    bits.push('Reference seating: ' + dispDist(dClose) + '–' + dispDist(dFarV) +
      ' from the screen (30–36&deg; viewing angle, SMPTE/THX guidance).');
    if (seat > 0 && !golfMode) {
      if (seat < dClose) bits.push('Your seating (' + dispDist(seat) + ') is closer than the reference range: extra immersive.');
      else if (seat > dFarV) bits.push('Your seating (' + dispDist(seat) + ') is farther than the reference range: the image may feel small.');
      else bits.push('Your seating (' + dispDist(seat) + ') lands inside the reference range.');
      // Ideal screen size for this seating distance (inverse of the viewing-angle math above).
      var wLo = 2 * seat * Math.tan(15 * Math.PI / 180) * 12; // inches, 30 deg
      var wHi = 2 * seat * Math.tan(18 * Math.PI / 180) * 12; // inches, 36 deg
      var swf = stdWidthFactor();
      bits.push('For your ' + dispDist(seat) + ' seating, the 30&ndash;36&deg; sweet spot is a ' +
        fmt(wLo / swf, 0) + '&ndash;' + fmt(wHi / swf, 0) + '&Prime; ' + stdAspect + ' screen.');
    }
    // Brightness: lumens over the lit image area, in foot-lamberts.
    var fl = NaN, flNote = '';
    var lumens = effLumens;
    if (lumens > 0) {
      var gain = gainInput ? parseFloat(gainInput.value, 10) : NaN;
      if (!(gain > 0)) gain = 1;
      var imgHIn = golfMode ? imgWIn / PROJ_AR : scrHIn;
      var areaSqFt = imgWIn * imgHIn / 144;
      if (areaSqFt > 0) {
        fl = lumens * gain / areaSqFt;
        flNote = fl < 12 ? 'dim, best in a fully dark room' :
          fl < 30 ? 'good with the lights off' :
          fl < 60 ? 'holds up with some ambient light' : 'bright enough for lights-on viewing';
        bits.push('Brightness: about ' + fmt(fl, 0) + ' foot-lamberts on this screen, ' + flNote + '.');
      }
    }
    var fitsRoom;
    if (!outdoor && !dimsKnown) {
      fitsRoom = null; // cannot judge the fit without the user's room size
      bits.push('Enter your room size above to check whether this fits.');
    } else if (!outdoor) {
      var maxW = Math.min(L * 12 / r[1], (W - 1) * 12);
      fitsRoom = reverseMode ? (tdFt <= L && scrWIn / 12 <= W - 1) : (throwD <= L && scrWIn / 12 <= W - 1);
      if (fitsRoom) {
        bits.push('It fits your ' + ROOMS[roomType].label.toLowerCase() + '.');
      } else if (golfMode) {
        bits.push('Too big for this room: the widest screen that fits is about ' + dispDist(maxW / 12) + ' wide.');
      } else {
        bits.push('Too big for this room: the largest screen that fits is about ' +
          fmt(maxW / stdWidthFactor(), 0) + '&Prime; ' + stdAspect + '.');
      }
    } else {
      bits.push('No walls to worry about outdoors, just keep the throw path clear.');
    }
    // Projector locked and the lens ran out of zoom: name what it can actually fill from here.
    if (lockMode === 'projector' && lockPegged && r && r[1] > r[0] && lockedD > 0) {
      var lockMinDg = (lockedD / r[1] * 12) / widthFactor();
      var lockMaxDg = (lockedD / r[0] * 12) / widthFactor();
      bits.push('Locked at ' + dispDist(lockedD) + ', the lens zoom runs out here: from this spot it can fill about ' +
        fmt(lockMinDg, 0) + '&ndash;' + fmt(lockMaxDg, 0) + '&Prime;.');
    }
    if (!outdoor && H > 0 && scrHIn > 0 && scrHIn / 12 > H - 1) {
      bits.push('Vertical fit: that screen is ' + dispDist(scrHIn / 12) + ' tall and your ceiling is ' +
        dispDist(H) + ', so it will nearly touch the floor and ceiling. Consider a smaller screen.');
    }
    if (ust) bits.push('Ultra-short-throw: measure from the wall, not the lens.');
    bits.push(ROOMS[roomType].tip);

    var imgRef = golfMode ? 'the ' + fmt(imgWIn, 1) + '&Prime;-wide image' : 'a ' + fmt(diag, 0) + '&Prime; screen';
    var throwStr = fmtDist(imgWIn * r[0]);
    var placeStr;
    var posWord = (!golfMode && !ust && projPos === 'ceiling') ? 'Ceiling-mount' : 'Place';
    var posTail = (!golfMode && !ust && projPos === 'table') ? ' on a table' : '';
    if (reverseMode && !golfMode) {
      placeStr = 'At a ' + dispDist(tdFt) + ' throw, the ' + modelName + ' fills a ' +
        dRange + '&Prime; ' + stdAspect + ' screen. ';
    } else if (golfMode && placement === 'golfer') {
      if (hitD > 0 && hitD >= near - 0.05 && hitD <= far + 0.05) {
        placeStr = 'The ' + modelName + ' works next to the golfer: set it beside the hitting mat, about ' +
          dispDist(hitD) + ' from the screen. ';
      } else if (hitD > 0) {
        placeStr = 'Heads up: at a ' + dispDist(hitD) + ' hitting distance the ' + modelName + ' needs ' +
          dispDist(near) + '–' + dispDist(far) + ' of throw, so it will not focus properly next to the golfer. ';
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
      placeStr = posWord + ' the ' + modelName + ' ' + throwStr + ' from ' + imgRef + posTail + '. ';
    } else {
      throwStr += ' – ' + fmtDist(imgWIn * r[1]);
      placeStr = posWord + ' the ' + modelName + ' between ' + fmtDist(imgWIn * r[0]) + ' and ' +
        fmtDist(imgWIn * r[1]) + ' from ' + imgRef + posTail + '. ';
      // When the zoom slider is off the wide end, name the selected throw position.
      if (zoomFrac() > 0.005) {
        placeStr += 'Zoom is set to about ' + dispDist(throwD) + ' of throw. ';
      }
    }

    var revMode = reverseMode && !golfMode;
    var headStr = revMode ? dRange + '&Prime; screen' : throwStr + ' throw';
    planSummary = {
      model: modelName,
      throw: revMode ? dispDist(tdFt) + ' throw' : throwStr + ' throw',
      screen: revMode ? dRange.replace(/&ndash;/g, '–') + '″ ' + stdAspect :
        (golfMode ? scrLabel : fmt(diag, 0) + '″ ' + stdAspect),
      room: ROOMS[roomType].label + (outdoor ? '' : (dimsKnown ?
        ', ' + dispShort(L) + ' × ' + dispShort(W) + ((H >= 0) ? ', ' + dispShort(H) + ' ceiling' : '') :
        ' (enter your room size)')),
      seat: seat > 0 ? dispDist(seat) + (golfMode ? ' hitting distance' : ' seating') : '',
      bright: fl > 0 ? 'about ' + fmt(fl, 0) + ' fL, ' + flNote : '',
      verdict: outdoor ? 'Outdoor setup: keep the throw path clear' :
        (!dimsKnown ? 'Enter your room size to check fit' :
        (fitsRoom ? 'Fits your ' + ROOMS[roomType].label.toLowerCase() : 'Too big for this room'))
    };

    // Head-to-head comparison table (A = main model, B/C = compare models).
    var cmpHtml = '';
    if (compareOn && advMode && (compareB || compareC)) {
      var cmpModels = [{ tag: 'A', name: modelName, t: r }];
      if (compareB) cmpModels.push({ tag: 'B', name: compareFullName('b'), t: compareRatio('b') });
      if (compareC) cmpModels.push({ tag: 'C', name: compareFullName('c'), t: compareRatio('c') });
      cmpHtml = '<table class="ref-table calc__compare-table"><thead><tr><th></th><th>Model</th>';
      if (revMode) {
        var cwf = stdWidthFactor();
        cmpHtml += '<th>Screen at ' + dispDist(tdFt) + '</th></tr></thead><tbody>';
        cmpModels.forEach(function (m) {
          var lo = tdFt * 12 / m.t[1] / cwf, hi = tdFt * 12 / m.t[0] / cwf;
          var lr = fmt(lo, 0) + (Math.abs(hi - lo) < 0.5 ? '' : '&ndash;' + fmt(hi, 0));
          cmpHtml += '<tr><td>' + m.tag + '</td><td>' + m.name + '</td><td>' + lr + '&Prime;</td></tr>';
        });
      } else {
        cmpHtml += '<th>Throw for this screen</th><th>Fits room</th></tr></thead><tbody>';
        cmpModels.forEach(function (m) {
          var cn = imgWIn * m.t[0], cf = imgWIn * m.t[1];
          var ctr = fmtDist(cn) + (m.t[1] !== m.t[0] ? '&ndash;' + fmtDist(cf) : '');
          var cfit = outdoor ? '&ndash;' : (!dimsKnown ? '?' : (cn / 12 <= L ? 'Yes' : 'No'));
          cmpHtml += '<tr><td>' + m.tag + '</td><td>' + m.name + '</td><td>' + ctr + '</td><td>' + cfit + '</td></tr>';
        });
      }
      cmpHtml += '</tbody></table>';
    }

    planResult.innerHTML =
      '<strong>' + headStr + '</strong>' +
      '<span>' + placeStr + bits.join(' ') + '</span>' + cmpHtml;
  }

  /* ---------- Isometric 3D room visualization (SVG) ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var NAVY = '#0c2244', MUTED = '#5c5c5c';

  function drawViz(o) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var VW = 660, VH = 440, pad = 34;
    var L = o.L, W = o.W, H = o.H;

    // No room size entered yet: prompt instead of drawing a room with made-up dims.
    if (!o.outdoor && !(L > 0 && W > 0)) {
      var dp = el('text', { x: VW / 2, y: VH / 2 - 8, 'text-anchor': 'middle',
        'font-size': 15, 'font-weight': '600', fill: '#8a94a8' });
      dp.textContent = 'Enter your room size above to see the 3D preview.';
      var wm0 = el('text', { x: VW - 12, y: VH - 10, 'text-anchor': 'end', 'font-size': 13,
        'font-weight': '600', 'letter-spacing': '1', fill: '#8a94a8', opacity: 0.55 });
      wm0.textContent = 'BudgetProjectors.org';
      return;
    }
    if (!(H >= 0)) H = 9; // ceiling only affects the 3D drawing, default it when empty

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
    txt(L / 2, -0.6, 0, dispShort(L), 12);
    txt(-0.6, W / 2, 0, dispShort(W), 12);

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
      // diagonal size arrow across the screen face
      if (sw > 2 && sh > 1.5) {
        var ax = 0.45;
        var ay1 = yA + 0.3, az1 = z0 + 0.35, ay2 = yB - 0.3, az2 = z0 + sh - 0.35;
        var ady = ay2 - ay1, adz = az2 - az1;
        var alen = Math.sqrt(ady * ady + adz * adz);
        var auy = ady / alen, auz = adz / alen, anx = -auz, anz = auy, at = 0.07;
        var dcol = '#0c2244';
        poly([[ax, ay1 + anx * at, az1 + anz * at],[ax, ay1 - anx * at, az1 - anz * at],
              [ax, ay2 - anx * at, az2 - anz * at],[ax, ay2 + anx * at, az2 + anz * at]], dcol);
        poly([[ax, ay1 - auy * 0.5, az1 - auz * 0.5],[ax, ay1 + anx * 0.3, az1 + anz * 0.3],[ax, ay1 - anx * 0.3, az1 - anz * 0.3]], dcol);
        poly([[ax, ay2 + auy * 0.5, az2 + auz * 0.5],[ax, ay2 + anx * 0.3, az2 + anz * 0.3],[ax, ay2 - anx * 0.3, az2 - anz * 0.3]], dcol);
        var adiag = Math.sqrt(sw * sw + sh * sh) * 12;
        txt(ax, (ay1 + ay2) / 2 + anx * 0.62, (az1 + az2) / 2 + anz * 0.62, fmt(adiag, 0) + '"', 13);
      }
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
      // projector (position follows the projector-position setting, or golf-sim placement)
      var pxx = (o.px != null) ? o.px : near;
      var pyy = (o.py != null) ? o.py : yc;
      var ppos = (!o.golf && !ust) ? (o.projPos || 'behind') : 'behind';
      var pzz = (o.pz != null) ? o.pz : (ust ? 1 : zc);
      if (ppos === 'ceiling' && H > 0) {
        pzz = H - 1.0;
        box(pxx, pyy, (pzz + H) / 2, 0.18, 0.18, H - pzz, pal.stand[0], pal.stand[1], pal.stand[2]); // mount pole
      } else if (ppos === 'table') {
        box(pxx, pyy, 1.1, 2.4, 1.8, 2.2, '#8a6f4d', '#7a6244', '#6e5840'); // table
        pzz = 2.475;
      } else if (o.pmount && H > 0) {
        box(pxx, pyy, (pzz + H) / 2, 0.18, 0.18, H - pzz, pal.stand[0], pal.stand[1], pal.stand[2]); // mount pole
      }
      box(pxx, pyy, pzz, 1.1, 0.9, 0.55, pal.proj[0], pal.proj[1], pal.proj[2]);
      txt(pxx, pyy, pzz + 0.9, 'projector', 11);
      var rangeLabel = fmtDist(imgWIn * o.r[0]);
      if (o.r[1] !== o.r[0]) rangeLabel += '–' + fmtDist(imgWIn * o.r[1]);
      // throw range in the white margin outside the 3D render, not under the unit
      var throwTag = el('text', { x: 16, y: 26, 'font-size': 13, 'font-weight': '600', fill: pal.label });
      var tThrow = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      // Projector locked: the throw is fixed, so name it and visualize the lens zoom
      // position instead of the range; the projector itself never moves.
      if (o.projLocked && o.throwD > 0) {
        tThrow.textContent = '🔒 Throw ' + fmtDist(o.throwD * 12);
      } else {
        tThrow.textContent = 'Throw ' + rangeLabel;
      }
      throwTag.appendChild(tThrow);
      if (o.zpct >= 0) {
        var tZoom = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tZoom.textContent = ' · Zoom ' + o.zpct + '%';
        throwTag.appendChild(tZoom);
      }
      // Only judge the fit when the user has entered a room length.
      if (!o.outdoor && o.L > 0) {
        // Judge the selected zoom position, not the far end of the zoom range.
        var selD = (o.throwD > 0) ? o.throwD : far;
        var throwInRange = selD <= o.L;
        var tStat = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tStat.textContent = throwInRange ? ' · In range' : ' · Out of range';
        tStat.setAttribute('fill', throwInRange
          ? (scene === 'night' ? '#7fd6a4' : '#2e7d5b')
          : (scene === 'night' ? '#ff9d8a' : '#c0392b'));
        throwTag.appendChild(tStat);
      }
      // brightness verdict in the white margin: is this screen size too dim for these lumens?
      if (o.lumens > 0 && imgWIn > 0) {
        var bGain = gainInput ? parseFloat(gainInput.value, 10) : NaN;
        if (!(bGain > 0)) bGain = 1;
        var bImgHIn = o.golf ? imgWIn / PROJ_AR : o.shFt * 12;
        var bArea = imgWIn * bImgHIn / 144;
        if (bArea > 0) {
          var bFl = o.lumens * bGain / bArea;
          var bNote = bFl < 12 ? 'dim, best in a fully dark room' :
            bFl < 30 ? 'good with the lights off' :
            bFl < 60 ? 'holds up with some ambient light' : 'bright enough for lights-on viewing';
          var bCol = bFl < 12 ? (scene === 'night' ? '#ff9d8a' : '#c0392b') :
            bFl < 30 ? (scene === 'night' ? '#ffd28a' : '#a86e00') :
            (scene === 'night' ? '#7fd6a4' : '#2e7d5b');
          var bTag = el('text', { x: 16, y: 44, 'font-size': 13, 'font-weight': '600', fill: pal.label });
          var bT1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          bT1.textContent = 'Brightness ~' + fmt(bFl, 0) + ' fL';
          bTag.appendChild(bT1);
          var bT2 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          bT2.textContent = ' · ' + bNote;
          bT2.setAttribute('fill', bCol);
          bTag.appendChild(bT2);
        }
      }
      // seating position in the white margin, not inside the 3D render
      if (o.seat > 0) {
        var sTag = el('text', { x: 16, y: 62, 'font-size': 13, 'font-weight': '600', fill: pal.label });
        var sT1 = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        sT1.textContent = (o.golf ? 'Hitting distance ' : 'Seating ') + dispDist(o.seat) + ' from screen';
        sTag.appendChild(sT1);
      }
      // light cone: lens to screen corners
      var lens = [pxx, pyy, pzz];
      var sc = [[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]];
      for (var i = 0; i < 4; i++) {
        poly([lens, sc[i], sc[(i + 1) % 4]], pal.beam, { opacity: pal.coneOp });
      }
      // head-to-head: extra projectors at their own throw distances (B green, C orange)
      (o.extraProj || []).forEach(function (xp, xi) {
        var cols = xi === 0 ? ['#2e7d5b', '#1d5c40', '#123c29'] : ['#c07a1e', '#8f5a12', '#5f3c0b'];
        var ex = xp.px, ey = xp.py != null ? xp.py : yc, ez;
        if (!o.golf && !xp.ust && xp.pos === 'ceiling' && H > 0) {
          ez = H - 1.0;
          box(ex, ey, (ez + H) / 2, 0.18, 0.18, H - ez, pal.stand[0], pal.stand[1], pal.stand[2]);
        } else if (xp.pmount && H > 0) {
          ez = xp.pz;
          box(ex, ey, (ez + H) / 2, 0.18, 0.18, H - ez, pal.stand[0], pal.stand[1], pal.stand[2]);
        } else {
          ez = xp.pz != null ? xp.pz : (xp.ust ? 1 : zc);
        }
        box(ex, ey, ez, 1.1, 0.9, 0.55, cols[0], cols[1], cols[2]);
        txt(ex, ey, ez + 0.95, xp.tag + ' ' + xp.dist, 11);
      });
      // seating furniture per room (a golfer in golf-sim mode)
      if (o.seat > 0) {
        var sx = Math.min(o.seat, o.outdoor ? L - 1 : L - 0.5);
        var kind = o.golf ? 'golfer' : ({ living: 'couch', dedicated: 'couch', bedroom: 'bed', outdoors: 'campchair' }[o.room] || 'seat');
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
        txt(sx, yc, fz, fname, 11);
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

    // watermark
    var wm = el('text', { x: VW - 12, y: VH - 10, 'text-anchor': 'end', 'font-size': 13,
      'font-weight': '600', 'letter-spacing': '1', fill: pal.label, opacity: 0.55 });
    wm.textContent = 'BudgetProjectors.org';
  }

  // init
  var savedMode = 'basic';
  try { savedMode = localStorage.getItem('calc-mode') || 'basic'; } catch (e) {}
  setUnit(unit, false);
  setRoom('living');
  setAdvMode(savedMode === 'advanced');
  applyShareHash();
})();
