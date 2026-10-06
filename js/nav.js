/* ==========================================================================
   Vathraja Facial Chambers — header, mobile drawer, misc navigation UI
   Depends on window.VFC (set up in /js/animations.js) for the Motion wrapper.
   ========================================================================== */
(function () {
  'use strict';

  var VFC = window.VFC || {};
  var M = VFC.motion || window.Motion || null;
  var reduced = VFC.reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animateOn = VFC.animateOn !== undefined ? VFC.animateOn : (!!M && !reduced);

  /* Play an animation if Motion is available; the caller always sets the
     resting state itself, so nothing depends on the animation completing. */
  var play = VFC.play || function () { return null; };

  /* ---------------------------------------------------------------------
     1. Sticky header that condenses on scroll
     --------------------------------------------------------------------- */
  function stickyHeader() {
    var header = document.querySelector('.site-header');
    if (!header) return;
    var ticking = false;

    function update() {
      header.classList.toggle('is-condensed', window.scrollY > 24);
      ticking = false;
    }
    update();
    window.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );
  }

  /* ---------------------------------------------------------------------
     2. Mobile drawer with animated slide-in + focus trap
     --------------------------------------------------------------------- */
  function mobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var drawer = document.querySelector('.mobile-nav');
    var scrim = document.querySelector('.nav-scrim');
    if (!toggle || !drawer || !scrim) return;

    var closeBtn = drawer.querySelector('.mobile-nav__close');
    var lastFocus = null;
    var isOpen = false;

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      scrim.classList.add('is-open');
      document.body.classList.add('nav-open');
      toggle.setAttribute('aria-expanded', 'true');

      /* Resting state first, animation second */
      scrim.style.opacity = '1';
      drawer.style.transform = 'translateX(0%)';

      if (animateOn) {
        play(scrim, { opacity: [0, 1] }, { duration: 0.3 });
        play(drawer, { transform: ['translateX(100%)', 'translateX(0%)'] }, { duration: 0.45 });
        play(
          drawer.querySelectorAll('.mobile-nav__list li, .mobile-nav__foot > *'),
          { opacity: [0, 1], transform: ['translateX(18px)', 'translateX(0px)'] },
          { duration: 0.4, delay: M.stagger(0.035, { start: 0.12 }) }
        );
      }

      window.setTimeout(function () { (closeBtn || drawer).focus(); }, 120);
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      scrim.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');

      scrim.style.opacity = '0';
      drawer.style.transform = 'translateX(100%)';

      if (animateOn) {
        play(scrim, { opacity: [1, 0] }, { duration: 0.25 });
        play(drawer, { transform: ['translateX(0%)', 'translateX(100%)'] }, { duration: 0.35 });
        window.setTimeout(function () {
          if (!isOpen) drawer.classList.remove('is-open');
        }, 370);
      } else {
        drawer.classList.remove('is-open');
      }

      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    toggle.addEventListener('click', function () { (isOpen ? close : open)(); });
    scrim.addEventListener('click', close);
    if (closeBtn) closeBtn.addEventListener('click', close);

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', close);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;

      var focusables = drawer.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* Close automatically if the viewport grows to desktop width */
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (e) {
      if (e.matches) close();
    });
  }

  /* ---------------------------------------------------------------------
     2b. Desktop "Treatments" dropdown
         Opens on hover for pointer users and on click/keyboard for everyone
         else. Escape closes and returns focus to the trigger.
     --------------------------------------------------------------------- */
  function navDropdowns() {
    var hoverable = window.matchMedia('(hover: hover)').matches;

    Array.prototype.forEach.call(document.querySelectorAll('[data-nav-menu]'), function (item) {
      var trigger = item.querySelector('.nav__link--menu');
      var menu = item.querySelector('.nav__menu');
      if (!trigger || !menu) return;

      var open = false;
      var closeTimer = null;

      function show() {
        window.clearTimeout(closeTimer);
        if (open) return;
        open = true;
        menu.removeAttribute('hidden');
        trigger.setAttribute('aria-expanded', 'true');
        menu.classList.add('is-open');          /* resting state first */
        if (animateOn) {
          play(menu,
            { opacity: [0, 1], transform: ['translateX(-50%) translateY(-8px)', 'translateX(-50%) translateY(0px)'] },
            { duration: 0.28 });
          play(menu.querySelectorAll('.nav__menu-list li, .nav__menu-foot'),
            { opacity: [0, 1], transform: ['translateY(6px)', 'translateY(0px)'] },
            { duration: 0.3, delay: M ? M.stagger(0.035, { start: 0.05 }) : 0 });
        }
      }

      function hide(returnFocus) {
        if (!open) return;
        open = false;
        trigger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('is-open');
        menu.style.opacity = '0';

        if (animateOn) {
          play(menu, { opacity: [1, 0] }, { duration: 0.18 });
          window.setTimeout(function () { if (!open) menu.setAttribute('hidden', ''); }, 190);
        } else {
          menu.setAttribute('hidden', '');
        }
        if (returnFocus) trigger.focus();
      }

      trigger.addEventListener('click', function () { (open ? hide : show)(); });

      if (hoverable) {
        item.addEventListener('mouseenter', show);
        item.addEventListener('mouseleave', function () {
          closeTimer = window.setTimeout(function () { hide(false); }, 160);
        });
      }

      trigger.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          show();
          var first = menu.querySelector('a');
          if (first) window.setTimeout(function () { first.focus(); }, 40);
        }
      });

      menu.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); hide(true); }
      });

      item.addEventListener('focusout', function (e) {
        if (!item.contains(e.relatedTarget)) hide(false);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && open) hide(true);
      });

      document.addEventListener('click', function (e) {
        if (open && !item.contains(e.target)) hide(false);
      });
    });
  }

  /* ---------------------------------------------------------------------
     3. Button / card hover micro-interactions
        CSS covers most of this; Motion adds the nav-link and card polish
        that benefits from interruption-safe animation.
     --------------------------------------------------------------------- */
  function hoverPolish() {
    if (!animateOn) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('[data-hover-lift]').forEach(function (el) {
      el.addEventListener('mouseenter', function () {
        play(el, { transform: "translateY(-4px)" }, { duration: 0.28 });
      });
      el.addEventListener('mouseleave', function () {
        play(el, { transform: "translateY(0px)" }, { duration: 0.3 });
      });
    });
  }

  /* ---------------------------------------------------------------------
     4. Conversion tracking hooks
        Every CTA carries data-track="<event-name>". Wire the real analytics
        call in one place here once a provider is chosen.
     --------------------------------------------------------------------- */
  function trackingHooks() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-track]');
      if (!el) return;
      var event = el.getAttribute('data-track');
      var label = el.getAttribute('data-track-label') || el.textContent.trim().slice(0, 60);

      /* TODO: replace with the real analytics call, e.g.
         gtag('event', event, { event_label: label });
         or dataLayer.push({ event: event, label: label });               */
      if (window.console && window.console.debug) {
        window.console.debug('[track]', event, label);
      }
    });
  }

  /* ---------------------------------------------------------------------
     5. Campaign source capture
        Persists utm_source / utm_campaign so the booking form can attribute
        an enquiry to the campaign that produced it.
     --------------------------------------------------------------------- */
  function captureCampaignParams() {
    try {
      var params = new URLSearchParams(window.location.search);
      var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'];
      var found = {};
      keys.forEach(function (k) { if (params.get(k)) found[k] = params.get(k); });
      if (Object.keys(found).length) {
        window.sessionStorage.setItem('vfc_campaign', JSON.stringify(found));
        /* TODO: forward campaign source to analytics / CRM on form submit */
      }
    } catch (err) {
      /* Storage unavailable (private mode) — attribution is optional. */
    }
  }

  /* ---------------------------------------------------------------------
     6. Year stamp in the footer
     --------------------------------------------------------------------- */
  function footerYear() {
    document.querySelectorAll('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  function init() {
    stickyHeader();
    mobileNav();
    navDropdowns();
    hoverPolish();
    trackingHooks();
    captureCampaignParams();
    footerYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
