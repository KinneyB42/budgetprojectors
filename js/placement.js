/* Budget Projectors, projector placement calculator (vanilla JS).
   Shows where a projector's image lands from a real placement, whether the
   model's published lens shift can square it, and whether keystone is needed.
   Model data from js/throw-data.js (window.THROW_DATA).
   16:9 screen math: width = diagonal * 0.8716, height = diagonal * 0.4903. */
(function () {
  'use strict';

  var THROW = window.THROW_DATA || [];

  var modelInput = document.getElementById('place-model');
  if (!modelInput) return;
  var suggest = document.getElementById('place-suggest');
  var selectedLine = document.getElementById('place-selected');
  var countEl = document.getElementById('place-model-count');
  var presetChips = document.querySelectorAll('#place-presets .place-chip');
  var aimChips = document.querySelectorAll('#place-aims .place-chip');
  var resultEl = document.getElementById('place-result');
  var detailsEl = document.getElementById('place-details');
  var topSvg = document.getElementById('place-top');
  var frontSvg = document.getElementById('place-front');
  var sideSvg = document.getElementById('place-side');
  var zoomSlider = document.getElementById('place-zoom');
  var zoomVal = document.getElementById('place-zoom-val');
  var zoomNote = document.getElementById('place-zoom-note');
  var shiftHSlider = document.getElementById('place-shifth');
  var shiftVSlider = document.getElementById('place-shiftv');
  var shiftHVal = document.getElementById('place-shifth-val');
  var shiftVVal = document.getElementById('place-shiftv-val');
  var shiftHMin = document.getElementById('place-shifth-min');
  var shiftHMax = document.getElementById('place-shifth-max');
  var shiftVMin = document.getElementById('place-shiftv-min');
  var shiftVMax = document.getElementById('place-shiftv-max');
  var shiftNote = document.getElementById('place-shift-note');
  var centerBtn = document.getElementById('place-center');
  var tuneReadout = document.getElementById('place-tune-readout');

  var SLIDERS = {
    dist: document.getElementById('place-dist'),
    size: document.getElementById('place-size'),
    offset: document.getElementById('place-offset'),
    height: document.getElementById('place-height'),
    screenBottom: document.getElementById('place-screenbottom')
  };
  var VALS = {
    dist: document.getElementById('place-dist-val'),
    size: document.getElementById('place-size-val'),
    offset: document.getElementById('place-offset-val'),
    height: document.getElementById('place-height-val'),
    screenBottom: document.getElementById('place-screenbottom-val')
  };

  var PRESETS = {
    centered:    { dist: 12,   offset: 0,  height: 48 },
    couch_side:  { dist: 10.5, offset: 30, height: 24 },
    couch_behind:{ dist: 16,   offset: 0,  height: 66 },
    ceiling:     { dist: 12,   offset: 0,  height: 90 },
    corner:      { dist: 13,   offset: 44, height: 30 },
    floor:       { dist: 9,    offset: 0,  height: 8 },
    coffee:      { dist: 8,    offset: 6,  height: 18 }
  };

  var state = {
    entry: null,
    aim: 'straight',
    dist: 10.5,
    size: 100,
    offset: 30,
    height: 24,
    screenBottom: 24,
    shiftH: 0,
    shiftV: 0
  };

  /* ---------- Formatting helpers ---------- */
  function f0(n) { return Math.round(n).toString(); }
  function f1(n) { return n.toFixed(1); }
  function trim2(n) { return n.toFixed(2).replace(/\.?0+$/, ''); }
  function ratioLabel(t) {
    if (t[0] === t[1]) return trim2(t[0]) + ':1';
    return trim2(t[0]) + '–' + trim2(t[1]) + ':1';
  }
  function pct(n) {
    var v = (n % 1 === 0) ? n.toFixed(0) : n.toFixed(1);
    return v + '%';
  }
  function pctRange(r) {
    var hi = r[1] > 0 ? '+' + pct(r[1]) : pct(r[1]);
    return pct(r[0]) + ' to ' + hi;
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- Model data helpers ---------- */
  function displayName(e) { return e.b + ' ' + e.m; }

  function throwRange(e) {
    if (e.l && e.l.length) {
      var mn = Infinity, mx = -Infinity, i;
      for (i = 0; i < e.l.length; i++) {
        if (e.l[i][1] < mn) mn = e.l[i][1];
        if (e.l[i][2] > mx) mx = e.l[i][2];
      }
      return { tmin: mn, tmax: mx, lenses: true, count: e.l.length };
    }
    return { tmin: e.t[0], tmax: e.t[1], lenses: false, count: 0 };
  }

  function shiftInfo(e) {
    return {
      has: !!(e.sv || e.sh),
      sv: e.sv || [0, 0],
      sh: e.sh || [0, 0]
    };
  }

  /* ---------- Model picker (mirrors the throw calculator on distance-guide) ---------- */
  function refreshSelectedLine() {
    if (!state.entry) { selectedLine.hidden = true; return; }
    var e = state.entry, r = throwRange(e), s = shiftInfo(e);
    var txt = displayName(e) + ' · throw ' + ratioLabel([r.tmin, r.tmax]);
    if (e.lm) txt += ' · ' + e.lm.toLocaleString('en-US') + ' lumens';
    if (r.lenses) txt += ' · ' + r.count + ' lenses';
    if (s.has) txt += ' · lens shift: vertical ' + pctRange(s.sv) + ', horizontal ' + pctRange(s.sh);
    else txt += ' · no lens shift data published';
    selectedLine.textContent = txt;
    selectedLine.hidden = false;
  }

  function chooseModel(entry) {
    state.entry = entry;
    modelInput.value = displayName(entry);
    suggest.hidden = true;
    suggest.innerHTML = '';
    modelInput.setAttribute('aria-expanded', 'false');
    state.shiftH = 0;
    state.shiftV = 0;
    refreshSelectedLine();
    recalc();
  }

  function renderSuggest(q) {
    if (q.length < 2) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    var matches = THROW.filter(function (x) {
      return displayName(x).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 20);
    if (!matches.length) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    suggest.innerHTML = '';
    matches.forEach(function (x) {
      var r = throwRange(x);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('role', 'option');
      var brand = document.createElement('span');
      brand.className = 'calc__suggest-brand';
      brand.textContent = x.b;
      btn.appendChild(brand);
      btn.appendChild(document.createTextNode(
        x.m + ' · ' + ratioLabel([r.tmin, r.tmax]) + (r.lenses ? ' · ' + r.count + ' lenses' : '')
      ));
      btn.addEventListener('click', function () { chooseModel(x); });
      suggest.appendChild(btn);
    });
    suggest.hidden = false;
    modelInput.setAttribute('aria-expanded', 'true');
  }

  modelInput.addEventListener('input', function () {
    state.entry = null;
    refreshSelectedLine();
    renderSuggest(modelInput.value.trim().toLowerCase());
    recalc();
  });
  modelInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape') { suggest.hidden = true; }
  });
  document.addEventListener('click', function (ev) {
    if (!suggest.hidden && !suggest.contains(ev.target) && ev.target !== modelInput) {
      suggest.hidden = true;
    }
  });

  /* ---------- Controls ---------- */
  function syncVals() {
    VALS.dist.textContent = f1(state.dist) + ' ft';
    VALS.size.textContent = f0(state.size) + ' in';
    VALS.offset.textContent = f0(state.offset) + ' in';
    VALS.height.textContent = f0(state.height) + ' in';
    VALS.screenBottom.textContent = f0(state.screenBottom) + ' in';
  }
  function syncSliders() {
    SLIDERS.dist.value = state.dist;
    SLIDERS.size.value = state.size;
    SLIDERS.offset.value = state.offset;
    SLIDERS.height.value = state.height;
    SLIDERS.screenBottom.value = state.screenBottom;
  }

  function clearPresetChips() {
    presetChips.forEach(function (b) { b.classList.remove('active'); });
  }

  Object.keys(SLIDERS).forEach(function (key) {
    SLIDERS[key].addEventListener('input', function () {
      state[key] = parseFloat(this.value);
      clearPresetChips();
      syncVals();
      recalc();
    });
  });

  presetChips.forEach(function (btn) {
    btn.addEventListener('click', function () {
      presetChips.forEach(function (b) { b.classList.toggle('active', b === btn); });
      var p = PRESETS[btn.getAttribute('data-preset')];
      if (p) {
        state.dist = p.dist;
        state.offset = p.offset;
        state.height = p.height;
        syncSliders();
        syncVals();
      }
      recalc();
    });
  });

  aimChips.forEach(function (btn) {
    btn.addEventListener('click', function () {
      aimChips.forEach(function (b) { b.classList.toggle('active', b === btn); });
      state.aim = btn.getAttribute('data-aim');
      recalc();
    });
  });

  /* ---------- Zoom and lens shift controls (step 3) ---------- */
  zoomSlider.addEventListener('input', function () {
    state.size = parseFloat(this.value);
    SLIDERS.size.value = state.size;
    syncVals();
    recalc();
  });
  shiftHSlider.addEventListener('input', function () {
    state.shiftH = parseFloat(this.value);
    syncShiftVals();
    recalc();
  });
  shiftVSlider.addEventListener('input', function () {
    state.shiftV = parseFloat(this.value);
    syncShiftVals();
    recalc();
  });
  centerBtn.addEventListener('click', function () {
    var e = state.entry;
    if (!e) return;
    var W = state.size * 0.8716, H = state.size * 0.4903;
    var dv = state.height - (state.screenBottom + H / 2);
    state.shiftH = e.sh ? clamp(-state.offset / W * 100, e.sh[0], e.sh[1]) : 0;
    state.shiftV = e.sv ? clamp(-dv / H * 100, e.sv[0], e.sv[1]) : 0;
    syncShiftVals();
    recalc();
  });

  /* ---------- Views ---------- */
  var NAVY = '#0c2244', MUTED = '#5c5c5c', PANEL = '#f6f3ec';
  var BEAM_FILL = 'rgba(37,99,235,0.16)', BEAM_STROKE = 'rgba(37,99,235,0.55)';
  var IMG_FILL = 'rgba(37,99,235,0.20)', IMG_STROKE = 'rgba(37,99,235,0.6)';
  var TIER_COLORS = { ok: '#2e7d5b', warn: '#b8860b', bad: '#c0392b' };

  /* ---------- Step 3 control sync ---------- */
  function signedPct(v) { return (v > 0 ? '+' : '') + f0(v) + '%'; }

  function syncShiftVals() {
    var e = state.entry;
    shiftHVal.textContent = !e ? '' : (e.sh ? signedPct(state.shiftH) : 'none');
    shiftVVal.textContent = !e ? '' : (e.sv ? signedPct(state.shiftV) : 'none');
  }

  function setupAxis(slider, minEl, maxEl, range, cur) {
    if (!range) {
      slider.disabled = true;
      slider.min = -50; slider.max = 50; slider.value = 0;
      minEl.textContent = ''; maxEl.textContent = '';
      return;
    }
    slider.disabled = false;
    slider.min = range[0]; slider.max = range[1];
    slider.value = clamp(cur, range[0], range[1]);
    minEl.textContent = pct(range[0]);
    maxEl.textContent = pct(range[1]);
  }

  function syncTune(sizeMin, sizeMax, r) {
    var e = state.entry;
    if (!e) {
      zoomSlider.disabled = true; zoomVal.textContent = '';
      zoomNote.textContent = 'Pick a model above and this slider uses its real zoom range.';
      shiftHSlider.disabled = true; shiftVSlider.disabled = true;
      shiftHVal.textContent = ''; shiftVVal.textContent = '';
      shiftHMin.textContent = ''; shiftHMax.textContent = '';
      shiftVMin.textContent = ''; shiftVMax.textContent = '';
      shiftNote.textContent = 'Pick a model above and these sliders use its published lens shift range.';
      centerBtn.disabled = true;
      return;
    }
    var lo = Math.floor(sizeMin), hi = Math.ceil(sizeMax);
    if (hi <= lo) hi = lo + 1;
    zoomSlider.min = lo; zoomSlider.max = hi;
    zoomSlider.value = clamp(state.size, lo, hi);
    zoomVal.textContent = f0(parseFloat(zoomSlider.value)) + ' in picture';
    if (r.tmax - r.tmin < 1e-9) {
      zoomSlider.disabled = true;
      zoomVal.textContent = f0(sizeMin) + ' in picture';
      zoomNote.textContent = 'Fixed lens: this model has no optical zoom. From here it throws a ' + f0(sizeMin) + ' inch picture; move it closer or farther to change the size.';
    } else {
      zoomSlider.disabled = false;
      zoomNote.textContent = 'From ' + f1(state.dist) + ' ft, this model throws a ' + f0(sizeMin) + ' to ' + f0(sizeMax) + ' inch picture.';
    }
    if (e.sh) state.shiftH = clamp(state.shiftH, e.sh[0], e.sh[1]); else state.shiftH = 0;
    if (e.sv) state.shiftV = clamp(state.shiftV, e.sv[0], e.sv[1]); else state.shiftV = 0;
    setupAxis(shiftHSlider, shiftHMin, shiftHMax, e.sh, state.shiftH);
    setupAxis(shiftVSlider, shiftVMin, shiftVMax, e.sv, state.shiftV);
    syncShiftVals();
    var parts = [];
    if (e.sv) parts.push('vertical ' + pctRange(e.sv));
    if (e.sh) parts.push('horizontal ' + pctRange(e.sh));
    centerBtn.disabled = !parts.length;
    shiftNote.textContent = parts.length
      ? 'Published lens shift for this model: ' + parts.join(', ') + '. The sliders stop at those limits.'
      : 'No lens shift data published for this model, so these sliders are off and the check below assumes no lens shift.';
  }

  /* ---------- Room views ---------- */
  function drawSide(g) {
    if (!sideSvg) return;
    var wallX = 56, floorY = 252, ceilY = 36;
    var sx = 514 / 300, syv = (floorY - ceilY) / 108;
    function Y(h) { return floorY - h * syv; }
    var distIn = state.dist * 12;
    var px = wallX + distIn * sx;
    var lensY = Y(state.height);
    var imgHpx = g.H * syv;
    var centerIn = state.aim === 'turned'
      ? state.screenBottom + g.H / 2 + state.shiftV / 100 * g.H
      : state.height + state.shiftV / 100 * g.H;
    var imgCY = Y(centerIn);
    var imgTop = imgCY - imgHpx / 2, imgBot = imgCY + imgHpx / 2;
    var scrTop = Y(state.screenBottom + g.H), scrBot = Y(state.screenBottom);
    var out = '';
    out += '<rect x="' + wallX + '" y="' + ceilY + '" width="' + (640 - wallX - 8) + '" height="' + (floorY - ceilY) + '" fill="#fbf9f4" stroke="' + MUTED + '" stroke-width="1"/>';
    out += '<polygon points="' + f1(px - 18) + ',' + f1(lensY) + ' ' + wallX + ',' + f1(imgTop) + ' ' + wallX + ',' + f1(imgBot) + '" fill="' + BEAM_FILL + '" stroke="' + BEAM_STROKE + '" stroke-width="1"/>';
    out += '<rect x="' + (wallX - 7) + '" y="' + f1(scrTop) + '" width="7" height="' + f1(scrBot - scrTop) + '" fill="' + NAVY + '"/>';
    out += '<rect x="' + (wallX - 14) + '" y="' + f1(imgTop) + '" width="5" height="' + f1(imgHpx) + '" fill="' + IMG_STROKE + '"/>';
    if (distIn >= 96) {
      var cxp = wallX + distIn * 0.45 * sx;
      out += '<rect x="' + f1(cxp - 26) + '" y="' + (floorY - 26) + '" width="52" height="26" rx="4" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>' +
             '<rect x="' + f1(cxp + 12) + '" y="' + (floorY - 50) + '" width="14" height="50" rx="4" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>';
    }
    if (state.height >= 84) {
      out += '<line x1="' + f1(px) + '" y1="' + ceilY + '" x2="' + f1(px) + '" y2="' + f1(lensY - 10) + '" stroke="' + NAVY + '" stroke-width="3"/>';
    } else if (state.height > 12) {
      out += '<rect x="' + f1(px - 22) + '" y="' + f1(lensY + 9) + '" width="44" height="' + f1(floorY - lensY - 9) + '" fill="#e7e2d6" stroke="' + MUTED + '" stroke-width="1"/>';
    }
    out += '<rect x="' + f1(px - 18) + '" y="' + f1(lensY - 9) + '" width="36" height="18" rx="3" fill="' + NAVY + '"/>' +
           '<circle cx="' + f1(px - 18) + '" cy="' + f1(lensY) + '" r="4.5" fill="#ffffff" stroke="' + NAVY + '" stroke-width="1.5"/>';
    out += '<text x="' + wallX + '" y="' + (floorY + 24) + '" font-size="11" fill="' + MUTED + '">SCREEN WALL</text>';
    out += '<text x="' + f1(px) + '" y="' + (floorY + 24) + '" font-size="11" fill="' + MUTED + '" text-anchor="middle">PROJECTOR · ' + f1(state.dist) + ' ft back · lens ' + f0(state.height) + ' in high</text>';
    sideSvg.innerHTML = out;
  }

  function drawViews(g, correctedMode, tier) {
    var W = g.W, H = g.H;
    /* Top view */
    var ox = clamp(state.offset / W * 104, -112, 112);
    var px = 160 + ox, py = 148;
    var beam;
    if (state.aim === 'straight') {
      beam = '<polygon points="' + px + ',' + py + ' ' + (px - 80) + ',22 ' + (px + 80) + ',22" fill="' + BEAM_FILL + '" stroke="' + BEAM_STROKE + '" stroke-width="1"/>';
    } else {
      beam = '<polygon points="' + px + ',' + py + ' 82,22 238,22" fill="' + BEAM_FILL + '" stroke="' + BEAM_STROKE + '" stroke-width="1"/>';
    }
    topSvg.innerHTML =
      '<line x1="160" y1="14" x2="160" y2="160" stroke="' + MUTED + '" stroke-dasharray="4 4" stroke-width="1"/>' +
      beam +
      '<line x1="62" y1="22" x2="258" y2="22" stroke="' + NAVY + '" stroke-width="4"/>' +
      '<rect x="102" y="112" width="116" height="24" rx="4" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>' +
      '<rect x="' + (px - 8) + '" y="' + (py - 6) + '" width="16" height="12" rx="2" fill="' + NAVY + '"/>' +
      '<circle cx="' + px + '" cy="' + (py - 7) + '" r="2.6" fill="#ffffff" stroke="' + NAVY + '" stroke-width="1"/>' +
      '<text x="160" y="10" font-size="10" fill="' + MUTED + '" text-anchor="middle">SCREEN WALL</text>' +
      '<text x="160" y="128" font-size="9" fill="' + MUTED + '" text-anchor="middle">COUCH</text>' +
      '<text x="' + px + '" y="166" font-size="10" fill="' + MUTED + '" text-anchor="middle">PROJECTOR</text>';

    /* Front view */
    var sx = 70, sy = 28, sw = 180, sh = 124, cx = 160, cy = 90;
    var landed = '', corrected = '';
    if (state.aim === 'straight') {
      var dxpx = clamp((state.offset + state.shiftH / 100 * W) * (sw / W), -170, 170);
      var dypx = clamp(-(g.dv + state.shiftV / 100 * H) * (sh / H), -70, 70);
      landed = '<rect x="' + (sx + dxpx) + '" y="' + (sy + dypx) + '" width="' + sw + '" height="' + sh + '" fill="' + IMG_FILL + '" stroke="' + IMG_STROKE + '" stroke-width="1.5"/>';
    } else {
      var sk = clamp(g.yaw * 0.6, 0, 18);
      var pk = clamp(g.pitch * 0.5, 0, 14);
      var topW = sw * (1 + (g.dv < 0 ? pk : -pk) / 100);
      var botW = sw * (1 + (g.dv < 0 ? -pk : pk) / 100);
      var tx = state.shiftH / 100 * sw, ty = -state.shiftV / 100 * sh;
      landed = '<polygon points="' +
        (cx - topW / 2 + tx) + ',' + (sy - sk / 2 + ty) + ' ' +
        (cx + topW / 2 + tx) + ',' + (sy + sk / 2 + ty) + ' ' +
        (cx + botW / 2 + tx) + ',' + (sy + sh + sk / 2 + ty) + ' ' +
        (cx - botW / 2 + tx) + ',' + (sy + sh - sk / 2 + ty) +
        '" fill="' + IMG_FILL + '" stroke="' + IMG_STROKE + '" stroke-width="1.5"/>';
    }
    if (correctedMode === 'screen') {
      corrected = '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="none" stroke="' + TIER_COLORS[tier] + '" stroke-width="2" stroke-dasharray="6 4"/>';
    } else if (correctedMode === 'keystone') {
      var cf = Math.cos(g.maxAngle * Math.PI / 180), cw = sw * cf, ch = sh * cf;
      corrected = '<rect x="' + (cx - cw / 2) + '" y="' + (cy - ch / 2) + '" width="' + cw + '" height="' + ch + '" fill="none" stroke="' + TIER_COLORS[tier] + '" stroke-width="2" stroke-dasharray="6 4"/>';
    }
    frontSvg.innerHTML =
      '<rect x="0" y="0" width="320" height="152" fill="#fbf9f4"/>' +
      '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="' + PANEL + '" stroke="' + NAVY + '" stroke-width="2"/>' +
      landed + corrected +
      '<rect x="0" y="152" width="320" height="38" fill="#e9e4d8"/>' +
      '<line x1="0" y1="152" x2="320" y2="152" stroke="' + MUTED + '" stroke-width="1"/>' +
      '<rect x="104" y="160" width="112" height="26" rx="6" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>' +
      '<rect x="96" y="156" width="14" height="30" rx="4" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>' +
      '<rect x="210" y="156" width="14" height="30" rx="4" fill="#ddd5c2" stroke="' + MUTED + '" stroke-width="1"/>';

    drawSide(g);
  }

  /* ---------- Engine ---------- */
  function recalc() {
    var distIn = state.dist * 12;
    var W = state.size * 0.8716, H = state.size * 0.4903;
    var centerH = state.screenBottom + H / 2;
    var dv = state.height - centerH; /* + = lens above screen center */
    var yaw = Math.atan2(state.offset, distIn) * 180 / Math.PI;
    var pitch = Math.atan2(Math.abs(dv), distIn) * 180 / Math.PI;
    var g = { W: W, H: H, dv: dv, yaw: yaw, pitch: pitch, maxAngle: Math.max(yaw, pitch) };

    if (!state.entry) {
      resultEl.innerHTML = '<strong>Pick your projector to see where the image lands.</strong>' +
        '<span>Search the database above, then set the placement. The verdict updates as you drag.</span>';
      detailsEl.innerHTML = '';
      syncTune(0, 0, null);
      tuneReadout.textContent = '';
      drawViews(g, null, 'ok');
      return;
    }

    var e = state.entry, name = displayName(e);
    var r = throwRange(e), s = shiftInfo(e);
    var reqThrow = distIn / W;
    var sizeMin = (distIn / r.tmax) / 0.8716;
    var sizeMax = (distIn / r.tmin) / 0.8716;
    var sizeOK = reqThrow >= r.tmin - 1e-9 && reqThrow <= r.tmax + 1e-9;
    var reqH = state.offset / W * 100;
    var reqV = Math.abs(dv) / H * 100;
    /* Direction-aware shift capacity: up uses the positive extent of sv,
       down the negative extent; sideways the larger absolute extent of sh. */
    var capH = Math.max(Math.abs(s.sh[0]), Math.abs(s.sh[1]));
    var capV = dv > 0 ? Math.abs(Math.min(s.sv[0], 0)) : Math.max(s.sv[1], 0);
    var coversH = reqH <= capH + 1e-9;
    var coversV = reqV <= capV + 1e-9;
    var cap = (e.b === 'XGIMI') ? 40 : 30;
    var capNote = (e.b === 'XGIMI')
      ? 'XGIMI publishes a 40° side throw limit for auto keystone'
      : 'a typical digital keystone range (estimate)';
    var correctedSize = state.size * Math.cos(g.maxAngle * Math.PI / 180);

    var tier, chip, headline, lines = [], correctedMode = null;

    if (!sizeOK) {
      tier = 'bad'; chip = "Won't work";
      headline = "Outside this projector's limitations";
      lines.push('From ' + f1(state.dist) + ' ft, the ' + esc(name) + ' throws a ' + f0(sizeMin) + ' to ' + f0(sizeMax) +
        ' inch image. Your ' + f0(state.size) + ' inch screen needs a ' + trim2(reqThrow) + ':1 throw ratio, and this model covers ' +
        ratioLabel([r.tmin, r.tmax]) + '.');
      lines.push(reqThrow > r.tmax
        ? 'Move the projector closer, go with a bigger screen, or pick a longer throw model.'
        : 'Move the projector farther back, go with a smaller screen, or pick a shorter throw model.');
    } else if (state.aim === 'straight') {
      var landH = state.offset === 0 ? 'dead center left to right' : f0(state.offset) + ' in to the side of screen center';
      var landV = Math.abs(dv) < 0.5 ? 'level with screen center'
        : f0(Math.abs(dv)) + ' in ' + (dv > 0 ? 'above' : 'below') + ' screen center';
      var landingLine = 'Pointing straight ahead, the image lands ' + landH + ' and ' + landV +
        '. The picture goes where the lens points, not where you wish it pointed.';
      var hangLine = null;
      if (state.offset > 0 && state.offset < W) {
        hangLine = 'About ' + f0(state.offset) + ' in of the image hangs off the side of the screen, and the same amount of screen sits empty on the other side.';
      }
      if (state.offset >= W) {
        tier = 'bad'; chip = "Won't work";
        headline = "Outside this projector's limitations";
        lines.push(landingLine);
        lines.push('Pointing straight, the image misses the screen entirely from this far sideways.');
        lines.push(g.maxAngle <= cap
          ? 'Turning the projector to face the screen and using keystone (about ' + f1(g.maxAngle) + '°) is the only way this spot works, and the corrected image shrinks to about ' + f0(correctedSize) + ' inches.'
          : 'Even turned toward the screen, it would need about ' + f1(g.maxAngle) + '° of correction, beyond ' + capNote + ' (' + cap + '°).');
        if (g.maxAngle <= cap) correctedMode = 'keystone';
      } else if (coversH && coversV) {
        tier = 'ok'; chip = 'Works';
        headline = 'Works pointing straight — lens shift pulls it onto the screen';
        lines.push(landingLine);
        if (hangLine) lines.push(hangLine);
        lines.push('This model&rsquo;s lens shift covers the landing spot: it needs ' + f0(reqH) + '% horizontal and ' + f0(reqV) +
          '% vertical shift, and the model offers ' + f0(capH) + '% sideways and ' + f0(capV) +
          '% in the direction needed. No turning, no keystone, no quality loss.');
        correctedMode = 'screen';
      } else if (g.maxAngle <= cap) {
        tier = 'warn'; chip = 'Keystone needed';
        headline = 'Pointing straight will not cover it — you need to turn it and use keystone';
        lines.push(landingLine);
        if (hangLine) lines.push(hangLine);
        lines.push('Lens shift cannot fully recenter this landing spot: it needs ' + f0(reqH) + '% horizontal and ' + f0(reqV) +
          '% vertical, and the model offers ' + f0(capH) + '% and ' + f0(capV) +
          '% in the directions needed. Turning the projector to face the screen centers the image but tilts the beam, so keystone of about ' +
          f1(g.maxAngle) + '° squares it again.');
        lines.push('Cost of keystone: the corrected image shrinks to about ' + f0(correctedSize) +
          ' inches, with some sharpness lost on the compressed side.');
        correctedMode = 'keystone';
      } else {
        tier = 'bad'; chip = "Won't work";
        headline = "Outside this projector's limitations";
        lines.push(landingLine);
        lines.push('Lens shift cannot recenter this landing spot, and turning the projector to face the screen would need about ' +
          f1(g.maxAngle) + '° of keystone, beyond ' + capNote + ' (' + cap + '°).');
        lines.push('Move the projector closer to the screen&rsquo;s center line, or pick a model with more lens shift.');
      }
    } else { /* turned */
      if (g.maxAngle < 1) {
        tier = 'ok'; chip = 'Works';
        headline = 'Works from this spot, no keystone needed';
        lines.push('The projector sits basically square to the screen from here, so the image lands as a clean rectangle.');
        correctedMode = 'screen';
      } else if (g.maxAngle <= cap) {
        tier = 'warn'; chip = 'Keystone needed';
        headline = 'You need keystone to make this work';
        lines.push('Turned to face the screen from this spot, the beam arrives at an angle: about ' + f1(yaw) +
          '° sideways and ' + f1(pitch) + '° vertical. The image lands as the trapezoid in blue, and digital keystone squares it to the dashed outline.');
        lines.push('Cost: the corrected image shrinks to about ' + f0(correctedSize) +
          ' inches, and you give up some sharpness and resolution on the compressed side. Lens shift can fine tune the position, but it does not fix a trapezoid.');
        correctedMode = 'keystone';
      } else {
        tier = 'bad'; chip = "Won't work";
        headline = "Outside this projector's limitations";
        lines.push('Facing the screen from here puts the beam about ' + f1(g.maxAngle) + '° off square, beyond ' +
          capNote + ' (' + cap + '°). Keystone cannot square an image from this far off line.');
        lines.push('Move the projector closer to the screen&rsquo;s center line, or pick a model with more correction range.');
      }
    }

    var chipCls = tier === 'ok' ? 'v-ok' : (tier === 'warn' ? 'v-warn' : 'v-bad');
    var html = '<div class="calc__verdicts"><span class="calc__verdict ' + chipCls + '">' + chip + '</span></div>' +
      '<strong>' + esc(headline) + '</strong>';
    lines.forEach(function (l) {
      html += '<span style="display:block;margin-top:4px">' + l + '</span>';
    });
    resultEl.innerHTML = html;

    /* ---------- Details block ---------- */
    var d = [];
    d.push('Image size range at ' + f1(state.dist) + ' ft: ' + f0(sizeMin) + ' to ' + f0(sizeMax) +
      ' inches diagonal. This setup needs a ' + trim2(reqThrow) + ':1 throw ratio; the ' + esc(name) +
      ' covers ' + ratioLabel([r.tmin, r.tmax]) + '.');
    if (r.lenses) {
      d.push('This model takes interchangeable lenses, so the throw range used here is the range across available lenses. The lens actually installed narrows it.');
    }
    if (state.aim === 'straight') {
      d.push('Landing spot, pointing straight: image center lands ' + f0(state.offset) + ' in to the side of screen center, ' +
        f0(Math.abs(dv)) + ' in ' + (dv > 0.5 ? 'above' : (dv < -0.5 ? 'below' : 'level with')) + ' screen center.');
    } else {
      d.push('Beam angle, turned to screen: ' + f1(yaw) + '° sideways, ' + f1(pitch) + '° vertical.');
    }
    if (s.has) {
      d.push('Lens shift needed: ' + f0(reqH) + '% horizontal, ' + f0(reqV) + '% vertical. Published range: vertical ' +
        pctRange(s.sv) + ', horizontal ' + pctRange(s.sh) + '.');
    } else {
      d.push('No lens shift data published for this model, so this check assumes no lens shift.');
    }
    if (r.tmax <= 0.45) {
      d.push('This is an ultra short throw model: it sits just below the screen rather than across the room. Its exact image heights by screen size are in the UST section of the <a href="distance-guide.html">Distance Guide</a>.');
    }
    if (state.height >= 84) {
      d.push('Ceiling mounted, the projector hangs inverted and its image is thrown downward from near the ceiling; the landing and shift math above runs from that height.');
    }
    d.push('Keystone size loss is an estimate: real correction varies by model. Maxing out lens shift on one axis can limit how much is left on the other.');
    detailsEl.innerHTML = '<ul>' + d.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>';

    /* ---------- Step 3 readout ---------- */
    syncTune(sizeMin, sizeMax, r);
    if (state.aim === 'straight') {
      var remH = state.offset + state.shiftH / 100 * W;
      var remV = dv + state.shiftV / 100 * H;
      if (Math.abs(remH) < 1 && Math.abs(remV) < 1) {
        tuneReadout.textContent = 'With the shift set like this, the image sits dead center on the screen.';
      } else {
        tuneReadout.textContent = 'With the shift set like this, the image center sits ' +
          f0(Math.abs(remH)) + ' in ' + (remH >= 0 ? 'to the right of' : 'to the left of') + ' screen center, ' +
          f0(Math.abs(remV)) + ' in ' + (remV >= 0 ? 'above' : 'below') + ' it.';
      }
    } else {
      tuneReadout.textContent = 'Turned toward the screen, lens shift only fine tunes where the image sits. Keystone does the squaring.';
    }

    drawViews(g, correctedMode, tier);
  }

  /* ---------- Init ---------- */
  if (countEl) countEl.textContent = THROW.length.toLocaleString('en-US');
  syncVals();
  var def = null;
  THROW.forEach(function (x) {
    if (x.b === 'XGIMI' && x.m === 'HORIZON 30 Pro') def = x;
  });
  if (def) chooseModel(def);
  else recalc();
})();
