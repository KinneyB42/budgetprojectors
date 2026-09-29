/* Side-by-side projector comparison. Reads window.SPEC_DATA (js/spec-data.js). */
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
    'XGIMI|HORIZON 20 Max': { label: 'XGIMI', url: 'https://xgimi.sjv.io/qW6yZL' }
  };

  var pickersEl = document.getElementById('compare-pickers');
  var tableEl = document.getElementById('compare-table');
  var headEl = document.getElementById('compare-head');
  var bodyEl = document.getElementById('compare-body');
  var emptyEl = document.getElementById('compare-empty');
  var buyEl = document.getElementById('compare-buy');
  if (!pickersEl) return;

  var DATA = window.SPEC_DATA || [];
  if (!DATA.length) {
    emptyEl.textContent = 'Comparison data is loading — please refresh in a moment.';
    return;
  }

  var SLOTS = 3;
  var picks = [0, 3, 6].map(function (i) { return DATA[i] ? i : -1; });

  function amazonUrl(q) {
    return AMAZON_SEARCH + encodeURIComponent(q) + '&tag=' + AMAZON_TAG;
  }
  function ebayUrl(q) {
    return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) +
      '&mkcid=1&mkrid=' + EBAY_MKRID + '&siteid=0&campid=' + EBAY_CAMID + '&toolid=80005&mkevt=1';
  }

  function modelKey(d) { return d.brand + '|' + d.model; }
  function modelName(d) { return d.brand + ' ' + d.model; }

  function renderPickers() {
    pickersEl.innerHTML = '';
    for (var s = 0; s < SLOTS; s++) {
      (function (slot) {
        var wrap = document.createElement('div');
        wrap.className = 'compare-picker';
        var label = document.createElement('span');
        label.className = 'calc__label';
        label.textContent = 'Projector ' + (slot + 1);
        var sel = document.createElement('select');
        sel.setAttribute('aria-label', 'Projector ' + (slot + 1));
        var none = document.createElement('option');
        none.value = '-1';
        none.textContent = slot === 0 ? 'Choose a projector\u2026' : 'None';
        sel.appendChild(none);
        DATA.forEach(function (d, i) {
          var o = document.createElement('option');
          o.value = String(i);
          o.textContent = modelName(d);
          sel.appendChild(o);
        });
        sel.value = String(picks[slot]);
        sel.addEventListener('change', function () {
          picks[slot] = parseInt(sel.value, 10);
          renderTable();
        });
        wrap.appendChild(label);
        wrap.appendChild(sel);
        pickersEl.appendChild(wrap);
      })(s);
    }
  }

  function specRows(d) {
    return [
      ['Resolution', d.resolution],
      ['Brightness', d.ansiLumens ? d.ansiLumens.toLocaleString('en-US') + ' ANSI lumens' + (d.lumensNote ? ' (' + d.lumensNote + ')' : '') : null],
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
        td.textContent = v != null ? v : '\u2014';
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
        if (i) links.appendChild(document.createTextNode(' \u00b7 '));
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
