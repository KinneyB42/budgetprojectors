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
  var suggestTimer = false;
  var zoomPct = 50;   // 0 = wide end, 100 = tele end
  var projDist = 0;   // ft, lens to screen (driven by the distance slider)
  var placement = 'ceiling';
  var opener = false;
  var roomType = 'garage';
  var device = 'pc';
  var shiftOn = false;

  /* ---------- elements ---------- */
  var modelInput = $('golf-model');
  if (!modelInput) return; // golf section not on this page
  var suggest = $('golf-suggest');
  var selectedLine = $('golf-selected');
  var lensWrap = $('golf-lens-wrap');
  var lensSelect = $('golf-lens');
  var lumensDisplay = $('golf-lumens-display');
  var zoomWrap = $('golf-zoom-wrap');
  var zoomSlider = $('golf-zoom');
  var zoomVal = $('golf-zoom-val');
  var distSlider = $('golf-dist');
  var distVal = $('golf-dist-val');
  /* If the page HTML is older than this script (stale cache), the sliders may
     not exist: guard everything so the calculator still works. */
  var hasSliders = !!(zoomWrap && zoomSlider && zoomVal && distSlider && distVal);
  var screenW = $('golf-screen-w');
  var screenH = $('golf-screen-h');
  var screenPresets = $('golf-screen-presets');
  var aspectSel = $('golf-aspect');
  var roomLen = $('golf-room-len');
  var roomWid = $('golf-room-wid');
  var roomCeil = $('golf-room-ceil');
  var hitInput = $('golf-hit');
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
  var svgSide = $('golf-side');

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
    var ll = lensLumens(selectedModel, selectedLens);
    if (ll > 0) return ll;
    if (selectedModel && selectedModel.lm > 0) return selectedModel.lm;
    return 0;
  }

  function currentRatio() {
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

  function refreshLumensDisplay() {
    var v = effectiveLumens();
    if (v > 0) {
      lumensDisplay.textContent = 'Projector lumens: ' + Math.round(v).toLocaleString('en-US') + ' (manufacturer spec)';
      lumensDisplay.hidden = false;
    } else {
      lumensDisplay.hidden = true;
    }
  }

  function chooseModel(x) {
    selectedModel = x;
    selectedLens = 0;
    modelInput.value = x.b + ' ' + x.m;
    suggest.hidden = true;
    suggest.innerHTML = '';
    modelInput.setAttribute('aria-expanded', 'false');
    syncLensPicker();
    zoomPct = 50;
    if (hasSliders) zoomSlider.value = 50;
    resetDistToFill(currentRatio());
    refreshLumensDisplay();
    refreshSelectedLine();
    recalc();
  }

  function renderSuggest(q) {
    suggest.innerHTML = '';
    if (q.length < 2) { suggest.hidden = true; return; }
    function emptyNote(text) {
      var d = document.createElement('div');
      d.className = 'calc__suggest-empty';
      d.textContent = text;
      suggest.appendChild(d);
      suggest.hidden = false;
      modelInput.setAttribute('aria-expanded', 'true');
    }
    try {
      if (!THROW.length) {
        emptyNote('Loading projector database (' + THROW.length + ' models) - results will appear automatically.');
      if (!suggestTimer) {
        suggestTimer = true;
        var s = document.createElement('script');
        s.src = 'js/throw-data.js';
        s.onload = function () {
          THROW = window.THROW_DATA || [];
          suggestTimer = false;
          var q2 = modelInput.value.trim().toLowerCase();
          if (q2.length >= 2) renderSuggest(q2);
        };
        s.onerror = function () {
          suggestTimer = false;
          emptyNote('Could not load the projector database - check your connection and refresh.');
        };
        document.head.appendChild(s);
      }
      return;
    }
    var matches = THROW.filter(function (x) {
      return (x.b + ' ' + x.m).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 20);
    if (!matches.length) { emptyNote('No models found - try fewer words.'); return; }
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
    } catch (err) {
      emptyNote('Search error: ' + (err && err.message ? err.message : err));
    }
  }

  modelInput.addEventListener('input', function () {
    selectedModel = null;
    selectedLens = 0;
    syncLensPicker();
    selectedLine.hidden = true;
    refreshLumensDisplay();
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
    selectedLens = parseInt(lensSelect.value, 10) || 0;
    resetDistToFill(currentRatio());
    refreshLumensDisplay();
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
  function markPreset(chip) {
    if (!screenPresets) return;
    screenPresets.querySelectorAll('.calc__chip').forEach(function (c) {
      c.classList.toggle('chosen', c === chip);
    });
  }
  function syncPresetChips() {
    if (!screenPresets) return;
    var w = parseFloat(screenW.value, 10), match = null;
    screenPresets.querySelectorAll('.calc__chip').forEach(function (c) {
      var v = c.getAttribute('data-sw');
      if (v !== 'custom' && w > 0 && parseFloat(v, 10) === w) match = c;
    });
    markPreset(match || screenPresets.querySelector('[data-sw="custom"]'));
  }
  if (screenPresets) screenPresets.querySelectorAll('.calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var v = chip.getAttribute('data-sw');
      markPreset(chip);
      if (v !== 'custom') {
        screenW.value = v;
        if (aspectSel.value !== 'custom') applyAspect();
      } else {
        screenW.focus();
      }
      recalc();
    });
  });
  screenW.addEventListener('input', function () {
    if (aspectSel.value !== 'custom') applyAspect();
    syncAspectFromDims(); syncPresetChips();
    resetDistToFill(currentRatio());
    recalc();
  });
  screenH.addEventListener('input', function () { syncAspectFromDims(); recalc(); });

  /* ---------- zoom + distance sliders ---------- */
  function ratioAtZoom(r) {
    return r[0] + (r[1] - r[0]) * zoomPct / 100;
  }
  function syncZoomUI(r) {
    if (!hasSliders) return;
    var zoomable = !!(r && r[0] !== r[1]);
    zoomWrap.hidden = !zoomable;
    if (zoomable) zoomVal.textContent = fmt(ratioAtZoom(r), 2) + ':1';
  }
  function resetDistToFill(r) {
    var sw = parseFloat(screenW.value, 10);
    if (r && sw > 0) {
      projDist = sw * ratioAtZoom(r);
      if (hasSliders) distSlider.value = projDist;
    }
  }
  if (hasSliders) {
    zoomSlider.addEventListener('input', function () {
      zoomPct = parseInt(zoomSlider.value, 10) || 0;
      recalc();
    });
    distSlider.addEventListener('input', function () {
      projDist = parseFloat(distSlider.value, 10) || 0;
      recalc();
    });
  }

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
  [roomLen, roomWid, roomCeil,
   hitInput, openerDist, gainInput].forEach(function (el) {
    el.addEventListener('input', recalc);
  });

  /* ---------- math + rendering ---------- */
  var NAVY = '#0c2244', MUTED = '#5c5c5c', IMG_FILL = '#d7e6f7', WARN = '#c0392b',
      OK = '#2e7d5b', AMBER = '#b7791f';

  function clearSvgs() {
    svgTop.innerHTML = '';
    svgFront.innerHTML = '';
    if (svgSide) svgSide.innerHTML = '';
  }

  function recalc() {
    var r = currentRatio();
    var sw = parseFloat(screenW.value, 10), sh = parseFloat(screenH.value, 10);
    var rl = parseFloat(roomLen.value, 10), rw = parseFloat(roomWid.value, 10);
    var ch = parseFloat(roomCeil.value, 10);
    var hit = parseFloat(hitInput.value, 10);
    var gain = parseFloat(gainInput.value, 10);
    if (!(gain > 0)) gain = 1;

    if (!r) {
      results.innerHTML = '<p>Pick a projector model above to see your simulator plan. The published manufacturer throw ratio is used automatically.</p>';
      clearSvgs();
      return;
    }
    if (!(sw > 0) || !(sh > 0)) {
      results.innerHTML = '<p>Enter your screen width and height.</p>';
      clearSvgs();
      return;
    }

    var out = [];
    var ratio = ratioAtZoom(r);
    var zoomable = r[0] !== r[1];
    syncZoomUI(r);

    /* Distance slider bounds: the room caps it (minus the opener for ceiling mounts). */
    var openerD = (roomType === 'garage' && opener) ? parseFloat(openerDist.value, 10) : 0;
    var tdFar = sw * r[1];
    if (hasSliders) {
      var maxD = rl > 0 ? rl : Math.ceil(tdFar * 1.25);
      distSlider.max = maxD;
      if (!(projDist > 0)) projDist = Math.min(sw * ratio, maxD);
      if (projDist > maxD) projDist = maxD;
      distSlider.value = projDist;
      distVal.textContent = ft(projDist);
    } else if (!(projDist > 0)) {
      projDist = sw * ratio; // no sliders on this page version: auto-fill
    }

    /* Image size from the two sliders. */
    var imageW = projDist / ratio;
    var imageH = imageW * sh / sw;
    out.push('<p><strong>Setup:</strong> projector ' + ft(projDist) + ' from the screen' +
      (zoomable ? ', zoom ' + zoomPct + '% (' + fmt(ratio, 2) + ':1)' : ' (' + fmt(ratio, 2) + ':1 fixed)') +
      ' - image is ' + ft(imageW) + ' wide.</p>');

    /* Fit verdict. */
    var drawW = sw, drawH = sh, unusedSide = 0, overflow = false;
    var tol = sw * 0.02;
    if (Math.abs(imageW - sw) <= tol) {
      out.push('<p><strong>Fit:</strong> the image fills the ' + ft(sw) + ' wide screen.</p>');
    } else if (imageW < sw) {
      drawW = imageW; drawH = imageH;
      unusedSide = (sw - imageW) / 2;
      out.push('<p><strong>Fit:</strong> ' + ft(sw - imageW) + ' of screen stays blank (' +
        ft(unusedSide) + ' each side) - marked with an X in the front view. Move the projector farther or zoom toward Wide.</p>');
    } else {
      overflow = true;
      out.push('<p><strong>Fit:</strong> the image is ' + ft(imageW - sw) +
        ' wider than the screen - move the projector closer or zoom toward Tele.</p>');
    }

    /* Garage opener: usable length + conflict warnings (red). */
    if (roomType === 'garage' && opener && openerD > 0 && rl > 0) {
      if (placement === 'ceiling') {
        out.push('<p><strong>Room:</strong> ' + ft(rl) + ' minus the opener at ' + ft(openerD) +
          ' leaves ' + ft(rl - openerD) + ' of usable length for a ceiling mount.</p>');
      }
      if (placement === 'ceiling' || placement === 'frame') {
        if (projDist > openerD) {
          out.push('<p style="color:' + WARN + '"><strong>Garage door opener in the way:</strong> it hangs between the projector and the screen and will block the image. Move the projector closer than ' + ft(openerD) +
            ' (in front of the opener), or mount it beside the opener.</p>');
        } else if (openerD - projDist < 2) {
          out.push('<p style="color:' + WARN + '"><strong>Too close to the opener:</strong> leave at least 2 ft between the projector and the opener, or mount the projector beside the opener instead of in line with it.</p>');
        }
      }
    }

    /* Brightness: foot-lamberts over the image area. */
    var lumens = effectiveLumens();
    if (lumens > 0 && imageW > 0 && imageH > 0) {
      var fl = lumens * gain / (imageW * imageH);
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
    } else {
      out.push('<p><strong>Brightness:</strong> pick a model with published lumens to see the foot-lambert estimate.</p>');
    }

    results.innerHTML = out.join('');
    drawTop(r, sw, sh, rl, rw, hit, projDist, openerD);
    drawFront(sw, sh, drawW, drawH, unusedSide, overflow, projDist);
    if (svgSide) drawSide(sw, sh, rl, ch, hit, projDist, drawW, drawH, openerD);
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

  /* ---------- SVG C: side view ---------- */
  function drawSide(sw, sh, rl, ch, hit, projDist, drawW, drawH, openerD) {
    if (!(rl > 0) || !(ch > 0)) { svgSide.innerHTML = ''; return; }
    var W = 620, H = 400, L = 56, T = 30, R = 20, B = 46;
    var plotW = W - L - R, plotH = H - T - B;
    var s = Math.min(plotW / rl, plotH / ch);
    var roomLenPx = rl * s, roomHpx = ch * s;
    var x0 = L + (plotW - roomLenPx) / 2, y0 = T + (plotH - roomHpx) / 2;
    function X(d) { return x0 + d * s; }
    function Y(h) { return y0 + roomHpx - h * s; }
    var parts = [];
    parts.push('<defs><pattern id="golf-xhatch-side" width="12" height="12" patternUnits="userSpaceOnUse">' +
      '<path d="M0,0 L12,12 M12,0 L0,12" stroke="' + WARN + '" stroke-width="1.4" opacity="0.55"/>' +
      '</pattern></defs>');

    function txt(x, y, str, size, color, anchor, rot) {
      var a = anchor ? ' text-anchor="' + anchor + '"' : '';
      var tr = rot ? ' transform="rotate(-90 ' + x + ' ' + y + ')"' : '';
      parts.push('<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '"' + a + tr +
        ' font-size="' + (size || 12) + '" fill="' + (color || MUTED) +
        '" font-family="Poppins, sans-serif">' + str + '</text>');
    }

    // room shell: floor + ceiling + walls
    parts.push('<rect x="' + x0.toFixed(1) + '" y="' + y0.toFixed(1) + '" width="' +
      roomLenPx.toFixed(1) + '" height="' + roomHpx.toFixed(1) +
      '" fill="none" stroke="' + MUTED + '" stroke-width="1.5"/>');
    parts.push('<line x1="' + x0.toFixed(1) + '" y1="' + Y(0).toFixed(1) +
      '" x2="' + (x0 + roomLenPx).toFixed(1) + '" y2="' + Y(0).toFixed(1) +
      '" stroke="' + NAVY + '" stroke-width="3"/>');
    txt(x0 - 10, Y(0) + 4, 'Floor', 11, MUTED, 'end');

    // screen at the left wall, standing on the floor
    var scrTop = Y(sh), scrBot = Y(0);
    parts.push('<rect x="' + (X(0) - 5).toFixed(1) + '" y="' + scrTop.toFixed(1) + '" width="10" height="' +
      (scrBot - scrTop).toFixed(1) + '" fill="#ffffff" stroke="' + NAVY + '" stroke-width="2"/>');
    txt(X(0), scrTop - 10, 'Screen ' + fmt(sh, 1) + ' ft tall', 11, NAVY, 'middle');

    // image on the screen (follows lens shift)
    if (projDist > 0 && drawW > 0 && drawH > 0) {
      var imgH = Math.min(drawH, sh);
      var imgBot = (sh - imgH) / 2;
      if (shiftOn) imgBot += ((parseFloat(shiftInput.value, 10) || 0) / 100) * imgH;
      imgBot = Math.max(0, Math.min(sh - imgH, imgBot));
      var imgTop = imgBot + imgH;
      // unused bands above / below the image
      if (imgBot > 0.03) {
        parts.push('<rect x="' + (X(0) - 5).toFixed(1) + '" y="' + Y(imgBot).toFixed(1) + '" width="10" height="' +
          (Y(0) - Y(imgBot)).toFixed(1) + '" fill="url(#golf-xhatch-side)"/>');
      }
      if (sh - imgTop > 0.03) {
        parts.push('<rect x="' + (X(0) - 5).toFixed(1) + '" y="' + Y(sh).toFixed(1) + '" width="10" height="' +
          (Y(imgTop) - Y(sh)).toFixed(1) + '" fill="url(#golf-xhatch-side)"/>');
      }
      parts.push('<rect x="' + (X(0) - 5).toFixed(1) + '" y="' + Y(imgTop).toFixed(1) + '" width="10" height="' +
        (Y(imgBot) - Y(imgTop)).toFixed(1) + '" fill="' + IMG_FILL + '" stroke="' + NAVY + '" stroke-width="1.5"/>');
    }

    // garage opener hanging from the ceiling (red when the projector conflicts)
    var conflict = opener && openerD > 0 && openerD < rl &&
      (placement === 'ceiling' || placement === 'frame') && projDist > openerD - 2;
    if (opener && openerD > 0 && openerD < rl) {
      var ow = Math.min(1.6 * s, 46), oh = Math.min(1.1 * s, 30);
      parts.push('<rect x="' + (X(openerD) - ow / 2).toFixed(1) + '" y="' + Y(ch).toFixed(1) +
        '" width="' + ow.toFixed(1) + '" height="' + oh.toFixed(1) +
        '" fill="' + (conflict ? WARN : AMBER) + '" opacity="0.8" rx="2"/>');
      parts.push('<line x1="' + X(openerD).toFixed(1) + '" y1="' + Y(ch).toFixed(1) +
        '" x2="' + X(openerD).toFixed(1) + '" y2="' + (Y(ch) + 4).toFixed(1) +
        '" stroke="' + (conflict ? WARN : AMBER) + '" stroke-width="2"/>');
      txt(X(openerD), Y(ch) - 8, 'Opener', 11, conflict ? WARN : AMBER, 'middle');
    }

    // hitting mat + golfer
    if (hit > 0 && hit < rl) {
      var mw = Math.min(2.4 * s, 60);
      parts.push('<rect x="' + (X(hit) - mw / 2).toFixed(1) + '" y="' + (Y(0) - 7).toFixed(1) +
        '" width="' + mw.toFixed(1) + '" height="7" fill="#4a7c59" rx="2"/>');
      parts.push('<circle cx="' + X(hit).toFixed(1) + '" cy="' + Y(3.2).toFixed(1) + '" r="10" fill="' + NAVY + '"/>');
      parts.push('<line x1="' + X(hit).toFixed(1) + '" y1="' + Y(2.4).toFixed(1) +
        '" x2="' + X(hit).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="' + NAVY + '" stroke-width="4"/>');
      txt(X(hit), Y(0) + 24, 'Golfer', 11, MUTED, 'middle');
    }

    // projector (height depends on placement)
    if (projDist > 0 && projDist < rl + 2) {
      var ph = placement === 'ceiling' ? ch - 0.8 :
        placement === 'frame' ? sh + 0.4 :
        (placement === 'table-left' || placement === 'table-right') ? 2.8 : 1.1;
      var px = X(projDist), py = Y(ph);
      parts.push('<line x1="' + px.toFixed(1) + '" y1="' + py.toFixed(1) +
        '" x2="' + X(0).toFixed(1) + '" y2="' + Y(sh / 2).toFixed(1) +
        '" stroke="' + (conflict ? WARN : NAVY) + '" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.6"/>');
      parts.push('<rect x="' + (px - 12).toFixed(1) + '" y="' + (py - 8).toFixed(1) +
        '" width="24" height="16" rx="2" fill="' + NAVY + '"/>');
      if (placement === 'ceiling') {
        parts.push('<line x1="' + px.toFixed(1) + '" y1="' + (py - 8).toFixed(1) +
          '" x2="' + px.toFixed(1) + '" y2="' + Y(ch).toFixed(1) + '" stroke="' + NAVY + '" stroke-width="3"/>');
      }
      txt(px, py + 28, (PLACE_LABEL[placement] || 'Projector') + ' (' + ft(ph) + ' high)', 11, NAVY, 'middle');
    }

    // dimensions
    txt(x0 + roomLenPx / 2, y0 + roomHpx + 30, ft(rl) + ' long', 12, MUTED, 'middle');
    txt(24, y0 + roomHpx / 2, ft(ch) + ' ceiling', 12, MUTED, 'middle', true);

    svgSide.innerHTML = parts.join('');
  }

  /* ---------- init ---------- */
  recalc();
})();
