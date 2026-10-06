/* ==========================================================================
   Vathraja Facial Chambers — hero carousel
   Crossfading slides with a slow drift, per-slide captions, dot indicators
   that double as an autoplay progress bar, arrows, keyboard and swipe input.

   Behaviour follows the same rules as the rest of the animation layer:
   - the resting state is committed before any animation runs, so a blocked
     CDN or an interrupted animation can never leave the hero blank;
   - prefers-reduced-motion disables autoplay and the drift entirely, leaving
     a manually controlled slideshow;
   - without JavaScript the first slide renders as a plain static image.
   ========================================================================== */
(function () {
  'use strict';

  var VFC = window.VFC || {};
  var reduced = VFC.reduced !== undefined
    ? VFC.reduced
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var animateOn = VFC.animateOn !== undefined ? VFC.animateOn : !reduced;
  var play = VFC.play || function () { return null; };

  var DWELL = 6000;      /* ms a slide stays before advancing */
  var FADE = 0.9;        /* crossfade duration, seconds */

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-carousel]'), setup);
    Array.prototype.forEach.call(document.querySelectorAll('[data-rail]'), setupRail);
  }

  /* ---------------------------------------------------------------------
     Card rail — a horizontally scrolling row that pages like a carousel.
     The scrolling itself is native (so touch swipe and trackpads work, and
     it still works with JavaScript off); this adds arrows, dots, and
     keyboard access.
     --------------------------------------------------------------------- */
  function setupRail(rail) {
    var track = rail.querySelector('[data-rail-track]');
    if (!track) return;

    var dotsWrap = rail.querySelector('[data-rail-dots]');
    var prevBtn = rail.querySelector('[data-rail-prev]');
    var nextBtn = rail.querySelector('[data-rail-next]');
    var dots = [];
    var m = { step: 1, perView: 1, pages: 1, max: 0 };

    /* Paging works off the card step (card width + gap), not the viewport
       width — otherwise the gap accumulates and pages drift out of alignment
       with the cards, producing a phantom last page.
       Measured once per layout change and cached, so the scroll handler stays
       arithmetic only. */
    function measure() {
      var card = track.firstElementChild;
      if (!card || !track.clientWidth) {
        m = { step: 1, perView: 1, pages: 1, max: 0 };
        return m;
      }
      var gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      var step = card.getBoundingClientRect().width + gap;
      var perView = Math.max(1, Math.round((track.clientWidth + gap) / step));
      m = {
        step: step,
        perView: perView,
        pages: Math.max(1, Math.ceil(track.children.length / perView)),
        max: track.scrollWidth - track.clientWidth
      };
      return m;
    }

    function currentPage() {
      if (m.max > 0 && track.scrollLeft >= m.max - 2) return m.pages - 1;
      return Math.min(m.pages - 1, Math.max(0, Math.round(track.scrollLeft / (m.step * m.perView))));
    }

    function goToPage(i) {
      var target = Math.min(m.max, Math.max(0, i * m.step * m.perView));
      track.scrollTo({ left: target, behavior: animateOn ? 'smooth' : 'auto' });
    }

    function buildDots() {
      var total = measure().pages;

      /* Nothing to scroll: hide the controls entirely */
      rail.classList.toggle('is-single', total < 2);
      track.setAttribute('tabindex', total < 2 ? '-1' : '0');
      if (total < 2) {
        track.removeAttribute('role');
        track.removeAttribute('aria-label');
      } else {
        track.setAttribute('role', 'group');
        track.setAttribute('aria-label', 'Scrollable list, use the arrow keys');
      }

      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      dots = [];
      if (total < 2) return;

      for (var i = 0; i < total; i++) {
        (function (index) {
          var li = document.createElement('li');
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'rail-dot';
          btn.setAttribute('aria-label', 'Show group ' + (index + 1) + ' of ' + total);
          btn.addEventListener('click', function () { goToPage(index); });
          li.appendChild(btn);
          dotsWrap.appendChild(li);
          dots.push(btn);
        })(i);
      }
      sync();
    }

    function sync() {
      var i = currentPage();
      dots.forEach(function (dot, index) {
        dot.setAttribute('aria-current', index === i ? 'true' : 'false');
      });
      var maxScroll = track.scrollWidth - track.clientWidth;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 2;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll - 2;
    }

    if (prevBtn) prevBtn.addEventListener('click', function () { goToPage(currentPage() - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { goToPage(currentPage() + 1); });

    /* Called straight from the scroll event rather than inside
       requestAnimationFrame: rAF is throttled in background tabs, which would
       leave the dots and arrows showing a stale position. sync() reads no
       layout beyond scrollLeft, so it is cheap enough to run directly. */
    track.addEventListener('scroll', sync, { passive: true });

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goToPage(currentPage() + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goToPage(currentPage() - 1); }
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(buildDots, 150);
    });

    buildDots();
  }

  function setup(root) {
    var viewport = root.querySelector('.hero-carousel__viewport');
    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-slide]'));
    if (slides.length < 2) return;

    var dots = Array.prototype.slice.call(root.querySelectorAll('.hero-dot'));
    var liveRegion = root.querySelector('[data-carousel-status]');
    var dwell = parseInt(root.getAttribute('data-dwell'), 10) || DWELL;

    var index = Math.max(0, slides.findIndex(function (s) { return s.classList.contains('is-active'); }));
    var timer = null;
    var startedAt = 0;
    var remaining = dwell;
    var paused = false;
    var userDriven = false;   /* becomes true after any manual interaction */

    root.style.setProperty('--dwell', dwell + 'ms');

    /* Initial state: the active slide is visible, the rest are not ------- */
    slides.forEach(function (slide, i) {
      var active = i === index;
      slide.classList.toggle('is-active', active);
      slide.style.opacity = active ? '1' : '0';
      slide.setAttribute('aria-hidden', active ? 'false' : 'true');
      setSlideFocusable(slide, active);
    });
    syncDots();
    if (animateOn) drift(slides[index]);

    /* ------------------------------------------------------------------ */
    function goTo(next, fromUser) {
      next = (next + slides.length) % slides.length;
      if (next === index) return;

      var outgoing = slides[index];
      var incoming = slides[next];
      index = next;

      if (fromUser) userDriven = true;

      /* Resting state first — the animation only decorates the change */
      incoming.classList.add('is-active');
      incoming.style.opacity = '1';
      incoming.setAttribute('aria-hidden', 'false');
      setSlideFocusable(incoming, true);

      outgoing.style.opacity = '0';
      outgoing.setAttribute('aria-hidden', 'true');
      setSlideFocusable(outgoing, false);

      if (animateOn) {
        play(incoming, { opacity: [0, 1] }, { duration: FADE });
        play(incoming.querySelector('img'),
          { transform: ['scale(1.05)', 'scale(1)'] }, { duration: 1.1 });
        play(outgoing, { opacity: [1, 0] }, { duration: FADE * 0.8 });

        var caption = incoming.querySelector('.hero-slide__caption');
        if (caption) {
          caption.style.opacity = '1';
          caption.style.transform = 'none';
          play(caption,
            { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] },
            { duration: 0.55, delay: 0.25 });
        }
        /* Start the drift only once the entry zoom has landed, so the two
           do not fight over the same transform */
        drift(incoming, 1.1);
      }

      /* Only remove the class once the crossfade has finished, so the
         outgoing slide does not disappear mid-fade */
      window.setTimeout(function () {
        if (slides[index] !== outgoing) outgoing.classList.remove('is-active');
      }, animateOn ? FADE * 1000 : 0);

      syncDots();
      announce();
      restart();
    }

    /* A barely perceptible zoom across the dwell — premium, not showy */
    function drift(slide, delay) {
      var img = slide.querySelector('img');
      if (!img || !animateOn) return;
      play(img, { transform: ['scale(1)', 'scale(1.035)'] },
        { duration: (dwell + 1200) / 1000, delay: delay || 0, ease: 'linear', easing: 'linear' });
    }

    function setSlideFocusable(slide, active) {
      Array.prototype.forEach.call(slide.querySelectorAll('a, button'), function (el) {
        if (active) el.removeAttribute('tabindex');
        else el.setAttribute('tabindex', '-1');
      });
    }

    function syncDots() {
      dots.forEach(function (dot, i) {
        var active = i === index;
        /* Re-adding the class restarts the progress-fill animation */
        dot.classList.remove('is-active');
        if (active) {
          void dot.offsetWidth;
          dot.classList.add('is-active');
        }
        dot.setAttribute('aria-selected', active ? 'true' : 'false');
        dot.setAttribute('tabindex', active ? '0' : '-1');
      });
    }

    /* The live region stays silent during autoplay and only announces once
       the visitor has taken control — per carousel authoring practice. */
    function announce() {
      if (!liveRegion) return;
      liveRegion.setAttribute('aria-live', userDriven ? 'polite' : 'off');
      liveRegion.textContent = 'Slide ' + (index + 1) + ' of ' + slides.length;
    }

    /* Autoplay ---------------------------------------------------------- */
    function restart() {
      window.clearTimeout(timer);
      if (!animateOn) return;
      remaining = dwell;
      startedAt = Date.now();
      paused = false;
      root.classList.remove('is-paused');
      timer = window.setTimeout(function () { goTo(index + 1, false); }, remaining);
    }

    function pause() {
      if (paused || !animateOn) return;
      paused = true;
      window.clearTimeout(timer);
      remaining = Math.max(600, remaining - (Date.now() - startedAt));
      root.classList.add('is-paused');
    }

    function resume() {
      if (!paused || !animateOn) return;
      paused = false;
      startedAt = Date.now();
      root.classList.remove('is-paused');
      timer = window.setTimeout(function () { goTo(index + 1, false); }, remaining);
    }

    if (animateOn) restart();

    /* Interaction ------------------------------------------------------- */
    root.addEventListener('mouseenter', pause);
    root.addEventListener('mouseleave', resume);
    root.addEventListener('focusin', pause);
    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) resume();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pause();
      else resume();
    });

    var prev = root.querySelector('[data-carousel-prev]');
    var next = root.querySelector('[data-carousel-next]');
    if (prev) prev.addEventListener('click', function () { goTo(index - 1, true); });
    if (next) next.addEventListener('click', function () { goTo(index + 1, true); });

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goTo(i, true); });
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1, true); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1, true); }
    });

    /* Swipe ------------------------------------------------------------- */
    if (viewport && window.PointerEvent) {
      var startX = null;
      viewport.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        startX = e.clientX;
        pause();
      });
      viewport.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var delta = e.clientX - startX;
        startX = null;
        if (Math.abs(delta) > 40) goTo(index + (delta < 0 ? 1 : -1), true);
        else resume();
      });
      viewport.addEventListener('pointercancel', function () { startX = null; resume(); });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
