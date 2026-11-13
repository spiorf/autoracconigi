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
    // Quando la finestra dello zoom è aperta le frecce della tastiera sono sue, non della galleria.
    var zoomAperto = false;

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
      if (zoomAperto) return;
      if (!gallery.contains(doc.activeElement) && doc.activeElement !== doc.body) return;
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    if (slides.length > 1) {
      show(0);
    }

    /* ---------- zoom: la foto ingrandita a schermo intero ----------
       Il markup della finestra è nelle pagine (build/templates.js → pageCar): qui c'è solo il
       comportamento. I pulsanti della barra (+ / − / quattro angoli / frecce / Chiudi) sono il
       modo sicuro per il cliente; la rotellina, il trascinamento e le due dita sono la stessa
       cosa fatta con il gesto. Senza JavaScript la foto resta nella sua cornice. */
    var zoom = $('.zoom');
    if (zoom && slides.length) {
      var zoomImg = $('.zoom__img', zoom);
      var zoomLivello = $('.zoom__level', zoom);
      var zoomContatore = $('.zoom__count', zoom);
      var zoomStage = $('.zoom__stage', zoom);
      var PASSO = 1.35;                    // quanto cresce l'immagine a ogni «Ingrandisci»
      var scala = 1, spostaX = 0, spostaY = 0, apertoDa = null, trascinato = false;

      /** Il tetto è il pixel vero della foto: oltre si vedrebbe solo sgranato. */
      function scalaMassima() {
        var larga = zoomImg.offsetWidth;
        if (!larga || !zoomImg.naturalWidth) return 3;
        return Math.min(5, Math.max(2, zoomImg.naturalWidth / larga));
      }

      function applica() {
        zoomImg.style.transform = 'translate(' + spostaX + 'px,' + spostaY + 'px) scale(' + scala.toFixed(3) + ')';
        if (zoomLivello) zoomLivello.textContent = Math.round(scala * 100) + '%';
        zoom.setAttribute('data-zoomed', scala > 1.02 ? 'true' : 'false');
      }

      /* Il bordo della finestra è il limite: la foto non può scivolare fuori del tutto. */
      function limita() {
        var mx = Math.max(0, (zoomImg.offsetWidth * scala - zoomStage.clientWidth) / 2);
        var my = Math.max(0, (zoomImg.offsetHeight * scala - zoomStage.clientHeight) / 2);
        spostaX = Math.min(mx, Math.max(-mx, spostaX));
        spostaY = Math.min(my, Math.max(-my, spostaY));
      }

      /** Nuova scala tenendo fermo il punto sotto il cursore (px, py sono coordinate schermo). */
      function setScala(nuova, px, py) {
        var prima = scala;
        scala = Math.min(scalaMassima(), Math.max(1, nuova));
        var rapporto = scala / prima;
        if (px !== undefined && px !== null && rapporto !== 1) {
          var lato = zoomImg.getBoundingClientRect();
          spostaX -= (px - (lato.left + lato.width / 2)) * (rapporto - 1);
          spostaY -= (py - (lato.top + lato.height / 2)) * (rapporto - 1);
        }
        if (scala === 1) { spostaX = 0; spostaY = 0; }   // «tutta la foto» riparte dal centro
        limita();
        applica();
      }

      function aggiornaFoto() {
        var slide = slides[index];
        zoomImg.src = slide.src;
        zoomImg.alt = slide.alt || zoomImg.alt;
        if (zoomContatore) zoomContatore.textContent = (index + 1) + ' / ' + slides.length;
        scala = 1; spostaX = 0; spostaY = 0;
        limita(); applica();
      }

      /** Cambia foto anche nella galleria sotto: miniature e contatore restano d'accordo. */
      function passa(i) { show(i); aggiornaFoto(); }

      function apri() {
        apertoDa = doc.activeElement;
        zoom.hidden = false;
        zoomAperto = true;
        doc.documentElement.classList.add('ha-zoom');
        aggiornaFoto();
        var pulsante = $('.zoom__btn--close', zoom);
        if (pulsante) pulsante.focus();
      }

      function chiudi() {
        zoom.hidden = true;
        zoomAperto = false;
        doc.documentElement.classList.remove('ha-zoom');
        zoomImg.style.transform = '';
        if (apertoDa && apertoDa.focus) apertoDa.focus();
      }

      var innesco = $('.gallery__zoom', gallery);
      if (innesco) innesco.addEventListener('click', function () { apri(); });
      $('.gallery__main', gallery).addEventListener('click', function (e) {
        if (e.target.closest && (e.target.closest('.gallery__nav') || e.target.closest('.gallery__zoom'))) return;
        if (e.target.tagName === 'IMG') apri();
      });

      $$('[data-zoom]', zoom).forEach(function (pulsante) {
        pulsante.addEventListener('click', function () {
          var atto = pulsante.getAttribute('data-zoom');
          if (atto === 'close') chiudi();
          else if (atto === 'in') setScala(scala * PASSO);
          else if (atto === 'out') setScala(scala / PASSO);
          else if (atto === 'fit') setScala(1);
          else if (atto === 'prev') passa(index - 1);
          else if (atto === 'next') passa(index + 1);
        });
      });

      // clic fuori dalla foto = chiudi, come in qualsiasi visualizzatore di foto
      zoom.addEventListener('click', function (e) {
        if (e.target === zoom || e.target === zoomStage) chiudi();
      });

      zoomImg.addEventListener('load', function () { limita(); applica(); });

      /* Trascinamento e pizzico con le Pointer Events: un solo codice per mouse, dito e stilo. */
      var dite = {}, divarioIniziale = 0, scalaDita = 1, presa = null;

      function divario() {
        var ids = Object.keys(dite);
        if (ids.length < 2) return 0;
        var a = dite[ids[0]], b = dite[ids[1]];
        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
      }

      zoomImg.addEventListener('pointerdown', function (e) {
        dite[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (Object.keys(dite).length === 1) {
          presa = { x: e.clientX, y: e.clientY, sx: spostaX, sy: spostaY, mosso: false };
          // può fallire se il puntatore non è più attivo (dito sollevata durante il toc): lo zoom funziona lo stesso
          try { if (zoomImg.setPointerCapture) zoomImg.setPointerCapture(e.pointerId); } catch (err) {}
        } else {
          divarioIniziale = divario(); scalaDita = scala; presa = null;
        }
      });

      zoomImg.addEventListener('pointermove', function (e) {
        if (!dite[e.pointerId]) return;
        dite[e.pointerId] = { x: e.clientX, y: e.clientY };
        if (divarioIniziale && Object.keys(dite).length >= 2) {
          var ora = divario();
          if (ora) setScala(scalaDita * (ora / divarioIniziale));
          e.preventDefault();
        } else if (presa) {
          var dx = e.clientX - presa.x, dy = e.clientY - presa.y;
          if (Math.abs(dx) + Math.abs(dy) > 8) presa.mosso = true;
          if (presa.mosso && scala > 1) {
            spostaX = presa.sx + dx; spostaY = presa.sy + dy;
            limita(); applica();
          }
        }
      });

      function lasci(e) {
        delete dite[e.pointerId];
        if (Object.keys(dite).length < 2) divarioIniziale = 0;
        if (!Object.keys(dite).length) { trascinato = !!(presa && presa.mosso); presa = null; }
      }
      zoomImg.addEventListener('pointerup', lasci);
      zoomImg.addEventListener('pointercancel', lasci);

      // un tocco sulla foto la ingrandisce, il successivo la riporta intera
      zoomImg.addEventListener('click', function (e) {
        if (trascinato) { trascinato = false; return; }
        if (divarioIniziale) return;
        setScala(scala > 1.02 ? 1 : Math.min(2.4, scalaMassima()), e.clientX, e.clientY);
      });

      zoomStage.addEventListener('wheel', function (e) {
        e.preventDefault();
        setScala(scala * Math.exp(-e.deltaY * 0.0018), e.clientX, e.clientY);
      }, { passive: false });

      /* Il focus resta dentro la finestra: Tab non riporta il cliente dietro il velo nero. */
      function trattieniFocus(e) {
        var pulsanti = $$('button', zoom);
        if (!pulsanti.length) return;
        var primo = pulsanti[0], ultimo = pulsanti[pulsanti.length - 1];
        if (e.shiftKey && doc.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && doc.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
      }

      doc.addEventListener('keydown', function (e) {
        if (!zoomAperto) return;
        if (e.key === 'Escape') { e.preventDefault(); chiudi(); }
        else if (e.key === '+' || e.key === '=') { e.preventDefault(); setScala(scala * PASSO); }
        else if (e.key === '-' || e.key === '_') { e.preventDefault(); setScala(scala / PASSO); }
        else if (e.key === '0') { e.preventDefault(); setScala(1); }
        else if (e.key === 'ArrowLeft' && slides.length > 1) { e.preventDefault(); passa(index - 1); }
        else if (e.key === 'ArrowRight' && slides.length > 1) { e.preventDefault(); passa(index + 1); }
        else if (e.key === 'Tab') trattieniFocus(e);
      });

      window.addEventListener('resize', function () { if (zoomAperto) { limita(); applica(); } });
    }
  }
})();
