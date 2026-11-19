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
  var presetSel = document.getElementById('place-preset');
  var aimSel = document.getElementById('place-aim');
  var resultEl = document.getElementById('place-result');
  var detailsEl = document.getElementById('place-details');
  var topSvg = document.getElementById('place-top');
  var frontSvg = document.getElementById('place-front');

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
    screenBottom: 24
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

  Object.keys(SLIDERS).forEach(function (key) {
    SLIDERS[key].addEventListener('input', function () {
      state[key] = parseFloat(this.value);
      presetSel.value = 'custom';
      syncVals();
      recalc();
    });
  });

  presetSel.addEventListener('change', function () {
    var p = PRESETS[this.value];
    if (p) {
      state.dist = p.dist;
      state.offset = p.offset;
      state.height = p.height;
      syncSliders();
      syncVals();
    }
    recalc();
  });

  aimSel.addEventListener('change', function () {
    state.aim = this.value;
    recalc();
  });

  /* ---------- Views ---------- */
  var NAVY = '#0c2244', MUTED = '#5c5c5c', PANEL = '#f6f3ec';
  var BEAM_FILL = 'rgba(37,99,235,0.16)', BEAM_STROKE = 'rgba(37,99,235,0.55)';
  var IMG_FILL = 'rgba(37,99,235,0.20)', IMG_STROKE = 'rgba(37,99,235,0.6)';
  var TIER_COLORS = { ok: '#2e7d5b', warn: '#b8860b', bad: '#c0392b' };

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
      '<rect x="' + (px - 7) + '" y="' + (py - 5) + '" width="14" height="10" rx="2" fill="' + NAVY + '"/>' +
      '<text x="160" y="10" font-size="10" fill="' + MUTED + '" text-anchor="middle">SCREEN WALL</text>' +
      '<text x="' + px + '" y="166" font-size="10" fill="' + MUTED + '" text-anchor="middle">PROJECTOR</text>';

    /* Front view */
    var sx = 70, sy = 28, sw = 180, sh = 124, cx = 160, cy = 90;
    var landed = '', corrected = '';
    if (state.aim === 'straight') {
      var dxpx = clamp(state.offset * (sw / W), -150, 150);
      var dypx = clamp(-g.dv * (sh / H), -64, 64);
      landed = '<rect x="' + (sx + dxpx) + '" y="' + (sy + dypx) + '" width="' + sw + '" height="' + sh + '" fill="' + IMG_FILL + '" stroke="' + IMG_STROKE + '" stroke-width="1.5"/>';
    } else {
      var sk = clamp(g.yaw * 0.6, 0, 18);
      var pk = clamp(g.pitch * 0.5, 0, 14);
      var topW = sw * (1 + (g.dv < 0 ? pk : -pk) / 100);
      var botW = sw * (1 + (g.dv < 0 ? -pk : pk) / 100);
      landed = '<polygon points="' +
        (cx - topW / 2) + ',' + (sy - sk / 2) + ' ' +
        (cx + topW / 2) + ',' + (sy + sk / 2) + ' ' +
        (cx + botW / 2) + ',' + (sy + sh + sk / 2) + ' ' +
        (cx - botW / 2) + ',' + (sy + sh - sk / 2) +
        '" fill="' + IMG_FILL + '" stroke="' + IMG_STROKE + '" stroke-width="1.5"/>';
    }
    if (correctedMode === 'screen') {
      corrected = '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="none" stroke="' + TIER_COLORS[tier] + '" stroke-width="2" stroke-dasharray="6 4"/>';
    } else if (correctedMode === 'keystone') {
      var cf = Math.cos(g.maxAngle * Math.PI / 180), cw = sw * cf, ch = sh * cf;
      corrected = '<rect x="' + (cx - cw / 2) + '" y="' + (cy - ch / 2) + '" width="' + cw + '" height="' + ch + '" fill="none" stroke="' + TIER_COLORS[tier] + '" stroke-width="2" stroke-dasharray="6 4"/>';
    }
    frontSvg.innerHTML =
      '<rect x="' + sx + '" y="' + sy + '" width="' + sw + '" height="' + sh + '" fill="' + PANEL + '" stroke="' + NAVY + '" stroke-width="2"/>' +
      landed + corrected +
      '<text x="160" y="170" font-size="10" fill="' + MUTED + '" text-anchor="middle">' +
        (state.aim === 'straight' ? 'blue = where the image lands pointing straight' : 'blue = image as it lands, turned in') + '</text>' +
      '<text x="160" y="183" font-size="10" fill="' + MUTED + '" text-anchor="middle">dashed = after correction · solid outline = your screen</text>';
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
