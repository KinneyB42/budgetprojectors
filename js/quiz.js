/* "Find your projector in 60 seconds" quiz. Reads window.QUIZ_MODELS (js/quiz-data.js). */
(function () {
  'use strict';

  var AMAZON_SEARCH = 'https://www.amazon.com/s?k=';
  var AMAZON_TAG = 'brandonkinney-20';
  var EBAY_CAMID = '5339116943';
  var EBAY_MKRID = '711-53200-19255-0';

  var QUESTIONS = [
    {
      key: 'light',
      q: 'How much light is in the room when you watch?',
      options: [
        { v: 'dark', t: 'Dark theater', d: 'Light-controlled room, mostly evening viewing' },
        { v: 'ambient', t: 'Some ambient light', d: 'Windows with curtains, some lamps on' },
        { v: 'bright', t: 'Bright living room', d: 'Lots of windows, daytime viewing' }
      ]
    },
    {
      key: 'size',
      q: 'How big should the picture be?',
      options: [
        { v: 0, t: 'Under 100"', d: 'Cozy room or first setup' },
        { v: 1, t: '100" to 120"', d: 'The sweet spot for most rooms' },
        { v: 2, t: 'Over 120"', d: 'Go big — dedicated space' }
      ]
    },
    {
      key: 'band',
      q: 'What is your projector budget?',
      options: [
        { v: 0, t: 'Under $500', d: 'Tight budget, maximum value' },
        { v: 1, t: '$500 – $1,000', d: 'Solid mid-range' },
        { v: 2, t: '$1,000 – $2,000', d: 'Serious home theater' },
        { v: 3, t: '$2,000+', d: 'Flagship territory' }
      ]
    },
    {
      key: 'use',
      q: 'What will you watch most?',
      options: [
        { v: 'movies', t: 'Movies & TV', d: 'Film nights, streaming, shows' },
        { v: 'sports', t: 'Sports', d: 'Bright, fast action' },
        { v: 'gaming', t: 'Gaming', d: 'Low lag matters' },
        { v: 'everything', t: 'A bit of everything', d: 'The all-rounder' }
      ]
    },
    {
      key: 'portable',
      q: 'How will it be set up?',
      options: [
        { v: false, t: 'Fixed in one room', d: 'Mounted or on a shelf, stays put' },
        { v: true, t: 'Move it around', d: 'Room to room, backyard, trips' }
      ]
    }
  ];

  var tool = document.getElementById('quiz-tool');
  var progressEl = document.getElementById('quiz-progress');
  var bodyEl = document.getElementById('quiz-body');
  if (!tool || !window.QUIZ_MODELS) return;

  var answers = {};
  var step = 0;

  function amazonUrl(q) {
    return AMAZON_SEARCH + encodeURIComponent(q) + '&tag=' + AMAZON_TAG;
  }
  function ebayUrl(q) {
    return 'https://www.ebay.com/sch/i.html?_nkw=' + encodeURIComponent(q) +
      '&mkcid=1&mkrid=' + EBAY_MKRID + '&siteid=0&campid=' + EBAY_CAMID + '&toolid=80005&mkevt=1';
  }
  function name(m) { return m.brand + ' ' + m.model; }

  function score(m) {
    if (m.band > answers.band) return -1; // over budget: ineligible
    var s = 3 - (answers.band - m.band); // prefer spending the budget well
    if (m.light.indexOf(answers.light) !== -1) s += 3;
    if (m.uses.indexOf(answers.use) !== -1) s += 3;
    else if (m.uses.indexOf('everything') !== -1) s += 2;
    if (answers.portable && m.portable) s += 3;
    if (answers.size === 2 && m.portable) s -= 3; // portables are not for huge screens
    return s;
  }

  function renderQuestion() {
    var Q = QUESTIONS[step];
    progressEl.innerHTML = '';
    var bar = document.createElement('div');
    bar.className = 'quiz-bar';
    var fill = document.createElement('div');
    fill.className = 'quiz-bar-fill';
    fill.style.width = ((step / QUESTIONS.length) * 100) + '%';
    bar.appendChild(fill);
    var lab = document.createElement('p');
    lab.className = 'quiz-count';
    lab.textContent = 'Question ' + (step + 1) + ' of ' + QUESTIONS.length;
    progressEl.appendChild(lab);
    progressEl.appendChild(bar);

    bodyEl.innerHTML = '';
    var h = document.createElement('h2');
    h.className = 'quiz-q';
    h.textContent = Q.q;
    bodyEl.appendChild(h);

    var opts = document.createElement('div');
    opts.className = 'quiz-opts';
    Q.options.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opt';
      var t = document.createElement('span');
      t.className = 'quiz-opt-t';
      t.textContent = o.t;
      var d = document.createElement('span');
      d.className = 'quiz-opt-d';
      d.textContent = o.d;
      b.appendChild(t);
      b.appendChild(d);
      b.addEventListener('click', function () {
        answers[Q.key] = o.v;
        step++;
        if (step < QUESTIONS.length) renderQuestion();
        else renderResults();
      });
      opts.appendChild(b);
    });
    bodyEl.appendChild(opts);

    if (step > 0) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'quiz-back';
      back.textContent = '\u2190 Back';
      back.addEventListener('click', function () { step--; renderQuestion(); });
      bodyEl.appendChild(back);
    }
  }

  function buyLinks(m) {
    var q = name(m) + ' projector';
    var wrap = document.createElement('div');
    wrap.className = 'quiz-buy';
    function add(t, u) {
      var a = document.createElement('a');
      a.href = u;
      a.target = '_blank';
      a.rel = 'nofollow sponsored noopener';
      a.className = 'quiz-buybtn';
      a.textContent = t;
      wrap.appendChild(a);
    }
    if (m.brandUrl) add('Buy direct', m.brandUrl);
    add('Amazon', amazonUrl(q));
    add('eBay', ebayUrl(q));
    return wrap;
  }

  function renderResults() {
    progressEl.innerHTML = '';
    var bar = document.createElement('div');
    bar.className = 'quiz-bar';
    var fill = document.createElement('div');
    fill.className = 'quiz-bar-fill';
    fill.style.width = '100%';
    bar.appendChild(fill);
    progressEl.appendChild(bar);

    var ranked = window.QUIZ_MODELS
      .map(function (m) { return { m: m, s: score(m) }; })
      .filter(function (r) { return r.s >= 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 3);

    bodyEl.innerHTML = '';
    var h = document.createElement('h2');
    h.className = 'quiz-q';
    h.textContent = ranked.length ? 'Your top 3 picks' : 'Hmm — tough combination';
    bodyEl.appendChild(h);

    if (!ranked.length) {
      var p = document.createElement('p');
      p.textContent = 'Nothing in the current lineup fits that budget and room together. The used market is your friend here — great projectors go for half of retail.';
      bodyEl.appendChild(p);
      var a = document.createElement('a');
      a.className = 'btn';
      a.href = 'used-checklist.html';
      a.textContent = 'Read the used buying checklist';
      bodyEl.appendChild(a);
    } else {
      var disc = document.createElement('p');
      disc.className = 'calc__hint';
      disc.textContent = 'Disclosure: As an Amazon Associate, I earn from qualifying purchases. I also earn from qualifying eBay, JMGO, and XGIMI purchases made through these links.';
      bodyEl.appendChild(disc);

      ranked.forEach(function (r, i) {
        var card = document.createElement('article');
        card.className = 'quiz-card';
        var rank = document.createElement('p');
        rank.className = 'label';
        rank.textContent = 'Pick ' + (i + 1);
        card.appendChild(rank);
        var nm = document.createElement('h3');
        nm.textContent = name(r.m);
        card.appendChild(nm);
        var ul = document.createElement('ul');
        r.m.why.forEach(function (w) {
          var li = document.createElement('li');
          li.textContent = w;
          ul.appendChild(li);
        });
        card.appendChild(ul);
        card.appendChild(buyLinks(r.m));
        bodyEl.appendChild(card);
      });

      // Honest-take note for stretched budgets.
      if (ranked[0].s < 5) {
        var note = document.createElement('p');
        note.className = 'calc__hint';
        note.innerHTML = 'Honest take: your budget and room are fighting each other a little. These are the best fits available new — but the <a href="used-checklist.html">used market</a> would stretch your dollar much further here.';
        bodyEl.appendChild(note);
      }

      var cta = document.createElement('p');
      cta.style.marginTop = '28px';
      cta.innerHTML = 'Want a human to double-check this for your exact room? <a href="book-a-consultation.html">Book a consultation</a> — I will confirm the pick or find you a better one.';
      bodyEl.appendChild(cta);
    }

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'quiz-back';
    again.textContent = '↻ Start over';
    again.addEventListener('click', function () {
      answers = {};
      step = 0;
      renderQuestion();
    });
    bodyEl.appendChild(again);
  }

  renderQuestion();
})();
