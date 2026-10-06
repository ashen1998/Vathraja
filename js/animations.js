/* ==========================================================================
   Vathraja Facial Chambers — animation layer
   Built on Motion (motion.dev) — the vanilla-JS library from the Framer Motion
   team. Loaded from CDN as a global `Motion` before this file runs.

   Principles for this brand:
   - Subtle, unhurried, clinical. No bounce, no overshoot, no gimmicks.
   - Content must be readable without animation. Every element's *resting*
     state is committed to inline styles before its animation starts, so a
     blocked CDN, a stalled animation, or a browser that never commits
     Web Animations end values can never leave content invisible.
   - prefers-reduced-motion is honoured: animations are skipped entirely.
   ========================================================================== */
(function () {
  'use strict';

  var M = window.Motion || null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animateOn = !!M && !reduced;

  /* Shared easing, exposed so nav.js / forms.js stay consistent */
  var EASE = [0.22, 0.61, 0.36, 1];
  var VFC = (window.VFC = window.VFC || {});
  VFC.motion = M;
  VFC.reduced = reduced;
  VFC.animateOn = animateOn;
  VFC.ease = EASE;

  /* Motion is called with both `ease` (v11) and `easing` (Motion One) so the
     library version can be swapped without touching every call site. */
  function opts(o) {
    o = o || {};
    o.ease = o.ease || EASE;
    o.easing = o.easing || EASE;
    return o;
  }
  VFC.opts = opts;

  /* Apply an element's resting state as inline styles. A running Web
     Animation still overrides these, so the motion is unaffected. */
  function rest(nodes, styles) {
    each(nodes).forEach(function (node) {
      if (!node || !node.style) return;
      Object.keys(styles).forEach(function (prop) { node.style[prop] = styles[prop]; });
    });
  }
  VFC.rest = rest;

  function each(nodes) {
    if (!nodes) return [];
    if (nodes instanceof Element) return [nodes];
    return Array.prototype.slice.call(nodes);
  }

  function play(nodes, keyframes, options) {
    if (!animateOn) return null;
    try {
      return M.animate(nodes, keyframes, opts(options));
    } catch (err) {
      return null; /* never let a decorative animation break the page */
    }
  }
  VFC.play = play;

  /* ---------------------------------------------------------------------
     1. Page-load veil — a calm fade rather than a flashy transition
     --------------------------------------------------------------------- */
  function pageEntrance() {
    var veil = document.querySelector('.page-veil');
    if (!veil) return;
    if (!animateOn) { veil.classList.add('is-gone'); return; }
    veil.style.opacity = '0';
    play(veil, { opacity: [1, 0] }, { duration: 0.55 });
    window.setTimeout(function () { veil.classList.add('is-gone'); }, 600);
  }

  /* ---------------------------------------------------------------------
     2. Hero entrance — headline, subtext, CTA staggering in
     --------------------------------------------------------------------- */
  function heroEntrance() {
    var hero = document.querySelector('[data-hero]');
    if (!hero) return;

    var pieces = hero.querySelectorAll(
      '.hero__eyebrow, .hero__title, .hero__copy, .hero__actions, .hero__media'
    );
    var chips = hero.querySelectorAll('.hero__chip');

    rest(pieces, { opacity: '1', transform: 'none' });
    rest(chips, { opacity: '1', transform: 'none' });
    if (!animateOn) return;

    play(
      pieces,
      { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0px)'] },
      { duration: 0.85, delay: M.stagger(0.11, { start: 0.15 }) }
    );

    if (chips.length) {
      play(
        chips,
        { opacity: [0, 1], transform: ['translateY(14px) scale(.96)', 'translateY(0px) scale(1)'] },
        { duration: 0.6, delay: M.stagger(0.12, { start: 0.75 }) }
      );
    }
  }

  /* ---------------------------------------------------------------------
     3. Scroll-triggered reveals (sections, cards, media)
     --------------------------------------------------------------------- */
  var DIRECTION = {
    up:    ['translateY(26px)', 'translateY(0px)'],
    down:  ['translateY(-20px)', 'translateY(0px)'],
    left:  ['translateX(28px)', 'translateX(0px)'],
    right: ['translateX(-28px)', 'translateX(0px)'],
    scale: ['scale(.965)', 'scale(1)'],
    fade:  null
  };

  function reveals() {
    var items = document.querySelectorAll('[data-reveal]');
    var groups = document.querySelectorAll('[data-stagger]');

    if (!animateOn) {
      rest(items, { opacity: '1', transform: 'none' });
      each(groups).forEach(function (group) {
        rest(group.children, { opacity: '1', transform: 'none' });
      });
      return;
    }

    each(items).forEach(function (el) {
      var dir = el.getAttribute('data-reveal') || 'up';
      var delay = parseFloat(el.getAttribute('data-delay') || '0');
      var moves = DIRECTION.hasOwnProperty(dir) ? DIRECTION[dir] : DIRECTION.up;
      var keyframes = { opacity: [0, 1] };
      if (moves) keyframes.transform = moves;

      watch(el, function () {
        rest(el, { opacity: '1', transform: 'none' });
        el.classList.add('is-revealed');
        play(el, keyframes, { duration: 0.8, delay: delay });
      });
    });

    each(groups).forEach(function (group) {
      var step = parseFloat(group.getAttribute('data-stagger') || '0.09');

      watch(group, function () {
        rest(group.children, { opacity: '1', transform: 'none' });
        group.classList.add('is-revealed');
        play(
          group.children,
          { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0px)'] },
          { duration: 0.75, delay: M.stagger(step) }
        );
      });
    });
  }

  /* Reveal once when the element scrolls into view. Falls back to a simple
     viewport check (and, ultimately, to revealing everything) if
     IntersectionObserver is unavailable or never reports. */
  function watch(el, onEnter) {
    var played = false;
    function fire() {
      if (played) return;
      played = true;
      if (typeof stop === 'function') stop();
      onEnter();
    }

    var stop = null;
    if (M && typeof M.inView === 'function') {
      stop = M.inView(el, fire, { margin: '0px 0px -12% 0px' });
    } else if (typeof IntersectionObserver === 'function') {
      var io = new IntersectionObserver(
        function (entries) { if (entries.some(function (e) { return e.isIntersecting; })) fire(); },
        { rootMargin: '0px 0px -12% 0px' }
      );
      io.observe(el);
      stop = function () { io.disconnect(); };
    }

    /* Safety net: anything already sitting in the viewport is revealed even
       if no observer ever reports (hidden tabs, unusual embeds). Checked once
       shortly after load, and again whenever the page becomes visible. */
    function checkInViewport() {
      if (played) return;
      var box = el.getBoundingClientRect();
      if (box.top < (window.innerHeight || 0) && box.bottom > 0) fire();
    }
    window.setTimeout(checkInViewport, 2500);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) window.setTimeout(checkInViewport, 300);
    });
  }

  /* ---------------------------------------------------------------------
     4. FAQ accordion — animated open/close, fully keyboard accessible
     --------------------------------------------------------------------- */
  function accordions() {
    var triggers = document.querySelectorAll('.acc-trigger');
    if (!triggers.length) return;

    each(triggers).forEach(function (trigger) {
      var panel = document.getElementById(trigger.getAttribute('aria-controls'));
      if (!panel) return;

      var startOpen = trigger.getAttribute('aria-expanded') === 'true';
      panel.style.height = startOpen ? 'auto' : '0px';
      if (!startOpen) panel.setAttribute('hidden', '');

      trigger.addEventListener('click', function () {
        var isOpen = trigger.getAttribute('aria-expanded') === 'true';
        toggle(trigger, panel, !isOpen);

        /* One panel open at a time within an accordion */
        var group = trigger.closest('.accordion');
        if (group && !isOpen) {
          each(group.querySelectorAll('.acc-trigger')).forEach(function (other) {
            if (other === trigger) return;
            if (other.getAttribute('aria-expanded') !== 'true') return;
            toggle(other, document.getElementById(other.getAttribute('aria-controls')), false);
          });
        }
      });
    });

    function toggle(trigger, panel, open) {
      if (!panel) return;
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');

      if (open) panel.removeAttribute('hidden');
      if (panel.__vfcTimer) window.clearTimeout(panel.__vfcTimer);

      var inner = panel.firstElementChild;

      if (!animateOn) {
        panel.style.height = open ? 'auto' : '0px';
        if (inner) inner.style.opacity = '1';
        if (!open) panel.setAttribute('hidden', '');
        return;
      }

      /* Measure the natural height while the panel is momentarily open */
      var previous = panel.style.height;
      panel.style.height = 'auto';
      var target = panel.scrollHeight;
      panel.style.height = previous;

      if (open) {
        panel.style.height = 'auto';                 /* resting state first */
        if (inner) inner.style.opacity = '1';
        play(panel, { height: ['0px', target + 'px'] }, { duration: 0.42 });
        play(inner, { opacity: [0, 1] }, { duration: 0.4, delay: 0.08 });
      } else {
        panel.style.height = '0px';                  /* resting state first */
        play(panel, { height: [target + 'px', '0px'] }, { duration: 0.34 });
        panel.__vfcTimer = window.setTimeout(function () {
          if (trigger.getAttribute('aria-expanded') === 'false') panel.setAttribute('hidden', '');
        }, 360);
      }
    }
  }

  /* ---------------------------------------------------------------------
     5. Scroll progress rail (patient journey stages)
        Fills a vertical track as the container scrolls past, and marks each
        step reached as its marker crosses the anchor line. Driven by a
        rAF-throttled scroll listener rather than the animation engine, so
        the position is always exact and never mid-flight.
     --------------------------------------------------------------------- */
  function scrollProgress() {
    var containers = Array.prototype.slice.call(document.querySelectorAll('[data-journey]'));
    if (!containers.length) return;

    /* Reduced motion (or no Motion at all): show the finished state */
    if (reduced) {
      containers.forEach(function (c) {
        var fill = c.querySelector('[data-scroll-progress]');
        if (fill) fill.style.transform = 'scaleY(1)';
        each(c.querySelectorAll('[data-journey-step]')).forEach(function (s) {
          s.classList.add('is-reached');
        });
      });
      return;
    }

    var ticking = false;

    function update() {
      ticking = false;
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      var anchor = viewportH * 0.62;   /* the line a step must cross to count */

      containers.forEach(function (container) {
        var fill = container.querySelector('[data-scroll-progress]');
        var steps = each(container.querySelectorAll('[data-journey-step]'));
        var box = container.getBoundingClientRect();
        if (!box.height) return;

        var progress = (anchor - box.top) / box.height;
        progress = Math.max(0, Math.min(1, progress));
        if (fill) fill.style.transform = 'scaleY(' + progress.toFixed(4) + ')';

        steps.forEach(function (step) {
          var dot = step.querySelector('.journey__dot') || step;
          var rect = dot.getBoundingClientRect();
          step.classList.toggle('is-reached', rect.top + rect.height / 2 <= anchor);
        });
      });
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }

  /* ---------------------------------------------------------------------
     6. Boot
     --------------------------------------------------------------------- */
  function init() {
    try { pageEntrance(); } catch (e) {}
    try { heroEntrance(); } catch (e) {}
    try { reveals(); } catch (e) {}
    try { accordions(); } catch (e) {}
    try { scrollProgress(); } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
