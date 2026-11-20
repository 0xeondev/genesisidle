/* Genesis Idle — site behaviour. No dependencies. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIG — fill these in before deploying.
     WAITLIST_ENDPOINT: URL that accepts POST JSON { email, source, consent, ts }.
     Remember to add its origin to connect-src in /_headers.
  ------------------------------------------------------------------ */
  var WAITLIST_ENDPOINT = '';
  var STORAGE_KEY = 'gi-demo-v1';
  var TOTAL = 24;
  var COLS = 6;
  var AWAY_MIN_SECONDS = 60;
  var AWAY_CAP_SECONDS = 12 * 60 * 60;

  var doc = document;
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Cookie-free event hook. Sends to Plausible or Umami if either is on the
     page; always dispatches a "gi:track" DOM event for anything else. */
  function track(name, props) {
    props = props || {};
    try {
      if (typeof window.plausible === 'function') { window.plausible(name, { props: props }); }
      else if (window.umami && typeof window.umami.track === 'function') { window.umami.track(name, props); }
      doc.dispatchEvent(new CustomEvent('gi:track', { detail: { name: name, props: props } }));
    } catch (e) { /* analytics must never break the page */ }
  }

  /* ---------------- Header: stuck state, menu, active section ---------------- */
  function initHeader() {
    var header = $('.gi-header');
    if (!header) { return; }
    var btn = $('.gi-menu-btn', header);
    var onScroll = function () { header.classList.toggle('is-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setOpen(open) {
      header.classList.toggle('is-open', open);
      if (btn) {
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      }
    }
    if (btn) {
      btn.addEventListener('click', function () { setOpen(!header.classList.contains('is-open')); });
      header.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('is-open')) { setOpen(false); btn.focus(); }
      });
      $$('.gi-nav a', header).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    }

    var links = $$('.gi-nav-links a[href^="#"]', header);
    if (links.length && 'IntersectionObserver' in window) {
      var byId = {};
      links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) { return; }
          links.forEach(function (a) { a.removeAttribute('aria-current'); });
          var link = byId[en.target.id];
          if (link) { link.setAttribute('aria-current', 'true'); }
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      Object.keys(byId).forEach(function (id) { var s = doc.getElementById(id); if (s) { io.observe(s); } });
    }

    /* "Get notified" scrolls to the form and puts the cursor in it. */
    $$('[data-focus-join]').forEach(function (a) {
      a.addEventListener('click', function () {
        var input = $('#join-email');
        if (!input) { return; }
        window.setTimeout(function () { input.focus({ preventScroll: true }); }, reduceMotion ? 0 : 700);
      });
    });
  }

  /* ---------------- Starfield: one canvas instead of 240 elements ---------------- */
  function initStars() {
    var canvas = $('.gi-stars');
    if (!canvas || !canvas.getContext) { return; }
    var ctx = canvas.getContext('2d');
    var layers = [
      { seed: 3, n: 140, rmin: 0.8, rmax: 1.2, omin: 0.15, omax: 0.45, drift: 90, glow: 0 },
      { seed: 5, n: 80, rmin: 1.1, rmax: 1.8, omin: 0.3, omax: 0.7, drift: 60, glow: 0 },
      { seed: 8, n: 22, rmin: 1.8, rmax: 2.8, omin: 0.6, omax: 1, drift: 38, glow: 6 }
    ];
    layers.forEach(function (L) {
      var r = rng(L.seed);
      L.stars = [];
      for (var i = 0; i < L.n; i++) {
        L.stars.push({ x: r(), y: r(), r: (L.rmin + r() * (L.rmax - L.rmin)) / 2, o: L.omin + r() * (L.omax - L.omin), p: r() * Math.PI * 2 });
      }
    });
    var w = 0, h = 0, dpr = 1, raf = 0, last = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now());
    }
    function draw(now) {
      var t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#fff';
      layers.forEach(function (L) {
        var sway = reduceMotion ? 0 : (Math.sin(t / L.drift * Math.PI) + 1) / 2;
        var ox = -40 * sway, oy = -30 * sway;
        ctx.shadowBlur = L.glow; ctx.shadowColor = 'rgba(255,255,255,0.6)';
        L.stars.forEach(function (s) {
          var tw = reduceMotion ? 1 : 0.6 + 0.4 * Math.sin(t * 1.25 + s.p);
          ctx.globalAlpha = s.o * tw;
          ctx.beginPath();
          ctx.arc(s.x * (w + 120) - 60 + ox, s.y * (h + 120) - 60 + oy, s.r, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    }
    function loop(now) {
      raf = window.requestAnimationFrame(loop);
      if (now - last < 80) { return; }   /* ~12 fps is plenty for a twinkle */
      last = now;
      draw(now);
    }
    function start() { if (!raf && !reduceMotion && !doc.hidden) { raf = window.requestAnimationFrame(loop); } }
    function stop() { if (raf) { window.cancelAnimationFrame(raf); raf = 0; } }

    window.addEventListener('resize', resize);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { stop(); } else { start(); } });
    resize();
    start();
  }

  /* ---------------- Planet lights ---------------- */
  function initLights() {
    var host = $('#gi-lights');
    if (!host) { return; }
    var q = rng(42);
    var centers = [[66, 64], [74, 78], [56, 82], [82, 56], [62, 48], [48, 70]];
    var pal = ['#ffcc7a', '#ffe2a8', '#ffd28a', '#9fe9ff'];
    var groups = [];
    for (var g = 0; g < 4; g++) {
      var el = doc.createElement('div');
      el.className = 'gi-light-group';
      el.style.animationDelay = (g * -1) + 's';
      host.appendChild(el);
      groups.push(el);
    }
    var n = 0;
    for (var c = 0; c < centers.length; c++) {
      for (var k = 0; k < 26; k++) {
        var gx = Math.round((q() - 0.5) * 6) * 2.2, gy = Math.round((q() - 0.5) * 6) * 2.2;
        var x = centers[c][0] + gx + (q() - 0.5) * 1.2, y = centers[c][1] + gy + (q() - 0.5) * 1.2;
        var dx = x - 50, dy = y - 50;
        if (Math.sqrt(dx * dx + dy * dy) > 46) { continue; }
        var core = Math.abs(gx) < 3 && Math.abs(gy) < 3;
        var color = pal[Math.floor(q() * (core ? 2 : pal.length))];
        var delay = c * 2.2 + q() * 3;
        q();
        var s = doc.createElement('span');
        s.className = 'gi-light';
        s.style.left = x.toFixed(2) + '%';
        s.style.top = y.toFixed(2) + '%';
        s.style.width = s.style.height = (core ? 3 : 2) + 'px';
        s.style.background = color;
        s.style.boxShadow = '0 0 ' + (core ? 10 : 6) + 'px ' + color;
        s.style.animationDelay = delay.toFixed(2) + 's';
        groups[n++ % groups.length].appendChild(s);
      }
    }
  }

  /* ---------------- Skyline: windows follow the demo ---------------- */
  var buildings = [];
  function initSkyline() {
    var host = $('#gi-buildings');
    if (!host) { return; }
    var b = rng(9), xpos = 0;
    while (xpos < 100) {
      var w = 2.2 + b() * 4.2, h = 60 + Math.pow(b(), 1.6) * 230;
      if (Math.abs(xpos + w / 2 - 50) < 18) { h = h * 0.55 + 30; }
      var a = Math.round(b() * 30), e = Math.round(40 + b() * 30);
      var top = b() > 0.7 ? '#2a2468' : '#171a44';
      var wc = b() > 0.75 ? 'rgba(127,230,255,0.75)' : 'rgba(255,214,150,0.8)';
      var rank = b();
      var el = doc.createElement('div');
      el.className = 'gi-bldg';
      el.style.left = xpos.toFixed(2) + '%';
      el.style.width = w.toFixed(2) + '%';
      el.style.height = Math.round(h) + 'px';
      el.style.background = 'linear-gradient(to top, #0b0d24, ' + top + ')';
      el.style.setProperty('animation-range', 'entry ' + a + '% cover ' + e + '%');
      var win = doc.createElement('div');
      win.className = 'gi-win';
      win.style.backgroundImage = 'radial-gradient(circle, ' + wc + ' 1.2px, transparent 1.6px)';
      el.appendChild(win);
      host.appendChild(el);
      buildings.push({ el: el, rank: rank });
      xpos += w + 0.4 + b() * 1.2;
    }
    buildings.sort(function (p, r) { return p.rank - r.rank; });
  }
  function lightSkyline(districts) {
    /* A third of the city is always awake; the rest lights up with the demo. */
    var lit = Math.round(buildings.length * (0.3 + 0.7 * districts / TOTAL));
    buildings.forEach(function (bd, i) { bd.el.classList.toggle('is-lit', i < lit); });
  }

  /* ---------------- Demo ---------------- */
  function initDemo() {
    var grid = $('#gi-tiles');
    var placeBtn = $('#gi-place');
    if (!grid || !placeBtn) { return; }
    var note = $('#gi-note');
    var live = $('#gi-live');
    var away = $('#gi-away');
    var awayText = $('#gi-away-text');
    var complete = $('#gi-complete');
    var completeTitle = $('#gi-complete-title');
    var milestones = [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000];
    var state = fresh();
    var started = false;
    var tiles = [];
    var focusIndex = 0;

    function fresh() {
      var t = [];
      for (var i = 0; i < TOTAL; i++) { t.push(i === 0); }
      return { tiles: t, pop: 12 };
    }
    function count() { return state.tiles.filter(Boolean).length; }
    function rateFor(d) { return +(d * 0.6 + d * d * 0.05).toFixed(1); }

    function load() {
      try {
        var raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) { return null; }
        var s = JSON.parse(raw);
        if (!s || s.v !== 1 || !Array.isArray(s.tiles) || s.tiles.length !== TOTAL || typeof s.pop !== 'number') { return null; }
        return s;
      } catch (e) { return null; }
    }
    function save() {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          v: 1, tiles: state.tiles.map(function (t) { return t ? 1 : 0; }), pop: state.pop, t: Date.now()
        }));
      } catch (e) { /* private mode or storage full: the demo still works */ }
    }
    function clear() { try { window.localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ } }

    for (var i = 0; i < TOTAL; i++) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'gi-tile' + (i % 5 === 0 ? ' is-alt' : '');
      b.setAttribute('data-i', String(i));
      grid.appendChild(b);
      tiles.push(b);
    }

    function render() {
      var d = count();
      var full = d >= TOTAL;
      var vals = { districts: String(d), popText: fmt(state.pop), rateText: rateFor(d).toFixed(1) };
      $$('[data-v]').forEach(function (el) {
        var v = vals[el.getAttribute('data-v')];
        if (v !== undefined && el.textContent !== v) { el.textContent = v; }
      });
      tiles.forEach(function (t, i) {
        var lit = state.tiles[i];
        t.classList.toggle('is-lit', lit);
        t.setAttribute('aria-label', 'District ' + (i + 1) + (lit ? ', online' : ', empty. Place a district here'));
        t.setAttribute('aria-pressed', lit ? 'true' : 'false');
        t.tabIndex = i === focusIndex ? 0 : -1;
      });
      placeBtn.hidden = full;
      complete.hidden = !full;
      lightSkyline(d);
    }

    function place(index, fromTile) {
      if (index === undefined) { index = state.tiles.indexOf(false); }
      if (index < 0 || state.tiles[index]) { return; }
      var hadFocus = doc.activeElement === placeBtn || tiles.indexOf(doc.activeElement) !== -1;
      state.tiles[index] = true;
      var d = count();
      if (!started) { started = true; track('demo_start', { via: fromTile ? 'tile' : 'button' }); }
      if (d === 6 || d === 12 || d === TOTAL) { track('demo_districts', { count: d }); }
      note.textContent = d === TOTAL ? 'The settlement is complete. Era II awaits.' : 'District ' + d + ' is online.';
      render();
      save();
      if (d === TOTAL) {
        track('demo_complete');
        if (hadFocus) { completeTitle.focus(); }
      }
    }

    function reset() {
      state = fresh();
      started = false;
      focusIndex = 0;
      clear();
      away.hidden = true;
      note.textContent = 'Back to the first spark.';
      render();
      placeBtn.focus();
    }

    placeBtn.addEventListener('click', function () { place(); });
    grid.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('.gi-tile') : null;
      if (!t) { return; }
      focusIndex = +t.getAttribute('data-i');
      place(focusIndex, true);
      render();
    });
    grid.addEventListener('keydown', function (e) {
      var step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS }[e.key];
      var next = focusIndex;
      if (step !== undefined) { next = focusIndex + step; }
      else if (e.key === 'Home') { next = 0; }
      else if (e.key === 'End') { next = TOTAL - 1; }
      else { return; }
      e.preventDefault();
      if (next < 0 || next >= TOTAL) { return; }
      focusIndex = next;
      render();
      tiles[focusIndex].focus();
    });
    $$('[data-demo-reset]').forEach(function (el) { el.addEventListener('click', reset); });
    var dismiss = $('#gi-away-dismiss');
    if (dismiss) { dismiss.addEventListener('click', function () { away.hidden = true; }); }

    /* Restore, and credit the time away: the whole idea of the game in one line. */
    var saved = load();
    if (saved) {
      state = { tiles: saved.tiles.map(Boolean), pop: Math.max(0, saved.pop) };
      if (count() === 0) { state.tiles[0] = true; }
      started = count() > 1;
      var elapsed = (Date.now() - (saved.t || Date.now())) / 1000;
      if (elapsed >= AWAY_MIN_SECONDS) {
        var gain = Math.round(Math.min(elapsed, AWAY_CAP_SECONDS) * rateFor(count()) * 3);
        if (gain > 0) {
          state.pop += gain;
          awayText.textContent = 'You left. The city didn’t stop: +' + fmt(gain) + ' while you were away.';
          away.hidden = false;
          track('demo_return', { gain: gain });
        }
      }
    }
    render();

    var ticks = 0;
    window.setInterval(function () {
      var d = count();
      var before = state.pop;
      state.pop += Math.round(rateFor(d) * 3 + Math.random() * d);
      for (var m = 0; m < milestones.length; m++) {
        if (before < milestones[m] && state.pop >= milestones[m]) { live.textContent = 'Population passed ' + fmt(milestones[m]) + '.'; }
      }
      render();
      if (++ticks % 5 === 0) { save(); }
    }, 1000);
    window.addEventListener('pagehide', save);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) { save(); } });
  }

  /* ---------------- Waitlist forms ---------------- */
  function initForms() {
    $$('form.gi-form').forEach(function (form) {
      var input = $('input[type="email"]', form);
      var consent = $('input[name="consent"]', form);
      var hp = $('input[name="company"]', form);
      var btn = $('button[type="submit"]', form);
      var status = $('.gi-form-status', form);
      var source = form.getAttribute('data-source') || 'unknown';
      var label = btn.textContent;

      function say(msg, isError) {
        status.textContent = msg;
        status.classList.toggle('is-error', !!isError);
      }
      function done() {
        var p = doc.createElement('p');
        p.className = 'gi-form-done';
        p.setAttribute('role', 'status');
        p.tabIndex = -1;
        p.textContent = 'You’re on the list. We’ll write when the first light is lit.';
        form.replaceWith(p);
        p.focus();
      }

      input.addEventListener('input', function () { input.removeAttribute('aria-invalid'); say(''); });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          input.setAttribute('aria-invalid', 'true');
          say('Enter a valid email address.', true);
          input.focus();
          return;
        }
        if (consent && !consent.checked) {
          say('Please tick the box so we can email you.', true);
          consent.focus();
          return;
        }
        if (hp && hp.value) { done(); return; }   /* bots fill hidden fields */
        if (!WAITLIST_ENDPOINT) {
          say('Sign-ups open soon. This form is not connected yet.', true);
          if (window.console) { console.warn('[Genesis Idle] Set WAITLIST_ENDPOINT in /assets/site.js'); }
          return;
        }
        btn.disabled = true;
        btn.textContent = 'Sending…';
        say('');
        var ctrl = 'AbortController' in window ? new AbortController() : null;
        var timer = window.setTimeout(function () { if (ctrl) { ctrl.abort(); } }, 10000);
        fetch(WAITLIST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, source: source, consent: true, ts: new Date().toISOString() }),
          signal: ctrl ? ctrl.signal : undefined
        }).then(function (res) {
          if (!res.ok) { throw new Error('HTTP ' + res.status); }
          track('waitlist_submit', { source: source });
          done();
        }).catch(function () {
          btn.disabled = false;
          btn.textContent = label;
          say('That didn’t go through. Try again in a moment.', true);
        }).then(function () { window.clearTimeout(timer); });
      });
    });
  }

  /* ---------------- FAQ + pausing off-screen loops ---------------- */
  function initFaq() {
    $$('.gi-faq details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (d.open) { track('faq_open', { q: ($('summary', d).textContent || '').trim() }); }
      });
    });
  }
  function initPausing() {
    var targets = $$('[data-pause]');
    if (!targets.length || !('IntersectionObserver' in window)) { return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.classList.toggle('is-paused', !en.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  function init() {
    initHeader();
    initStars();
    initLights();
    initSkyline();
    initDemo();
    initForms();
    initFaq();
    initPausing();
  }
  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
