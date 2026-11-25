/* Genesis Idle — site behaviour. No dependencies. */
(function () {
  'use strict';

  var doc = document;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

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
  }

  /* ---------------- City lights on the night side of the hero scene ----------------
     Positions are percentages of the rendered scene (wide and tall crops), taken from
     where the render itself puts its cities. */
  var LIGHTS_WIDE = [[59.2,67.8],[59.9,68.8],[54.8,95.1],[74.4,95.6],[78.7,48.2],[83,54.8],[99.8,65.1],[60,90.1],[61.2,92.4],[57.6,93.8],[88.5,44.2],[93.7,55.1],[58.6,89.4],[73.4,92.1],[95.1,55.6],[69.1,97.1],[51.3,99.6],[68.1,99.8],[59.2,92.4],[56.6,69.9],[98.6,68.8],[72.7,64.2],[98.7,55.4],[59.5,94.3],[58,99.2],[96.8,56.4],[67.2,98.2],[61.2,94.4],[83,49.2],[48.3,98.7],[80.4,55.8],[57.7,69.2],[59.3,96.8],[80.8,46],[85,54.4],[58.9,66.6],[95.6,60.6],[47.5,86.8],[72,94.9],[66.4,91.1],[57.5,95.1],[60.9,67.2],[75.3,98.9],[60.9,65.6],[70.4,99.2],[73.5,51.9],[68.4,98.6],[57,96.4],[48,85.4],[62.7,91],[56,93.7],[77.3,49.8],[55.4,71.4],[73,90.8],[99.8,63.8],[69.5,93.9],[99.9,90.1],[95,54.2],[55.4,96.7],[70.9,62.2],[68,95.7],[82,57.1],[57.5,92.2],[98.7,62.5]];
  var LIGHTS_TALL = [[92.6,93.9],[96,92.9],[59.6,99.9],[48.2,94.9],[53.2,93.6],[95.6,94.8],[59.5,98.6],[57,99.9],[94.8,93.2],[79.9,99.5],[61.2,89.8],[55.7,94.6],[53.4,92.4],[54.7,94.9],[54.4,93.1],[93.2,96.6],[57,91.3],[52.3,94.3],[86.2,98.3],[90.2,99.8],[55.8,92.6],[93.9,93.9],[89.8,98.7],[84.7,98.7],[77.7,98.3],[94,97.8],[90.3,97.8],[94.8,96.8],[48.5,96.1],[50,95.3],[78.9,97.9],[96.8,95.2],[76.7,99.8],[59.3,90.1],[91.2,98.6],[57.5,92.3],[85.7,99.3],[83.5,99.9],[42.6,97.7],[87.1,99.8],[88.4,99.9],[91.3,99.8],[96.3,93.9],[92.2,99],[80.4,98.5],[58.4,98.3],[60.3,90.4]];
  function fillLights(host, points, seed) {
    if (!host) { return; }
    var q = rng(seed);
    var pal = ['#ffcc7a', '#ffe2a8', '#ffd28a', '#fff1cf'];
    var groups = [], g, i;
    for (g = 0; g < 4; g++) {
      var el = doc.createElement('div');
      el.className = 'gi-light-group';
      el.style.animationDelay = (g * -1) + 's';
      host.appendChild(el);
      groups.push(el);
    }
    for (i = 0; i < points.length; i++) {
      var big = q() > 0.72;
      var color = pal[Math.floor(q() * pal.length)];
      var s = doc.createElement('span');
      s.className = 'gi-light';
      s.style.left = points[i][0] + '%';
      s.style.top = points[i][1] + '%';
      s.style.width = s.style.height = (big ? 3 : 2) + 'px';
      s.style.background = color;
      s.style.boxShadow = '0 0 ' + (big ? 9 : 5) + 'px ' + color;
      s.style.animationDelay = (0.8 + i * 0.24 + q() * 0.5).toFixed(2) + 's';
      groups[i % groups.length].appendChild(s);
    }
  }
  function initLights() {
    fillLights($('#gi-lights'), LIGHTS_WIDE, 42);
    fillLights($('#gi-lights-m'), LIGHTS_TALL, 43);
  }


  /* ---------------- Pause off-screen loops ---------------- */
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
    initLights();
    initPausing();
  }

  if (doc.readyState === 'loading') { doc.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
