/* Side-by-side projector comparison.
   Data: window.SPEC_DATA (js/spec-data.js, hand-verified full specs for a
   curated set) merged with window.COMPARE_DATA (js/compare-data.js, the full
   model database: resolution, published lumens, throw ratio, lens shift
   where published). Curated entries win on a name match. */
(function () {
  'use strict';

  var AMAZON_SEARCH = 'https://www.amazon.com/s?k=';
  var AMAZON_TAG = 'brandonkinney-20';
  var EBAY_CAMID = '5339116943';
  var EBAY_MKRID = '711-53200-19255-0';

  // Dedicated Impact affiliate links for JMGO / XGIMI models.
  var BRAND_LINKS = {
    'JMGO|IRIS Ultra': { label: 'JMGO', url: 'https://affiliate.jmgo.com/OYv0dG' },
    'JMGO|IRIS Ultra Max': { label: 'JMGO', url: 'https://affiliate.jmgo.com/JkvXAN' },
    'JMGO|N3 Ultimate': { label: 'JMGO', url: 'https://affiliate.jmgo.com/NGygxq' },
    'XGIMI|HORIZON 20': { label: 'XGIMI', url: 'https://xgimi.sjv.io/R0dbmb' },
    'XGIMI|HORIZON 20 Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/MKdbyo' },
    'XGIMI|HORIZON 20 Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/qW6yZL' },
    'XGIMI|TITAN': { label: 'XGIMI', url: 'https://xgimi.sjv.io/DWd3en' },
    'XGIMI|Halo+ GTV': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhalo-plus' },
    'XGIMI|Horizon S Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-s-max' },
    'XGIMI|MoGo 4': { label: 'XGIMI', url: 'https://xgimi.sjv.io/5k0nYN' },
    'XGIMI|Halo+': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhalo-plus' },
    'XGIMI|MoGo 2 Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNbj' },
    'XGIMI|HORIZON Ultra': { label: 'XGIMI', url: 'https://xgimi.sjv.io/QYdb43' },
    'XGIMI|MoGo 3 Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fmogo-3-pro' },
    'XGIMI|MoGo 4 Laser': { label: 'XGIMI', url: 'https://xgimi.sjv.io/1Gd7Rm' },
    'XGIMI|Elfin Flip Plus': { label: 'XGIMI', url: 'https://xgimi.sjv.io/X49NOg' },
    'XGIMI|Horizon Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-pro' },
    'XGIMI|HORIZON S Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-s-pro' },
    'XGIMI|Elfin Flip Laser': { label: 'XGIMI', url: 'https://xgimi.sjv.io/2R0dyQ' },
    'XGIMI|Elfin Flip 4K': { label: 'XGIMI', url: 'https://xgimi.sjv.io/0GKPyJ' },
    'XGIMI|AURA 3 Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fpages%2Faura-3-max' },
    'XGIMI|HORIZON 30 Ultra Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-30-ultra-max' },
    'XGIMI|HORIZON 30 Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-30-pro' },
    'XGIMI|HORIZON 30 Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhorizon-30-max' },
    'XGIMI|Elfin': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Felfin' },
    'XGIMI|Elfin Flip': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Felfin-flip' },
    'XGIMI|Halo': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhalo' },
    'XGIMI|Halo+ (New)': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fhalo-plus-new' },
    'XGIMI|HORIZON': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fpages%2Fhorizon' },
    'XGIMI|MoGo Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fmogo-pro' },
    'XGIMI|MoGo Pro+': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fmogo-pro-plus' },
    'XGIMI|TITAN Noir Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/6kMEoG' },
    'XGIMI|TITAN Noir Pro': { label: 'XGIMI', url: 'https://xgimi.sjv.io/n46yoX' },
    'XGIMI|TITAN Noir': { label: 'XGIMI', url: 'https://xgimi.sjv.io/gRXG69' },
    'XGIMI|Aura 2': { label: 'XGIMI', url: 'https://xgimi.sjv.io/DWd3Od' },
    'XGIMI|MoGo 2': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Fmogo-2' },
    'XGIMI|Aura': { label: 'XGIMI', url: 'https://xgimi.sjv.io/YVmNnR?u=https%3A%2F%2Fus.xgimi.com%2Fproducts%2Faura' },
    'XGIMI|Vibe One': { label: 'XGIMI', url: 'https://xgimi.sjv.io/vD6VQj' },
    'XGIMI|Vibe One Battery Powered': { label: 'XGIMI', url: 'https://xgimi.sjv.io/vD6VQj' },
  };

  var pickersEl = document.getElementById('compare-pickers');
  var tableEl = document.getElementById('compare-table');
  var headEl = document.getElementById('compare-head');
  var bodyEl = document.getElementById('compare-body');
  var emptyEl = document.getElementById('compare-empty');
  var buyEl = document.getElementById('compare-buy');
  if (!pickersEl) return;

  function fmtNum(n) {
    return String(Math.round(n * 1000) / 1000);
  }
  function fmtThrow(t) {
    if (!t) return null;
    return t[0] === t[1] ? fmtNum(t[0]) + ':1' : fmtNum(t[0]) + '-' + fmtNum(t[1]) + ':1';
  }
  function fmtShiftRange(r) {
    if (!r) return '';
    var a = r[0], b = r[1];
    if (a === 0 && b === 0) return '';
    if (a === -b) return '±' + fmtNum(Math.abs(b)) + '%';
    if (a === b) return fmtNum(a) + '%';
    return fmtNum(a) + '% to ' + fmtNum(b) + '%';
  }
  function fmtShift(sv, sh) {
    var parts = [];
    var v = fmtShiftRange(sv), h = fmtShiftRange(sh);
    if (v) parts.push('Vertical ' + v);
    if (h) parts.push('Horizontal ' + h);
    return parts.length ? parts.join(', ') : null;
  }

  // Build the merged model list.
  var DATA = [];
  var seenKeys = {};
  (window.SPEC_DATA || []).forEach(function (d) {
    DATA.push(d);
    seenKeys[(d.brand + '|' + d.model).toUpperCase()] = true;
  });
  (window.COMPARE_DATA || []).forEach(function (e) {
    var key = (e.b + '|' + e.m).toUpperCase();
    if (seenKeys[key]) return;
    seenKeys[key] = true;
    DATA.push({
      brand: e.b,
      model: e.m,
      resolution: e.r || null,
      ansiLumens: e.lm || null,
      lumensNote: e.lm ? 'manufacturer rated' : null,
      throwRatio: fmtThrow(e.t),
      lightSource: null,
      inputLagMs: null,
      lensShift: fmtShift(e.sv, e.sh),
      contrast: null
    });
  });

  if (!DATA.length) {
    emptyEl.textContent = 'Comparison data is loading, please refresh in a moment.';
    return;
  }

  // Present the list grouped by brand, brand A-Z and model A-Z within brand.
  DATA.sort(function (a, b) {
    var ka = (a.brand + ' ' + a.model).toUpperCase();
    var kb = (b.brand + ' ' + b.model).toUpperCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  var SLOTS = 3;

  function amazonUrl(q) {
    return AMAZON_SEARCH + encodeURIComponent(q) + '&tag=' + AMAZON_TAG;
  }
  function ebayUrl(q) {
    return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) +
      '&mkcid=1&mkrid=' + EBAY_MKRID + '&siteid=0&campid=' + EBAY_CAMID + '&toolid=80005&mkevt=1';
  }

  function modelKey(d) { return d.brand + '|' + d.model; }
  function modelName(d) { return d.brand + ' ' + d.model; }

  // Name lookup for the default picks (first entry wins on duplicate names).
  var NAME2IDX = {};
  DATA.forEach(function (d, i) {
    var k = modelName(d).toUpperCase();
    if (!(k in NAME2IDX)) NAME2IDX[k] = i;
  });

  // Brand list (A-Z) and each brand's model indexes (A-Z, DATA is sorted).
  var BRANDS = [];
  var MODELS_BY_BRAND = {};
  DATA.forEach(function (d, i) {
    if (!MODELS_BY_BRAND[d.brand]) {
      MODELS_BY_BRAND[d.brand] = [];
      BRANDS.push(d.brand);
    }
    MODELS_BY_BRAND[d.brand].push(i);
  });
  BRANDS.sort(function (a, b) {
    var ka = a.toUpperCase(), kb = b.toUpperCase();
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });

  var DEFAULT_PICKS = ['JMGO IRIS Ultra', 'XGIMI HORIZON 20', 'BenQ X3100i'];
  var picks = DEFAULT_PICKS.map(function (name) {
    var idx = NAME2IDX[name.toUpperCase()];
    return idx != null ? idx : -1;
  });
  while (picks.length < SLOTS) picks.push(-1);

  function renderPickers() {
    pickersEl.innerHTML = '';
    for (var s = 0; s < SLOTS; s++) {
      (function (slot) {
        var wrap = document.createElement('div');
        wrap.className = 'compare-picker';
        var label = document.createElement('span');
        label.className = 'calc__label';
        label.textContent = 'Projector ' + (slot + 1);
        wrap.appendChild(label);

        var brandSel = document.createElement('select');
        brandSel.setAttribute('aria-label', 'Projector ' + (slot + 1) + ' brand');
        var b0 = document.createElement('option');
        b0.value = '';
        b0.textContent = 'Select a brand…';
        brandSel.appendChild(b0);
        BRANDS.forEach(function (b) {
          var o = document.createElement('option');
          o.value = b;
          o.textContent = b;
          brandSel.appendChild(o);
        });

        var modelSel = document.createElement('select');
        modelSel.setAttribute('aria-label', 'Projector ' + (slot + 1) + ' model');

        function fillModels(brand, selectedIdx) {
          modelSel.innerHTML = '';
          var m0 = document.createElement('option');
          m0.value = '';
          m0.textContent = brand ? 'Select a model…' : 'Pick a brand first';
          modelSel.appendChild(m0);
          (MODELS_BY_BRAND[brand] || []).forEach(function (idx) {
            var o = document.createElement('option');
            o.value = String(idx);
            o.textContent = DATA[idx].model;
            modelSel.appendChild(o);
          });
          modelSel.disabled = !brand;
          modelSel.value = selectedIdx >= 0 ? String(selectedIdx) : '';
        }

        brandSel.addEventListener('change', function () {
          picks[slot] = -1;
          fillModels(brandSel.value, -1);
          renderTable();
        });
        modelSel.addEventListener('change', function () {
          picks[slot] = modelSel.value === '' ? -1 : parseInt(modelSel.value, 10);
          renderTable();
        });

        // Initial state from the current pick.
        var cur = picks[slot] >= 0 && DATA[picks[slot]] ? DATA[picks[slot]] : null;
        brandSel.value = cur ? cur.brand : '';
        fillModels(cur ? cur.brand : '', picks[slot]);

        wrap.appendChild(brandSel);
        wrap.appendChild(modelSel);
        pickersEl.appendChild(wrap);
      })(s);
    }
  }

  function specRows(d) {
    return [
      ['Resolution', d.resolution],
      ['Brightness', d.ansiLumens ? (d.lumensNote
          ? d.ansiLumens.toLocaleString('en-US') + ' lumens (' + d.lumensNote + ')'
          : d.ansiLumens.toLocaleString('en-US') + ' ANSI lumens') : null],
      ['Throw ratio', d.throwRatio],
      ['Light source', d.lightSource],
      ['Input lag', d.inputLagMs != null ? d.inputLagMs + ' ms' : null],
      ['Lens shift', d.lensShift],
      ['Contrast (claimed)', d.contrast]
    ];
  }

  function renderTable() {
    var chosen = picks.filter(function (i) { return i >= 0 && DATA[i]; })
                      .map(function (i) { return DATA[i]; });
    // De-dupe.
    var seen = {};
    chosen = chosen.filter(function (d) {
      var k = modelKey(d);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    if (!chosen.length) {
      tableEl.hidden = true;
      buyEl.innerHTML = '';
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    tableEl.hidden = false;

    headEl.innerHTML = '';
    var corner = document.createElement('th');
    corner.textContent = 'Spec';
    headEl.appendChild(corner);
    chosen.forEach(function (d) {
      var th = document.createElement('th');
      th.textContent = modelName(d);
      headEl.appendChild(th);
    });

    bodyEl.innerHTML = '';
    var rows = specRows(chosen[0]);
    rows.forEach(function (row, ri) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      th.textContent = row[0];
      tr.appendChild(th);
      chosen.forEach(function (d) {
        var td = document.createElement('td');
        var v = specRows(d)[ri][1];
        td.textContent = v != null ? v : '—';
        tr.appendChild(td);
      });
      bodyEl.appendChild(tr);
    });

    // Buy buttons + disclosure.
    buyEl.innerHTML = '';
    var disc = document.createElement('p');
    disc.className = 'calc__hint';
    disc.textContent = 'Disclosure: As an Amazon Associate, I earn from qualifying purchases. I also earn from qualifying eBay, JMGO, and XGIMI purchases made through these links.';
    buyEl.appendChild(disc);
    chosen.forEach(function (d) {
      var q = modelName(d);
      var row = document.createElement('div');
      row.className = 'compare-buyrow';
      var name = document.createElement('strong');
      name.textContent = q;
      row.appendChild(name);
      var links = document.createElement('span');
      var bl = BRAND_LINKS[modelKey(d)];
      var items = [];
      if (bl) items.push({ t: 'Buy at ' + bl.label, u: bl.url });
      items.push({ t: 'Amazon', u: amazonUrl(q + ' projector') });
      items.push({ t: 'eBay', u: ebayUrl(q + ' projector') });
      items.forEach(function (it, i) {
        if (i) links.appendChild(document.createTextNode(' · '));
        var a = document.createElement('a');
        a.href = it.u;
        a.target = '_blank';
        a.rel = 'nofollow sponsored noopener';
        a.textContent = it.t;
        links.appendChild(a);
      });
      row.appendChild(links);
      buyEl.appendChild(row);
    });
  }

  renderPickers();
  renderTable();
})();
