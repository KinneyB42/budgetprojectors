/* Brightness calculator: screen size + lighting + gain -> ANSI lumens target. */
(function () {
  'use strict';

  // Target lumens per square foot of 16:9 screen, by room lighting.
  var TARGETS = {
    dark:    { lo: 15, hi: 25, label: 'Dark theater',
               verdict: 'In a dark room, contrast beats brightness. You need enough light to fill the screen — after that, deeper blacks matter far more than extra lumens.',
               note: 'Tip: spend the budget on contrast and black levels, not a light cannon you will run in eco mode.' },
    ambient: { lo: 35, hi: 55, label: 'Some ambient light',
               verdict: 'Some light in the room means you need real brightness to hold the image. Pair this with a gray or ALR screen and the picture stays punchy.',
               note: 'Tip: an ALR screen can matter as much as the lumen number here.' },
    bright:  { lo: 65, hi: 90, label: 'Bright living room',
               verdict: 'This is a bright room, so brightness is everything. Hit this target or plan on watching after sunset.',
               note: 'Tip: lumens alone cannot save a washed-out image — a gray or ALR screen plus light control helps enormously.' }
  };

  var sizeEl = document.getElementById('bright-size');
  var sizeVal = document.getElementById('bright-size-val');
  var lightWrap = document.getElementById('bright-light');
  var gainWrap = document.getElementById('bright-gain');
  var resultEl = document.getElementById('bright-result');
  var verdictEl = document.getElementById('bright-verdict');
  var noteEl = document.getElementById('bright-note');
  var haveEl = document.getElementById('bright-have');
  var haveResultEl = document.getElementById('bright-have-result');
  if (!sizeEl || !lightWrap || !gainWrap) return;

  function chosen(wrap, attr) {
    var b = wrap.querySelector('.calc__chip.chosen');
    return b ? b.getAttribute(attr) : null;
  }

  function round50(n) { return Math.round(n / 50) * 50; }

  function fmt(n) { return n.toLocaleString('en-US'); }

  function update() {
    var diag = parseFloat(sizeEl.value, 10);
    var light = chosen(lightWrap, 'data-light') || 'dark';
    var gain = parseFloat(chosen(gainWrap, 'data-gain') || '1.0', 10);
    var t = TARGETS[light];

    sizeVal.textContent = diag + '\u2033 diagonal';

    // 16:9 screen area in square feet from diagonal inches.
    var wIn = diag * 0.8716, hIn = diag * 0.4903;
    var area = (wIn * hIn) / 144;

    var lo = round50((area * t.lo) / gain);
    var hi = round50((area * t.hi) / gain);
    if (lo < 100) lo = 100;

    resultEl.textContent = fmt(lo) + '\u2013' + fmt(hi) + ' ANSI lumens';
    // The lm/sq-ft targets are foot-lamberts on a 1.0-gain screen; show both units.
    var nitsLo = Math.round(t.lo * 3.426), nitsHi = Math.round(t.hi * 3.426);
    verdictEl.textContent = t.verdict + ' That is about ' + t.lo + '\u2013' + t.hi +
      ' foot-lamberts (' + nitsLo + '\u2013' + nitsHi + ' nits) on your screen.';
    noteEl.textContent = t.note;

    updateHave(area, gain, t, lo, hi);
  }

  function updateHave(area, gain, t, lo, hi) {
    if (!haveEl || !haveResultEl) return;
    var lumens = parseFloat(haveEl.value, 10);
    if (!(lumens > 0)) { haveResultEl.textContent = ''; return; }
    // Foot-lamberts = lumens x gain / screen area.
    var fl = (lumens * gain) / area;
    var nits = Math.round(fl * 3.426);
    var msg = 'About ' + Math.round(fl) + ' foot-lamberts (' + nits + ' nits) on your screen. ';
    if (lumens < lo * 0.9) {
      msg += 'Below target for this room \u2014 expect a dim image, especially with the lights on.';
    } else if (lumens <= hi * 1.15) {
      msg += 'Inside the target range \u2014 brightness is not your problem.';
    } else {
      msg += 'Well above target \u2014 plenty bright. In a dark room, extra lumens past this point buy nothing; contrast matters more.';
    }
    haveResultEl.textContent = msg;
  }

  function chipify(wrap) {
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('.calc__chip');
      if (!b) return;
      wrap.querySelectorAll('.calc__chip').forEach(function (c) { c.classList.remove('chosen'); });
      b.classList.add('chosen');
      update();
    });
  }

  sizeEl.addEventListener('input', update);
  if (haveEl) haveEl.addEventListener('input', update);
  chipify(lightWrap);
  chipify(gainWrap);
  update();
})();
