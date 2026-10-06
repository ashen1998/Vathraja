/* ==========================================================================
   Vathraja Facial Chambers — clinic gallery
   Category filtering plus an accessible lightbox (Escape, arrow keys, focus
   trap, focus restored on close). Degrades to a plain image grid when
   JavaScript is unavailable.
   ========================================================================== */
(function () {
  'use strict';

  var VFC = window.VFC || {};
  var M = VFC.motion || window.Motion || null;
  var animateOn = VFC.animateOn !== undefined
    ? VFC.animateOn
    : !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var play = VFC.play || function () { return null; };

  function init() {
    var grid = document.querySelector('[data-gallery]');
    if (!grid) return;

    var items = Array.prototype.slice.call(grid.querySelectorAll('[data-gallery-item]'));
    setupFilters(grid, items);
    setupLightbox(grid, items);
  }

  /* ---------------------------------------------------------------------
     Category filtering
     --------------------------------------------------------------------- */
  function setupFilters(grid, items) {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-gallery-filter]'));
    var counter = document.querySelector('[data-gallery-count]');
    if (!buttons.length) return;

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var filter = btn.getAttribute('data-gallery-filter');

        buttons.forEach(function (b) {
          b.setAttribute('aria-pressed', b === btn ? 'true' : 'false');
        });

        var shown = 0;
        items.forEach(function (item) {
          var match = filter === 'all' || item.getAttribute('data-category') === filter;
          item.classList.toggle('is-hidden', !match);
          if (match) {
            shown++;
            if (animateOn) {
              item.style.opacity = '1';
              play(item, { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0px)'] },
                { duration: 0.4 });
            }
          }
        });

        if (counter) {
          counter.textContent = shown + (shown === 1 ? ' image' : ' images');
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     Lightbox
     --------------------------------------------------------------------- */
  function setupLightbox(grid, items) {
    var box = document.querySelector('[data-lightbox]');
    if (!box) return;

    var img = box.querySelector('.lightbox__img');
    var caption = box.querySelector('[data-lightbox-caption]');
    var status = box.querySelector('[data-lightbox-status]');
    var closeBtn = box.querySelector('.lightbox__close');
    var prevBtn = box.querySelector('.lightbox__prev');
    var nextBtn = box.querySelector('.lightbox__next');

    var current = 0;
    var lastFocus = null;

    /* Only the items still visible after filtering take part */
    function visible() {
      return items.filter(function (i) { return !i.classList.contains('is-hidden'); });
    }

    function render() {
      var list = visible();
      var item = list[current];
      if (!item) return;
      var source = item.querySelector('img');

      img.src = source.getAttribute('src');
      img.alt = source.getAttribute('alt') || '';
      caption.innerHTML = '';
      caption.appendChild(document.createTextNode(item.getAttribute('data-title') || ''));
      var cat = document.createElement('span');
      cat.textContent = item.getAttribute('data-caption') || '';
      caption.appendChild(cat);
      if (status) status.textContent = (current + 1) + ' of ' + list.length;

      if (animateOn) {
        img.style.opacity = '1';
        play(img, { opacity: [0, 1], transform: ['scale(.985)', 'scale(1)'] }, { duration: 0.35 });
      }
    }

    /* `trigger` is passed explicitly rather than read from document.activeElement:
       clicking a <button> does not focus it in every browser, and focus must
       return to the thumbnail the visitor opened. */
    function open(index, trigger) {
      var list = visible();
      current = Math.max(0, index);
      lastFocus = trigger || document.activeElement;

      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lightbox-open');
      render();

      if (animateOn) {
        box.style.opacity = '1';
        play(box, { opacity: [0, 1] }, { duration: 0.25 });
      }
      window.setTimeout(function () { closeBtn.focus(); }, 40);

      /* Hide the arrows when there is nothing to move between */
      var many = list.length > 1;
      prevBtn.hidden = !many;
      nextBtn.hidden = !many;
    }

    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function step(delta) {
      var list = visible();
      if (!list.length) return;
      current = (current + delta + list.length) % list.length;
      render();
    }

    items.forEach(function (item) {
      item.addEventListener('click', function () {
        open(visible().indexOf(item), item);
      });
    });

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { step(-1); });
    nextBtn.addEventListener('click', function () { step(1); });

    box.addEventListener('click', function (e) {
      if (e.target === box) close();   /* click the backdrop */
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;

      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      else if (e.key === 'Tab') {
        /* Keep focus inside the lightbox while it is open */
        var focusables = Array.prototype.filter.call(
          box.querySelectorAll('button'),
          function (b) { return !b.hidden; }
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    /* Swipe between images on touch devices */
    if (window.PointerEvent) {
      var startX = null;
      box.addEventListener('pointerdown', function (e) { startX = e.clientX; });
      box.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var delta = e.clientX - startX;
        startX = null;
        if (Math.abs(delta) > 45) step(delta < 0 ? 1 : -1);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
