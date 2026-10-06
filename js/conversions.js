/* Unit conversions: type in any box, the others follow. */
(function () {
  'use strict';

  function num(v) { var n = parseFloat(v, 10); return isFinite(n) ? n : NaN; }
  function set(el, v, d) {
    el.value = isFinite(v) ? Number(v.toFixed(d === undefined ? 2 : d)).toString() : '';
  }
  function pair(a, b, fwd, back, d) {
    a.addEventListener('input', function () { var v = num(a.value); set(b, fwd(v), d); });
    b.addEventListener('input', function () { var v = num(b.value); set(a, back(v), d); });
  }
  function ids() {
    var o = {};
    for (var i = 0; i < arguments.length; i++) o[arguments[i]] = document.getElementById('cv-' + arguments[i]);
    return o;
  }

  // 1. Screen brightness: foot-lamberts <-> nits.
  var br = ids('ftl', 'nits');
  if (br.ftl && br.nits) pair(br.ftl, br.nits, function (v) { return v * 3.426; }, function (v) { return v / 3.426; }, 1);

  // 2. Room light: foot-candles <-> lux.
  var li = ids('fc', 'lux');
  if (li.fc && li.lux) pair(li.fc, li.lux, function (v) { return v * 10.764; }, function (v) { return v / 10.764; }, 1);

  // 3. Length: inches <-> feet <-> cm <-> meters (inches is the hub).
  var len = ids('in', 'ft', 'cm', 'm');
  if (len.in && len.ft && len.cm && len.m) {
    var boxes = [len.in, len.ft, len.cm, len.m];
    var toIn = [function (v) { return v; }, function (v) { return v * 12; },
                function (v) { return v / 2.54; }, function (v) { return v * 39.3701; }];
    boxes.forEach(function (box, i) {
      box.addEventListener('input', function () {
        var inches = toIn[i](num(box.value));
        set(len.in, inches, 2); set(len.ft, inches / 12, 2);
        set(len.cm, inches * 2.54, 1); set(len.m, inches / 39.3701, 3);
        if (!isFinite(inches)) boxes.forEach(function (b2) { if (b2 !== box) b2.value = ''; });
      });
    });
  }

  // 4. Lumens -> screen brightness: lumens + diagonal + aspect + gain -> ftL/nits.
  var lb = ids('lumens', 'ldiag', 'lgain', 'lftl', 'lnits', 'larea');
  if (lb.lumens && lb.lftl) {
    var arBtns = document.querySelectorAll('[data-cv-ar]');
    function arVal() {
      for (var i = 0; i < arBtns.length; i++) if (arBtns[i].classList.contains('chosen')) return arBtns[i].getAttribute('data-cv-ar');
      return '16:9';
    }
    function calcLumens() {
      var lum = num(lb.lumens.value), dg = num(lb.ldiag.value), gn = num(lb.lgain.value) || 1;
      if (!(lum > 0) || !(dg > 0)) { lb.lftl.value = ''; lb.lnits.value = ''; if (lb.larea) lb.larea.textContent = ''; return; }
      var a = arVal() === '2.39' ? 2.39 : 16 / 9, d = Math.sqrt(a * a + 1);
      var area = (dg * a / d) * (dg / d) / 144;
      var fl = lum * gn / area;
      set(lb.lftl, fl, 1); set(lb.lnits, fl * 3.426, 0);
      if (lb.larea) lb.larea.textContent = 'on ' + area.toFixed(1) + ' sq ft of screen';
    }
    [lb.lumens, lb.ldiag, lb.lgain].forEach(function (el) { el.addEventListener('input', calcLumens); });
    for (var i = 0; i < arBtns.length; i++) arBtns[i].addEventListener('click', function () {
      for (var j = 0; j < arBtns.length; j++) arBtns[j].classList.remove('chosen');
      this.classList.add('chosen'); calcLumens();
    });
  }

  // 5. Throw ratio: ratio + image width -> throw distance.
  var th = ids('tratio', 'twidth', 'tdist');
  if (th.tratio && th.tdist) {
    function calcThrow() {
      var r = num(th.tratio.value), w = num(th.twidth.value);
      if (r > 0 && w > 0) { var inches = r * w; set(th.tdist, inches / 12, 2); }
      else th.tdist.value = '';
    }
    th.tratio.addEventListener('input', calcThrow);
    th.twidth.addEventListener('input', calcThrow);
  }

  // 6. Viewing angle: width + seat distance -> angle; angle + width -> seat distance.
  var va = ids('vwidth', 'vdist', 'vang', 'awidth', 'aang', 'adist');
  if (va.vwidth && va.vang) {
    va.vwidth.addEventListener('input', vaCalc); va.vdist.addEventListener('input', vaCalc);
    function vaCalc() {
      var w = num(va.vwidth.value), d = num(va.vdist.value);
      set(va.vang, (w > 0 && d > 0) ? 2 * Math.atan((w / 2) / (d * 12)) * 180 / Math.PI : NaN, 1);
    }
    va.awidth.addEventListener('input', vaCalc2); va.aang.addEventListener('input', vaCalc2);
    function vaCalc2() {
      var w = num(va.awidth.value), a = num(va.aang.value);
      set(va.adist, (w > 0 && a > 0 && a < 180) ? ((w / 2) / Math.tan(a * Math.PI / 360)) / 12 : NaN, 1);
    }
  }

  // 7. Contrast: ratio -> stops + black level as % of white.
  var ct = ids('cratio', 'cstops', 'cblack');
  if (ct.cratio && ct.cstops) {
    ct.cratio.addEventListener('input', function () {
      var r = num(ct.cratio.value);
      set(ct.cstops, r > 0 ? Math.log(r) / Math.log(2) : NaN, 2);
      set(ct.cblack, r > 0 ? 100 / r : NaN, 4);
    });
  }
})();
