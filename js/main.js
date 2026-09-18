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
      selectedLens = parseInt(lensSelect.value, 10) || 0;
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
    var show = !!r && r[1] > r[0] && !reverseMode && imgWIn > 0;
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
    if (selectedLine) selectedLine.hidden = true;
    clearModelChips();
    if (suggest) suggest.hidden = true;
    syncShiftControls();
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
    syncShiftControls();
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
      renderSuggest(modelInput.value.trim().toLowerCase());
      syncShiftControls();
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
    gateOutdoorOptions();
    recalc();
  }

  // Outdoors has no ceiling: hide the ceiling-mount position and the indoor-only
  // screen styles (acoustic frame, floor rising), falling back to safe choices.
  function gateOutdoorOptions() {
    var outdoor = roomType === 'outdoors';
    document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (c) {
      if (c.getAttribute('data-pos') === 'ceiling') c.style.display = outdoor ? 'none' : '';
    });
    document.querySelectorAll('#calc-screenstyle .calc__chip').forEach(function (c) {
      var ss = c.getAttribute('data-ss');
      if (ss === 'acoustic' || ss === 'floor') c.style.display = outdoor ? 'none' : '';
    });
    if (outdoor && projPos === 'ceiling') setProjPos('table');
    if (outdoor && (screenStyle === 'acoustic' || screenStyle === 'floor')) setScreenStyle('fixed');
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
      ['calc-seat', 'Seating distance', m ? 'e.g. 3' : 'e.g. 10'],
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
      var inp = document.getElementById(d[0]);      if (!inp) return;
      if (m) {
        inp.min = fmt(d[1] * M_PER_FT, 1);
        inp.max = fmt(d[2] * M_PER_FT, 0);
        inp.step = '0.1';
      } else {
        inp.min = d[1]; inp.max = d[2]; inp.step = d[3];
      }
    });
    var eu = document.getElementById('calc-eye-unit');
    if (eu) eu.textContent = m ? 'cm' : 'in';
    var pu = document.getElementById('calc-pipe-unit');
    if (pu) pu.textContent = m ? 'cm' : 'in';
    var plu = document.getElementById('calc-polelen-unit');
    if (plu) plu.textContent = m ? 'cm' : 'in';
    var ei = document.getElementById('calc-eye-height');
    if (ei) { ei.min = m ? 51 : 20; ei.max = m ? 203 : 80; }
    var pi = document.getElementById('calc-pipe-drop');
    if (pi) { pi.min = m ? 5 : 2; pi.max = m ? 122 : 48; }
    var pli = document.getElementById('calc-pole-len');
    if (pli) { pli.min = m ? 5 : 2; pli.max = m ? 122 : 48; }
  }
  function setUnit(u, convert) {
    if (u !== 'ft' && u !== 'm') return;
    if (convert && u !== unit) {
      var toM = (u === 'm');
      [lenInput, widInput, ceilInput, seatInput, throwDistInput].forEach(function (el) {
        if (!el || el.value === '') return;
        var v = parseFloat(el.value, 10);
        if (!(v >= 0)) return;
        el.value = toM ? fmt(v * M_PER_FT, 2) : fmt(v / M_PER_FT, 2);
      });
      [eyeInput, pipeInput, poleLenInput].forEach(function (el) {
        if (!el || el.value === '') return;
        var v = parseFloat(el.value, 10);
        if (!(v >= 0)) return;
        el.value = toM ? fmt(v * 2.54, 0) : fmt(v / 2.54, 0);
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
  function setProjPos(pos) {
    projPos = pos;
    document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-pos') === pos);
    });
    syncMountTypeUI();
    recalc();
  }
  document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setProjPos(chip.getAttribute('data-pos'));
    });
  });

  /* ---------- Lens shift: up/down moves the projector body (established planner
     behavior); left/right shifts the projected image while the body stays put.
     Verified ranges come from the model's sv/sh fields in throw-data.js.
     Unknown models get a manual +/-60% vertical fallback; never invent ranges. ---------- */
  var shiftOn = false, shiftPct = 0, shiftHPct = 0;
  var shiftChip = document.getElementById('calc-shift-chip');
  var shiftWrap = document.getElementById('calc-shift-wrap');
  var shiftInput = document.getElementById('calc-shift');
  var shiftVal = document.getElementById('calc-shift-val');
  var shiftHint = document.getElementById('calc-shift-hint');
  var shiftHRow = document.getElementById('calc-shift-h-row');
  var shiftHInput = document.getElementById('calc-shift-h');
  var shiftHVal = document.getElementById('calc-shift-h-val');
  var shiftHHint = document.getElementById('calc-shift-h-hint');

  /* Pure helper: model -> lens-shift control config. Side-effect free so the range
     logic can be unit-tested without a browser. */
  function shiftConfigFor(model) {
    var cfg = {
      vMin: -60, vMax: 60, vStep: 5, vDisabled: false,
      vHint: 'Manual fallback \u2014 check your model\u2019s spec sheet for its real shift range.',
      hShow: false, hMin: -50, hMax: 50, hStep: 1, hHint: ''
    };
    var sv = model && model.sv, sh = model && model.sh;
    var vKnown = !!(sv && sv.length === 2), hKnown = !!(sh && sh.length === 2);
    var vHas = vKnown && (sv[0] !== 0 || sv[1] !== 0);
    var hHas = hKnown && (sh[0] !== 0 || sh[1] !== 0);
    if (vKnown && vHas) {
      cfg.vMin = sv[0]; cfg.vMax = sv[1]; cfg.vStep = 1; // step 1 so the verified endpoints are reachable
      cfg.vHint = 'Verified range for ' + model.b + ' ' + model.m + ': ' +
        sv[0] + '% to ' + sv[1] + '% of image height (manufacture sheet).';
    } else if (vKnown && !vHas) {
      cfg.vMin = 0; cfg.vMax = 0; cfg.vDisabled = true;
      cfg.vHint = 'This model has no lens shift \u2014 keep the projector aligned with the screen.';
    }
    if (hHas) {
      cfg.hShow = true; cfg.hMin = sh[0]; cfg.hMax = sh[1];
      cfg.hHint = 'Verified: ' + sh[0] + '% to ' + sh[1] + '% of image width.';
    }
    return cfg;
  }

  /* Clamp a shift value to the slider's live (model-aware) min/max. */
  function clampShiftVal(input, val, dMin, dMax) {
    var mn = parseFloat(input.min), mx = parseFloat(input.max);
    if (isNaN(mn)) mn = dMin; if (isNaN(mx)) mx = dMax;
    return Math.max(mn, Math.min(mx, val));
  }

  /* Apply the selected model's verified shift ranges to the sliders. Called on
     model choose/clear and on manual-input changes. Resets both values to 0 so
     stale out-of-range values never linger. */
  function syncShiftControls() {
    if (!shiftInput) return;
    var cfg = shiftConfigFor(selectedModel);
    shiftInput.min = cfg.vMin; shiftInput.max = cfg.vMax; shiftInput.step = cfg.vStep;
    shiftInput.disabled = cfg.vDisabled;
    if (shiftHint) shiftHint.textContent = cfg.vHint;
    if (shiftHRow) shiftHRow.hidden = !cfg.hShow;
    if (shiftHInput) { shiftHInput.min = cfg.hMin; shiftHInput.max = cfg.hMax; shiftHInput.step = cfg.hStep; }
    if (shiftHHint) shiftHHint.textContent = cfg.hHint;
    shiftPct = 0; shiftHPct = 0;
    shiftInput.value = 0;
    if (shiftHInput) shiftHInput.value = 0;
    if (shiftVal) shiftVal.textContent = '0%';
    if (shiftHVal) shiftHVal.textContent = '0%';
  }
  if (shiftChip) {
    shiftChip.addEventListener('click', function () {
      shiftOn = !shiftOn;
      shiftChip.classList.toggle('chosen', shiftOn);
      shiftChip.setAttribute('aria-pressed', shiftOn ? 'true' : 'false');
      if (shiftWrap) shiftWrap.hidden = !shiftOn;
      recalc();
    });
  }
  if (shiftInput) {
    shiftInput.addEventListener('input', function () {
      shiftPct = parseFloat(shiftInput.value, 10) || 0;
      if (shiftVal) shiftVal.textContent = (shiftPct > 0 ? '+' : '') + shiftPct + '%';
      recalc();
    });
  }
  if (shiftHInput) {
    shiftHInput.addEventListener('input', function () {
      shiftHPct = parseFloat(shiftHInput.value, 10) || 0;
      if (shiftHVal) shiftHVal.textContent = (shiftHPct > 0 ? '+' : '') + shiftHPct + '%';
      recalc();
    });
  }

  /* ---------- Ceiling fan (always room center) for the 3D / side views ---------- */
  var fanOn = false;
  var fanToggle = document.getElementById('calc-fan-toggle');
  if (fanToggle) {
    fanToggle.addEventListener('click', function () {
      fanOn = !fanOn;
      fanToggle.classList.toggle('chosen', fanOn);
      fanToggle.textContent = fanOn ? 'Ceiling fan: On' : 'Ceiling fan: Off';
      fanToggle.setAttribute('aria-pressed', fanOn ? 'true' : 'false');
      recalc();
    });
  }

  /* ---------- Screen style (physical) and front speakers for the viewer view ---------- */
  var screenStyle = 'fixed';
  function setScreenStyle(ss) {
    screenStyle = ss;
    document.querySelectorAll('#calc-screenstyle .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-ss') === ss);
    });
    recalc();
  }
  document.querySelectorAll('#calc-screenstyle .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setScreenStyle(chip.getAttribute('data-ss'));
    });
  });
  var speakerMode = 'none';
  document.querySelectorAll('#calc-speakers .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      speakerMode = chip.getAttribute('data-spk');
      document.querySelectorAll('#calc-speakers .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c === chip);
      });
      recalc();
    });
  });

  /* ---------- Projector geometry + obstacle math (shared by 3D, side, results) ----------
     The lens point is the projector body center plus the vertical lens-shift offset
     (a fraction of the image height). The model DB carries no shift specs, so the
     user declares it with the lens-shift chip. The throw beam runs lens -> screen
     corners; the sightline runs viewer eye -> screen center. */
  function projectorBodyZ(o, sh, zc, H) {
    var ust = !!(o.r && o.r[1] < 1);
    var ppos = !ust ? (o.projPos || 'behind') : 'behind';
    var pzz = (o.pz != null) ? o.pz : (ust ? 1 : zc);
    if (ppos === 'ceiling' && H > 0) pzz = H - ceilingDropFt();
    else if (ppos === 'table') pzz = 2.475;
    else if (ppos === 'rear') pzz = zc;
    if (shiftOn) pzz += (shiftPct / 100) * sh;
    return { ppos: ppos, z: pzz, ust: ust };
  }

  /* Ceiling-mount drop in feet: a flush bracket holds the lens about 4 in below
     the ceiling; a pole mount drops it by the editable pole length. */
  function ceilingDropFt() {
    if (mountType === 'pole') return Math.max(pipeDropIn(), 2) / 12;
    return 4 / 12;
  }

  function roomObstacles(o) {
    var sh = o.shFt;
    if (!(sh > 0) || !o.r) return null;
    var H = o.H, L = o.L || 0;
    var z0 = 2;
    if (H > 0 && z0 + sh > H - 0.5) z0 = Math.max(0.5, H - sh - 0.5);
    var zc = z0 + sh / 2;
    var pg = projectorBodyZ(o, sh, zc, H);
    var throwD = o.throwD > 0 ? o.throwD : ((o.px != null) ? o.px : 0);
    var lensX = pg.ppos === 'rear' ? -throwD : throwD;
    var res = { z0: z0, zc: zc, bodyZ: pg.z, lensX: lensX, ppos: pg.ppos, ust: pg.ust,
      blocked: false, fanBeam: false, fanMount: false, seatX: 0, eyeH: 3.8 };
    // projector body in the viewer's sightline? check the full frustum
    // (eye -> screen top/bottom), not just the center line
    if (o.seat > 0 && L > 0 && pg.ppos !== 'rear') {
      var seatX = Math.min(o.seat, L - 0.5);
      res.seatX = seatX;
      if (lensX > 0 && lensX < seatX) {
        var f = (seatX - lensX) / seatX;
        var hTop = res.eyeH + ((z0 + sh) - res.eyeH) * f;
        var hBot = res.eyeH + (z0 - res.eyeH) * f;
        if (pg.z + 0.3 >= hBot && pg.z - 0.3 <= hTop) res.blocked = true;
      }
    }
    // ceiling fan always hangs at room center
    if (fanOn && !o.outdoor && H > 0 && L > 0) {
      var fx = L / 2, fz = H - 1.2;
      if (pg.ppos === 'ceiling' && Math.abs(lensX - fx) < 2) res.fanMount = true;
      if (lensX > fx) {
        var t = (lensX - fx) / lensX;
        var hTop = pg.z + ((z0 + sh) - pg.z) * t;
        var hBot = pg.z + (z0 - pg.z) * t;
        var lo = Math.min(hTop, hBot), hi = Math.max(hTop, hBot);
        if (hi >= fz - 0.4 && lo <= H) res.fanBeam = true;
      }
    }
    return res;
  }

  /* ---------- Lights on/off for the 3D preview ---------- */
  var lightsOn = false;
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

  /* ---------- View toggles: show/hide each render individually, or all at once ---------- */
  var viewIds = ['3d', 'side', 'viewer', 'ceiling', 'mounting'];
  var viewState = { '3d': true, side: true, viewer: true, ceiling: true, mounting: true };
  try {
    var vsSaved = JSON.parse(localStorage.getItem('calc-views') || 'null');
    if (vsSaved) viewIds.forEach(function (id) { if (vsSaved[id] === false) viewState[id] = false; });
  } catch (e) {}
  function applyViewToggles() {
    viewIds.forEach(function (id) {
      var fig = document.querySelector('[data-viewfig="' + id + '"]');
      if (fig) fig.style.display = viewState[id] ? '' : 'none';
      var chip = document.querySelector('#calc-view-toggles [data-view="' + id + '"]');
      if (chip) {
        chip.classList.toggle('chosen', !!viewState[id]);
        chip.setAttribute('aria-pressed', viewState[id] ? 'true' : 'false');
      }
    });
    var allOn = viewIds.every(function (id) { return viewState[id]; });
    var allChip = document.getElementById('calc-views-all');
    if (allChip) {
      allChip.classList.toggle('chosen', allOn);
      allChip.setAttribute('aria-pressed', allOn ? 'true' : 'false');
    }
    try { localStorage.setItem('calc-views', JSON.stringify(viewState)); } catch (e2) {}
  }
  var viewToggleWrap = document.getElementById('calc-view-toggles');
  if (viewToggleWrap) {
    viewToggleWrap.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('button') : null;
      if (!btn) return;
      if (btn.id === 'calc-views-all') {
        var turnOn = !viewIds.every(function (id) { return viewState[id]; });
        viewIds.forEach(function (id) { viewState[id] = turnOn; });
      } else if (btn.hasAttribute('data-view')) {
        var vid = btn.getAttribute('data-view');
        viewState[vid] = !viewState[vid];
      }
      applyViewToggles();
    });
  }
  applyViewToggles();

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
    if (sizeInput && parseFloat(sizeInput.value, 10) > 0) enc('sz', Math.round(parseFloat(sizeInput.value, 10)));
    enc('ar', stdAspect);
    enc('dir', reverseMode ? '1' : '0');
    if (reverseMode) { var td = inFt(throwDistInput); if (td > 0) enc('td', r2(td)); }
    if (compareB) { enc('cb', compareB.b + ' ' + compareB.m); if (modelLenses(compareB)) enc('cbl', compareLens.b); }
    if (compareC) { enc('cc', compareC.b + ' ' + compareC.m); if (modelLenses(compareC)) enc('ccl', compareLens.c); }
    var seat = inFt(seatInput); if (seat > 0) enc('seat', r2(seat));
    enc('pp', projPos);
    if (projPos === 'ceiling') {
      enc('mt', mountType);
      if (mountType === 'pole') enc('pd', Math.round(pipeDropIn() * 10) / 10);
    }
    if (roomType !== 'outdoors') {
      var L = inFt(lenInput); if (L > 0) enc('L', r2(L));
      var Wd = inFt(widInput); if (Wd > 0) enc('W', r2(Wd));
      var H = inFt(ceilInput); if (H > 0) enc('H', r2(H));
    }
    enc('u', unit);
    if (screenType === 'alr') enc('st', 'alr');
    if (screenStyle !== 'fixed') enc('ss', screenStyle);
    if (speakerMode !== 'none') enc('spk', speakerMode);
    if (fanOn) enc('cf', '1');
    if (shiftOn) { enc('ls', '1'); if (shiftPct !== 0) enc('lsv', shiftPct); if (shiftHPct !== 0) enc('lsh', shiftHPct); }
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
    if (p.g === '1' || p.dir === '1' || p.cb || p.cc || p.cbl || p.ccl || p.gn || p.gp || p.gw || p.gh || p.ga) setAdvMode(true);
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
    if (p.pp && ['behind', 'table', 'ceiling', 'rear'].indexOf(p.pp) >= 0) {
      projPos = p.pp;
      document.querySelectorAll('#calc-projpos .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-pos') === p.pp);
      });
    }
    if (p.mt === 'pole' || p.mt === 'flush') mountType = p.mt;
    if (!isNaN(num('pd'))) {
      var pdDisp = unit === 'm' ? fmt(num('pd') * 2.54, 0) : fmt(num('pd'), 0);
      if (pipeInput) pipeInput.value = pdDisp;
      if (poleLenInput) poleLenInput.value = pdDisp;
    }
    syncMountTypeUI();
    if (!isNaN(num('gn')) && gainInput) gainInput.value = p.gn;
    if (p.st === 'alr') setScreenType('alr');
    if (p.ss && ['fixed', 'pulldown', 'acoustic', 'floor', 'portable'].indexOf(p.ss) >= 0) {
      screenStyle = p.ss;
      document.querySelectorAll('#calc-screenstyle .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-ss') === p.ss);
      });
    }
    if (p.spk && ['none', 'wall', 'tower', 'soundbar'].indexOf(p.spk) >= 0) {
      speakerMode = p.spk;
      document.querySelectorAll('#calc-speakers .calc__chip').forEach(function (c) {
        c.classList.toggle('chosen', c.getAttribute('data-spk') === p.spk);
      });
    }
    if (p.cf === '1' && !fanOn && fanToggle) fanToggle.click();
    if (p.ls === '1' && !shiftOn && shiftChip) shiftChip.click();
    if (p.lsv && shiftInput) {
      shiftInput.value = clampShiftVal(shiftInput, parseFloat(p.lsv) || 0, -60, 60);
      shiftInput.dispatchEvent(new Event('input'));
    }
    if (p.lsh && shiftHInput) {
      shiftHInput.value = clampShiftVal(shiftHInput, parseFloat(p.lsh) || 0, -50, 50);
      shiftHInput.dispatchEvent(new Event('input'));
    }
    if (!isNaN(num('z')) && zoomInput) zoomInput.value = Math.max(0, Math.min(100, Math.round(num('z'))));
    if (p.lk === '1') setLockMode('projector'); else if (p.lk === '2') setLockMode('image');
    if (p.li === '0' && lightsOn && lightsToggle) lightsToggle.click();
    if (p.li === '1' && !lightsOn && lightsToggle) lightsToggle.click();
    if (p.sun === '1' && !sunOn && sunToggle) sunToggle.click();
    if (p.sun === '0' && sunOn && sunToggle) sunToggle.click();
    gateOutdoorOptions(); // a shared link can carry ceiling/acoustic/floor with outdoors
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
    function rasterize(node, w, h, done) {
      var clone = node.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', String(w));
      clone.setAttribute('height', String(h));
      var st = document.createElementNS(NS, 'style');
      st.textContent = 'text{font-family:Arial,Helvetica,sans-serif}';
      clone.insertBefore(st, clone.firstChild);
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
      var img = new Image();
      img.onload = function () { done(img, url); };
      img.onerror = function () { URL.revokeObjectURL(url); done(null, url); };
      img.src = url;
    }
    var svg2 = document.getElementById('calc-svg-side');
    var svg3 = document.getElementById('calc-svg-viewer');
    var svg4 = advMode ? document.getElementById('calc-svg-mount') : null;
    var svg5 = advMode ? document.getElementById('calc-svg-drop') : null;
    rasterize(svg, 1320, 880, function (img1, url1) {
      function step2(img2, url2) {
        function step3(img3, url3) {
          function step4(img4, url4) {
        function compose(img5, url5) {
        try {
          var views = [[img1, 660, 440], [img2, 660, 380], [img3, 660, 360], [img4, 660, 380], [img5, 660, 300]]
            .filter(function (v) { return !!v[0]; });
          var CW = 1600, PW = 540, PITCH = 500;
          var CH = 60 + views.length * PITCH;
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
          var RW = CW - PW;
          function place(img, vw, vh, slotY) {
            if (!img) return;
            var s = Math.min((RW - 40) / vw, 480 / vh);
            var dw = vw * s, dh = vh * s;
            cx.drawImage(img, PW + (RW - dw) / 2, slotY + (480 - dh) / 2, dw, dh);
          }
          var slotY = 30;
          views.forEach(function (v) { place(v[0], v[1], v[2], slotY); slotY += PITCH; });
          // measurements text
          var S = planSummary;
          var VALW = PW - 48 - 24; // value text must end 24px before the panel edge
          function wrapVal(text) {
            var words = String(text).split(/\s+/).filter(Boolean), lines = [], line = '';
            function pushWord(w) {
              // hard-break a single word that is wider than the column
              while (cx.measureText(w).width > VALW && w.length > 1) {
                var k = 1;
                while (k < w.length && cx.measureText(w.slice(0, k + 1)).width <= VALW) k++;
                lines.push(w.slice(0, k)); w = w.slice(k);
              }
              var t = line ? line + ' ' + w : w;
              if (cx.measureText(t).width <= VALW || !line) line = t;
              else { lines.push(line); line = w; }
            }
            words.forEach(pushWord);
            if (line) lines.push(line);
            return lines;
          }
          function row(label, value, y) {
            cx.fillStyle = '#8fa3c8';
            cx.font = '600 13px Arial,sans-serif';
            cx.fillText(label.toUpperCase(), 48, y);
            cx.fillStyle = '#ffffff';
            cx.font = '400 23px Arial,sans-serif';
            var lines = wrapVal(value);
            if (lines.length > 3) {
              lines = lines.slice(0, 3);
              var last = lines[2];
              while (last.length > 1 && cx.measureText(last + '…').width > VALW) last = last.slice(0, -1);
              lines[2] = last + '…';
            }
            lines.forEach(function (ln, i) { cx.fillText(ln, 48, y + 30 + i * 30); });
            return lines.length;
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
          if (S.model) { y += 44 + row('Projector', S.model, y) * 30; }
          if (S.throw) { y += 44 + row('Throw distance', S.throw, y) * 30; }
          if (S.screen) { y += 44 + row('Screen', S.screen, y) * 30; }
          if (S.room) { y += 44 + row('Room', S.room, y) * 30; }
          if (S.seat) { y += 44 + row('Seating', S.seat, y) * 30; }
          if (S.bright) { y += 44 + row('Brightness', S.bright, y) * 30; }
          if (S.mount) { y += 44 + row('Mounting', S.mount, y) * 30; }
          if (S.drop) { y += 44 + row('Mount drop', S.drop, y) * 30; }
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
            URL.revokeObjectURL(url1); URL.revokeObjectURL(url2); URL.revokeObjectURL(url3);
            URL.revokeObjectURL(url4); URL.revokeObjectURL(url5);
          }, mime, 0.92);
        } catch (e) {
          URL.revokeObjectURL(url1); URL.revokeObjectURL(url2); URL.revokeObjectURL(url3);
          URL.revokeObjectURL(url4); URL.revokeObjectURL(url5);
        }
        }
        if (svg5) rasterize(svg5, 1320, 600, compose);
        else compose(null, null);
        }
        if (svg4) rasterize(svg4, 1320, 760, step4);
        else step4(null, null);
      }
      if (svg3) rasterize(svg3, 1320, 720, step3);
      else step3(null, null);
      }
      if (svg2) rasterize(svg2, 1320, 760, step2);
      else step2(null, null);
    });
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function exportPdf() {
    if (!svg || !planSummary) return;
    var S = planSummary;
    var sheet = document.getElementById('calc-print');
    if (!sheet) return;
    var rows = [
      ['Projector', S.model],
      ['Throw distance', S.throw],
      ['Screen', S.screen],
      ['Room', S.room]
    ];
    if (S.seat) rows.push(['Seating', S.seat]);
    if (S.bright) rows.push(['Brightness', S.bright]);
    if (S.mount) rows.push(['Screen mounting', S.mount]);
    if (S.drop) rows.push(['Mount drop', S.drop]);
    var rowsHtml = rows.map(function (r) {
      return '<tr><th>' + r[0] + '</th><td>' + escHtml(r[1]) + '</td></tr>';
    }).join('');
    var fits = S.verdict.indexOf('Fits your') === 0;
    var date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    var tagline = 'Your professional estimate was generated based on your customized space provided by BudgetProjectors.org';
    sheet.innerHTML =
      '<div class="cp-watermark">BudgetProjectors.org</div>' +
      '<div class="cp-head"><div class="cp-brand">BUDGETPROJECTORS.ORG</div>' +
      '<h1>Room Plan</h1><div class="cp-date">' + date + '</div></div>' +
      '<p class="cp-tagline">' + tagline + '</p>' +
      '<table class="cp-specs">' + rowsHtml + '</table>' +
      '<div class="cp-fit ' + (fits ? 'yes' : 'warn') + '">' + escHtml(S.verdict) + '</div>' +
      '<h2>3D view</h2><div class="cp-view" id="cp-view"></div>' +
      '<h2>Side view</h2><div class="cp-view" id="cp-view-side"></div>' +
      '<h2>Viewer view</h2><div class="cp-view" id="cp-view-viewer"></div>' +
      '<h2>Mounting view</h2><div class="cp-view" id="cp-view-mount"></div>' +
      '<h2>Mount drop simulator</h2><div class="cp-view" id="cp-view-drop"></div>' +
      '<div class="cp-foot"><strong>BudgetProjectors.org</strong> &middot; Generated ' + date + '<br>' + tagline + '</div>';
    var slot = document.getElementById('cp-view');
    var clone = svg.cloneNode(true);
    clone.removeAttribute('id');
    slot.appendChild(clone);
    var slot2 = document.getElementById('cp-view-side');
    var svg2 = document.getElementById('calc-svg-side');
    if (slot2 && svg2) {
      var clone2 = svg2.cloneNode(true);
      clone2.removeAttribute('id');
      slot2.appendChild(clone2);
    }
    var slot3 = document.getElementById('cp-view-viewer');
    var svg3 = document.getElementById('calc-svg-viewer');
    if (slot3 && svg3) {
      var clone3 = svg3.cloneNode(true);
      clone3.removeAttribute('id');
      slot3.appendChild(clone3);
    }
    var slot4 = document.getElementById('cp-view-mount');
    var svg4 = advMode ? document.getElementById('calc-svg-mount') : null;
    if (slot4 && svg4) {
      var clone4 = svg4.cloneNode(true);
      clone4.removeAttribute('id');
      slot4.appendChild(clone4);
    } else if (slot4) { slot4.style.display = 'none'; slot4.previousElementSibling.style.display = 'none'; }
    var slot5 = document.getElementById('cp-view-drop');
    var svg5 = advMode ? document.getElementById('calc-svg-drop') : null;
    if (slot5 && svg5) {
      var clone5 = svg5.cloneNode(true);
      clone5.removeAttribute('id');
      slot5.appendChild(clone5);
    } else if (slot5) { slot5.style.display = 'none'; slot5.previousElementSibling.style.display = 'none'; }
    document.body.classList.add('printing-calc');
    window.print();
  }

  var pngBtn = document.getElementById('calc-export-png');
  if (pngBtn) pngBtn.addEventListener('click', function () { exportImage('png'); });
  var jpgBtn = document.getElementById('calc-export-jpg');
  if (jpgBtn) jpgBtn.addEventListener('click', function () { exportImage('jpg'); });
  var pdfBtn = document.getElementById('calc-export-pdf');
  if (pdfBtn) pdfBtn.addEventListener('click', exportPdf);
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('printing-calc', 'printing-golf');
  });

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
  if (gainInput) gainInput.addEventListener('input', recalc);

  /* ---------- Screen material: standard matte white vs ALR ---------- */
  var screenType = 'standard';
  try { var _sst = localStorage.getItem('calc-screentype'); if (_sst === 'alr' || _sst === 'standard') screenType = _sst; } catch (e) {}
  function setScreenType(st) {
    screenType = st === 'alr' ? 'alr' : 'standard';
    document.querySelectorAll('#calc-screentype .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-st') === screenType);
    });
    try { localStorage.setItem('calc-screentype', screenType); } catch (e) {}
    var alrNote = document.getElementById('calc-alr-note');
    if (alrNote) alrNote.style.display = screenType === 'alr' ? '' : 'none';
  }
  document.querySelectorAll('#calc-screentype .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      setScreenType(chip.getAttribute('data-st'));
      recalc();
    });
  });
  setScreenType(screenType);
  // Effective screen gain: ALR surfaces run lower gain (typical 0.6) but reject
  // ambient light; the gain box multiplies either base.
  function effGain() {
    var g = gainInput ? parseFloat(gainInput.value, 10) : NaN;
    if (!(g > 0)) g = 1;
    if (screenType === 'alr') g *= 0.6;
    return g;
  }
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
    if (lockMode === 'projector' && lockedD > 0 && !reverseMode && lastMoved && sizeInput) {
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
      drawAll({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: null, seat: seat, room: roomType });
      planResult.innerHTML = '<strong>Pick your projector model</strong>' +
        '<span>Choose your model from the list above (or enter its throw ratio manually) and your room plan will appear here.</span>';
      syncZoom(null, 0);
      return;
    }

    // Screen size: diagonal in standard mode.
    // Reverse mode: throw distance in, screen-size range out.
    var scrWIn = 0, scrHIn = 0, imgWIn = 0, arWarn = '', scrLabel = '';
    var tdFt = NaN, dMin = NaN, dMax = NaN, dRange = '';
    if (reverseMode) {
      tdFt = throwDistInput ? toFt(parseFloat(throwDistInput.value, 10)) : NaN;
      if (!(tdFt > 0)) {
        drawAll({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType });
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
      scrLabel = dRange + '&Prime; image size @ ' + stdAspect;
    } else {
      if (!(diag > 0)) {
        drawAll({ L: L, W: W, H: H, outdoor: outdoor, swFt: 0, shFt: 0, scrLabel: '', r: r, seat: seat, room: roomType });
        planResult.innerHTML = '<strong>Enter a screen size</strong>' +
          '<span>Type the screen diagonal you want and the planner will show throw distance, seating, and whether it fits your room.</span>';
        syncZoom(null, 0);
        return;
      }
      var a = ASPECTS[stdAspect] || ASPECTS['16:9'];
      var ad = Math.sqrt(a[0] * a[0] + a[1] * a[1]);
      scrWIn = diag * a[0] / ad; scrHIn = diag * a[1] / ad;
      imgWIn = scrWIn;
      scrLabel = fmt(diag, 0) + '&Prime; image size @ ' + stdAspect;
    }

    var ust = r[1] < 1;
    if (projposWrap) projposWrap.hidden = ust;

    var near = imgWIn * r[0] / 12; // ft
    var far = imgWIn * r[1] / 12; // ft
    // Projector position on the zoom slider; the slider only applies in standard screen-size mode.
    var throwD = reverseMode ? near : near + zoomFrac() * (far - near); // ft
    if (needLockCapture) { lockedD = throwD; needLockCapture = false; }
    // Absolute projector lock: the projector never moves while locked, even when the
    // zoom pegs at its limit (the verdict below names what the lens can actually fill).
    if (lockMode === 'projector' && lockedD > 0 && !reverseMode) throwD = lockedD;
    var modelName = selectedModel ? selectedModel.b + ' ' + selectedModel.m + (selectedLensName() ? ' · ' + selectedLensName() : '') : 'throw ' + ratioLabel(r);

    var px = throwD, py = W / 2, pz = ust ? 1 : 3, pmount = false;

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
        sp.px = Math.min(nX, L - 0.8);
        sp.py = W / 2;
        sp.pos = xust ? 'behind' : projPos;
        sp.pz = sp.pos === 'table' ? 2.475 : null;
        sp.lm = (entry && entry.lm) || 0; // published lumens for the on-render data line
        sp.fit = (!xust && !outdoor && L > 0) ? (nX <= L) : null; // wide-end throw fits the room
        extraProj.push(sp);
      });
    }

    // Effective lumens for brightness: the selected lens's published output,
    // then the model's published output. No manual override exists.
    var effLumens = lensLumens(selectedModel, selectedLens);
    if (!(effLumens > 0) && selectedModel && selectedModel.lm > 0) effLumens = selectedModel.lm;

    syncZoom(r, imgWIn);
    var zoomPct = (zoomWrap && !zoomWrap.hidden) ? Math.round(zoomFrac() * 100) : -1;
    var drawO = { L: L, W: W, H: H, outdoor: outdoor, swFt: scrWIn / 12, shFt: scrHIn / 12,
      scrLabel: scrLabel, imgWIn: imgWIn, r: r, seat: seat, room: roomType,
      px: px, py: py, pz: pz, pmount: pmount, projPos: projPos, extraProj: extraProj,
      throwD: throwD, zpct: zoomPct, projLocked: lockMode === 'projector',
      lumens: effLumens > 0 ? effLumens : 0, screenType: screenType,
      sv: (selectedModel && selectedModel.sv) || null };
    drawO.obst = roomObstacles(drawO);
    drawAll(drawO);

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
    if (seat > 0) {
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
      var gain = effGain();
      var imgHIn = scrHIn;
      var areaSqFt = imgWIn * imgHIn / 144;
      if (areaSqFt > 0) {
        fl = lumens * gain / areaSqFt;
        flNote = fl < 12 ? 'dim, best in a fully dark room' :
          fl < 30 ? 'good with the lights off' :
          fl < 60 ? 'holds up with some ambient light' : 'bright enough for lights-on viewing';
        bits.push('Brightness: about ' + fmt(fl, 0) + ' foot-lamberts on this screen, ' + flNote +
          (screenType === 'alr' ? ' The ALR surface holds contrast with the lights on.' : '.'));
      }
    }
    var mountStr = '', dropStr = '';
    if (advMode && scrHIn > 0) {
      var eyeIn = eyeHeightIn();
      var ma = mountAdvice(drawO, eyeIn);
      mountStr = 'Center the screen at seated eye level (' + dispIn(eyeIn) + '): bottom ' +
        dispIn(ma.botGapIn) + ' off the floor, top ' + dispIn(ma.topGapIn) + ' below the ' +
        dispShort(ma.ceilFt) + ' ceiling' + (ma.ceilKnown ? '' : ' (assumed)') + '.' +
        (ma.warn ? ' ' + ma.warn + '.' : '');
      bits.push('Screen mounting: ' + mountStr);
      if (selectedModel) {
        var isFlushMt = mountType !== 'pole';
        var da = dropAdvice(drawO, ma, isFlushMt ? 4 : pipeDropIn(), isFlushMt);
        dropStr = (isFlushMt ? 'Flush-mount drop: ' : 'Pole-mount drop: ') + da.text;
        bits.push(dropStr);
      }
    }
    var fitsRoom;
    var isRear = !ust && projPos === 'rear';
    if (!outdoor && !dimsKnown) {
      fitsRoom = null; // cannot judge the fit without the user's room size
      bits.push('Enter your room size above to check whether this fits.');
    } else if (!outdoor) {
      var maxW = Math.min(L * 12 / r[1], (W - 1) * 12);
      fitsRoom = reverseMode ? (tdFt <= L && scrWIn / 12 <= W - 1) :
        isRear ? (scrWIn / 12 <= W - 1) : (throwD <= L && scrWIn / 12 <= W - 1);
      if (fitsRoom) {
        bits.push('It fits your ' + ROOMS[roomType].label.toLowerCase() + '.');
      } else {
        bits.push('Too big for this room: the largest screen that fits is about ' +
          fmt(maxW / stdWidthFactor(), 0) + '&Prime; ' + stdAspect + '.');
      }
      if (isRear && throwD > 0) {
        bits.push('Rear projection: leave about ' + fmt(throwD + 2, 0) +
          ' ft behind the screen for the projector and its throw. You will need a dedicated rear-projection screen — standard white and ALR screens do not work from behind.');
      }
    } else {
      bits.push('No walls to worry about outdoors, just keep the throw path clear.');
    }
    // Obstacle warnings from the 3D / side view geometry.
    var ob = drawO.obst;
    if (ob) {
      if (ob.blocked) bits.push('Heads up: the projector sits in your sightline and will block part of the screen from your seat — move it behind the seating or shift it aside.');
      if (ob.fanMount) bits.push('Heads up: the ceiling mount lands within 2 ft of the ceiling fan — they will collide.');
      if (ob.fanBeam) bits.push('Heads up: the ceiling fan crosses the throw beam — the blades will cast shadows on the image. Lower the projector with lens shift or move the mount.');
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

    var imgRef = 'a ' + fmt(diag, 0) + '&Prime; screen';
    var throwStr = fmtDist(imgWIn * r[0]);
    var placeStr;
    var posWord = (!ust && projPos === 'ceiling') ? (mountType === 'pole' ? 'Pole-mount' : 'Flush-mount') : 'Place';
    var posTail = (!ust && projPos === 'table') ? ' on a table' : '';
    if (reverseMode) {
      placeStr = 'At a ' + dispDist(tdFt) + ' throw, the ' + modelName + ' fills a ' +
        dRange + '&Prime; ' + stdAspect + ' screen. ';
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

    var revMode = reverseMode;
    var headStr = revMode ? dRange + '&Prime; screen' : throwStr + ' throw';
    var scrMatNote = screenType === 'alr' ? ' ALR' : '';
    planSummary = {
      model: modelName,
      throw: revMode ? dispDist(tdFt) + ' throw' : throwStr + ' throw',
      screen: revMode ? dRange.replace(/&ndash;/g, '–') + '″ ' + stdAspect + scrMatNote :
        fmt(diag, 0) + '″ ' + stdAspect + scrMatNote + ' · place projector ' + throwStr,
      room: ROOMS[roomType].label + (outdoor ? '' : (dimsKnown ?
        ', ' + dispShort(L) + ' × ' + dispShort(W) + ((H >= 0) ? ', ' + dispShort(H) + ' ceiling' : '') :
        ' (enter your room size)')),
      seat: seat > 0 ? dispDist(seat) + ' seating' : '',
      bright: fl > 0 ? 'about ' + fmt(fl, 0) + ' fL, ' + flNote : '',
      mount: mountStr, drop: dropStr,
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

  // Color-key legend entries for the tagged projectors (A = first, B/C = compare).
  // mainOnly=true lists just the main projector (views that don't draw B/C bodies).
  function compareLegendItems(o, cols, mainOnly) {
    var items = [];
    var cmp = !mainOnly && (o.extraProj || []).length > 0;
    var mainName = selectedModel ? (selectedModel.b + ' ' + selectedModel.m) : null;
    if (!mainName && !o.r) return items;
    items.push({ col: cols.a, label: (cmp ? 'A · ' : '') + (mainName || 'Manual throw ratio') });
    if (mainOnly) return items;
    (o.extraProj || []).forEach(function (xp, xi) {
      items.push({ col: xi === 0 ? cols.b : cols.c, label: xp.tag + ' · ' + compareFullName(xi === 0 ? 'b' : 'c') });
    });
    return items;
  }
  // Horizontal color-key legend row; centered=true centers the row in the 660-wide viewBox.
  function drawLegend(elFn, items, x0, y, maxW, textCol, centered) {
    if (!items.length) return;
    if (!svgMeasureCtx) svgMeasureCtx = document.createElement('canvas').getContext('2d');
    var ctx = svgMeasureCtx;
    // measure with the page's real font (Poppins stack), not a fallback, so the
    // row never runs into the watermark with longer model names
    ctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    var gap = 20;
    items.forEach(function (it) {
      var lab = String(it.label);
      if (lab.length > 30) lab = lab.slice(0, 29).trim() + '…';
      it.short = lab;
    });
    function total() {
      return items.reduce(function (a, it) { return a + 20 + ctx.measureText(it.short).width; }, 0) + gap * (items.length - 1);
    }
    var guard = 0;
    while (total() > maxW && guard++ < 12) {
      var longest = items.reduce(function (a, b) { return b.short.length > a.short.length ? b : a; });
      if (longest.short.length <= 10) break;
      longest.short = longest.short.slice(0, -2).trim() + '…';
    }
    var x = centered ? (660 - total()) / 2 : x0;
    items.forEach(function (it) {
      elFn('rect', { x: x.toFixed(1), y: (y - 11).toFixed(1), width: 14, height: 14, rx: 3,
        fill: it.col, stroke: textCol, 'stroke-width': 1 });
      var t = elFn('text', { x: (x + 20).toFixed(1), y: y.toFixed(1), 'font-size': 12, fill: textCol });
      t.textContent = it.short;
      x += 20 + ctx.measureText(it.short).width + gap;
    });
  }
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
    function raw(x, y, z) { return [(y - x) * 0.8660254, (x + y) * 0.5 - z]; }
    var corners = [[0,0,0],[L,0,0],[0,W,0],[L,W,0],[0,0,H],[L,0,H],[0,W,H],[L,W,H]];
    var rearX = 0; // rear projection: the booth behind the screen must fit in the frame
    if (o.obst && o.obst.ppos === 'rear' && o.throwD > 0) {
      rearX = -(o.throwD + 1.5);
      [[rearX,0,0],[rearX,W,0],[rearX,0,H],[rearX,W,H]].forEach(function (c) { corners.push(c); });
    }
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
      // horizontal lens shift: the image lands sideways on the screen wall while the
      // projector body stays put (+ shifts toward +y). Screen, beam targets, viewing
      // cone, and labels follow the image.
      var hOff = (shiftOn && shiftHPct) ? (shiftHPct / 100) * sw : 0; // ft
      var ycI = yc + hOff; // shifted image center
      yA += hOff; yB += hOff;
      var alr = o.screenType === 'alr';
      var scrPts = [[0,yA,z0],[0,yB,z0],[0,yB,z0+sh],[0,yA,z0+sh]];
      // screen (with a glow when the lights are off). ALR surfaces are grey;
      // matte white washes out when the lights or sun are on, ALR holds contrast.
      if (scene === 'night') {
        poly(scrPts, '#bcd0ff', { opacity: 0.5, filter: 'url(#calc-glow)' });
      }
      poly(scrPts, alr ? '#878e99' : '#ffffff', { stroke: NAVY, 'stroke-width': 2 });
      if (scene !== 'night' && !alr) {
        poly(scrPts, '#fff3d0', { opacity: 0.55 });
      }
      // viewing cone: ALR brightness falls off-axis, matte white is ~180 degrees
      var coneHalf = alr ? 30 : 75;
      var coneLen = Math.min(W * 0.85, 14);
      var ca = coneHalf * Math.PI / 180;
      var cdx = Math.cos(ca) * coneLen, cdy = Math.sin(ca) * coneLen;
      var coneStyle = { stroke: '#8a94a8', 'stroke-width': 1, 'stroke-dasharray': '5 4', opacity: 0.55 };
      var coneO = P(0, ycI, zc), coneU = P(cdx, ycI + cdy, zc), coneD = P(cdx, ycI - cdy, zc);
      el('line', { x1: coneO[0].toFixed(1), y1: coneO[1].toFixed(1),
        x2: coneU[0].toFixed(1), y2: coneU[1].toFixed(1),
        stroke: coneStyle.stroke, 'stroke-width': coneStyle['stroke-width'],
        'stroke-dasharray': coneStyle['stroke-dasharray'], opacity: coneStyle.opacity });
      el('line', { x1: coneO[0].toFixed(1), y1: coneO[1].toFixed(1),
        x2: coneD[0].toFixed(1), y2: coneD[1].toFixed(1),
        stroke: coneStyle.stroke, 'stroke-width': coneStyle['stroke-width'],
        'stroke-dasharray': coneStyle['stroke-dasharray'], opacity: coneStyle.opacity });
      txt(cdx, ycI + cdy, zc + 0.4, 'viewing cone', 11);
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
      txt(0, ycI, z0 + sh + 0.7, (o.scrLabel || 'screen').replace(/&Prime;/g, '″'), 12);
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
      // projector geometry: body height includes the lens-shift offset; rear sits behind the screen
      var ob = o.obst;
      var pg = ob ? { ppos: ob.ppos, z: ob.bodyZ } : projectorBodyZ(o, sh, zc, H);
      var ppos = pg.ppos, pzz = pg.z;
      var isRear = ppos === 'rear';
      var pxx = (o.px != null) ? o.px : near;
      var pyy = (o.py != null) ? o.py : yc;
      if (isRear) pxx = ob ? ob.lensX : -(o.throwD > 0 ? o.throwD : near);
      // throw range zone on the floor (behind the screen for rear projection)
      var zA = isRear ? -far : near, zB = isRear ? -near : far;
      poly([[zA,yc-1.1,0.02],[zB,yc-1.1,0.02],[zB,yc+1.1,0.02],[zA,yc+1.1,0.02]], pal.zone, { opacity: pal.zoneOp });
      // projector (position follows the projector-position setting)
      if (ppos === 'ceiling' && H > 0) {
        var cdrop = H - pzz;
        if (cdrop > 0.15) {
          if (mountType === 'pole') box(pxx, pyy, (pzz + H) / 2, 0.18, 0.18, cdrop, pal.stand[0], pal.stand[1], pal.stand[2]); // mount pole
          else box(pxx, pyy, (pzz + H) / 2, 0.55, 0.45, cdrop, pal.stand[0], pal.stand[1], pal.stand[2]); // flush-mount bracket
        }
      } else if (ppos === 'table') {
        if (shiftOn && Math.abs(pzz - 2.475) > 0.05) {
          box(pxx, pyy, pzz / 2, 0.18, 0.18, pzz, pal.stand[0], pal.stand[1], pal.stand[2]); // adjustable stand
        } else {
          box(pxx, pyy, 1.1, 2.4, 1.8, 2.2, '#8a6f4d', '#7a6244', '#6e5840'); // table
        }
      } else if (o.pmount && H > 0) {
        box(pxx, pyy, (pzz + H) / 2, 0.18, 0.18, H - pzz, pal.stand[0], pal.stand[1], pal.stand[2]); // mount pole
      }
      box(pxx, pyy, pzz, 1.1, 0.9, 0.55, pal.proj[0], pal.proj[1], pal.proj[2]);
      // head-to-head: tag the first projector A so it matches the B/C labels
      var projLabel = isRear ? 'rear projector' : 'projector';
      if (!isRear && (o.extraProj || []).length > 0 && o.r) {
        projLabel = 'A ' + fmtDist(imgWIn * o.r[0]) + (o.r[1] !== o.r[0] ? '–' + fmtDist(imgWIn * o.r[1]) : '');
      }
      txt(pxx, pyy, pzz + 0.9, projLabel, 11);
      if (isRear && H > 0) {
        // cutaway booth behind the screen wall
        var bx0 = pxx - 1.5;
        [[bx0,0,0, 0,0,0],[bx0,W,0, 0,W,0],[bx0,0,H, 0,0,H],[bx0,W,H, 0,W,H],
         [bx0,0,0, bx0,W,0],[bx0,0,H, bx0,W,H],
         [bx0,0,0, bx0,0,H],[bx0,W,0, bx0,W,H]].forEach(function (e) {
          var a = P(e[0], e[1], e[2]), b = P(e[3], e[4], e[5]);
          el('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1],
            stroke: '#8a94a8', 'stroke-width': 1.5, 'stroke-dasharray': '7 5', opacity: 0.8 });
        });
        txt((bx0) / 2, yc, H + 0.6, 'rear projection booth', 11);
      }
      if (fanOn && !o.outdoor && L > 0 && H > 0) {
        // ceiling fan always hangs at room center; amber when it fouls the mount or the beam
        var fx = L / 2, fz = H - 1.2;
        var fAlert = ob && (ob.fanBeam || ob.fanMount);
        var fb = fAlert ? ['#d98a2b', '#b56f1f', '#8f5718'] : pal.stand;
        box(fx, yc, H - 0.6, 0.14, 0.14, 1.2, pal.stand[0], pal.stand[1], pal.stand[2]); // downrod
        box(fx, yc, fz, 0.55, 0.55, 0.35, fb[0], fb[1], fb[2]); // motor
        box(fx - 1.35, yc, fz, 2.2, 0.5, 0.08, fb[0], fb[1], fb[2]);
        box(fx + 1.35, yc, fz, 2.2, 0.5, 0.08, fb[0], fb[1], fb[2]);
        box(fx, yc - 1.35, fz, 0.5, 2.2, 0.08, fb[0], fb[1], fb[2]);
        box(fx, yc + 1.35, fz, 0.5, 2.2, 0.08, fb[0], fb[1], fb[2]);
        txt(fx, yc, fz + 0.7, 'ceiling fan', 11);
      }
      if (ob && ob.seatX > 0 && !isRear) {
        // viewer sightline: seat eye -> screen center, amber when the projector blocks it
        var sA = P(ob.seatX, yc, ob.eyeH), sB = P(0, yc, ob.zc);
        el('line', { x1: sA[0], y1: sA[1], x2: sB[0], y2: sB[1],
          stroke: ob.blocked ? '#d98a2b' : '#8a94a8', 'stroke-width': ob.blocked ? 2.5 : 1,
          'stroke-dasharray': '6 4', opacity: ob.blocked ? 0.95 : 0.45 });
        if (ob.blocked) txt(ob.seatX / 2, yc, (ob.eyeH + ob.zc) / 2 + 0.9, 'blocks your view!', 12);
      }
      var rangeLabel = fmtDist(imgWIn * o.r[0]);
      if (o.r[1] !== o.r[0]) rangeLabel += '–' + fmtDist(imgWIn * o.r[1]);
      var cmpCount = (o.extraProj || []).length;
      if (cmpCount > 0) {
        // head-to-head: one color-coded data line per projector (throw, zoom,
        // brightness, fit) so a weak pick is obvious at a glance
        var fitCol = function (ok) {
          return ok ? (scene === 'night' ? '#7fd6a4' : '#2e7d5b')
                    : (scene === 'night' ? '#ff9d8a' : '#c0392b');
        };
        var flCol = function (fl) {
          return fl < 12 ? (scene === 'night' ? '#ff9d8a' : '#c0392b') :
            fl < 30 ? (scene === 'night' ? '#ffd28a' : '#a86e00') :
            (scene === 'night' ? '#7fd6a4' : '#2e7d5b');
        };
        var scrArea = (imgWIn > 0 && o.shFt > 0) ? imgWIn * o.shFt * 12 / 144 : 0;
        function dataLine(y, tag, tagCol, throwTxt, lumens, inRange) {
          var g = el('text', { x: 16, y: y, 'font-size': 13, 'font-weight': '600', fill: pal.label });
          function tsp(str, fill) {
            var t = document.createElementNS(NS, 'tspan');
            t.textContent = str;
            if (fill) t.setAttribute('fill', fill);
            g.appendChild(t);
          }
          tsp(tag + ' · ', tagCol);
          tsp(throwTxt);
          if (lumens > 0 && scrArea > 0) {
            var fl = lumens * effGain() / scrArea;
            tsp(' · ~' + fmt(fl, 0) + ' fL', flCol(fl));
          }
          if (inRange != null) tsp(inRange ? ' · In range' : ' · Out of range', fitCol(inRange));
        }
        var aThrow = (o.projLocked && o.throwD > 0)
          ? '🔒 Throw ' + fmtDist(o.throwD * 12)
          : 'Throw ' + rangeLabel + (isRear ? ' · behind the screen' : '');
        if (o.zpct >= 0) aThrow += ' · Zoom ' + o.zpct + '%';
        var aFit = (!o.outdoor && o.L > 0 && !isRear)
          ? (((o.throwD > 0) ? o.throwD : far) <= o.L) : null;
        dataLine(26, 'A', pal.proj[0], aThrow, o.lumens, aFit);
        (o.extraProj || []).forEach(function (xp, xi) {
          dataLine(44 + xi * 18, xp.tag, xi === 0 ? '#2e7d5b' : '#c07a1e',
            'Throw ' + xp.dist, xp.lm || 0, xp.fit);
        });
        if (o.seat > 0) {
          var sTagC = el('text', { x: 16, y: 44 + cmpCount * 18, 'font-size': 13, 'font-weight': '600', fill: pal.label });
          var sT1C = document.createElementNS(NS, 'tspan');
          sT1C.textContent = 'Seating ' + dispDist(o.seat) + ' from screen';
          sTagC.appendChild(sT1C);
        }
      } else {
      // throw range in the white margin outside the 3D render, not under the unit
      var throwTag = el('text', { x: 16, y: 26, 'font-size': 13, 'font-weight': '600', fill: pal.label });
      var tThrow = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      // Projector locked: the throw is fixed, so name it and visualize the lens zoom
      // position instead of the range; the projector itself never moves.
      if (o.projLocked && o.throwD > 0) {
        tThrow.textContent = '🔒 Throw ' + fmtDist(o.throwD * 12);
      } else {
        tThrow.textContent = 'Throw ' + rangeLabel + (isRear ? ' · behind the screen' : '');
      }
      throwTag.appendChild(tThrow);
      if (o.zpct >= 0) {
        var tZoom = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tZoom.textContent = ' · Zoom ' + o.zpct + '%';
        throwTag.appendChild(tZoom);
      }
      // Only judge the fit when the user has entered a room length.
      // Rear projection doesn't consume room length, so there is nothing to judge.
      if (!o.outdoor && o.L > 0 && !isRear) {
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
        var bGain = effGain();
        var bImgHIn = o.shFt * 12;
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
        sT1.textContent = 'Seating ' + dispDist(o.seat) + ' from screen';
        sTag.appendChild(sT1);
      }
      } // end non-compare tags
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
        if (!xp.ust && xp.pos === 'ceiling' && H > 0) {
          ez = H - ceilingDropFt();
          var xdrop = H - ez;
          if (mountType === 'pole') box(ex, ey, (ez + H) / 2, 0.18, 0.18, xdrop, pal.stand[0], pal.stand[1], pal.stand[2]);
          else box(ex, ey, (ez + H) / 2, 0.55, 0.45, xdrop, pal.stand[0], pal.stand[1], pal.stand[2]); // flush-mount bracket
        } else if (xp.pmount && H > 0) {
          ez = xp.pz;
          box(ex, ey, (ez + H) / 2, 0.18, 0.18, H - ez, pal.stand[0], pal.stand[1], pal.stand[2]);
        } else {
          ez = xp.pz != null ? xp.pz : (xp.ust ? 1 : zc);
        }
        box(ex, ey, ez, 1.1, 0.9, 0.55, cols[0], cols[1], cols[2]);
        txt(ex, ey, ez + 0.95, xp.tag + ' ' + xp.dist, 11);
      });
      // seating furniture per room
      if (o.seat > 0) {
        var sx = Math.min(o.seat, o.outdoor ? L - 1 : L - 0.5);
        var kind = ({ living: 'couch', dedicated: 'couch', bedroom: 'bed', outdoors: 'campchair' }[o.room] || 'seat');
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

    // legend at the bottom: color key for the projector labels
    drawLegend(el, compareLegendItems(o, { a: pal.proj[0], b: '#2e7d5b', c: '#c07a1e' }), 16, VH - 14, 420, pal.label, false);

    // watermark
    var wm = el('text', { x: VW - 12, y: VH - 10, 'text-anchor': 'end', 'font-size': 13,
      'font-weight': '600', 'letter-spacing': '1', fill: pal.label, opacity: 0.55 });
    wm.textContent = 'BudgetProjectors.org';
  }

  // Side elevation: screen wall on the left, projector at its throw distance,
  // throw beam, and seating. Mirrors the placement math in drawViz.
  function drawSideViz(o) {
    var svg2 = document.getElementById('calc-svg-side');
    if (!svg2) return;
    while (svg2.firstChild) svg2.removeChild(svg2.firstChild);
    var VW = 660, VH = 380;
    var night = !sunOn && !lightsOn;
    var ink = night ? '#dbe2f0' : NAVY;
    var mut = night ? '#8a94a8' : MUTED;
    var scrFill = night ? '#bcd0ff' : (o.screenType === 'alr' ? '#878e99' : '#dbe7ff');
    function el2(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg2.appendChild(e); return e;
    }
    function tx(x, y, str, size, anchor, fill) {
      var t = el2('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle',
        'font-size': size || 12, fill: fill || mut });
      t.textContent = str; return t;
    }
    function dim(x1, y1, x2, y2, str) {
      // horizontal dimension line with end ticks and a centered label
      el2('line', { x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1), stroke: mut, 'stroke-width': 1 });
      el2('line', { x1: x1.toFixed(1), y1: (y1 - 5).toFixed(1), x2: x1.toFixed(1), y2: (y1 + 5).toFixed(1), stroke: mut, 'stroke-width': 1 });
      el2('line', { x1: x2.toFixed(1), y1: (y2 - 5).toFixed(1), x2: x2.toFixed(1), y2: (y2 + 5).toFixed(1), stroke: mut, 'stroke-width': 1 });
      tx((x1 + x2) / 2, (y1 + y2) / 2 - 6, str, 12, 'middle', mut);
    }
    function dimV(x, y1, y2, str) {
      // vertical dimension line with a rotated label
      el2('line', { x1: x.toFixed(1), y1: y1.toFixed(1), x2: x.toFixed(1), y2: y2.toFixed(1), stroke: mut, 'stroke-width': 1 });
      el2('line', { x1: (x - 5).toFixed(1), y1: y1.toFixed(1), x2: (x + 5).toFixed(1), y2: y1.toFixed(1), stroke: mut, 'stroke-width': 1 });
      el2('line', { x1: (x - 5).toFixed(1), y1: y2.toFixed(1), x2: (x + 5).toFixed(1), y2: y2.toFixed(1), stroke: mut, 'stroke-width': 1 });
      var mx = x - 9, my = (y1 + y2) / 2;
      var t = tx(mx, my, str, 12, 'middle', mut);
      t.setAttribute('transform', 'rotate(-90 ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')');
    }
    if (night) el2('rect', { x: 0, y: 0, width: VW, height: VH, fill: '#0e1320' });

    var L = o.L, H = o.H;
    var hasRoom = o.outdoor || (L > 0);
    if (!hasRoom) {
      tx(VW / 2, VH / 2 - 8, 'Enter your room size above to see the side view.', 15, 'middle', mut);
      tx(VW - 12, VH - 10, 'BudgetProjectors.org', 13, 'end', mut).setAttribute('opacity', 0.55);
      return;
    }
    var hasScreen = o.swFt > 0 && o.shFt > 0;
    if (!hasScreen) {
      tx(VW / 2, VH / 2 - 8, o.r ? 'Enter a screen size to see the side view.' : 'Pick a model and enter a screen size.', 14, 'middle', mut);
      tx(VW - 12, VH - 10, 'BudgetProjectors.org', 13, 'end', mut).setAttribute('opacity', 0.55);
      return;
    }
    var sw = o.swFt, sh = o.shFt;
    var hKnown = H >= 0 && H > 0;
    // screen vertical placement mirrors drawViz
    var z0 = 2;
    if (hKnown && z0 + sh > H - 0.5) z0 = Math.max(0.5, H - sh - 0.5);
    var zc = z0 + sh / 2;
    // projector placement mirrors drawViz (body height includes the lens-shift offset)
    var ust = o.r[1] < 1;
    var imgWIn = o.imgWIn || sw * 12;
    var near = imgWIn / 12 * o.r[0];
    var ob = o.obst;
    var pg = ob ? { ppos: ob.ppos, z: ob.bodyZ } : projectorBodyZ(o, sh, zc, hKnown ? H : 0);
    var ppos = pg.ppos, pzz = pg.z;
    var isRear = ppos === 'rear';
    var pxx = (o.px != null) ? o.px : near;
    if (isRear) pxx = ob ? ob.lensX : -(o.throwD > 0 ? o.throwD : near);
    var poleTop = -1, onTable = false;
    if (ppos === 'ceiling' && hKnown) { poleTop = H; }
    else if (ppos === 'table') { onTable = true; }
    else if (o.pmount && hKnown) { poleTop = H; }
    // plot scaling (rear projection extends left of the screen wall)
    var xMin = isRear ? pxx - 1.5 : 0;
    var xMax = Math.max(L || 10, pxx > 0 ? pxx : 0);
    var zTop = hKnown ? H : Math.max(z0 + sh + 1, pzz + 1.5, 6);
    var padL = 66, padR = 26, padT = 28, padB = 88;
    var s = Math.min((VW - padL - padR) / (xMax - xMin), (VH - padT - padB) / zTop);
    var ox = padL, oy = VH - padB;
    function X(x) { return ox + (x - xMin) * s; }
    function Z(z) { return oy - z * s; }

    // room shell
    el2('line', { x1: X(0).toFixed(1), y1: oy.toFixed(1), x2: X(L).toFixed(1), y2: oy.toFixed(1), stroke: ink, 'stroke-width': 3 }); // floor
    if (!o.outdoor) {
      var wallTop = hKnown ? H : z0 + sh;
      el2('line', { x1: X(0).toFixed(1), y1: oy.toFixed(1), x2: X(0).toFixed(1), y2: Z(wallTop).toFixed(1), stroke: ink, 'stroke-width': 2 }); // screen wall
      el2('line', { x1: X(L).toFixed(1), y1: oy.toFixed(1), x2: X(L).toFixed(1), y2: Z(wallTop).toFixed(1), stroke: ink, 'stroke-width': 2 }); // back wall
      if (hKnown) {
        el2('line', { x1: X(0).toFixed(1), y1: Z(H).toFixed(1), x2: X(L).toFixed(1), y2: Z(H).toFixed(1), stroke: ink, 'stroke-width': 2 }); // ceiling
      } else {
        el2('line', { x1: X(0).toFixed(1), y1: Z(zTop).toFixed(1), x2: X(L).toFixed(1), y2: Z(zTop).toFixed(1),
          stroke: mut, 'stroke-width': 1.5, 'stroke-dasharray': '7 5' });
        tx(X(L) + 4, Z(zTop) + 4, 'enter ceiling height', 11, 'start', mut);
      }
    }
    // screen
    el2('rect', { x: (X(0) - 7).toFixed(1), y: Z(z0 + sh).toFixed(1), width: 7, height: (sh * s).toFixed(1),
      fill: scrFill, stroke: ink, 'stroke-width': 1.5 });
    if (!night && o.screenType !== 'alr') {
      // matte white washes out with the lights on; ALR holds its contrast
      el2('rect', { x: (X(0) - 7).toFixed(1), y: Z(z0 + sh).toFixed(1), width: 7, height: (sh * s).toFixed(1),
        fill: '#fff3d0', opacity: 0.6 });
    }
    // screen label sits above the top of the screen so it never collides with the
    // "blocks your view!" sightline warning at screen-center height
    var scrLabY = (hKnown && H - (z0 + sh) <= 1) ? Z(zc) + 4 : Z(z0 + sh) - 10;
    tx(X(0) + 10, scrLabY, 'screen ' + dispShort(sh) + (o.screenType === 'alr' ? ' · ALR' : ''), 11, 'start', mut);
    if (isRear) {
      // cutaway booth behind the screen wall
      var boothH = hKnown ? H : z0 + sh;
      el2('rect', { x: X(xMin).toFixed(1), y: Z(boothH).toFixed(1),
        width: (X(0) - X(xMin)).toFixed(1), height: (boothH * s).toFixed(1),
        fill: 'none', stroke: mut, 'stroke-width': 1.5, 'stroke-dasharray': '7 5' });
      tx((X(xMin) + X(0)) / 2, Z(boothH) - 8, 'rear projection booth', 11, 'middle', mut);
    }
    // throw beam: lens to screen top and bottom
    var lx = X(pxx), lz = Z(pzz);
    el2('line', { x1: lx.toFixed(1), y1: lz.toFixed(1), x2: X(0).toFixed(1), y2: Z(z0).toFixed(1),
      stroke: ink, 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: 0.55 });
    el2('line', { x1: lx.toFixed(1), y1: lz.toFixed(1), x2: X(0).toFixed(1), y2: Z(z0 + sh).toFixed(1),
      stroke: ink, 'stroke-width': 1.5, 'stroke-dasharray': '6 4', opacity: 0.55 });
    // mount pole or table
    if (poleTop > 0 && lz - 8 > Z(poleTop)) {
      el2('line', { x1: lx.toFixed(1), y1: (lz - 8).toFixed(1), x2: lx.toFixed(1), y2: Z(poleTop).toFixed(1), stroke: ink, 'stroke-width': 4 });
    } else if (onTable) {
      if (shiftOn && Math.abs(pzz - 2.475) > 0.05) {
        el2('line', { x1: lx.toFixed(1), y1: oy.toFixed(1), x2: lx.toFixed(1), y2: lz.toFixed(1), stroke: ink, 'stroke-width': 4 });
      } else {
        el2('rect', { x: (lx - 1.2 * s).toFixed(1), y: Z(2.2).toFixed(1), width: (2.4 * s).toFixed(1), height: (2.2 * s).toFixed(1),
          fill: night ? '#4a5878' : '#c9bfae', stroke: ink, 'stroke-width': 1.5 });
      }
    } else if (o.outdoor) {
      // stand legs for the outdoor screen
      el2('line', { x1: X(0.3).toFixed(1), y1: Z(z0).toFixed(1), x2: X(0.9).toFixed(1), y2: oy.toFixed(1), stroke: ink, 'stroke-width': 2.5 });
      el2('line', { x1: (X(0) - 7).toFixed(1), y1: Z(z0).toFixed(1), x2: (X(0) - 14).toFixed(1), y2: oy.toFixed(1), stroke: ink, 'stroke-width': 2.5 });
    }
    // projector body
    el2('rect', { x: (lx - 17).toFixed(1), y: (lz - 8).toFixed(1), width: 34, height: 16, rx: 3,
      fill: night ? '#3b5a94' : NAVY });
    tx(lx, lz - 14, isRear ? 'rear projector' : (ppos === 'ceiling' ? 'ceiling mount' : (onTable ? 'on table' : 'projector')), 11, 'middle', mut);
    if (fanOn && hKnown && !o.outdoor) {
      // ceiling fan at room center; amber when it fouls the mount or the throw beam
      var fxx = X(L / 2), fzz = Z(H - 1.2);
      var fAlert = ob && (ob.fanBeam || ob.fanMount);
      var fcol = fAlert ? '#d98a2b' : ink;
      el2('line', { x1: fxx.toFixed(1), y1: Z(H).toFixed(1), x2: fxx.toFixed(1), y2: fzz.toFixed(1), stroke: fcol, 'stroke-width': 3 });
      el2('line', { x1: X(L / 2 - 2.5).toFixed(1), y1: fzz.toFixed(1), x2: X(L / 2 + 2.5).toFixed(1), y2: fzz.toFixed(1), stroke: fcol, 'stroke-width': 6 });
      tx(fxx, fzz - 10, 'ceiling fan', 11, 'middle', fcol);
    }
    // seating marker
    if (o.seat > 0) {
      var sx = Math.min(o.seat, (L || 10) - 0.5);
      el2('rect', { x: (X(sx) - 20).toFixed(1), y: (oy - 20).toFixed(1), width: 40, height: 20, rx: 4,
        fill: night ? '#5c6a8c' : '#9aa5bd', stroke: ink, 'stroke-width': 1.5 });
      tx(X(sx), oy - 26, 'seating', 11, 'middle', mut);
    }
    if (ob && ob.seatX > 0 && !isRear) {
      // viewer sightline: seat eye -> screen center, amber when the projector blocks it
      el2('line', { x1: X(ob.seatX).toFixed(1), y1: Z(ob.eyeH).toFixed(1), x2: X(0).toFixed(1), y2: Z(ob.zc).toFixed(1),
        stroke: ob.blocked ? '#d98a2b' : mut, 'stroke-width': ob.blocked ? 2.5 : 1,
        'stroke-dasharray': '6 4', opacity: ob.blocked ? 0.95 : 0.5 });
      if (ob.blocked) tx(X(ob.seatX / 2), Z((ob.eyeH + ob.zc) / 2) - 10, 'blocks your view!', 12, 'middle', '#d98a2b');
    }
    // dimensions
    dim(X(0), oy + 20, X(pxx), oy + 20, dispDist(Math.abs(pxx)) + ' throw' + (isRear ? ' (behind screen)' : ''));
    dim(X(0), oy + 40, X(L), oy + 40, dispShort(L) + (o.outdoor ? '' : ' long'));
    if (hKnown) dimV(X(0) - 26, Z(H), oy, dispShort(H) + ' ceiling');
    // legend at the bottom: color key for the projector
    drawLegend(el2, compareLegendItems(o, { a: night ? '#3b5a94' : NAVY, b: '#2e7d5b', c: '#c07a1e' }, true), 16, VH - 14, 470, mut, false);
    var wmt = tx(VW - 12, VH - 10, 'BudgetProjectors.org', 13, 'end', mut);
    wmt.setAttribute('opacity', 0.55);
  }

  // First-person view from the seating position: the screen drawn at its true
  // angular size inside a ~90-degree field-of-view viewport, with 30°/36°
  // reference frames (SMPTE minimum / immersive target).
  // shared SVG caption wrapper: split a string into lines that fit maxW px
  var svgMeasureCtx = null;
  function wrapText(str, font, maxW, maxLines) {
    if (!svgMeasureCtx) svgMeasureCtx = document.createElement('canvas').getContext('2d');
    var ctx = svgMeasureCtx;
    ctx.font = font;
    var words = String(str).split(/\s+/).filter(Boolean), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= maxW || !line) line = t;
      else { lines.push(line); line = w; }
    });
    if (line) lines.push(line);
    if (maxLines && lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      var last = lines[maxLines - 1];
      while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = last + '…';
    }
    return lines;
  }

  function drawViewerViz(o) {
    var svg3 = document.getElementById('calc-svg-viewer');
    if (!svg3) return;
    while (svg3.firstChild) svg3.removeChild(svg3.firstChild);
    var VW = 660, VH = 360;
    var night = !sunOn && !lightsOn;
    var mut = night ? '#8a94a8' : MUTED;
    var alr = o.screenType === 'alr';
    function el3(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg3.appendChild(e); return e;
    }
    function tx3(x, y, str, size, anchor, fill) {
      var t = el3('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle',
        'font-size': size || 12, fill: fill || mut });
      t.textContent = str; return t;
    }
    el3('rect', { x: 0, y: 0, width: VW, height: VH, fill: night ? '#0e1320' : '#e8e2d4' });
    // room shell: side walls + floor, first-person from the couch
    var floorY = Math.round(VH * 0.70);
    var wallTone = night ? '#141c30' : '#d9d2c0';
    var floorTone = night ? '#0b101d' : '#c9c0a9';
    var trimCol = night ? '#232f4d' : '#a89e86';
    el3('polygon', { points: '0,0 58,' + floorY + ' 0,' + VH, fill: wallTone });
    el3('polygon', { points: VW + ',0 ' + (VW - 58) + ',' + floorY + ' ' + VW + ',' + VH, fill: wallTone });
    el3('polygon', { points: '0,' + VH + ' ' + VW + ',' + VH + ' ' + (VW - 58) + ',' + floorY + ' 58,' + floorY,
      fill: floorTone });
    [150, 260, 400, 510].forEach(function (fx) {
      el3('line', { x1: fx, y1: VH, x2: (VW / 2 + (fx - VW / 2) * 0.12).toFixed(1), y2: floorY + 4,
        stroke: trimCol, 'stroke-width': 1, opacity: 0.45 });
    });
    el3('line', { x1: 58, y1: floorY, x2: VW - 58, y2: floorY,
      stroke: trimCol, 'stroke-width': 2, opacity: 0.8 });
    // ceiling band across the top of the room
    var ceilY = 56;
    var ceilTone = night ? '#1a2340' : '#e6dfcc';
    el3('polygon', { points: '0,0 ' + VW + ',0 ' + (VW - 58) + ',' + ceilY + ' 58,' + ceilY, fill: ceilTone });
    el3('line', { x1: 58, y1: ceilY, x2: VW - 58, y2: ceilY,
      stroke: trimCol, 'stroke-width': 2, opacity: 0.8 });
    // window on the left wall when sunlight is on (drawn before the screen so the screen sits in front)
    if (sunOn && !o.outdoor) {
      var winFrame = '#b89b5e';
      el3('polygon', { points: '10,130 40,142 40,208 10,200', fill: '#ffedb0', opacity: 0.35 });
      el3('polygon', { points: '10,130 40,142 40,208 10,200', fill: '#fffbe8', opacity: 0.95 });
      el3('polygon', { points: '10,130 40,142 40,208 10,200', fill: 'none', stroke: winFrame, 'stroke-width': 2.5 });
      el3('line', { x1: 25, y1: 136, x2: 25, y2: 204, stroke: winFrame, 'stroke-width': 2 });
      el3('line', { x1: 10, y1: 165, x2: 40, y2: 175, stroke: winFrame, 'stroke-width': 2 });
    }

    var sw = o.swFt, sh = o.shFt, seat = o.seat;
    function watermark3() {
      // top-right: the bottom-center caption stack occupies the bottom corners
      var w = tx3(VW - 12, 24, 'BudgetProjectors.org', 13, 'end', mut);
      w.setAttribute('opacity', 0.55);
    }
    if (!(sw > 0 && sh > 0)) {
      tx3(VW / 2, VH / 2 - 8, 'Pick a screen size above to see the viewer perspective.', 15, 'middle', mut);
      watermark3(); return;
    }
    if (!(seat > 0)) {
      tx3(VW / 2, VH / 2 - 8, 'Enter your seating distance above to see the viewer perspective.', 15, 'middle', mut);
      watermark3(); return;
    }
    // viewport width = 90° horizontal field of view
    var tanHalfFov = Math.tan(45 * Math.PI / 180);
    function wForDeg(deg) { return VW * Math.tan(deg * Math.PI / 360) / tanHalfFov; }
    var screenDeg = 2 * Math.atan((sw / 2) / seat) * 180 / Math.PI;
    // the screen at its true angular size
    var scrW = wForDeg(Math.min(screenDeg, 90)), scrH = scrW * (sh / sw);
    var sx = VW / 2 - scrW / 2, sy = VH / 2 - scrH / 2;
    // horizontal lens shift: the image center moves (shiftHPct/100)*sw feet sideways
    // at the screen; convert that lateral offset to pixels from the seat's viewing
    // angle (pixels = VW * tan(atan(d/seat)) / tan(45°), and tan(45°) = 1)
    var hOffFt = (shiftOn && shiftHPct) ? (shiftHPct / 100) * sw : 0;
    var hPix = (seat > 0 && hOffFt) ? VW * hOffFt / seat : 0;
    sx += hPix;
    var face = night ? (alr ? '#9aa2ad' : '#eef3ff') : (alr ? '#878e99' : '#f7f4ec');
    var styleName = { fixed: 'Fixed frame', pulldown: 'Manual pull-down', acoustic: 'Acoustic frame',
      floor: 'Floor rising', portable: 'Portable on legs' }[screenStyle] || 'Fixed frame';
    var frameCol = screenStyle === 'acoustic' ? '#3a3f47' : NAVY;
    var caseFill = night ? '#3b5a94' : '#dfe5ef';
    // physical screen style: legs and housings around the same image area
    if (screenStyle === 'portable') {
      [[sx + 12, sx - 16], [sx + scrW - 12, sx + scrW + 16]].forEach(function (lx) {
        el3('line', { x1: lx[0].toFixed(1), y1: (sy + scrH - 4).toFixed(1), x2: lx[1].toFixed(1), y2: floorY.toFixed(1),
          stroke: frameCol, 'stroke-width': 4 });
        el3('line', { x1: (lx[1] - 12).toFixed(1), y1: floorY.toFixed(1), x2: (lx[1] + 12).toFixed(1), y2: floorY.toFixed(1),
          stroke: frameCol, 'stroke-width': 4 });
      });
    }
    if (screenStyle === 'pulldown') {
      // tube mounted just under the ceiling; black leader drops from the tube to the
      // viewing area, so switching styles visibly changes the distance from the ceiling
      var caseH = 13;
      var caseY = Math.min(ceilY + 6, sy - caseH - 4);
      el3('rect', { x: (sx - 8).toFixed(1), y: caseY.toFixed(1), width: (scrW + 16).toFixed(1), height: caseH, rx: 6,
        fill: caseFill, stroke: NAVY, 'stroke-width': 1.5 });
      var leadTop = caseY + caseH, leadBot = sy;
      if (leadBot - leadTop > 3) {
        el3('rect', { x: sx.toFixed(1), y: leadTop.toFixed(1), width: scrW.toFixed(1),
          height: (leadBot - leadTop).toFixed(1), fill: night ? '#04060c' : '#151515' });
      }
    }
    el3('rect', { x: sx.toFixed(1), y: sy.toFixed(1), width: scrW.toFixed(1), height: scrH.toFixed(1),
      fill: face, stroke: frameCol, 'stroke-width': screenStyle === 'acoustic' ? 5 : 3 });
    if (screenStyle === 'pulldown') {
      el3('rect', { x: sx.toFixed(1), y: (sy + scrH - 2).toFixed(1), width: scrW.toFixed(1), height: 5,
        fill: caseFill, stroke: NAVY, 'stroke-width': 1 });
    }
    if (screenStyle === 'floor') {
      // housing sits on the floor; black leader rises from the housing to the viewing area
      var fhh = 11, fhx = sx - 6, fhw = scrW + 12;
      var fhy = (sy + scrH + 8 <= floorY - fhh) ? floorY - fhh : sy + scrH + 8;
      if (fhy > sy + scrH) {
        el3('rect', { x: sx.toFixed(1), y: (sy + scrH).toFixed(1), width: scrW.toFixed(1),
          height: (fhy - sy - scrH).toFixed(1), fill: night ? '#04060c' : '#151515' });
      }
      el3('rect', { x: fhx.toFixed(1), y: fhy.toFixed(1), width: fhw.toFixed(1), height: fhh, rx: 5,
        fill: caseFill, stroke: NAVY, 'stroke-width': 1.5 });
    }
    // front speakers flanking the screen
    var spkFill = night ? '#3b5a94' : NAVY;
    var spkCone = night ? '#0e1320' : '#ffffff';
    if (speakerMode === 'wall') {
      var ww = 24, wh = scrH * 0.52, wy = VH / 2 - wh / 2;
      [sx - ww - 16, sx + scrW + 16].forEach(function (wx) {
        el3('rect', { x: wx.toFixed(1), y: wy.toFixed(1), width: ww, height: wh.toFixed(1), rx: 5, fill: spkFill });
        el3('circle', { cx: (wx + ww / 2).toFixed(1), cy: (wy + wh * 0.3).toFixed(1), r: 6, fill: spkCone, opacity: 0.5 });
        el3('circle', { cx: (wx + ww / 2).toFixed(1), cy: (wy + wh * 0.7).toFixed(1), r: 9, fill: spkCone, opacity: 0.5 });
      });
    } else if (speakerMode === 'tower') {
      // towers stand on the floor: true angular height of a 3.4 ft tower at the seat distance
      var thT = VW * 3.4 / (2 * seat), twT = Math.max(22, thT * 0.30), tyT = floorY - thT;
      [sx - twT - 18, sx + scrW + 18].forEach(function (wx) {
        el3('rect', { x: wx.toFixed(1), y: tyT.toFixed(1), width: twT.toFixed(1), height: thT.toFixed(1), rx: 4, fill: spkFill });
        [0.25, 0.5, 0.75].forEach(function (f) {
          el3('circle', { cx: (wx + twT / 2).toFixed(1), cy: (tyT + thT * f).toFixed(1), r: (twT * 0.22).toFixed(1),
            fill: spkCone, opacity: 0.5 });
        });
      });
    } else if (speakerMode === 'soundbar') {
      // soundbar mounted under the physical screen: it stays centered on the
      // screen itself, not on the shifted image
      var sbw = scrW * 0.55, sbh = 14;
      var sbcx = sx - hPix + scrW / 2;
      var sbx = sbcx - sbw / 2, sby = sy + scrH + 10;
      el3('rect', { x: sbx.toFixed(1), y: sby.toFixed(1), width: sbw.toFixed(1), height: sbh,
        rx: 7, fill: spkFill });
      [0.2, 0.35, 0.5, 0.65, 0.8].forEach(function (f) {
        el3('circle', { cx: (sbx + sbw * f).toFixed(1), cy: (sby + sbh / 2).toFixed(1), r: 3.5,
          fill: spkCone, opacity: 0.5 });
      });
    }
    // center channel: behind the screen (acoustic-transparent) for wall layouts,
    // under the screen for tower layouts
    if (speakerMode === 'wall') {
      // drawn over the image with reduced opacity and a dashed outline so it
      // reads as "behind"; follows the shifted image position
      var ccw = scrW * 0.28, cch = 22;
      var ccx = sx + scrW / 2 - ccw / 2, ccy = VH / 2 - cch / 2;
      el3('rect', { x: ccx.toFixed(1), y: ccy.toFixed(1), width: ccw.toFixed(1), height: cch,
        rx: 8, fill: spkFill, opacity: 0.85, stroke: spkCone, 'stroke-width': 1.5, 'stroke-dasharray': '6 4' });
      [0.25, 0.5, 0.75].forEach(function (f) {
        el3('circle', { cx: (ccx + ccw * f).toFixed(1), cy: (VH / 2).toFixed(1), r: 6, fill: spkCone, opacity: 0.5 });
      });
      tx3(sx + scrW / 2, ccy + cch + 15, 'center channel (behind screen)', 11, 'middle',
        night ? '#dbe2f0' : NAVY);
    } else if (speakerMode === 'tower') {
      // center channel sits under the screen, clamped above the floor line
      var tcw = scrW * 0.34, tch = 26;
      var tcx = sx + scrW / 2 - tcw / 2;
      var tcy = Math.min(sy + scrH + 10, floorY - tch - 4);
      el3('rect', { x: tcx.toFixed(1), y: tcy.toFixed(1), width: tcw.toFixed(1), height: tch,
        rx: 8, fill: spkFill, stroke: NAVY, 'stroke-width': 1.5 });
      [0.25, 0.5, 0.75].forEach(function (f) {
        el3('circle', { cx: (tcx + tcw * f).toFixed(1), cy: (tcy + tch / 2).toFixed(1), r: 7,
          fill: spkCone, opacity: 0.5 });
      });
      tx3(sx + scrW / 2, tcy + tch + 15, 'center channel', 11, 'middle',
        night ? '#dbe2f0' : NAVY);
    }
    // ambient washout on the screen face: sunlight hits far harder than indoor lamps,
    // so it bleaches a matte white screen badly; ALR holds up but still takes a hit
    var washOp = 0, washFill = '#fff3d0';
    if (!alr) {
      if (sunOn) { washOp = 0.8; washFill = '#fff6d8'; }
      else if (!night) washOp = 0.55;
    } else if (sunOn) {
      washOp = 0.3; washFill = '#fff6d8';
    }
    if (washOp > 0) {
      el3('rect', { x: sx.toFixed(1), y: sy.toFixed(1), width: scrW.toFixed(1), height: scrH.toFixed(1),
        fill: washFill, opacity: washOp });
    }
    if (night) {
      el3('rect', { x: sx.toFixed(1), y: sy.toFixed(1), width: scrW.toFixed(1), height: scrH.toFixed(1),
        fill: '#ffffff', opacity: 0.18 });
    }
    // 30° / 36° reference frames, drawn over the screen
    [{ deg: 36, lab: 'top' }, { deg: 30, lab: 'bottom' }].forEach(function (ref) {
      var rw = wForDeg(ref.deg), rh = rw * (sh / sw);
      var rx = VW / 2 - rw / 2, ry = VH / 2 - rh / 2;
      el3('rect', { x: rx.toFixed(1), y: ry.toFixed(1), width: rw.toFixed(1), height: rh.toFixed(1),
        fill: 'none', stroke: mut, 'stroke-width': 1, 'stroke-dasharray': '6 4', opacity: 0.7 });
      if (ref.lab === 'top') tx3(rx + rw - 6, ry + 16, ref.deg + '°', 11, 'end', mut);
      else tx3(rx + rw - 6, ry + rh - 8, ref.deg + '°', 11, 'end', mut);
    });
    var fillsAll = screenDeg >= 90;
    var isRearV = !!(o.obst && o.obst.ppos === 'rear');
    // ----- finished-setup elements: ceiling fan, projector, floor/ceiling dimensions -----
    var pposV = (o.obst && o.obst.ppos) || 'behind';
    var isUstV = !!(o.obst && o.obst.ust);
    var projBodyC = night ? '#2c3d66' : '#22345c';
    var projTrimC = night ? '#5a6c96' : '#7a6a52';
    function projLens3(px, py, r, op) {
      el3('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: r, fill: '#9fd0ff', opacity: op == null ? 1 : op });
      el3('circle', { cx: px.toFixed(1), cy: py.toFixed(1), r: (r * 0.45).toFixed(1), fill: '#e8f4ff', opacity: op == null ? 1 : op });
    }
    if (isUstV) {
      if (sy + scrH < VH - 120) {
        var uuw = Math.min(150, scrW * 0.5), uux = VW / 2 - uuw / 2, uuy = sy + scrH + 10;
        el3('rect', { x: uux.toFixed(1), y: (uuy + 16).toFixed(1), width: uuw.toFixed(1), height: 24, rx: 3, fill: projTrimC });
        el3('rect', { x: (uux + uuw / 2 - 34).toFixed(1), y: uuy.toFixed(1), width: 68, height: 18, rx: 3, fill: projBodyC });
        projLens3(uux + uuw / 2, uuy + 7, 4);
      }
    } else if (pposV === 'ceiling') {
      var pipeInV = pipeDropIn();
      var pipePx = Math.max(12, Math.min(44, 10 + pipeInV * 0.6));
      var pcx = VW / 2, pTopV = 4, pBodyY = pTopV + pipePx;
      el3('line', { x1: pcx, y1: pTopV, x2: pcx, y2: pBodyY, stroke: projTrimC, 'stroke-width': 5 });
      el3('rect', { x: (pcx - 32).toFixed(1), y: pBodyY.toFixed(1), width: 64, height: 24, rx: 5, fill: projBodyC });
      projLens3(pcx, pBodyY + 12, 6.5);
      var ceilFtV = (!o.outdoor && o.H > 0) ? o.H : 9;
      tx3(pcx, pBodyY + 40, 'projector · ' + dispIn(pipeInV) + ' pipe · lens ' + fmtDist((ceilFtV - pipeInV / 12) * 12) + ' off floor',
        11, 'middle', mut);
    } else if (pposV === 'table') {
      var ttx = VW / 2;
      el3('rect', { x: (ttx - 24).toFixed(1), y: (floorY - 48).toFixed(1), width: 48, height: 14, rx: 3, fill: projBodyC });
      projLens3(ttx, floorY - 41, 4.5);
      el3('rect', { x: (ttx - 30).toFixed(1), y: (floorY - 34).toFixed(1), width: 60, height: 6, rx: 2, fill: projTrimC });
      el3('line', { x1: ttx - 24, y1: floorY - 28, x2: ttx - 24, y2: floorY, stroke: projTrimC, 'stroke-width': 4 });
      el3('line', { x1: ttx + 24, y1: floorY - 28, x2: ttx + 24, y2: floorY, stroke: projTrimC, 'stroke-width': 4 });
      tx3(ttx, floorY + 18, 'projector on table', 11, 'middle', mut);
    } else if (pposV === 'behind') {
      var bbx = VW / 2;
      el3('line', { x1: bbx, y1: 6, x2: bbx, y2: 22, stroke: projTrimC, 'stroke-width': 5,
        opacity: 0.45, 'stroke-dasharray': '5 4' });
      el3('rect', { x: (bbx - 30).toFixed(1), y: 22, width: 60, height: 22, rx: 5, fill: projBodyC, opacity: 0.5 });
      projLens3(bbx, 33, 6, 0.6);
      tx3(bbx, 58, 'projector on a shelf behind you', 11, 'middle', mut);
    }
    // screen distances off the floor / to the ceiling, as side callouts
    var maV = mountAdvice(o, eyeHeightIn());
    function dimCallout(dx, dy, dir, label) {
      var dy2 = dy + dir * 36;
      el3('line', { x1: dx, y1: dy, x2: dx, y2: dy2, stroke: mut, 'stroke-width': 1 });
      el3('line', { x1: dx - 5, y1: dy, x2: dx + 5, y2: dy, stroke: mut, 'stroke-width': 1 });
      el3('line', { x1: dx - 5, y1: dy2, x2: dx + 5, y2: dy2, stroke: mut, 'stroke-width': 1 });
      var lx = dx + (dx < VW / 2 ? -11 : 11), ly = dy + dir * 18;
      var lt = tx3(lx, ly, label, 11, 'middle', mut);
      lt.setAttribute('transform', 'rotate(-90 ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')');
    }
    if (sx - 40 > 4 && sy + scrH + 48 < VH) dimCallout(sx - 28, sy + scrH, 1, dispIn(maV.botGapIn) + ' off floor');
    if (sx + scrW + 40 < VW - 4 && sy - 48 > 0) dimCallout(sx + scrW + 28, sy, -1, dispIn(maV.topGapIn) + ' to ceiling');
    var shiftNote = (shiftOn && shiftHPct) ? ' · image shifted ' + (shiftHPct > 0 ? 'right' : 'left') +
      ' ' + Math.abs(shiftHPct) + '% (lens shift)' : '';
    // bottom caption stack, built upward from the bottom line so wrapped
    // lines grow into free space instead of colliding with the line below
    var verdictStr = fillsAll ? 'The screen fills your entire field of view' + shiftNote :
      'The screen fills about ' + Math.round(screenDeg) + '° of your view' +
      (screenDeg < 30 ? ' · below the 30° cinematic minimum' :
       screenDeg <= 40 ? ' · right in the cinematic sweet spot' : ' · bigger than the 36° immersive target') + shiftNote;
    var verdictLines = wrapText(verdictStr, '12px Arial,sans-serif', 620, 2);
    var noteStr = isRearV ? 'Rear projection needs a dedicated rear-projection screen' :
      (sunOn && !alr) ? 'sunlight washes out a matte white screen — consider ALR' :
      (sunOn && alr) ? 'ALR holds up in sunlight, though blacks still lift' :
      (!night && !alr) ? 'matte white washes out with the lights on' :
      (!night && alr) ? 'ALR holds contrast with the lights on' : '';
    var capY = VH - 16;
    if (noteStr) { tx3(VW / 2, capY, noteStr, 11, 'middle', mut); capY -= 18; }
    verdictLines.forEach(function (ln, i) {
      tx3(VW / 2, capY - (verdictLines.length - 1 - i) * 16, ln, 12, 'middle', mut);
    });
    capY -= (verdictLines.length - 1) * 16 + 18;
    tx3(VW / 2, capY, 'From your seat · ' + dispDist(seat) + ' away · ' + styleName, 14, 'middle', night ? '#dbe2f0' : NAVY);
    capY -= 18;
    if (sunOn) tx3(VW / 2, capY, 'Simulated sunlight — actual brightness varies by room', 11, 'middle',
      night ? '#dbe2f0' : '#8a6a2a');
    // legend at the top-left: color key for the projector
    drawLegend(el3, compareLegendItems(o, { a: projBodyC, b: '#2e7d5b', c: '#c07a1e' }, true), 16, 26, 400, mut, false);
    watermark3();
  }

  /* ---------- Ceiling view: looking straight up at the ceiling ----------
     Plan of the ceiling showing where each projector mounts, so A/B/C
     throw differences read at a glance. */
  function drawCeilingViz(o) {
    var svg6 = document.getElementById('calc-svg-ceiling');
    if (!svg6) return;
    while (svg6.firstChild) svg6.removeChild(svg6.firstChild);
    var VW = 660, VH = 360;
    var night = !sunOn && !lightsOn;
    var mut = night ? '#8a94a8' : MUTED;
    var ink = night ? '#dbe2f0' : NAVY;
    function el6(name, attrs) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg6.appendChild(e); return e;
    }
    function tx6(x, y, str, size, anchor, fill) {
      var t = el6('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle',
        'font-size': size || 12, fill: fill || mut });
      t.textContent = str; return t;
    }
    function watermark6() {
      var w = tx6(VW - 12, VH - 12, 'BudgetProjectors.org', 13, 'end', mut);
      w.setAttribute('opacity', 0.55);
    }
    var L = o.L || 0, W = o.W || 0, H = o.H || 0, sw = o.swFt || 0;
    if (o.outdoor) {
      tx6(VW / 2, VH / 2 - 8, 'No ceiling outdoors — the ceiling view needs a room.', 15, 'middle', mut);
      watermark6(); return;
    }
    if (!(L > 0 && W > 0)) {
      tx6(VW / 2, VH / 2 - 8, 'Enter your room size above to see the ceiling view.', 15, 'middle', mut);
      watermark6(); return;
    }
    if (!(sw > 0)) {
      tx6(VW / 2, VH / 2 - 8, 'Pick a screen size above to see the ceiling view.', 15, 'middle', mut);
      watermark6(); return;
    }
    tx6(VW / 2, 24, 'Looking up at the ceiling — where each projector mounts', 14, 'middle', ink);
    // legend under the caption: color key for the projector labels
    drawLegend(el6, compareLegendItems(o, { a: night ? '#8fb0e8' : NAVY, b: night ? '#57b586' : '#2e7d5b', c: night ? '#e09a3c' : '#c07a1e' }), 0, 46, VW - 40, mut, true);
    // plan scale: x = distance from the screen wall, y = across the room
    var padL = 64, padR = 30, padT = 68, padB = 54;
    var s = Math.min((VW - padL - padR) / L, (VH - padT - padB) / W);
    var ox = padL + ((VW - padL - padR) - L * s) / 2;
    var oy = padT + ((VH - padT - padB) - W * s) / 2;
    function X(x) { return ox + x * s; }
    function Y(y) { return oy + y * s; }
    // ceiling slab
    el6('rect', { x: X(0).toFixed(1), y: Y(0).toFixed(1), width: (L * s).toFixed(1), height: (W * s).toFixed(1),
      fill: night ? '#141b2e' : '#eef1f6', stroke: ink, 'stroke-width': 2 });
    // faint grid every 2 ft so throw differences are easy to read
    for (var gx = 2; gx < L; gx += 2) {
      el6('line', { x1: X(gx).toFixed(1), y1: Y(0).toFixed(1), x2: X(gx).toFixed(1), y2: Y(W).toFixed(1),
        stroke: ink, 'stroke-width': 1, opacity: 0.14 });
    }
    // screen mark on the screen wall (left edge)
    var scrA = Y(W / 2 - sw / 2), scrB = Y(W / 2 + sw / 2);
    el6('line', { x1: X(0).toFixed(1), y1: scrA.toFixed(1), x2: X(0).toFixed(1), y2: scrB.toFixed(1),
      stroke: night ? '#9fb6dd' : '#41598a', 'stroke-width': 7, 'stroke-linecap': 'round' });
    tx6(X(0) - 10, (scrA + scrB) / 2 + 4, 'screen', 11, 'end', mut);
    // seating marker
    if (o.seat > 0) {
      var sx = Math.min(o.seat, L - 0.5);
      el6('rect', { x: (X(sx) - 16).toFixed(1), y: (Y(W / 2) - 10).toFixed(1), width: 32, height: 20, rx: 5,
        fill: night ? '#5c6a8c' : '#9aa5bd', stroke: ink, 'stroke-width': 1.5 });
      tx6(X(sx), Y(W / 2) - 18, 'seating', 11, 'middle', mut);
    }
    // ceiling fan at room center; amber when it fouls the mount or the beam
    if (fanOn && H > 0) {
      var fx = X(L / 2), fy = Y(W / 2);
      var fAlert = o.obst && (o.obst.fanBeam || o.obst.fanMount);
      var fcol = fAlert ? '#d98a2b' : mut;
      for (var bi = 0; bi < 4; bi++) {
        var fa = bi * Math.PI / 2 + Math.PI / 4;
        el6('line', { x1: fx.toFixed(1), y1: fy.toFixed(1),
          x2: (fx + 24 * Math.cos(fa)).toFixed(1), y2: (fy + 24 * Math.sin(fa)).toFixed(1),
          stroke: fcol, 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.75 });
      }
      el6('circle', { cx: fx.toFixed(1), cy: fy.toFixed(1), r: 5, fill: fcol });
      tx6(fx, fy - 32, 'ceiling fan', 11, 'middle', fcol);
    }
    // projectors as seen from below: A navy, B green, C orange (matches the 3D view)
    var projs = [];
    if (o.px >= 0 && o.r) {
      var mainDist = fmtDist(o.imgWIn * o.r[0]) + (o.r[1] !== o.r[0] ? '–' + fmtDist(o.imgWIn * o.r[1]) : '');
      projs.push({ tag: (o.extraProj || []).length > 0 ? 'A' : 'projector', px: o.px, py: o.py != null ? o.py : W / 2, dist: mainDist,
        col: night ? '#8fb0e8' : NAVY, ceiling: o.projPos === 'ceiling' || !!o.pmount });
    }
    (o.extraProj || []).forEach(function (xp, xi) {
      if (!(xp.px >= 0)) return;
      projs.push({ tag: xp.tag, px: xp.px, py: xp.py != null ? xp.py : W / 2, dist: xp.dist,
        col: xi === 0 ? (night ? '#57b586' : '#2e7d5b') : (night ? '#e09a3c' : '#c07a1e'),
        ceiling: xp.pos === 'ceiling' });
    });
    // stagger glyphs that would sit on top of each other
    var placed = [];
    projs.forEach(function (p) {
      var dx = Math.max(0.5, Math.min(L - 0.5, p.px));
      var dy = Math.max(0.9, Math.min(W - 0.9, p.py));
      placed.forEach(function (q) {
        if (Math.abs(dx - q.dx) < 1 && Math.abs(dy - q.dy) < 1) dy = Math.min(W - 0.9, q.dy + 1.2);
      });
      p.dx = dx; p.dy = dy; placed.push(p);
    });
    if (!svgMeasureCtx) svgMeasureCtx = document.createElement('canvas').getContext('2d');
    var mctx = svgMeasureCtx; mctx.font = '12px ' + getComputedStyle(document.body).fontFamily;
    // body boxes up front so throw labels can dodge neighboring bodies as well as labels
    var bodyBoxes = projs.map(function (p) {
      var bx = X(p.dx), by = Y(p.dy), bw2 = 1.2 * s, bh2 = 1.0 * s;
      return { x0: bx - bw2 / 2, x1: bx + bw2 / 2, y0: by - bh2 / 2, y1: by + bh2 / 2 };
    });
    var placedLabels = [];
    projs.forEach(function (p, pi) {
      var cx = X(p.dx), cy = Y(p.dy), bw = 1.2 * s, bh = 1.0 * s;
      var body = { x: (cx - bw / 2).toFixed(1), y: (cy - bh / 2).toFixed(1),
        width: bw.toFixed(1), height: bh.toFixed(1), rx: 4,
        fill: p.col, opacity: 0.92, stroke: ink, 'stroke-width': 1.5 };
      if (!p.ceiling) body['stroke-dasharray'] = '5 4'; // dashed = not ceiling-mounted
      el6('rect', body);
      // lens on the screen-facing edge
      el6('circle', { cx: (cx - bw / 2).toFixed(1), cy: cy.toFixed(1), r: 4,
        fill: night ? '#dbe2f0' : '#ffffff', stroke: ink, 'stroke-width': 1 });
      // mount point for ceiling mounts
      if (p.ceiling) el6('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 3.5, fill: night ? '#0e1320' : '#ffffff' });
      // throw label, bumped to a lower row when it would collide with a
      // neighbor's label or projector body
      var lab = p.tag + ' · ' + p.dist;
      var lw = mctx.measureText(lab).width;
      var lx0 = cx - lw / 2, lx1 = cx + lw / 2, ly = cy + bh / 2 + 17, tries = 0, clear = false;
      while (!clear && tries < 5) {
        clear = true;
        var ltop = ly - 12;
        var oi, ob;
        for (oi = 0; oi < placedLabels.length; oi++) {
          ob = placedLabels[oi];
          if (lx0 < ob.x1 + 6 && lx1 > ob.x0 - 6 && Math.abs(ly - ob.y) < 15) { clear = false; break; }
        }
        for (oi = 0; clear && oi < bodyBoxes.length; oi++) {
          if (oi === pi) continue;
          ob = bodyBoxes[oi];
          if (lx0 < ob.x1 + 4 && lx1 > ob.x0 - 4 && ltop < ob.y1 + 4 && ly > ob.y0 - 4) { clear = false; break; }
        }
        if (!clear) { ly += 18; tries++; }
      }
      tx6(cx, ly, lab, 12, 'middle', p.col);
      placedLabels.push({ x0: lx0, x1: lx1, y: ly });
    });
    // dimensions
    var dyL = Y(W) + 30;
    el6('line', { x1: X(0).toFixed(1), y1: dyL.toFixed(1), x2: X(L).toFixed(1), y2: dyL.toFixed(1), stroke: mut, 'stroke-width': 1 });
    el6('line', { x1: X(0).toFixed(1), y1: (dyL - 5).toFixed(1), x2: X(0).toFixed(1), y2: (dyL + 5).toFixed(1), stroke: mut, 'stroke-width': 1 });
    el6('line', { x1: X(L).toFixed(1), y1: (dyL - 5).toFixed(1), x2: X(L).toFixed(1), y2: (dyL + 5).toFixed(1), stroke: mut, 'stroke-width': 1 });
    tx6((X(0) + X(L)) / 2, dyL + 16, dispShort(L) + ' long', 11, 'middle', mut);
    var dxW = X(0) - 34;
    el6('line', { x1: dxW.toFixed(1), y1: Y(0).toFixed(1), x2: dxW.toFixed(1), y2: Y(W).toFixed(1), stroke: mut, 'stroke-width': 1 });
    var wt = tx6(dxW - 8, (Y(0) + Y(W)) / 2, dispShort(W) + ' wide', 11, 'middle', mut);
    wt.setAttribute('transform', 'rotate(-90 ' + (dxW - 8).toFixed(1) + ' ' + ((Y(0) + Y(W)) / 2).toFixed(1) + ')');
    watermark6();
  }
  function drawAll(o) { drawViz(o); drawSideViz(o); drawViewerViz(o); drawCeilingViz(o); if (advMode) { drawMountViz(o); drawDropViz(o); } }

  /* ---------- Mounting guidance: screen height + projector drop simulator ----------
     Screen: center it at seated eye level. Projector drop: with the screen placed,
     the lens must sit at screenCenter - shift*imageH; the pipe must put it there. */
  var eyeInput = document.getElementById('calc-eye-height');
  var pipeInput = document.getElementById('calc-pipe-drop');
  function eyeHeightIn() {
    var v = eyeInput ? parseFloat(eyeInput.value, 10) : NaN;
    if (!(v > 0)) v = unit === 'm' ? 107 : 42;
    return unit === 'm' ? v / 2.54 : v;
  }
  function pipeDropIn() {
    var v = pipeInput ? parseFloat(pipeInput.value, 10) : NaN;
    if (!(v > 0)) v = unit === 'm' ? 15 : 6;
    return unit === 'm' ? v / 2.54 : v;
  }
  function dispIn(inches) { return unit === 'm' ? fmt(inches * 2.54, 0) + ' cm' : fmt(inches, 0) + ' in'; }
  if (eyeInput) eyeInput.addEventListener('input', function () { recalc(); });
  var poleLenInput = document.getElementById('calc-pole-len');
  if (pipeInput) pipeInput.addEventListener('input', function () {
    if (poleLenInput && poleLenInput.value !== pipeInput.value) poleLenInput.value = pipeInput.value;
    recalc();
  });
  if (poleLenInput) {
    poleLenInput.value = pipeInput ? pipeInput.value : poleLenInput.value;
    poleLenInput.addEventListener('input', function () {
      if (pipeInput && pipeInput.value !== poleLenInput.value) pipeInput.value = poleLenInput.value;
      recalc();
    });
  }

  /* ---------- Ceiling mount type: flush mount vs pole mount ----------
     Shown under the projector-position chips when ceiling is picked. The pole
     length shares one value with the advanced mount-pipe input above. */
  var mountType = 'flush';
  try {
    var mtSaved = localStorage.getItem('calc-mounttype');
    if (mtSaved === 'pole' || mtSaved === 'flush') mountType = mtSaved;
  } catch (e) {}
  var mountTypeWrap = document.getElementById('calc-mounttype-wrap');
  var poleLenWrap = document.getElementById('calc-polelen-wrap');
  function syncMountTypeUI() {
    var isCeil = projPos === 'ceiling';
    if (mountTypeWrap) mountTypeWrap.hidden = !isCeil;
    document.querySelectorAll('#calc-mounttype .calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c.getAttribute('data-mt') === mountType);
    });
    if (poleLenWrap) poleLenWrap.hidden = !(isCeil && mountType === 'pole');
    try { localStorage.setItem('calc-mounttype', mountType); } catch (e2) {}
  }
  document.querySelectorAll('#calc-mounttype .calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      mountType = chip.getAttribute('data-mt');
      syncMountTypeUI();
      recalc();
    });
  });
  syncMountTypeUI();
  function mountAdvice(o, eyeIn) {
    var scrHIn = o.shFt * 12;
    var ceilKnown = !o.outdoor && o.H >= 0 && o.H > 0;
    var ceilFt = ceilKnown ? o.H : 9;
    var eyeClamped = Math.min(Math.max(eyeIn, 20), ceilFt * 12 - 12);
    var botGapIn = eyeClamped - scrHIn / 2;
    var placeable = botGapIn >= 0;
    var centerIn = placeable ? eyeClamped : scrHIn / 2; // too tall: bottom sits on the floor
    var topGapIn = ceilFt * 12 - (centerIn + scrHIn / 2);
    var warn = '';
    if (!placeable) warn = 'too tall for eye-level mounting: the bottom edge would sit ' + dispIn(-botGapIn) + ' below the floor — use a smaller screen';
    else if (botGapIn < 12) warn = 'bottom edge only ' + dispIn(botGapIn) + ' off the floor — tight for furniture';
    else if (topGapIn < 6) warn = 'top edge nearly touches the ceiling';
    return { scrHIn: scrHIn, ceilFt: ceilFt, ceilKnown: ceilKnown, eyeIn: eyeClamped,
      botGapIn: placeable ? botGapIn : 0, topGapIn: topGapIn, centerIn: centerIn,
      placeable: placeable, warn: warn };
  }
  function dropAdvice(o, ma, pipeIn, isFlush) {
    var sv = (o.sv && o.sv.length === 2) ? o.sv : [0, 0];
    var vHas = (sv[0] !== 0 || sv[1] !== 0);
    var imgHIn = ma.scrHIn, zcIn = ma.centerIn, ceilIn = ma.ceilFt * 12;
    var noModel = !o.r;
    var haveTxt = isFlush ? 'your flush mount' : 'your ' + dispIn(pipeIn) + ' pipe';
    if (noModel) return { vHas: false, noModel: true, text: 'Pick a projector model to simulate the mount drop.' };
    if (!vHas) {
      var needIn = ceilIn - zcIn;
      var ok = Math.abs(pipeIn - needIn) <= 1;
      return { vHas: false, noModel: false, needIn: needIn, ok: ok,
        text: ok ? 'Your ' + (isFlush ? 'flush mount' : dispIn(pipeIn) + ' pipe') + ' works — no lens shift, so the lens must sit level with the screen center.' :
          'No lens shift on this model: the lens must sit level with the screen center, so you need about ' + dispIn(needIn) + ' of drop — ' +
          (isFlush ? 'switch to a pole mount with about ' + dispIn(needIn) + ' of pipe.'
                   : (pipeIn < needIn ? 'add an extension tube.' : 'shorten the pipe.')) +
          ' Check the manufacture sheet for this model\u2019s fixed image offset.' };
    }
    var sMin = sv[0] / 100, sMax = sv[1] / 100;
    var zlHi = zcIn - sMin * imgHIn, zlLo = zcIn - sMax * imgHIn;
    var dMinIn = ceilIn - zlHi, dMaxIn = ceilIn - zlLo;
    var zlIn = ceilIn - pipeIn;
    var sNeed = (zcIn - zlIn) / imgHIn * 100;
    var span = Math.max(Math.abs(sv[0]), Math.abs(sv[1]));
    var ok2 = pipeIn >= dMinIn - 0.5 && pipeIn <= dMaxIn + 0.5;
    var text;
    if (!ok2 && pipeIn < dMinIn) text = 'Too short — with this screen position the lens needs at least ' + dispIn(dMinIn) + ' of drop (' + dispIn(dMinIn - pipeIn) + ' more than ' + haveTxt + '). ' + (isFlush ? 'Switch to a pole mount.' : 'Add an extension tube.');
    else if (!ok2) text = 'Too long — the most drop this shift range allows here is ' + dispIn(dMaxIn) + '. ' + (isFlush ? 'A flush mount hangs too low here — lower the screen and re-check.' : 'Shorten the pipe.');
    else {
      text = 'Your ' + (isFlush ? 'flush mount' : dispIn(pipeIn) + ' pipe') + ' works \u2014 it needs ' + fmt(Math.abs(sNeed), 0) + '% shift (range \u00B1' + fmt(span, 0) + '%).';
      if (Math.abs(sNeed) > 0.85 * span) text += ' That is near the shift limit \u2014 ' + (isFlush ? 'a pole mount would give you more headroom.' : 'a longer pipe would give you more headroom.');
    }
    return { vHas: true, noModel: false, dMinIn: dMinIn, dMaxIn: dMaxIn, zlIn: zlIn,
      zlLo: zlLo, zlHi: zlHi, sNeed: sNeed, span: span, ok: ok2, text: text };
  }

  function drawMountViz(o) {
    var svg4 = document.getElementById('calc-svg-mount');
    if (!svg4) return;
    while (svg4.firstChild) svg4.removeChild(svg4.firstChild);
    var VW = 660, VH = 380;
    var night = !sunOn && !lightsOn;
    var ink = night ? '#dbe2f0' : NAVY;
    var mut = night ? '#8a94a8' : MUTED;
    var scrFill = night ? '#bcd0ff' : (o.screenType === 'alr' ? '#878e99' : '#dbe7ff');
    var NS4 = 'http://www.w3.org/2000/svg';
    function el4(name, attrs) {
      var e = document.createElementNS(NS4, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg4.appendChild(e); return e;
    }
    function tx(x, y, str, size, anchor, fill) {
      var t = el4('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle',
        'font-size': size || 12, fill: fill || mut });
      t.textContent = str; return t;
    }
    function dimV(x, y1, y2, str) {
      el4('line', { x1: x.toFixed(1), y1: y1.toFixed(1), x2: x.toFixed(1), y2: y2.toFixed(1), stroke: mut, 'stroke-width': 1 });
      el4('line', { x1: (x - 5).toFixed(1), y1: y1.toFixed(1), x2: (x + 5).toFixed(1), y2: y1.toFixed(1), stroke: mut, 'stroke-width': 1 });
      el4('line', { x1: (x - 5).toFixed(1), y1: y2.toFixed(1), x2: (x + 5).toFixed(1), y2: y2.toFixed(1), stroke: mut, 'stroke-width': 1 });
      var mx = x - 9, my = (y1 + y2) / 2;
      var t = tx(mx, my, str, 12, 'middle', mut);
      t.setAttribute('transform', 'rotate(-90 ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')');
    }
    if (night) el4('rect', { x: 0, y: 0, width: VW, height: VH, fill: '#0e1320' });
    tx(VW - 12, VH - 10, 'BudgetProjectors.org', 13, 'end', mut).setAttribute('opacity', 0.55);
    var hasScreen = o.swFt > 0 && o.shFt > 0;
    if (!hasScreen) {
      tx(VW / 2, VH / 2 - 8, 'Pick a screen size above to see mounting guidance.', 15, 'middle', mut);
      return;
    }
    var eyeIn = eyeHeightIn();
    var ma = mountAdvice(o, eyeIn);
    var ceilIn = ma.ceilFt * 12, scrHIn = ma.scrHIn, scrWIn = o.swFt * 12;
    var warnLines = ma.warn ? wrapText(ma.warn, '12px Arial,sans-serif', 600, 2) : [];
    var cy = 64 + (warnLines.length > 1 ? 16 : 0), fy = 318 + (warnLines.length > 1 ? 16 : 0);
    var s = (fy - cy) / ceilIn;
    function Y(v) { return fy - v * s; }
    var wallL = 150, wallR = 510;
    el4('rect', { x: wallL, y: cy, width: wallR - wallL, height: fy - cy,
      fill: night ? '#141b2e' : '#f2f5fa', stroke: ink, 'stroke-width': 1.5 });
    // screen, true scale, centered on the wall
    var scrWpx = Math.min(scrWIn * s, wallR - wallL - 48);
    var scrHpx = Math.min(scrHIn, ceilIn - ma.botGapIn) * s;
    var sx = 330 - scrWpx / 2;
    var scrTopIn = ma.botGapIn + Math.min(scrHIn, ceilIn - ma.botGapIn);
    var scrTopY = Y(scrTopIn);
    el4('rect', { x: sx.toFixed(1), y: scrTopY.toFixed(1),
      width: scrWpx.toFixed(1), height: scrHpx.toFixed(1), fill: scrFill, stroke: ink, 'stroke-width': 2 });
    if (o.scrLabel) tx(330, scrTopY - 10, o.scrLabel, 12, 'middle', ink);
    // floor + ceiling
    el4('line', { x1: wallL - 24, y1: fy, x2: wallR + 24, y2: fy, stroke: ink, 'stroke-width': 3 });
    tx(wallR + 30, fy + 4, 'Floor', 12, 'start', mut);
    el4('line', { x1: wallL - 24, y1: cy, x2: wallR + 24, y2: cy, stroke: ink, 'stroke-width': 1.5 });
    tx(652, cy + 4, 'Ceiling ' + dispShort(ma.ceilFt) + (ma.ceilKnown ? '' : ' (assumed)'), 12, 'end', mut);
    // seated eye-level line through the screen center
    if (ma.placeable) {
      var ey = Y(ma.eyeIn);
      el4('line', { x1: wallL, y1: ey, x2: wallR, y2: ey, stroke: night ? '#7fd6a4' : '#2e7d5b',
        'stroke-width': 1.5, 'stroke-dasharray': '7 5' });
      tx(652, ey + 4, 'seated eye level ' + dispIn(ma.eyeIn), 12, 'end', night ? '#7fd6a4' : '#2e7d5b');
    }
    // dimensions: floor -> screen bottom, screen top -> ceiling
    var topIn = Math.min(ma.botGapIn + scrHIn, ceilIn);
    dimV(112, Y(ma.botGapIn), fy, dispIn(ma.botGapIn) + ' off floor');
    if (ceilIn - topIn > 0.5) dimV(548, cy, Y(topIn), dispIn(ceilIn - topIn) + ' to ceiling');
    tx(330, 30, 'Mount the screen with its center at seated eye level (' + dispIn(ma.eyeIn) + ')', 14, 'middle', ink);
    warnLines.forEach(function (ln, i) {
      tx(330, 50 + i * 15, ln, 12, 'middle', night ? '#ff9d8a' : '#c0392b');
    });
  }

  function drawDropViz(o) {
    var svg5 = document.getElementById('calc-svg-drop');
    if (!svg5) return;
    while (svg5.firstChild) svg5.removeChild(svg5.firstChild);
    var VW = 660, VH = 300;
    var night = !sunOn && !lightsOn;
    var ink = night ? '#dbe2f0' : NAVY;
    var mut = night ? '#8a94a8' : MUTED;
    var scrFill = night ? '#bcd0ff' : (o.screenType === 'alr' ? '#878e99' : '#dbe7ff');
    var NS5 = 'http://www.w3.org/2000/svg';
    function el5(name, attrs) {
      var e = document.createElementNS(NS5, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      svg5.appendChild(e); return e;
    }
    function tx(x, y, str, size, anchor, fill) {
      var t = el5('text', { x: x.toFixed(1), y: y.toFixed(1), 'text-anchor': anchor || 'middle',
        'font-size': size || 12, fill: fill || mut });
      t.textContent = str; return t;
    }
    if (night) el5('rect', { x: 0, y: 0, width: VW, height: VH, fill: '#0e1320' });
    tx(VW - 12, VH - 10, 'BudgetProjectors.org', 13, 'end', mut).setAttribute('opacity', 0.55);
    var hasScreen = o.swFt > 0 && o.shFt > 0;
    if (!hasScreen) {
      tx(VW / 2, VH / 2 - 8, 'Pick a screen size above to simulate the mount drop.', 15, 'middle', mut);
      return;
    }
    var eyeIn = eyeHeightIn(), pipeIn = pipeDropIn();
    var ma = mountAdvice(o, eyeIn);
    var isFlushDv = mountType !== 'pole';
    var da = dropAdvice(o, ma, isFlushDv ? 4 : pipeIn, isFlushDv);
    var ceilIn = ma.ceilFt * 12, scrHIn = ma.scrHIn;
    var vLines = wrapText(da.text, '12.5px Arial,sans-serif', 600, 3);
    var cy = 30 + vLines.length * 16, fy = 248;
    var s = (fy - cy) / ceilIn;
    function Y(v) { return fy - v * s; }
    var scrX = 120, lensX = 430;
    // ceiling + floor
    el5('line', { x1: 60, y1: cy, x2: 600, y2: cy, stroke: ink, 'stroke-width': 1.5 });
    tx(654, cy + 4, 'Ceiling ' + dispShort(ma.ceilFt) + (ma.ceilKnown ? '' : ' (assumed)'), 11, 'end', mut);
    el5('line', { x1: 60, y1: fy, x2: 600, y2: fy, stroke: ink, 'stroke-width': 3 });
    tx(54, fy + 4, 'Floor', 11, 'end', mut);
    // screen on the left wall at the mounting height
    var botIn = ma.botGapIn, topIn = Math.min(botIn + scrHIn, ceilIn);
    el5('rect', { x: scrX - 6, y: Y(topIn).toFixed(1), width: 12, height: (Y(botIn) - Y(topIn)).toFixed(1),
      fill: scrFill, stroke: ink, 'stroke-width': 2 });
    tx(scrX - 6, Y(topIn) - 8, 'Screen', 11, 'end', mut);
    if (da.noModel) {
      tx(330, 24, 'Ceiling-mount drop simulator — ' + da.text, 13, 'middle', mut);
      return;
    }
    var zlIn = da.vHas ? da.zlIn : ceilIn - da.needIn;
    // shift-range band on the pole, clamped so it never drops below the floor
    if (da.vHas) {
      var bandTop = Math.min(da.zlHi, ceilIn), bandBot = Math.max(da.zlLo, 0);
      if (bandBot < bandTop) {
        el5('rect', { x: lensX - 5, y: Y(bandTop).toFixed(1), width: 10,
          height: Math.max(2, Y(bandBot) - Y(bandTop)).toFixed(1),
          fill: night ? '#1d3a2a' : '#d9efe2', stroke: night ? '#7fd6a4' : '#2e7d5b', 'stroke-width': 1 });
        tx(lensX + 14, (Y(bandTop) + Y(bandBot)) / 2 + 4, 'lens shift range', 11, 'start', night ? '#7fd6a4' : '#2e7d5b');
      }
    }
    // pole + projector body at the pipe drop
    el5('line', { x1: lensX, y1: cy, x2: lensX, y2: Y(zlIn).toFixed(1), stroke: ink, 'stroke-width': 3 });
    el5('rect', { x: lensX - 22, y: Y(zlIn) - 7, width: 44, height: 15, rx: 3, fill: ink });
    el5('circle', { cx: lensX, cy: Y(zlIn) + 1, r: 3.5, fill: night ? '#0e1320' : '#ffffff' });
    tx(lensX, Y(zlIn) + 30, isFlushDv ? 'your flush mount: about 4 in' : 'your pipe: ' + dispIn(pipeIn), 12, 'middle', ink);
    // beam: lens -> screen top/bottom
    el5('line', { x1: lensX, y1: Y(zlIn).toFixed(1), x2: scrX, y2: Y(topIn).toFixed(1),
      stroke: mut, 'stroke-width': 1.2, 'stroke-dasharray': '6 4' });
    el5('line', { x1: lensX, y1: Y(zlIn).toFixed(1), x2: scrX, y2: Y(botIn).toFixed(1),
      stroke: mut, 'stroke-width': 1.2, 'stroke-dasharray': '6 4' });
    var col = da.ok ? (night ? '#7fd6a4' : '#2e7d5b') : (night ? '#ff9d8a' : '#c0392b');
    vLines.forEach(function (ln, i) { tx(330, 30 + i * 16, ln, 12.5, 'middle', col); });
  }

  // init
  var savedMode = 'basic';
  try { savedMode = localStorage.getItem('calc-mode') || 'basic'; } catch (e) {}
  setUnit(unit, false);
  setRoom('living');
  setAdvMode(savedMode === 'advanced');
  applyShareHash();
})();
