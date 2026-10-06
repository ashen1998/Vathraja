/* ==========================================================================
   Vathraja Facial Chambers — consultation request forms
   Client-side only. There is no backend yet: submissions are validated,
   logged, and the visitor is sent to /thank-you.html.
   ========================================================================== */
(function () {
  'use strict';

  var VFC = window.VFC || {};
  var M = VFC.motion || window.Motion || null;
  var reduced = VFC.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var play = VFC.play || function () { return null; };
  var animateOn = VFC.animateOn !== undefined ? VFC.animateOn : (!!M && !reduced);

  var PHONE_RE = /^[0-9+()\s-]{7,20}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function init() {
    document.querySelectorAll('[data-consult-form]').forEach(setupForm);
    prefillServiceFromQuery();
  }

  /* Deep links such as /contact-booking.html?service=injectables preselect
     the right pathway, so campaign traffic lands in the right place. */
  function prefillServiceFromQuery() {
    var service = new URLSearchParams(window.location.search).get('service');
    if (!service) return;
    document.querySelectorAll('select[name="service"]').forEach(function (select) {
      Array.prototype.forEach.call(select.options, function (option) {
        if (option.value.toLowerCase() === service.toLowerCase()) select.value = option.value;
      });
    });
  }

  function setupForm(form) {
    var errorBox = form.querySelector('[data-form-error]');
    var submitBtn = form.querySelector('[type="submit"]');

    form.setAttribute('novalidate', '');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var problems = validate(form);
      if (problems.length) {
        showError(errorBox, problems[0].message);
        shake(form.querySelector('[name="' + problems[0].field + '"]'));
        var firstField = form.querySelector('[name="' + problems[0].field + '"]');
        if (firstField) firstField.focus();
        return;
      }

      hideError(errorBox);

      var data = collect(form);

      /* ------------------------------------------------------------------
         INTEGRATION POINT — replace this block with the real submission.

         Today: the enquiry is logged to the console and the visitor is sent
         to the thank-you page. Nothing is stored or transmitted.

         When a backend / CRM is available, POST `data` here, await the
         response, and only then redirect. Keep the consent flag and the
         campaign attribution in the payload.

         Example:
           fetch('/api/consultation-request', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(data)
           }).then(...)
         ------------------------------------------------------------------ */
      /* TODO: fire consultation form submit conversion event here */
      window.console.log('[Vathraja] Consultation request (not yet sent to a server):', data);

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      var redirect = form.getAttribute('data-redirect') || 'thank-you.html';
      window.setTimeout(function () { window.location.href = redirect; }, 350);
    });

    /* Clear the error message once the visitor starts fixing things */
    form.addEventListener('input', function () { hideError(errorBox); });
  }

  function validate(form) {
    var problems = [];
    var get = function (name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? String(el.value || '').trim() : '';
    };

    if (get('name').length < 2) {
      problems.push({ field: 'name', message: 'Please enter your name.' });
    }
    if (!PHONE_RE.test(get('mobile'))) {
      problems.push({ field: 'mobile', message: 'Please enter a valid mobile number so we can reach you.' });
    }
    var email = get('email');
    if (email && !EMAIL_RE.test(email)) {
      problems.push({ field: 'email', message: 'Please check the email address.' });
    }
    if (!get('service')) {
      problems.push({ field: 'service', message: 'Please choose the type of consultation you would like.' });
    }
    var consent = form.querySelector('[name="consent"]');
    if (consent && !consent.checked) {
      problems.push({ field: 'consent', message: 'Please confirm you agree to be contacted about your enquiry.' });
    }
    return problems;
  }

  function collect(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      data[key] = typeof value === 'string' ? value.trim() : value;
    });
    data.consent = !!form.querySelector('[name="consent"]:checked');
    data.submittedAt = new Date().toISOString();
    data.pageUrl = window.location.href;

    try {
      var campaign = window.sessionStorage.getItem('vfc_campaign');
      if (campaign) data.campaign = JSON.parse(campaign);
    } catch (err) { /* attribution is optional */ }

    return data;
  }

  function showError(box, message) {
    if (!box) return;
    box.textContent = message;
    box.classList.add('is-visible');
    play(box, { opacity: [0, 1], transform: ['translateY(-6px)', 'translateY(0px)'] },
      { duration: 0.3 });
  }

  function hideError(box) {
    if (!box) return;
    box.classList.remove('is-visible');
    box.textContent = '';
  }

  function shake(el) {
    if (!el || !animateOn) return;
    play(el, { transform: ['translateX(0px)', 'translateX(-5px)', 'translateX(5px)', 'translateX(0px)'] },
      { duration: 0.32 });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
