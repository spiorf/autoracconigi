/* Autoracconigi — filtri e ordinamento del catalogo, lato client.
   Il catalogo è un file statico: i filtri non chiamano alcun server.
   Deep link accettati sia come query string (?marca=Fiat) sia come hash (#marca=Fiat). */
(function () {
  'use strict';

  var grid = document.getElementById('car-grid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.car-card'));
  var inputs = {
    q: document.getElementById('f-q'),
    marca: document.getElementById('f-marca'),
    carburante: document.getElementById('f-carburante'),
    cambio: document.getElementById('f-cambio'),
    prezzo_min: document.getElementById('f-prezzo-min'),
    prezzo_max: document.getElementById('f-prezzo-max'),
    posti_min: document.getElementById('f-posti-min'),
    status: document.getElementById('f-status'),
    ordina: document.getElementById('f-ordina'),
  };
  var countEl = document.getElementById('results-count');
  var emptyEl = document.getElementById('empty-state');
  var resetBtn = document.getElementById('f-reset');

  var original = cards.map(function (card, i) { return { card: card, index: i, parent: card.parentNode }; });
  var num = function (v) { var n = parseFloat(v); return isNaN(n) ? null : n; };

  /* parametri iniziali: prima l'hash (condivisibile), poi la query string */
  function readParams() {
    var out = {};
    var parse = function (str) {
      str.split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        try { out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) { /* ignore */ }
      });
    };
    if (location.search.length > 1) parse(location.search.slice(1));
    if (location.hash.length > 1) parse(location.hash.slice(1).replace(/^\//, ''));
    return out;
  }

  var params = readParams();
  Object.keys(inputs).forEach(function (key) {
    if (inputs[key] && params[key] !== undefined) inputs[key].value = params[key];
  });

  function value(key) {
    var el = inputs[key];
    return el ? String(el.value || '').trim() : '';
  }

  function matches(card) {
    var q = value('q').toLowerCase();
    var marca = value('marca');
    var carburante = value('carburante');
    var cambio = value('cambio');
    var pmin = num(value('prezzo_min'));
    var pmax = num(value('prezzo_max'));
    var posti = num(value('posti_min'));
    var status = value('status') || 'attive';
    var prezzo = num(card.getAttribute('data-prezzo')) || 0;
    var seats = num(card.getAttribute('data-posti'));
    var st = card.getAttribute('data-status');

    if (status === 'attive' && st === 'venduta') return false;
    if (status === 'solo-vendute' && st !== 'venduta') return false;
    if (marca && card.getAttribute('data-marca') !== marca) return false;
    if (carburante && card.getAttribute('data-carburante') !== carburante) return false;
    if (cambio && card.getAttribute('data-cambio') !== cambio) return false;
    if (pmin !== null && prezzo < pmin) return false;
    if (pmax !== null && prezzo > pmax) return false;
    if (posti !== null && (seats === null || seats < posti)) return false;
    if (q && (card.getAttribute('data-search') || '').indexOf(q) === -1) return false;
    return true;
  }

  function sortValue(card, key) {
    if (key === 'prezzo') return num(card.getAttribute('data-prezzo')) || 0;
    if (key === 'km') return num(card.getAttribute('data-km')) || 0;
    if (key === 'anno') return num(card.getAttribute('data-anno')) || 0;
    if (key === 'nome') return (card.getAttribute('data-search') || '');
    return null;
  }

  function apply() {
    var visible = [];
    cards.forEach(function (card) {
      var ok = matches(card);
      card.hidden = !ok;
      card.style.display = ok ? '' : 'none';
      if (ok) visible.push(card);
    });

    var ordina = value('ordina') || 'recenti';
    if (ordina !== 'recenti') {
      var desc = ordina === 'prezzo-desc' || ordina === 'anno-desc';
      var key = ordina.split('-')[0];
      visible.sort(function (a, b) {
        var va = sortValue(a, key); var vb = sortValue(b, key);
        if (typeof va === 'string' || typeof vb === 'string') {
          va = String(va); vb = String(vb);
          return desc ? vb.localeCompare(va, 'it') : va.localeCompare(vb, 'it');
        }
        return desc ? vb - va : va - vb;
      });
    }
    visible.forEach(function (card) { grid.appendChild(card); });

    if (countEl) {
      var n = visible.length;
      countEl.innerHTML = '<b>' + n + '</b> ' + (n === 1 ? 'vettura trovata' : 'vetture trovate');
    }
    if (emptyEl) emptyEl.hidden = visible.length !== 0;
    writeHash();
  }

  function writeHash() {
    var parts = [];
    Object.keys(inputs).forEach(function (key) {
      if (key === 'ordina' || key === 'status') return;
      var v = value(key);
      if (v) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(v));
    });
    var hash = parts.join('&');
    try {
      history.replaceState(null, '', hash ? '#' + hash : location.pathname);
    } catch (e) { /* file:// o browser vecchi: nessuna condivisione stato */ }
  }

  var timer = null;
  Object.keys(inputs).forEach(function (key) {
    var el = inputs[key];
    if (!el) return;
    var evt = el.tagName === 'SELECT' ? 'change' : 'input';
    el.addEventListener(evt, function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(apply, 110);
    });
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      Object.keys(inputs).forEach(function (key) {
        var el = inputs[key];
        if (!el) return;
        el.value = el.getAttribute('data-default') || '';
      });
      apply();
    });
  }

  apply();
})();
