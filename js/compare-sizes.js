/* TV vs projector screen comparison: dimensions, area, viewing angle, to-scale diagram. */
(function () {
  'use strict';

  // Width/height factors per unit of diagonal for common aspect ratios.
  function wh(diag, ar) {
    var a = ar === '2.39' ? 2.39 : 16 / 9;
    var d = Math.sqrt(a * a + 1);
    return { w: diag * a / d, h: diag / d };
  }

  var tvSize = document.getElementById('cs-tv');
  var tvVal = document.getElementById('cs-tv-val');
  var scrSize = document.getElementById('cs-screen');
  var scrVal = document.getElementById('cs-screen-val');
  var scrAr = document.getElementById('cs-ar');
  var seat = document.getElementById('cs-seat');
  var seatVal = document.getElementById('cs-seat-val');
  var out = document.getElementById('cs-result');
  var svg = document.getElementById('cs-svg');
  if (!tvSize || !scrSize || !seat || !out) return;

  function chosenAr() {
    var b = scrAr.querySelector('.calc__chip.chosen');
    return b ? b.getAttribute('data-ar') : '16:9';
  }

  function fmt(n, d) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function angleDeg(wIn, seatFt) {
    return 2 * Math.atan((wIn / 2) / (seatFt * 12)) * 180 / Math.PI;
  }

  function update() {
    var tvD = parseFloat(tvSize.value, 10);
    var scrD = parseFloat(scrSize.value, 10);
    var seatFt = parseFloat(seat.value, 10);
    var ar = chosenAr();

    tvVal.textContent = tvD + '\u2033';
    scrVal.textContent = scrD + '\u2033 ' + (ar === '2.39' ? '2.39:1' : '16:9');
    seatVal.textContent = seatFt + ' ft';

    var tv = wh(tvD, '16:9'), sc = wh(scrD, ar);
    var tvArea = tv.w * tv.h / 144, scArea = sc.w * sc.h / 144;
    var ratio = scArea / tvArea;
    var tvAng = angleDeg(tv.w, seatFt), scAng = angleDeg(sc.w, seatFt);

    out.innerHTML =
      '<p class="calc__big">' + fmt(ratio, 1) + '&times; the picture area</p>' +
      '<p class="calc__verdict-line">TV: ' + fmt(tv.w, 0) + '&Prime; &times; ' + fmt(tv.h, 0) +
      '&Prime; (' + fmt(tvArea, 1) + ' sq ft, ' + fmt(tvAng, 0) + '&deg; viewing angle) vs screen: ' +
      fmt(sc.w, 0) + '&Prime; &times; ' + fmt(sc.h, 0) + '&Prime; (' + fmt(scArea, 1) + ' sq ft, ' +
      fmt(scAng, 0) + '&deg; viewing angle) at ' + seatFt + ' ft.</p>' +
      '<p class="calc__hint">A ' + scrD + '\u2033 screen has about ' + Math.round((ratio - 1) * 100) +
      '% more picture area than a ' + tvD + '\u2033 TV. That is the number your eyes actually notice.</p>';

    draw(tv, sc);
  }

  function draw(tv, sc) {
    var NS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = 660, H = 340, pad = 30, personH = 72; // 6-ft person, inches
    var maxW = Math.max(tv.w, sc.w), maxH = Math.max(tv.h, sc.h, personH);
    var s = Math.min((W - pad * 3 - 60) / (tv.w + sc.w), (H - pad * 2) / maxH);
    s = Math.min(s, (W - pad * 2) / maxW);

    function rect(x, y, w, h, fill, stroke, label) {
      var r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x); r.setAttribute('y', y);
      r.setAttribute('width', Math.max(w, 2)); r.setAttribute('height', Math.max(h, 2));
      r.setAttribute('fill', fill); r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', '2');
      svg.appendChild(r);
      var t = document.createElementNS(NS, 'text');
      t.setAttribute('x', x + w / 2); t.setAttribute('y', y - 8);
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#dbe4f5');
      t.setAttribute('font-size', '14');
      t.textContent = label;
      svg.appendChild(t);
    }

    var baseY = H - pad;
    var tvW = tv.w * s, tvH = tv.h * s, scW = sc.w * s, scH = sc.h * s;
    var gap = 60;
    var totalW = tvW + scW + gap;
    var x0 = (W - totalW) / 2;

    rect(x0, baseY - tvH, tvW, tvH, '#16305e', '#5b8def', 'TV');
    rect(x0 + tvW + gap, baseY - scH, scW, scH, '#0e2a5c', '#ffd166', 'Screen');

    // 6-ft person silhouette for scale.
    var px = x0 + totalW + 24, ph = personH * s, pw = 22;
    var c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', px + pw / 2); c.setAttribute('cy', baseY - ph - 8);
    c.setAttribute('r', 9); c.setAttribute('fill', '#8fa3c8');
    svg.appendChild(c);
    var b = document.createElementNS(NS, 'rect');
    b.setAttribute('x', px); b.setAttribute('y', baseY - ph);
    b.setAttribute('width', pw); b.setAttribute('height', ph);
    b.setAttribute('rx', 8); b.setAttribute('fill', '#8fa3c8');
    svg.appendChild(b);
    var t = document.createElementNS(NS, 'text');
    t.setAttribute('x', px + pw / 2); t.setAttribute('y', baseY + 18);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', '#8fa3c8');
    t.setAttribute('font-size', '12');
    t.textContent = '6 ft';
    svg.appendChild(t);
  }

  function chipify() {
    scrAr.addEventListener('click', function (e) {
      var b = e.target.closest('.calc__chip');
      if (!b) return;
      scrAr.querySelectorAll('.calc__chip').forEach(function (c) { c.classList.remove('chosen'); });
      b.classList.add('chosen');
      update();
    });
  }

  [tvSize, scrSize, seat].forEach(function (el) { el.addEventListener('input', update); });
  chipify();
  update();
})();
