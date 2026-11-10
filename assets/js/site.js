/* Autoracconigi — interazioni globali: menu, reveal, orari, galleria scheda auto.
   Nessuna dipendenza. Degradazione elegante senza JavaScript. */
(function () {
  'use strict';

  var doc = document;
  var $ = function (sel, root) { return (root || doc).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); };

  /* ---------- menu mobile ---------- */
  var toggle = $('.nav-toggle');
  var nav = $('#site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.getAttribute('data-open') === 'true';
      nav.setAttribute('data-open', open ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { nav.removeAttribute('data-open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  /* ---------- anno nel footer ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- evidenzia il giorno corrente negli orari ---------- */
  var GIORNI = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
  var today = GIORNI[new Date().getDay()];
  $$('.hours [data-day]').forEach(function (row) {
    var day = row.getAttribute('data-day').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (day === today) row.setAttribute('data-today', 'true');
  });

  /* ---------- reveal on scroll ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    $$('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    $$('.reveal').forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- galleria scheda auto ---------- */
  var gallery = $('.gallery');
  if (gallery) {
    var slides = $$('.gallery__main img', gallery);
    var thumbs = $$('.gallery__thumbs img', gallery);
    var counter = $('.gallery__count', gallery);
    var index = 0;

    function show(next) {
      if (!slides.length) return;
      index = (next + slides.length) % slides.length;
      slides.forEach(function (img, i) { img.classList.toggle('is-hidden', i !== index); });
      thumbs.forEach(function (img, i) {
        if (i === index) img.setAttribute('aria-current', 'true'); else img.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = (index + 1) + ' / ' + slides.length;
      if (thumbs[index] && thumbs[index].scrollIntoView) thumbs[index].scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    var prev = $('.gallery__nav--prev', gallery);
    var next = $('.gallery__nav--next', gallery);
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
    thumbs.forEach(function (img, i) { img.addEventListener('click', function () { show(i); }); });
    doc.addEventListener('keydown', function (e) {
      if (!gallery.contains(doc.activeElement) && doc.activeElement !== doc.body) return;
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    if (slides.length > 1) {
      show(0);
    }
  }
})();
