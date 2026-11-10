/* Autoracconigi — modulo contatti: compone un'e-mail nel client di posta dell'utente.
   Nessun dato lascia il browser verso questo sito (che è statico e non ha backend). */
(function () {
  'use strict';

  function field(form, name) {
    var el = form.querySelector('[name="' + name + '"]');
    return el ? String(el.value || '').trim() : '';
  }

  Array.prototype.slice.call(document.querySelectorAll('form.js-mailto')).forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.checkValidity) { form.submit(); return; }
      if (!form.checkValidity()) {
        if (form.reportValidity) form.reportValidity();
        return;
      }
      var to = form.getAttribute('data-to') || '';
      var subject = form.getAttribute('data-subject') || 'Richiesta informazioni dal sito';
      var lines = [];
      var nome = field(form, 'nome');
      var tel = field(form, 'telefono');
      var auto = field(form, 'auto');
      var msg = field(form, 'messaggio');

      if (nome) lines.push('Nome: ' + nome);
      if (tel) lines.push('Telefono: ' + tel);
      if (auto) lines.push('Cosa cerco: ' + auto);
      if (msg) lines.push('', 'Note: ' + msg);
      lines.push('', '—', 'Inviato dal sito web (modulo contatti)');

      var href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      window.location.href = href;

      var note = form.querySelector('.js-mailto-note');
      if (note) {
        note.hidden = false;
        note.textContent = 'Si è aperto il tuo programma di posta con la richiesta già scritta. Se non succede nulla, scrivici direttamente: ' + to;
      }
    });
  });
})();
