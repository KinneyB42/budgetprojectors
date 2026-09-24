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
  var shopNote = $('golf-shop-note');
  var jmgoNote = $('golf-jmgo-note');
  var xgimiNote = $('golf-xgimi-note');
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
  var heightFt = $('golf-height-ft');
  var heightIn = $('golf-height-in');
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

  /* ---------- Affiliate shop links for the selected model ----------
     Same tagged links as the main calculator (main.js). */
  var AFF = {
    amazonTag: 'brandonkinney-20', /* Brandon's Associates tag, from his SiteStripe link 2026-09-20 */
    amazonSearch: 'https://www.amazon.com/s?k=',
    ebayCampid: '5339116943', /* Brandon's EPN campaign, confirmed 2026-09-20 */
    ebayMkrid: '711-53200-19255-0',
    jmgoIrisUltra: 'https://affiliate.jmgo.com/OYv0dG', /* Brandon's JMGO affiliate link, generated via Impact 2026-09-21 */
    jmgoIrisUltraMax: 'https://affiliate.jmgo.com/JkvXAN', /* Brandon's JMGO affiliate link, generated via Impact 2026-09-21 */
  };
  function isJmgoFeatured() {
    return selectedModel && selectedModel.b === 'JMGO' &&
      (selectedModel.m === 'IRIS ULTRA' || selectedModel.m === 'IRIS ULTRA MAX');
  }
  function jmgoUrl() {
    if (!isJmgoFeatured()) return '';
    return selectedModel.m === 'IRIS ULTRA MAX' ? AFF.jmgoIrisUltraMax : AFF.jmgoIrisUltra;
  }
  /* XGIMI direct-store links, for models still sold on us.xgimi.com.
     Brandon's Impact affiliate links, generated and redirect-verified 2026-09-21. */
  var XGIMI_LINKS = {
    'TITAN': 'https://xgimi.sjv.io/DWd3en',
    'TITAN Noir': 'https://xgimi.sjv.io/gRXG69',
    'TITAN Noir Pro': 'https://xgimi.sjv.io/n46yoX',
    'TITAN Noir Max': 'https://xgimi.sjv.io/6kMEoG',
    'Horizon 20': 'https://xgimi.sjv.io/R0dbmb',
    'HORIZON 20 Pro': 'https://xgimi.sjv.io/MKdbyo',
    'HORIZON 20 Max': 'https://xgimi.sjv.io/qW6yZL',
    'HORIZON Ultra': 'https://xgimi.sjv.io/QYdb43',
    'Horizon Ultra': 'https://xgimi.sjv.io/QYdb43', /* duplicate calculator record, same product */
    'MoGo 4': 'https://xgimi.sjv.io/5k0nYN',
    'MoGo 4 Laser': 'https://xgimi.sjv.io/1Gd7Rm',
    'Elfin Flip Plus': 'https://xgimi.sjv.io/X49NOg',
    'Elfin Flip 4K': 'https://xgimi.sjv.io/0GKPyJ',
    'Elfin Flip Laser': 'https://xgimi.sjv.io/2R0dyQ',
    'Vibe One Battery Powered': 'https://xgimi.sjv.io/vD6VQj',
    'MoGo 2 Pro': 'https://xgimi.sjv.io/YVmNbj', /* links to the current MoGo 2 Pro (New) product page */
    'Aura 2': 'https://xgimi.sjv.io/DWd3Od', /* links to the current AURA 2 (New) product page */
  };
  function xgimiUrl() {
    if (!selectedModel || selectedModel.b !== 'XGIMI') return '';
    return XGIMI_LINKS[selectedModel.m] || '';
  }
  function amazonUrl(q) {
    var u = AFF.amazonSearch + encodeURIComponent(q);
    if (AFF.amazonTag) u += '&tag=' + encodeURIComponent(AFF.amazonTag);
    return u;
  }
  function ebayUrl(q) {
    return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) +
      '&mkcid=1&mkrid=' + AFF.ebayMkrid + '&siteid=0&campid=' + AFF.ebayCampid + '&toolid=80005&mkevt=1';
  }
  function shopAnchor(href, label) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'nofollow sponsored noopener';
    a.className = 'calc-shop-link';
    a.textContent = label;
    return a;
  }

  function refreshSelectedLine() {
    if (!selectedModel) { selectedLine.hidden = true; hideShopDisclosure(); return; }
    var txt = 'Using ' + selectedModel.b + ' ' + selectedModel.m;
    var L = modelLenses(selectedModel);
    if (L && L[selectedLens]) txt += ' - lens ' + L[selectedLens][0];
    var r = currentRatio();
    if (r) txt += ' - throw ' + ratioLabel(r);
    selectedLine.textContent = txt;
    var q = selectedModel.b + ' ' + selectedModel.m;
    var shop = document.createElement('span');
    shop.className = 'calc-shop';
    shop.appendChild(document.createTextNode(' - '));
    shop.appendChild(shopAnchor(amazonUrl(q), 'Amazon'));
    shop.appendChild(document.createTextNode(' | '));
    shop.appendChild(shopAnchor(ebayUrl(q), 'eBay'));
    var ju = jmgoUrl();
    if (ju) {
      shop.appendChild(document.createTextNode(' | '));
      shop.appendChild(shopAnchor(ju, 'JMGO Direct'));
    }
    var xu = xgimiUrl();
    if (xu) {
      shop.appendChild(document.createTextNode(' | '));
      shop.appendChild(shopAnchor(xu, 'XGIMI Direct'));
    }
    selectedLine.appendChild(shop);
    selectedLine.hidden = false;
    if (shopNote) shopNote.hidden = false;
    if (jmgoNote) jmgoNote.hidden = !isJmgoFeatured();
    if (xgimiNote) xgimiNote.hidden = !xgimiUrl();
  }

  function hideShopDisclosure() {
    if (shopNote) shopNote.hidden = true;
    if (jmgoNote) jmgoNote.hidden = true;
    if (xgimiNote) xgimiNote.hidden = true;
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
    hideShopDisclosure();
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
   hitInput, heightFt, heightIn, openerDist, gainInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
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
    var gh = (parseFloat(heightFt.value, 10) || 0) + (parseFloat(heightIn.value, 10) || 0) / 12;
    var hasGh = gh >= 3 && gh <= 8.5;
    var drawGh = hasGh ? gh : 5.75; // generic figure until a height is entered
    function fmtHt(h) { return Math.floor(h) + "'" + Math.round((h - Math.floor(h)) * 12) + '"'; }
    var gain = parseFloat(gainInput.value, 10);
    if (!(gain > 0)) gain = 1;

    if (!r) {
      results.innerHTML = '<p>Pick a projector model above to see your simulator plan. The published manufacturer throw ratio is used automatically.</p>';
      clearSvgs();
      planData = null;
      return;
    }
    if (!(sw > 0) || !(sh > 0)) {
      results.innerHTML = '<p>Enter your screen width and height.</p>';
      clearSvgs();
      planData = null;
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
    var openerBlocked = false, openerTooClose = false;
    if (roomType === 'garage' && opener && openerD > 0 && rl > 0) {
      if (placement === 'ceiling') {
        out.push('<p><strong>Room:</strong> ' + ft(rl) + ' minus the opener at ' + ft(openerD) +
          ' leaves ' + ft(rl - openerD) + ' of usable length for a ceiling mount.</p>');
      }
      if (placement === 'ceiling' || placement === 'frame') {
        if (projDist > openerD) {
          openerBlocked = true;
          out.push('<p style="color:' + WARN + '"><strong>Garage door opener in the way:</strong> it hangs between the projector and the screen and will block the image. Move the projector closer than ' + ft(openerD) +
            ' (in front of the opener), or mount it beside the opener.</p>');
        } else if (openerD - projDist < 2) {
          openerTooClose = true;
          out.push('<p style="color:' + WARN + '"><strong>Too close to the opener:</strong> leave at least 2 ft between the projector and the opener, or mount the projector beside the opener instead of in line with it.</p>');
        }
      }
    }

    /* Brightness: foot-lamberts over the image area. */
    var lumens = effectiveLumens(), fl = 0, brightNote = '';
    if (lumens > 0 && imageW > 0 && imageH > 0) {
      fl = lumens * gain / (imageW * imageH);
      brightNote = fl < 12 ? 'dim, best in a fully dark room' :
        fl < 30 ? 'good with the lights off' :
        fl < 60 ? 'holds up with some ambient light' : 'bright enough for lights-on viewing';
      var color = fl < 12 ? WARN : fl < 30 ? AMBER : OK;
      out.push('<p><strong>Brightness:</strong> ~' + fmt(fl, 0) + ' fL - <span style="color:' + color + '">' +
        brightNote + '</span>.</p>');
      if (fl < 30) {
        out.push('<p style="color:' + WARN + '"><strong>Heads up:</strong> on a grey golf screen with ambient ' +
          'light this will look dim - a brighter projector is worth it.</p>');
      }
    } else {
      out.push('<p><strong>Brightness:</strong> pick a model with published lumens to see the foot-lambert estimate.</p>');
    }

    /* Golfer clearance: swing room, head bumps, club strikes, beam shadows. */
    var projH = placement === 'ceiling' ? ch - 0.8 :
      placement === 'frame' ? sh + 0.4 :
      (placement === 'table-left' || placement === 'table-right') ? 2.8 : 1.1;
    if (hasGh && ch > 0 && ch < gh + 3.5) {
      out.push('<p style="color:' + WARN + '"><strong>Ceiling too low for a full swing:</strong> at ' + fmtHt(gh) +
        ' tall you need about ' + ft(gh + 3.5) + ' of ceiling for a driver. Stick to shorter clubs or find more height.</p>');
    }
    if (hasGh && hit > 0 && projDist > 0) {
      var gap = Math.abs(projDist - hit);
      if (gap < 2.5 && projH < gh + 0.5) {
        out.push('<p style="color:' + WARN + '"><strong>Head-bump risk:</strong> the projector hangs at ' + ft(projH) +
          ' right by the hitting mat - you will bump your head on it. Move the projector farther from the mat or mount it higher.</p>');
      } else if (gap < 3.5 && projH < gh + 3.5) {
        out.push('<p style="color:' + WARN + '"><strong>Club-strike risk:</strong> your driver swing reaches about ' + ft(gh + 3.5) +
          ' high and the projector sits inside your swing zone. Move it at least 4 ft from the mat or mount it higher.</p>');
      }
      if (hit < projDist && sh > 0) {
        var lineH = projH - (projH - sh / 2) * (projDist - hit) / projDist;
        if (lineH < gh + 0.3) {
          out.push('<p style="color:' + WARN + '"><strong>You will block the image:</strong> the throw beam passes at ' + ft(lineH) +
            ' high over the hitting mat while you stand ' + fmtHt(gh) + ' - your head will cast a shadow on the screen. Move the mat forward or mount the projector higher.</p>');
        }
      }
    }

    /* Drawings use a typical room until the user enters their own; warnings only use entered dimensions. */
    var drl = rl > 0 ? rl : Math.max(17, projDist + 5, (hit > 0 ? hit : 0) + 5);
    var drw = rw > 0 ? rw : 12;
    var dch = ch > 0 ? ch : 10;
    var roomAssumed = !(rl > 0) || !(rw > 0) || !(ch > 0);
    if (roomAssumed) {
      out.push('<p style="color:' + MUTED + '"><em>Room views show a typical ' + ft(drl) + ' x ' + ft(drw) +
        ' room with a ' + ft(dch) + ' ceiling until you enter your dimensions.</em></p>');
    }

    results.innerHTML = out.join('');
    drawTop(r, sw, sh, drl, drw, hit, projDist, openerD);
    drawFront(sw, sh, drawW, drawH, unusedSide, overflow, projDist);
    if (svgSide) drawSide(sw, sh, drl, dch, hit, projDist, drawW, drawH, openerD, projH, drawGh, hasGh, fmtHt);

    /* Snapshot for the JPG/PNG/PDF export. */
    var warnHtml = out.filter(function (s) { return s.indexOf(WARN) !== -1; });
    planData = {
      model: selectedModel.b + ' ' + selectedModel.m,
      lens: modelLenses(selectedModel) ? modelLenses(selectedModel)[selectedLens][0] : '',
      ratio: fmt(ratio, 2) + ':1' + (zoomable ? '' : ' fixed'),
      zoom: zoomable ? zoomPct + '%' : '',
      throwDist: ft(projDist),
      placement: PLACE_LABEL[placement] || placement,
      screen: fmt(sw, 1) + ' x ' + fmt(sh, 1) + ' ft',
      room: roomAssumed ? 'typical ' + ft(drl) + ' x ' + ft(drw) + ', ' + ft(dch) + ' ceiling (illustrative)' :
        ft(rl) + ' x ' + ft(rw) + ', ' + ft(ch) + ' ceiling',
      hit: hit > 0 ? ft(hit) : '',
      height: hasGh ? fmtHt(gh) : '',
      opener: (roomType === 'garage' && opener && openerD > 0) ? ft(openerD) + ' from the screen' : '',
      openerIssue: openerBlocked ? 'BLOCKS THE IMAGE' : openerTooClose ? 'too close - leave 2 ft' : '',
      fit: !overflow && !openerBlocked && !openerTooClose,
      fitNote: overflow ? 'image overflows the screen' : (unusedSide > 0.02 ? ft(sw - imageW) + ' of screen unused' : 'image fills the screen'),
      brightness: fl > 0 ? '~' + fmt(fl, 0) + ' fL - ' + brightNote : '',
      warnings: warnHtml.map(function (s) { return s.replace(/<[^>]+>/g, ''); }),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };
    // The file-name box shows the auto name it will use when left blank.
    if (golfExportNameInput) golfExportNameInput.placeholder = defaultGolfExportBase();
  }

  var planData = null; // set by recalc; used by the export buttons

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
  function drawSide(sw, sh, rl, ch, hit, projDist, drawW, drawH, openerD, projH, drawGh, hasGh, fmtHt) {
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

    // hitting mat + golfer drawn to scale
    if (hit > 0 && hit < rl) {
      var mw = Math.min(2.4 * s, 60);
      parts.push('<rect x="' + (X(hit) - mw / 2).toFixed(1) + '" y="' + (Y(0) - 7).toFixed(1) +
        '" width="' + mw.toFixed(1) + '" height="7" fill="#4a7c59" rx="2"/>');
      var headR = Math.max(6, 0.42 * s), bodyW = Math.max(3, 0.28 * s);
      parts.push('<line x1="' + X(hit).toFixed(1) + '" y1="' + Y(0).toFixed(1) +
        '" x2="' + X(hit).toFixed(1) + '" y2="' + Y(drawGh - 0.75).toFixed(1) +
        '" stroke="' + NAVY + '" stroke-width="' + bodyW.toFixed(1) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + X(hit).toFixed(1) + '" cy="' + Y(drawGh - 0.35).toFixed(1) +
        '" r="' + headR.toFixed(1) + '" fill="' + NAVY + '"/>');
      txt(X(hit), Y(0) + 24, hasGh ? 'You (' + fmtHt(drawGh) + ')' : 'Golfer', 11, MUTED, 'middle');
      // driver swing reach
      if (hasGh) {
        var reach = drawGh + 3.5, rx0 = Math.max(0, hit - 3), rx1 = Math.min(rl, hit + 3);
        parts.push('<line x1="' + X(rx0).toFixed(1) + '" y1="' + Y(reach).toFixed(1) +
          '" x2="' + X(rx1).toFixed(1) + '" y2="' + Y(reach).toFixed(1) +
          '" stroke="' + MUTED + '" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>');
        txt(X(rx1) + 4, Y(reach) + 4, 'driver swing reach', 10, MUTED, 'start');
      }
    }

    // projector (height depends on placement; falls back to the drawn ceiling)
    if (projDist > 0 && projDist < rl + 2) {
      var ph = (projH > 0) ? projH : ch - 0.8;
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

  /* ---------- export: PNG / PDF ---------- */
  var MOUNT_LIST = 'https://amzn.to/4vALW2k';
  var CABLE_LIST = 'https://amzn.to/4oFKjxP';
  var HDMI_LIST = 'https://www.amazon.com/shop/brandonkinney/list/T1MTOGHLPMRU?ref_=aipsflist';
  var ACCESSORY_LIST = 'https://www.amazon.com/shop/brandonkinney/list/33RRH1863AJE5?ref_=aipsflist';
  var TAGLINE = 'Your professional estimate was generated based on your customized space provided by BudgetProjectors.org';

  function nudgeExport() {
    results.innerHTML = '<p>Pick a projector model above to export your simulator plan.</p>';
    if (modelInput && modelInput.focus) modelInput.focus();
  }

  function roundRectPath(cx, x, y, w, h, r) {
    cx.beginPath();
    cx.moveTo(x + r, y);
    cx.arcTo(x + w, y, x + w, y + h, r);
    cx.arcTo(x + w, y + h, x, y + h, r);
    cx.arcTo(x, y + h, x, y, r);
    cx.arcTo(x, y, x + w, y, r);
    cx.closePath();
  }

  function rasterizeGolfSvg(el, pxW, cb) {
    try {
      var clone = el.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      var pxH = Math.round(pxW * 400 / 620);
      clone.setAttribute('width', String(pxW));
      clone.setAttribute('height', String(pxH));
      var st = document.createElementNS('http://www.w3.org/2000/svg', 'style');
      st.textContent = 'text{font-family:Arial,Helvetica,sans-serif}';
      clone.insertBefore(st, clone.firstChild);
      var url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }));
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); cb(img, pxH); };
      img.onerror = function () { URL.revokeObjectURL(url); cb(null, pxH); };
      img.src = url;
    } catch (e) { cb(null, 0); }
  }

  function golfSpecRows(P) {
    var rows = [
      ['Projector', P.model + (P.lens ? ' - ' + P.lens : '')],
      ['Placement from screen', P.throwDist],
      ['Placement method', P.placement],
      ['Throw ratio', P.ratio + (P.zoom ? ' - zoom ' + P.zoom : '')],
      ['Screen', P.screen],
      ['Room', P.room]
    ];
    if (P.hit) rows.push(['Hitting distance', P.hit]);
    if (P.height) rows.push(['Your height', P.height]);
    if (P.opener) rows.push(['Garage door opener', P.opener + (P.openerIssue ? ' - ' + P.openerIssue : '')]);
    if (P.brightness) rows.push(['Brightness', P.brightness]);
    return rows;
  }

  function golfSteps(P) {
    var steps = ['Mount the projector ' + P.throwDist + ' from the screen (' + P.placement.toLowerCase() + ').'];
    if (P.zoom) steps.push('Adjust the lens zoom to ' + P.zoom + ' (throw ratio ' + P.ratio + ') so the image fills the screen.');
    else steps.push('Fixed lens, no zoom to set - the image fills the screen from that spot.');
    steps.push('Check the side view: the projector clears your swing and the throw beam clears your head.');
    return steps;
  }

  /* Single code path draws the document or just measures its height. */
  function renderGolfDoc(P, imgs, L) {
    var W = 1600, M = 80, CW = W - M * 2;
    function text(str, x, y, font, color, align) {
      if (L.measure) return;
      L.cx.font = font; L.cx.fillStyle = color; L.cx.textAlign = align || 'left'; L.cx.textBaseline = 'alphabetic';
      L.cx.fillText(str, x, y);
    }
    function wrapped(str, x, y, maxW, font, color, lineH) {
      L.cx.font = font;
      var words = String(str).split(' '), line = '', yy = y;
      function emit(ln) {
        if (!L.measure) { L.cx.fillStyle = color; L.cx.textAlign = 'left'; L.cx.fillText(ln, x, yy); }
        yy += lineH;
      }
      words.forEach(function (w) {
        var t = line ? line + ' ' + w : w;
        if (L.cx.measureText(t).width > maxW && line) { emit(line); line = w; } else line = t;
      });
      if (line) emit(line);
      return yy;
    }
    var y = L.y;
    if (!L.measure) { L.cx.fillStyle = '#0c2244'; L.cx.fillRect(0, y, W, 200); }
    text('BUDGETPROJECTORS.ORG', M, y + 66, '600 20px Arial,sans-serif', '#8fa3c8');
    text('Golf Simulator Plan', M, y + 132, '700 52px Arial,sans-serif', '#ffffff');
    text(P.date, W - M, y + 66, '400 20px Arial,sans-serif', '#8fa3c8', 'right');
    y += 200;
    y = wrapped(TAGLINE, M, y + 52, CW, 'italic 400 22px Arial,sans-serif', '#5c5c5c', 32) + 30;

    var rows = golfSpecRows(P), colW = CW / 2, perCol = Math.ceil(rows.length / 2), rh = 84;
    rows.forEach(function (r, i) {
      var x = M + (i < perCol ? 0 : colW), ry = y + 24 + (i % perCol) * rh;
      text(r[0].toUpperCase(), x, ry, '600 15px Arial,sans-serif', '#8fa3c8');
      text(String(r[1]).substring(0, 46), x, ry + 36, '400 26px Arial,sans-serif', '#0c2244');
    });
    y += 24 + perCol * rh + 20;

    var fitColor = P.fit ? '#2e7d5b' : '#c0392b';
    if (!L.measure) { L.cx.fillStyle = fitColor; roundRectPath(L.cx, M, y, CW, 104, 14); L.cx.fill(); }
    text('WILL IT FIT: ' + (P.fit ? 'YES' : 'NO'), M + 32, y + 66, '700 36px Arial,sans-serif', '#ffffff');
    text(P.fitNote.substring(0, 44), W - M - 32, y + 62, '400 22px Arial,sans-serif', '#ffffff', 'right');
    y += 104 + 44;

    text('3D views', M, y + 34, '700 32px Arial,sans-serif', '#0c2244');
    y += 66;
    var vw1 = 740, vh1 = Math.round(vw1 * 400 / 620);
    if (!L.measure) {
      L.cx.strokeStyle = '#d8d8d8'; L.cx.lineWidth = 2;
      if (imgs[0].img) L.cx.drawImage(imgs[0].img, M, y, vw1, vh1);
      L.cx.strokeRect(M, y, vw1, vh1);
      if (imgs[1].img) L.cx.drawImage(imgs[1].img, M + vw1 + 40, y, vw1, vh1);
      L.cx.strokeRect(M + vw1 + 40, y, vw1, vh1);
    }
    text('Top-down view', M, y + vh1 + 34, '600 19px Arial,sans-serif', '#0c2244');
    text('What you see from the hitting mat', M + vw1 + 40, y + vh1 + 34, '600 19px Arial,sans-serif', '#0c2244');
    y += vh1 + 68;
    var vh2 = Math.round(CW * 400 / 620);
    if (!L.measure) {
      if (imgs[2].img) L.cx.drawImage(imgs[2].img, M, y, CW, vh2);
      L.cx.strokeStyle = '#d8d8d8'; L.cx.lineWidth = 2; L.cx.strokeRect(M, y, CW, vh2);
    }
    text('Side view', M, y + vh2 + 34, '600 19px Arial,sans-serif', '#0c2244');
    y += vh2 + 68;

    text('To set it up', M, y + 34, '700 32px Arial,sans-serif', '#0c2244');
    y += 66;
    golfSteps(P).forEach(function (s, i) {
      y = wrapped((i + 1) + '. ' + s, M, y + 6, CW, '400 22px Arial,sans-serif', '#222222', 32) + 16;
    });
    y += 24;

    if (P.warnings.length) {
      text('Watch out for', M, y + 34, '700 32px Arial,sans-serif', '#c0392b');
      y += 66;
      P.warnings.forEach(function (w) {
        y = wrapped('\u2022  ' + w, M, y + 6, CW, '400 22px Arial,sans-serif', '#c0392b', 32) + 16;
      });
      y += 24;
    }

    text('Recommended accessories', M, y + 34, '700 32px Arial,sans-serif', '#0c2244');
    y += 66;
    [['Projector mounts', MOUNT_LIST], ['HDMI cables', CABLE_LIST],
     ['HDMI extenders and switches', HDMI_LIST], ['More home theater accessories', ACCESSORY_LIST]
    ].forEach(function (a) {
      text(a[0] + ':', M, y + 8, '600 22px Arial,sans-serif', '#0c2244');
      y = wrapped(a[1], M, y + 42, CW, '400 20px Arial,sans-serif', '#1a56db', 28) + 20;
    });
    y += 34;

    if (!L.measure) { L.cx.fillStyle = '#0c2244'; L.cx.fillRect(0, y, W, 128); }
    text('BudgetProjectors.org', M, y + 54, '600 22px Arial,sans-serif', '#ffffff');
    text('Generated ' + P.date, W - M, y + 54, '400 18px Arial,sans-serif', '#8fa3c8', 'right');
    text(TAGLINE, M, y + 92, 'italic 400 15px Arial,sans-serif', '#8fa3c8');
    y += 128;
    L.y = y;
  }

  function drawGolfWatermark(cx, W, H) {
    cx.save();
    cx.globalAlpha = 0.05;
    cx.fillStyle = '#0c2244';
    cx.font = '700 130px Arial,sans-serif';
    cx.textAlign = 'center';
    cx.translate(W / 2, H / 2);
    cx.rotate(-0.32);
    for (var i = -2; i <= 2; i++) cx.fillText('BudgetProjectors.org', 0, i * 280);
    cx.restore();
  }

  function downloadGolfBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 800);
  }

  /* ---------- Export file name: user-customizable, persisted ---------- */
  var GOLF_EXPORT_FALLBACK = 'budgetprojectors-golf-plan';
  function sanitizeGolfExportName(raw, fallback) {
    var s = String(raw == null ? '' : raw).replace(/[\\\/:*?"<>|\u0000-\u001f]/g, '');
    s = s.replace(/\s+/g, ' ').replace(/^[\s.]+|[\s.]+$/g, '');
    s = s.replace(/\.(png|jpe?g|pdf)$/i, '').replace(/[\s.]+$/g, '');
    if (s.length > 80) s = s.slice(0, 80).replace(/[\s.]+$/g, '');
    return s || fallback;
  }
  var golfExportNameInput = $('golf-export-name');
  try {
    var savedGolfExportName = localStorage.getItem('golf-export-name');
    if (golfExportNameInput && savedGolfExportName) golfExportNameInput.value = savedGolfExportName;
  } catch (e) {}
  function golfExportBaseName() {
    // A typed name always wins; otherwise <model-slug>.BudgetProjectors.
    if (golfExportNameInput && /\S/.test(golfExportNameInput.value)) {
      return sanitizeGolfExportName(golfExportNameInput.value, GOLF_EXPORT_FALLBACK);
    }
    return defaultGolfExportBase();
  }
  function defaultGolfExportBase() {
    var m = (typeof planData !== 'undefined' && planData && planData.model) ? planData.model : '';
    var slug = String(m).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug ? slug + '.BudgetProjectors' : GOLF_EXPORT_FALLBACK;
  }
  if (golfExportNameInput) golfExportNameInput.addEventListener('input', function () {
    try { localStorage.setItem('golf-export-name', golfExportNameInput.value); } catch (e) {}
  });
  // The PDF goes through the browser print dialog, which suggests the document
  // title as the file name — swap it for the export name while printing.
  var savedGolfDocTitle = null;
  window.addEventListener('afterprint', function () {
    if (savedGolfDocTitle !== null) { document.title = savedGolfDocTitle; savedGolfDocTitle = null; }
  });

  function composeGolfImage(kind, P, imgs) {
    var W = 1600;
    var scratch = document.createElement('canvas');
    var Lm = { cx: scratch.getContext('2d'), y: 0, measure: true };
    renderGolfDoc(P, imgs, Lm);
    var H = Math.ceil(Lm.y) + 40;
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var cx = cv.getContext('2d');
    cx.fillStyle = '#ffffff'; cx.fillRect(0, 0, W, H);
    renderGolfDoc(P, imgs, { cx: cx, y: 0, measure: false });
    drawGolfWatermark(cx, W, H);
    cv.toBlob(function (blob) {
      if (blob) downloadGolfBlob(blob, golfExportBaseName() + '.' + kind);
    }, kind === 'jpg' ? 'image/jpeg' : 'image/png', 0.92);
  }

  function exportGolfImage(kind) {
    if (!planData) { nudgeExport(); return; }
    var P = planData;
    var srcs = [svgTop, svgFront, svgSide];
    var imgs = [], loaded = 0;
    srcs.forEach(function (src, i) {
      if (!src) { imgs[i] = { img: null, h: 0 }; if (++loaded === srcs.length) composeGolfImage(kind, P, imgs); return; }
      rasterizeGolfSvg(src, 1240, function (img, h) {
        imgs[i] = { img: img, h: h };
        if (++loaded === srcs.length) composeGolfImage(kind, P, imgs);
      });
    });
  }

  function exportGolfPdf() {
    if (!planData) { nudgeExport(); return; }
    var P = planData;
    var sheet = document.getElementById('golf-print');
    if (!sheet) return;
    var rows = golfSpecRows(P).map(function (r) {
      return '<tr><th>' + r[0] + '</th><td>' + r[1] + '</td></tr>';
    }).join('');
    var steps = golfSteps(P).map(function (s) { return '<li>' + s + '</li>'; }).join('');
    var warns = P.warnings.length ?
      '<h2>Watch out for</h2><ul class="gp-warn">' +
      P.warnings.map(function (w) { return '<li>' + w + '</li>'; }).join('') + '</ul>' : '';
    sheet.innerHTML =
      '<div class="gp-watermark">BudgetProjectors.org</div>' +
      '<div class="gp-head"><div class="gp-brand">BUDGETPROJECTORS.ORG</div>' +
      '<h1>Golf Simulator Plan</h1><div class="gp-date">' + P.date + '</div></div>' +
      '<p class="gp-tagline">' + TAGLINE + '</p>' +
      '<table class="gp-specs">' + rows + '</table>' +
      '<div class="gp-fit ' + (P.fit ? 'yes' : 'no') + '">WILL IT FIT: ' + (P.fit ? 'YES' : 'NO') +
      '<span>' + P.fitNote + '</span></div>' +
      '<h2>3D views</h2><div class="gp-views">' +
      '<figure><figcaption>Top-down view</figcaption><div class="gp-svg" id="gp-v0"></div></figure>' +
      '<figure><figcaption>What you see from the hitting mat</figcaption><div class="gp-svg" id="gp-v1"></div></figure>' +
      '<figure><figcaption>Side view</figcaption><div class="gp-svg" id="gp-v2"></div></figure></div>' +
      '<h2>To set it up</h2><ol class="gp-steps">' + steps + '</ol>' + warns +
      '<h2>Recommended accessories</h2><ul class="gp-acc">' +
      '<li>Projector mounts: <a href="' + MOUNT_LIST + '">' + MOUNT_LIST + '</a></li>' +
      '<li>HDMI cables: <a href="' + CABLE_LIST + '">' + CABLE_LIST + '</a></li>' +
      '<li>HDMI extenders and switches: <a href="' + HDMI_LIST + '">' + HDMI_LIST + '</a></li>' +
      '<li>More home theater accessories: <a href="' + ACCESSORY_LIST + '">' + ACCESSORY_LIST + '</a></li></ul>' +
      '<div class="gp-foot"><strong>BudgetProjectors.org</strong> &middot; Generated ' + P.date + '<br>' + TAGLINE + '</div>';
    [svgTop, svgFront, svgSide].forEach(function (src, i) {
      var slot = document.getElementById('gp-v' + i);
      if (slot && src) slot.appendChild(src.cloneNode(true));
    });
    document.body.classList.add('printing-golf');
    savedGolfDocTitle = document.title;
    document.title = golfExportBaseName();
    window.print();
  }

  /* ---------- init ---------- */
  var golfPngBtn = $('golf-export-png'), golfPdfBtn = $('golf-export-pdf');
  if (golfPngBtn) golfPngBtn.addEventListener('click', function () { exportGolfImage('png'); });
  if (golfPdfBtn) golfPdfBtn.addEventListener('click', exportGolfPdf);
  recalc();
})();
