/* Budget Projectors accessibility adjustments widget (vanilla JS, no dependencies).
   Adds a floating button + panel with reader-controlled adjustments. Settings persist
   in localStorage under 'bp-a11y-v1' and are applied as classes on <html>; the visual
   effects live in css/style.css under the matching .a11y-* selectors. */
(function () {
  'use strict';

  var KEY = 'bp-a11y-v1';
  var FEATURES = [
    { id: 'text',     label: 'Larger Text',          desc: 'Increase text size across the site' },
    { id: 'contrast', label: 'High Contrast',        desc: 'Black and white with stronger contrast' },
    { id: 'links',    label: 'Highlight Links',      desc: 'Make links stand out on the page' },
    { id: 'font',     label: 'Readable Font',        desc: 'Plain sans serif font, easier to read' },
    { id: 'spacing',  label: 'Comfortable Spacing',   desc: 'More space between lines and words' },
    { id: 'motion',   label: 'Reduce Motion',        desc: 'Calm animations and scrolling' },
    { id: 'guide',    label: 'Reading Guide',        desc: 'A shaded bar follows your cursor line by line' }
  ];

  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { state = {}; }
  if (!localStorage.getItem(KEY) && window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    state.motion = true; // respect the visitor's OS setting on first visit
  }

  function apply() {
    FEATURES.forEach(function (f) {
      document.documentElement.classList.toggle('a11y-' + f.id, !!state[f.id]);
    });
    var guide = document.getElementById('a11y-guide');
    if (guide) guide.style.display = state.guide ? 'block' : 'none';
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* Skip link: first focusable element, jumps to the page heading */
  var skip = document.createElement('a');
  skip.href = '#a11y-main';
  skip.className = 'a11y-skip';
  skip.textContent = 'Skip to main content';
  skip.addEventListener('click', function (ev) {
    var h = document.querySelector('h1');
    if (h) {
      ev.preventDefault();
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: false });
    }
  });
  document.body.insertBefore(skip, document.body.firstChild);

  /* Reading guide bar */
  var guide = document.createElement('div');
  guide.id = 'a11y-guide';
  guide.setAttribute('aria-hidden', 'true');
  document.body.appendChild(guide);
  document.addEventListener('mousemove', function (ev) {
    if (state.guide) guide.style.top = (ev.clientY - 17) + 'px';
  }, { passive: true });

  /* Floating button */
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'a11y-btn';
  btn.setAttribute('aria-label', 'Accessibility adjustments');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" width="50" height="50" aria-hidden="true"><circle cx="12" cy="12" r="10.3" fill="none" stroke="#ffffff" stroke-width="1.2"/><circle cx="12" cy="7.3" r="1.85" fill="#ffffff"/><path d="M5.3 10.5 L12 12.2 L18.7 10.5" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12.2 V16.3" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round"/><path d="M12 16.1 L9.6 20.3 M12 16.1 L14.4 20.3" fill="none" stroke="#ffffff" stroke-width="2.1" stroke-linecap="round"/></svg>';
  document.body.appendChild(btn);

  /* Panel */
  var panel = document.createElement('div');
  panel.className = 'a11y-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Accessibility adjustments');
  panel.hidden = true;

  var html = '<div class="a11y-panel__head"><h2>Accessibility Adjustments</h2>' +
    '<button type="button" class="a11y-panel__close" aria-label="Close accessibility panel">&times;</button></div>';
  FEATURES.forEach(function (f) {
    html += '<div class="a11y-row"><div class="a11y-row__text"><span class="a11y-row__label">' + f.label +
      '</span><span class="a11y-row__desc">' + f.desc + '</span></div>' +
      '<button type="button" class="a11y-switch" role="switch" data-feature="' + f.id +
      '" aria-checked="' + (state[f.id] ? 'true' : 'false') + '" aria-label="' + f.label + '">' +
      '<span class="a11y-switch__knob"></span></button></div>';
  });
  html += '<button type="button" class="a11y-reset">Reset Settings</button>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  function setOpen(open) {
    panel.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var c = panel.querySelector('.a11y-panel__close');
      if (c) c.focus();
    } else {
      btn.focus();
    }
  }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  panel.querySelector('.a11y-panel__close').addEventListener('click', function () { setOpen(false); });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && !panel.hidden) setOpen(false);
  });

  panel.addEventListener('click', function (ev) {
    var sw = ev.target.closest ? ev.target.closest('.a11y-switch') : null;
    if (sw) {
      var id = sw.getAttribute('data-feature');
      state[id] = !state[id];
      sw.setAttribute('aria-checked', state[id] ? 'true' : 'false');
      save(); apply();
      return;
    }
    if (ev.target.classList && ev.target.classList.contains('a11y-reset')) {
      state = {};
      save(); apply();
      panel.querySelectorAll('.a11y-switch').forEach(function (s) {
        s.setAttribute('aria-checked', 'false');
      });
    }
  });

  apply();
})();
