/* Budget Projectors — mobile nav + throw-distance calculator (vanilla JS) */
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

  /* Throw-distance calculator — per-model ratios from js/throw-data.js.
     Screen width (in) = diagonal * 0.8716 (16:9). */
  var WIDTH_FACTOR = 0.8716; // 16:9 width as fraction of diagonal
  var THROW = window.THROW_DATA || [];

  function fmt(n, digits) {
    return Number(n).toLocaleString('en-US', {
      minimumFractionDigits: digits, maximumFractionDigits: digits
    });
  }

  /* Tabs */
  var tabs = document.querySelectorAll('.calc__tab');
  var panels = document.querySelectorAll('.calc__panel');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) { t.classList.remove('active'); });
      panels.forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      var panel = document.getElementById(tab.getAttribute('data-panel'));
      if (panel) panel.classList.add('active');
      recalc();
    });
  });

  /* Model picker state */
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
    return selectedModel ? selectedModel.t : null;
  }

  function clearChips() {
    document.querySelectorAll('.calc__chip').forEach(function (c) {
      c.classList.remove('chosen');
    });
  }

  function chooseModel(entry, chip) {
    selectedModel = entry;
    if (modelInput) modelInput.value = entry.b + ' ' + entry.m;
    if (suggest) { suggest.hidden = true; suggest.innerHTML = ''; }
    if (manualBox) manualBox.hidden = true;
    clearChips();
    if (chip) chip.classList.add('chosen');
    if (selectedLine) {
      selectedLine.hidden = false;
      selectedLine.textContent = 'Using ' + entry.b + ' ' + entry.m + ' · throw ' + ratioLabel(entry.t);
    }
    recalc();
  }

  function renderSuggest(q) {
    if (!suggest || !modelInput) return;
    if (q.length < 2) { suggest.hidden = true; suggest.innerHTML = ''; return; }
    var matches = THROW.filter(function (x) {
      return (x.b + ' ' + x.m).toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
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
      btn.appendChild(document.createTextNode(x.m + ' · ' + ratioLabel(x.t)));
      btn.addEventListener('click', function () { chooseModel(x, null); });
      suggest.appendChild(btn);
    });
    suggest.hidden = false;
    modelInput.setAttribute('aria-expanded', 'true');
  }

  if (modelInput) {
    modelInput.addEventListener('input', function () {
      selectedModel = null;
      if (selectedLine) selectedLine.hidden = true;
      clearChips();
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

  document.querySelectorAll('.calc__chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
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
      selectedModel = null;
      if (modelInput) modelInput.value = '';
      if (selectedLine) selectedLine.hidden = true;
      clearChips();
      if (suggest) suggest.hidden = true;
      manualBox.hidden = !manualBox.hidden;
      recalc();
    });
  }
  [ratioMinInput, ratioMaxInput].forEach(function (el) {
    if (el) el.addEventListener('input', recalc);
  });

  function fmtDist(inches) {
    var ft = inches / 12;
    if (inches < 36) return fmt(inches, 0) + ' in';
    return fmt(ft, 1) + ' ft';
  }

  function noModelMsg() {
    return '<strong>Pick your model first</strong>' +
      '<span>Choose your projector from the list above (or enter its throw ratio manually) and the numbers will appear here.</span>';
  }

  /* Mode 1: screen size -> throw distance */
  var sizeInput = document.getElementById('calc-size');
  var sizeResult = document.getElementById('calc-size-result');

  /* Mode 2: distance -> screen size */
  var distInput = document.getElementById('calc-dist');
  var distResult = document.getElementById('calc-dist-result');

  function recalc() {
    var r = currentRatio();
    var ust = r && r[1] < 1;
    var ustNote = ust ? ' Ultra-short-throw: measure from the wall, not the lens.' : '';

    if (sizeInput && sizeResult && document.getElementById('panel-size').classList.contains('active')) {
      var diag = parseFloat(sizeInput.value, 10);
      if (!diag || diag <= 0) { sizeResult.classList.remove('show'); }
      else if (!r) {
        sizeResult.innerHTML = noModelMsg();
        sizeResult.classList.add('show');
      } else {
        var widthIn = diag * WIDTH_FACTOR;
        var nearIn = widthIn * r[0];
        var farIn = widthIn * r[1];
        var label = selectedModel ? selectedModel.b + ' ' + selectedModel.m : 'throw ' + ratioLabel(r);
        sizeResult.innerHTML =
          '<strong>' + fmtDist(nearIn) + ' – ' + fmtDist(farIn) + '</strong>' +
          '<span>Place the ' + label + ' between ' + fmtDist(nearIn) + ' and ' +
          fmtDist(farIn) + ' from a ' + fmt(diag, 0) + '&Prime; 16:9 screen.' + ustNote + '</span>';
        sizeResult.classList.add('show');
      }
    }

    if (distInput && distResult && document.getElementById('panel-dist').classList.contains('active')) {
      var ft = parseFloat(distInput.value, 10);
      if (!ft || ft <= 0) { distResult.classList.remove('show'); }
      else if (!r) {
        distResult.innerHTML = noModelMsg();
        distResult.classList.add('show');
      } else {
        var distIn = ft * 12;
        var diagMax = distIn / r[0] / WIDTH_FACTOR;
        var diagMin = distIn / r[1] / WIDTH_FACTOR;
        var label2 = selectedModel ? selectedModel.b + ' ' + selectedModel.m : 'throw ' + ratioLabel(r);
        distResult.innerHTML =
          '<strong>' + fmt(diagMin, 0) + '&Prime; – ' + fmt(diagMax, 0) + '&Prime; diagonal</strong>' +
          '<span>From ' + fmt(ft, 1) + ' ft away, the ' + label2 + ' fills roughly a ' +
          fmt(diagMin, 0) + '&Prime; to ' + fmt(diagMax, 0) + '&Prime; 16:9 screen.' + ustNote + '</span>';
        distResult.classList.add('show');
      }
    }
  }

  if (sizeInput) sizeInput.addEventListener('input', recalc);
  if (distInput) distInput.addEventListener('input', recalc);
})();
