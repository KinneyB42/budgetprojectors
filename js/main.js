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

  /* Throw-distance calculator — standard 16:9 math.
     Screen width (in) = diagonal * 0.8716. Throw ratio range 1.2x–1.5x
     is a common span for home projectors; users should confirm their
     exact model spec. */
  var WIDTH_FACTOR = 0.8716; // 16:9 width as fraction of diagonal
  var RATIO_MIN = 1.2;
  var RATIO_MAX = 1.5;

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
    });
  });

  /* Mode 1: screen size -> throw distance */
  var sizeInput = document.getElementById('calc-size');
  var sizeResult = document.getElementById('calc-size-result');
  if (sizeInput && sizeResult) {
    sizeInput.addEventListener('input', function () {
      var diag = parseFloat(sizeInput.value, 10);
      if (!diag || diag <= 0) { sizeResult.classList.remove('show'); return; }
      var widthIn = diag * WIDTH_FACTOR;
      var nearFt = (widthIn * RATIO_MIN) / 12;
      var farFt = (widthIn * RATIO_MAX) / 12;
      sizeResult.innerHTML =
        '<strong>' + fmt(nearFt, 1) + ' – ' + fmt(farFt, 1) + ' ft</strong>' +
        '<span>Place the projector between ' + fmt(nearFt, 1) + ' ft and ' +
        fmt(farFt, 1) + ' ft from a ' + fmt(diag, 0) +
        '&Prime; 16:9 screen (based on a typical 1.2x&ndash;1.5x throw ratio). ' +
        'Check your projector&rsquo;s exact throw ratio for the precise number.</span>';
      sizeResult.classList.add('show');
    });
  }

  /* Mode 2: distance -> max screen size */
  var distInput = document.getElementById('calc-dist');
  var distResult = document.getElementById('calc-dist-result');
  if (distInput && distResult) {
    distInput.addEventListener('input', function () {
      var ft = parseFloat(distInput.value, 10);
      if (!ft || ft <= 0) { distResult.classList.remove('show'); return; }
      var widthIn = ft * 12;
      var diagMax = widthIn / RATIO_MIN / WIDTH_FACTOR; // longest throw -> biggest screen
      var diagMin = widthIn / RATIO_MAX / WIDTH_FACTOR; // shortest throw -> smallest screen
      distResult.innerHTML =
        '<strong>Up to ' + fmt(diagMax, 0) + '&Prime; diagonal</strong>' +
        '<span>From ' + fmt(ft, 1) + ' ft away you can fill roughly a ' +
        fmt(diagMin, 0) + '&Prime; to ' + fmt(diagMax, 0) +
        '&Prime; 16:9 screen (typical 1.2x&ndash;1.5x throw ratio). ' +
        'Check your projector&rsquo;s exact throw ratio for the precise number.</span>';
      distResult.classList.add('show');
    });
  }
})();
