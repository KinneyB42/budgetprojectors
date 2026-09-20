/* BudgetProjectors Room Finder — "find projectors for my room".
   Rank every catalog model by throw fit for the user's room + screen,
   then by published brightness on that screen.
   Affiliate links: plain retailer search URLs until Brandon supplies his tags.
   Amazon Associates rule: never show prices or ratings here. */
(function () {
  'use strict';

  /* ---------- Affiliate config: Brandon fills in his own tags ---------- */
  var AFF = {
    amazonTag: 'brandonkinney-20', /* Brandon's Associates tag, from his SiteStripe link 2026-09-20 */
    amazonSearch: 'https://www.amazon.com/s?k=',
    /* Brandon's EPN campaign params, recovered from his own tagged links 2026-09-20 */
    ebayCampid: '5339116943',
    ebayMkrid: '711-53200-19255-0'
  };

  var ASPECTS = { '16:9': [16, 9], '16:10': [16, 10], '2.35:1': [2.35, 1], '4:3': [4, 3] };
  var FT_PER_M = 3.28084;
  var BODY_ALLOW_FT = 1.5; /* projector body + cables/clearance behind the lens */
  var UST_MAX = 0.6;       /* throw ratio below this = ultra short throw */
  var MAX_RESULTS = 40;

  function $(id) { return document.getElementById(id); }

  var units = 'ft';
  var aspect = '16:9';
  var lightsOn = false;

  function chipGroup(id, attr, cb) {
    var g = $(id);
    if (!g) return;
    g.querySelectorAll('.calc__chip').forEach(function (c) {
      c.addEventListener('click', function () {
        g.querySelectorAll('.calc__chip').forEach(function (x) { x.classList.remove('chosen'); });
        c.classList.add('chosen');
        cb(c.getAttribute(attr));
      });
    });
  }

  function toFt(v) { return units === 'm' ? v / FT_PER_M : v; }
  function fromFt(v) { return units === 'm' ? v * FT_PER_M : v; }
  function fmtD(v) {
    var d = fromFt(v);
    return (Math.round(d * 10) / 10) + (units === 'm' ? ' m' : ' ft');
  }

  /* Effective throw range for a catalog entry (interchangeable lenses -> widest coverage). */
  function throwRange(e) {
    var tmin = Infinity, tmax = -Infinity;
    if (e.l && e.l.length) {
      e.l.forEach(function (L) {
        if (L[1] < tmin) tmin = L[1];
        if (L[2] > tmax) tmax = L[2];
      });
    } else if (e.t && e.t.length >= 2) {
      tmin = e.t[0]; tmax = e.t[1];
    }
    if (!(tmin <= tmax)) return null;
    return [tmin, tmax];
  }

  function badge(tmin, tmax) {
    if (tmax < UST_MAX) return 'UST';
    if (tmax <= 1.0) return 'Short throw';
    if (tmin >= 2.5) return 'Long throw';
    return 'Standard';
  }

  function brightnessVerdict(ftL) {
    if (lightsOn) {
      if (ftL < 30) return 'dim with lights on';
      if (ftL <= 60) return 'good with lights on';
      return 'bright even with lights on';
    }
    if (ftL < 12) return 'dim for a dark room';
    if (ftL <= 40) return 'good for a dark room';
    return 'very bright';
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

  function shopLink(href, label) {
    var a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'nofollow sponsored noopener';
    a.className = 'finder-shop';
    a.textContent = label;
    return a;
  }

  function find() {
    var roomLenRaw = parseFloat(($('finder-room-len') || {}).value, 10);
    var diagRaw = parseFloat(($('finder-screen') || {}).value, 10);
    var out = $('finder-results');
    var countLine = $('finder-count');
    if (!out) return;

    if (!(roomLenRaw > 0) || !(diagRaw > 0)) {
      out.innerHTML = '';
      if (countLine) {
        if (roomLenRaw > 0) countLine.textContent = 'Room length set. Now enter a screen size to see what fits.';
        else if (diagRaw > 0) countLine.textContent = 'Screen size set. Now enter your room length to see what fits.';
        else countLine.textContent = 'Enter your room length and screen size to see what fits.';
      }
      return;
    }

    var roomLenFt = toFt(roomLenRaw);
    var ar = ASPECTS[aspect] || ASPECTS['16:9'];
    var hyp = Math.sqrt(ar[0] * ar[0] + ar[1] * ar[1]);
    var wIn = diagRaw * ar[0] / hyp, hIn = diagRaw * ar[1] / hyp;
    var widthFt = wIn / 12;
    var areaSqft = (wIn / 12) * (hIn / 12);

    var data = window.THROW_DATA || [];
    var hits = [];
    data.forEach(function (e) {
      var r = throwRange(e);
      if (!r) return;
      var tmin = r[0], tmax = r[1];
      var isUst = tmax < UST_MAX;
      var placeLo, placeHi, fits;
      if (isUst) {
        fits = roomLenFt >= 4; /* needs a console, not a throw distance */
        placeLo = 0.5; placeHi = 2;
      } else {
        var minT = tmin * widthFt, maxT = tmax * widthFt;
        fits = (minT + BODY_ALLOW_FT) <= roomLenFt;
        placeLo = minT; placeHi = Math.min(maxT, roomLenFt - BODY_ALLOW_FT);
      }
      if (!fits) return;
      var ftL = (e.lm && areaSqft > 0) ? (e.lm / areaSqft) : null;
      hits.push({ e: e, tmin: tmin, tmax: tmax, isUst: isUst, placeLo: placeLo, placeHi: placeHi, ftL: ftL });
    });

    /* Rank: brightness suitability for the lighting (not raw brightness — a
       3,000 ftL light cannon is a bad pick for a bedroom) plus zoom flexibility. */
    function brightnessScore(ftL) {
      var lo = lightsOn ? 35 : 16, hi = lightsOn ? 80 : 50;
      if (ftL == null) return 0.55;
      if (ftL < lo) return Math.max(0.05, ftL / lo);
      if (ftL > hi) return Math.max(0.05, hi / ftL);
      return 1;
    }
    hits.forEach(function (h) {
      var flex = Math.min(1, (h.tmax - h.tmin) / 1.0);
      h.score = 0.7 * brightnessScore(h.ftL) + 0.3 * flex;
    });
    hits.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      var an = (a.e.b + ' ' + a.e.m).toLowerCase(), bn = (b.e.b + ' ' + b.e.m).toLowerCase();
      return an < bn ? -1 : an > bn ? 1 : 0;
    });

    var total = hits.length;
    if (countLine) {
      countLine.textContent = total === 0
        ? 'No models fit that room and screen.'
        : total + ' of ' + data.length.toLocaleString() + ' models fit your room.';
    }

    out.innerHTML = '';
    if (!total) {
      var tip = document.createElement('p');
      tip.className = 'finder-tip';
      tip.textContent = 'Tight room? Try a smaller screen, or look at ultra short throw models — they sit inches from the wall instead of across the room.';
      out.appendChild(tip);
      return;
    }
    if (total < 10) {
      var tip2 = document.createElement('p');
      tip2.className = 'finder-tip';
      tip2.textContent = 'Tight fit — most of these need the projector near the back wall. Ultra short throw rows below sit inches from the wall.';
      out.appendChild(tip2);
    }

    hits.slice(0, MAX_RESULTS).forEach(function (h) {
      var e = h.e;
      var row = document.createElement('div');
      row.className = 'finder-row';

      var main = document.createElement('div');
      main.className = 'finder-main';
      var name = document.createElement('div');
      name.className = 'finder-name';
      name.textContent = e.b + ' ' + e.m;
      var bd = document.createElement('span');
      bd.className = 'finder-badge';
      bd.textContent = badge(h.tmin, h.tmax);
      name.appendChild(bd);
      main.appendChild(name);

      var stats = document.createElement('div');
      stats.className = 'finder-stats';
      var bits = [];
      bits.push(h.isUst ? 'Sits inches from the wall' : 'Place ' + fmtD(h.placeLo) + '–' + fmtD(h.placeHi) + ' from screen');
      if (h.ftL != null) bits.push('~' + Math.round(h.ftL) + ' ftL — ' + brightnessVerdict(h.ftL));
      else bits.push('brightness not published');
      if (e.l && e.l.length) bits.push(e.l.length + ' lens options');
      stats.textContent = bits.join(' · ');
      main.appendChild(stats);
      row.appendChild(main);

      var actions = document.createElement('div');
      actions.className = 'finder-actions';
      var plan = document.createElement('button');
      plan.type = 'button';
      plan.className = 'finder-plan';
      plan.textContent = 'Plan in calculator';
      plan.addEventListener('click', function () { planInCalculator(e, diagRaw, roomLenRaw); });
      actions.appendChild(plan);
      var q = e.b + ' ' + e.m;
      var shopBtn = document.createElement('button');
      shopBtn.type = 'button';
      shopBtn.className = 'finder-plan';
      shopBtn.setAttribute('aria-expanded', 'false');
      shopBtn.textContent = 'Shop';
      var shopRow = document.createElement('div');
      shopRow.className = 'finder-shop-row';
      shopRow.hidden = true;
      shopRow.appendChild(shopLink(amazonUrl(q), 'Amazon'));
      shopRow.appendChild(shopLink(ebayUrl(q), 'eBay'));
      shopBtn.addEventListener('click', function () {
        var open = shopRow.hidden;
        shopRow.hidden = !open;
        shopBtn.setAttribute('aria-expanded', String(open));
      });
      actions.appendChild(shopBtn);
      row.appendChild(actions);
      row.appendChild(shopRow);

      out.appendChild(row);
    });

    if (total > MAX_RESULTS) {
      var more = document.createElement('p');
      more.className = 'finder-tip';
      more.textContent = 'Showing the top ' + MAX_RESULTS + ' best matches. Narrow the screen size to shorten the list.';
      out.appendChild(more);
    }
  }

  /* Load a finder result into the main throw-distance calculator. */
  function planInCalculator(entry, diag, roomLenRaw) {
    var sizeSlider = $('calc-size'), sizeNum = $('calc-size-num');
    var d = Math.max(20, Math.min(300, Math.round(diag)));
    [sizeSlider, sizeNum].forEach(function (el) {
      if (!el) return;
      el.value = d;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    var chip = document.querySelector('#calc-aspect-std .calc__chip[data-ar="' + aspect + '"]');
    if (chip) chip.click();
    var len = $('calc-room-len');
    if (len) {
      len.value = units === 'm' ? (roomLenRaw / FT_PER_M).toFixed(1) : roomLenRaw.toFixed(1);
      len.dispatchEvent(new Event('input', { bubbles: true }));
      len.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (window.BPChooseModel) window.BPChooseModel(entry);
    var calc = $('calculator');
    if (calc && calc.scrollIntoView) calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  chipGroup('finder-units', 'data-u', function (v) { units = v; find(); });
  chipGroup('finder-aspect', 'data-ar', function (v) { aspect = v; find(); });
  chipGroup('finder-lights', 'data-l', function (v) { lightsOn = (v === 'on'); find(); });

  var btn = $('finder-go');
  if (btn) btn.addEventListener('click', find);
  ['finder-room-len', 'finder-screen'].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') find(); });
  });
})();
