# Vathraja Facial Chambers — website

Plain HTML, CSS, and JavaScript. No build tooling, no framework, no bundler.
Open `index.html` directly, or serve the folder as static files.

---

## Running it locally

Any static server works. One is included for convenience:

```bash
powershell -ExecutionPolicy Bypass -File tools/serve.ps1
```

Then open <http://localhost:5173/>. The site also works from `file://`, though a
server is closer to production behaviour.

---

## Design system

Extracted from the supplied Figma reference.

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `--c-violet` | `#7A6AC0` | Primary brand violet — buttons, bands, accents |
| `--c-violet-600` | `#6B5AB4` | Hover / pressed states |
| `--c-violet-700` | `#574896` | Links, eyebrows, icon glyphs |
| `--c-violet-800` | `#45397A` | Card headings, footer background |
| `--c-violet-900` | `#332A5C` | Deepest violet, reserved |
| `--c-lav-50` | `#F5F3FC` | Tinted section backgrounds, input fills |
| `--c-lav-100` | `#EAE6F8` | Soft fills, avatar backgrounds |
| `--c-lav-200` | `#D9D2F0` | Rules, dividers |
| `--c-lav-300` | `#BFB4E4` | Ghost-button borders |
| `--c-cream` | `#F8F5EE` | Alternating warm section background |
| `--c-line-lav` | `#E2DCF3` | Card and input borders |
| `--c-ink` | `#241F3D` | Headings |
| `--c-ink-soft` | `#4A4468` | Strong body text, labels |
| `--c-body` | `#5B5776` | Body copy |
| `--c-muted` | `#7A7498` | Meta text, disclaimers |
| `--c-gold` | `#B99763` | Sparingly, on cream note blocks |
| `--c-danger` | `#B4443C` | Form validation only |

All tokens live in `:root` at the top of `css/styles.css`.

### Typography

- **Display / headings:** Poppins (500, 600) — geometric, calm, matches the Figma headline forms.
- **Body / UI:** Inter (400, 500, 600).
- Both load from Google Fonts with system-font fallbacks.
- Sizes are fluid `clamp()` values (`--fs-hero` through `--fs-xs`), so there are
  no typographic breakpoints to maintain.

### Shape and depth

Pill buttons (`--r-pill`), 22px cards (`--r-lg`), 30px hero/CTA panels
(`--r-xl`). Shadows are soft and diffused (`--sh-1` … `--sh-3`) — never harsh,
in keeping with a clinical rather than commercial feel.

---

## Structure

```
index.html                 …and 15 more page files at the root
css/
  styles.css               tokens, layout, components
  animations.css           pre-animation states + reduced-motion resets
js/
  animations.js            Motion setup, reveals, hero entrance, accordion
  nav.js                   sticky header, mobile drawer, tracking, campaign params
  carousel.js              hero carousel
  gallery.js               gallery filtering + lightbox
  forms.js                 consultation form validation and submission
images/                    labelled JPEG placeholders + SVG logo mark
tools/
  build.sh                 page assembler (see below)
  serve.ps1                local static server
  make-placeholders.ps1    regenerates the placeholder JPEGs
  placeholder-manifest.txt text + geometry for each placeholder
  pages/                   per-page body content
```

### Pages

| File | Purpose |
| --- | --- |
| `index.html` | Home |
| `about.html` | About Vathraja Facial Chambers |
| `dermatology-skin-health.html` | Dermatology and Skin Health |
| `facial-aesthetics.html` | Facial Aesthetics and Rejuvenation |
| `injectables-facial-balance.html` | Injectables and Facial Balance |
| `doctor-led-cosmetic-procedures.html` | Doctor-Led Cosmetic Procedures |
| `skin-consultation.html` | Skin Consultation |
| `safety-aftercare.html` | Safety, Suitability and Aftercare |
| `face-and-smile-before-the-big-day.html` | Shared Danthaja + Vathraja campaign page |
| `patient-journey.html` | Patient Journey |
| `faqs.html` | FAQs (accordion + FAQPage schema) |
| `blog.html` | Skin education listing |
| `blog-healthy-skin-begins-with-the-right-diagnosis.html` | Sample article |
| `gallery.html` | Clinic gallery (filterable grid + lightbox) |
| `contact-booking.html` | Contact and appointment booking |
| `launch-consultation-week.html` | Launch campaign page |
| `thank-you.html` | Post-submission page |

---

## Editing pages

The shipped `.html` files are plain static pages and can be edited directly.

Because the header, footer, and booking CTA band repeat on all 16 pages, a small
assembler keeps them identical:

```bash
bash tools/build.sh
```

It wraps each body in `tools/pages/<slug>.html` with the shared `<head>`,
header, footer, and script tags, writing the result to `<slug>.html` at the root.

- Page metadata (title, description, active nav item) is the `MANIFEST` block at
  the top of `tools/build.sh`.
- The shared header, footer, and CTA band markup also live in `tools/build.sh`.
- A page body drops `<!--@CTA-->` (or `<!--@CTA_CREAM-->` on a cream background)
  wherever the booking CTA band should appear.
- Optional per-page `<head>` additions go in `tools/pages/<slug>.head.html`
  (used for the FAQ page's `FAQPage` JSON-LD).

**If you edit the root `.html` files directly, do not run the build afterwards** —
it would overwrite them from `tools/pages/`. Either keep editing the root files
and retire the assembler, or keep edits in `tools/pages/` and rebuild.

---

## Animation

Animations use [Motion](https://motion.dev) — the vanilla-JavaScript library from
the team behind Framer Motion (Framer Motion itself is React-only and cannot run
here). It loads from CDN in every page footer:

```html
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.13/dist/motion.js"></script>
```

What is animated: hero entrance stagger, scroll-triggered section and card
reveals, the mobile drawer, the FAQ accordion, the page-load fade, header
condensing on scroll, plus hover transitions (mostly CSS).

Two rules the code follows:

1. **Resting state is committed before the animation starts.** Every animated
   element has its final inline styles applied first, then the animation plays
   over the top. A blocked CDN, an interrupted animation, or a browser that does
   not commit Web Animations end values can never leave content invisible.
2. **`prefers-reduced-motion` is fully honoured** — pre-animation states are
   neutralised in `css/animations.css` and the JS skips animation entirely.

Add a reveal to any element with `data-reveal="up|down|left|right|scale|fade"`
(optionally `data-delay="0.15"`), or stagger a grid's children with
`data-stagger="0.08"` on the container.

### Hero carousel

The home-page hero visual is a carousel (`js/carousel.js`), matching the slider
dots in the Figma reference. Four slides crossfade every 6 seconds with a slow,
barely perceptible zoom; each slide carries its own caption chip.

- **Controls:** dot indicators that double as an autoplay progress bar, arrow
  buttons (hidden below 480px), keyboard `←` / `→`, and swipe.
- **Autoplay pauses** on hover, on keyboard focus anywhere inside, during a
  swipe, and when the browser tab is hidden — resuming with the remaining time
  rather than restarting.
- **Accessibility:** `aria-roledescription="carousel"` / `"slide"`, dots as a
  tablist with `aria-selected`, inactive slides `aria-hidden` and removed from
  the tab order, and a visually hidden live region that stays silent during
  autoplay and only announces once the visitor takes control.
- **Reduced motion:** autoplay and the drift are both off; slides swap instantly
  and the carousel becomes a manually controlled slideshow.
- **Without JavaScript:** the first slide renders as a plain static image and
  the controls are hidden.

To change slides, edit the `.hero-slide` blocks in `tools/pages/index.html` —
add or remove a matching `.hero-dot` button, keep the `aria-label` counts
("2 of 4") in step, and rebuild. Timing is the `data-dwell` attribute in
milliseconds. The markup is generic (`data-carousel`), so the same component can
be dropped onto another page's hero.

Slide images are cropped to `4 / 3` on mobile, `3 / 2` at single-column widths,
and `4 / 5` once the image sits beside the headline — set in the
`.hero-carousel__viewport` rules.

### Clinic gallery

`gallery.html` is a column-based masonry grid (no layout JavaScript) with
category filtering and a lightbox (`js/gallery.js`). The lightbox traps focus,
closes on Escape or a backdrop click, steps with `←` / `→` or a swipe, and
returns focus to the thumbnail that opened it. Filtering and the lightbox are
aware of each other: stepping only walks the images currently visible.

To add an image, copy a `.gallery-item` button and set `data-category`
(`spaces` / `consultation` / `treatment` / `details`), `data-title`, and
`data-caption`. A new category needs a matching `.gallery-filter` button.

The home page carries a four-image teaser strip linking through to the page.

**This gallery is clinic environment only** — no patient photographs and no
before-and-after comparisons, consistent with the rest of the site. The page
states this explicitly in a closing note.

### Sticky intro column

Add `class="split__sticky"` to the first child of a `.split` grid and it stays
pinned while the second column scrolls past (940px and up only). Used on the
home page "Why choose us" section, the contact page (clinic details beside the
booking form), and the patient journey page (the pathway intro beside the
stages).

Before adding it somewhere new, check the column is shorter than the viewport.
A sticky column taller than the screen pins at the top and leaves its lower
content permanently unreachable.

Note: this depends on `<body>` using `overflow-x: clip` rather than
`overflow-x: hidden` — hidden turns the body into a scroll container and
silently breaks every `position: sticky` inside it. The rule sits just under
the `body` declaration in `css/styles.css` with a comment; don't revert it.

### Navigation

The four clinical pathways live in a **Treatments** dropdown so the top level
stays short. It opens on hover for pointer users and on click or `↓` for
everyone else; Escape closes it and returns focus to the trigger. The parent
highlights on any of the four pages.

Edit the submenu in the `NAV_TREATMENTS` block of `tools/build.sh` — labels,
hrefs, and the one-line descriptions that appear under each. On mobile the same
four links render as a labelled indented group inside the drawer.

### Journey stages

The patient journey pathway (`.journey`) is a card-based set of stages with a
vertical rail that fills as the visitor scrolls; each stage's numbered marker
fills violet as it crosses an anchor line at 62% of the viewport height.

The progress is driven by a rAF-throttled scroll listener in `js/animations.js`
(`scrollProgress`), not by the animation engine — so the fill is always exactly
where the scroll position says it should be, never mid-flight or stale.

- **Reduced motion:** rail full, every stage shown in its reached state.
- **Without JavaScript:** identical — the CSS defaults are the finished state
  and the `.js` class is what hides them.

Markup lives in `tools/pages/patient-journey.html`: a `.journey` wrapper holding
`.journey__track` and an `.journey__list` of `[data-journey-step]` items. Each
card pairs an image with a stage label, heading, body, and a `.journey__tag` chip naming
what the visitor gets from that stage.

The stage image sits beside the text only between 700–939px and above 1200px.
Between 940px and 1199px the stages column is too narrow and the image would
collapse into a sliver, so it stacks above the text at a 16:9 crop instead.

This replaced the older `.timeline` component, whose CSS has been removed.

### Placeholder images

Every placeholder is a **JPEG** in `images/`, matching the format the real
photography will arrive in. The one exception is `images/logo-mark.svg`:

- JPEG has no transparency, so a JPG logo would sit in a white box on the
  violet footer;
- it is also the favicon, and SVG stays sharp at 16px.

Keep the logo as SVG (or swap it for a transparent PNG).

The placeholders are generated rather than hand-drawn:

```bash
powershell -ExecutionPolicy Bypass -File tools/make-placeholders.ps1
```

`tools/placeholder-manifest.txt` holds one row per text line —
`name|width|height|baselineY|fontSize|fill|bold|letterSpacing|text` — so sizes
and captions can be changed and the set re-rendered. Pass `-Quality 80` to
trade fidelity for file size.

A note on size: the diagonal stripe pattern is high-frequency detail across the
whole frame, which is the worst case for JPEG. These placeholders total ~4.1MB
at quality 92. Real photographs at the same dimensions compress far better, so
this shrinks on its own once they land.

### Clinical team

The home page shows one card per clinician in a horizontal **rail** (`.rail`,
driven by `setupRail` in `js/carousel.js`): three cards in view on desktop, two
on tablet, one on mobile, with the rest scrolling into place. The pillar card
design is unchanged — only its container is different.

- Native scroll with CSS scroll-snap, so touch swipe and trackpads work and the
  rail is still usable with JavaScript off (the arrows and dots hide).
- Paging is measured from the **card step** (card width + gap), not the viewport
  width; paging by viewport width lets the gap accumulate and produces a
  phantom final page.
- Dots are generated to match the real page count: `ceil(cards / cards-in-view)`.
- The scroll handler runs directly rather than inside `requestAnimationFrame`,
  which is throttled in background tabs and would leave stale dot states.
- Keyboard: the track is focusable when scrollable and responds to the arrow keys.

The five clinicians on `about.html` come from *Vathraja Facial Chambers —
Doctors Directory*. Each card carries name, role, any special interest,
SLMC number and qualifications, the supplied bio, and a link to that
clinician's pathway. The home page pillar cards name the same clinicians
against their pathway.

Pathway mapping:

| Pathway | Clinicians |
| --- | --- |
| Dermatology and Skin Health | Dr Dulini Liyanagama, Dr Kavinda Nanayakkara |
| Facial Surgical Aesthetics and Injectables | Dr Anushan Madhushanka, Dr Dilan Fernando |
| Doctor-Led General Cosmetic Procedures | Dr Madhubhani Dissanayake |

**Email addresses were not published.** The directory lists a personal Gmail
address for three of the clinicians. That document is an internal directory,
personal addresses on a public page attract spam, and patient enquiries should
reach the clinic rather than an individual inbox. If the clinicians do want
them public, add a line to each card — the markup is in
`tools/pages/about.html`.

Bios are reproduced as supplied, with only the leading "At Vathraja Facial
Chambers," removed, since the sentence already sits on the Vathraja website.

### Safety panel

`.safety-panel` is the modern treatment of the "safety and suitability" block —
a violet gradient card with a badge, three translucent point cards, and a
footer pairing the disclaimer with a booking CTA. It is currently used on
`dermatology-skin-health.html`; the other three clinical pages still use the
older plain `.note` block.

---

## Forms

`js/forms.js` handles any form marked `data-consult-form`. It validates name,
mobile, email format, service, and the consent checkbox, then logs the payload
and redirects to `thank-you.html`.

**There is no backend.** The integration point is marked with a comment block in
`js/forms.js` — POST the collected `data` object there and redirect only on a
successful response. The payload already includes the consent flag, the
submitting page, and any captured `utm_*` campaign parameters.

Deep links can preselect a pathway:
`contact-booking.html?service=Dermatology%20Consultation`.

---

## Tracking

Every conversion point carries `data-track="<event>"` and usually a
`data-track-label`. A single delegated listener in `js/nav.js` catches them all —
wire the real analytics call there (a `TODO` marks the spot).

Events in use: `cta_book_consultation`, `cta_call`, `cta_whatsapp`, `cta_email`,
`cta_face_and_smile`, `cta_destination`, `service_card_click`,
`doctor_profile_click`, `consultation_click`, `journey_click`, `safety_click`,
`faq_click`, `blog_click`, `social_click`, `hero_carousel_dot`, `gallery_click`,
`gallery_filter`, `form_submit`.

Campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
`ref`) are captured into `sessionStorage` on arrival and attached to form
submissions.

---

## Structured data

- `MedicalClinic` JSON-LD on every page (in `tools/build.sh`).
- `FAQPage` JSON-LD on `faqs.html` (in `tools/pages/faqs.head.html`) — keep it in
  sync when questions change.

---

## Before launch — replace these placeholders

- [ ] `images/logo-mark.svg` — brand logo
- [ ] All `images/*.jpg` — labelled placeholders; no real photography is used
- [ ] `images/hero-slide-1…4.jpg` — the four hero carousel slides (portrait crop)
- [ ] `images/gallery-*.jpg` — the twelve clinic gallery images
- [ ] `images/journey-0*.jpg` — the five patient journey stage images
- [x] Clinician names, roles, qualifications and bios — taken from
      *Vathraja Facial Chambers — Doctors Directory* (`about.html` team section,
      `index.html` pillar cards)
- [ ] **SLMC numbers missing for two clinicians** — Dr Dilan Fernando and
      Dr Kavinda Nanayakkara. The other three are published; showing
      registration for some and not others looks inconsistent on a medical site
- [ ] `images/doctor-*.jpg` — the five clinician portraits are placeholders
- [ ] Decide whether the clinicians' email addresses from the directory should
      be published. They are personal Gmail accounts and were **deliberately
      left off the site** — see "Clinical team" below
- [ ] Phone, WhatsApp number, and email (set once at the top of `tools/build.sh`,
      plus `tel:` / `wa.me` links inside `tools/pages/`)
- [ ] Canonical domain — currently `https://www.vathraja.lk/`
- [ ] Opening hours in the `MedicalClinic` schema
- [ ] Map embed on `contact-booking.html`
- [ ] Remaining four blog articles (only the first is written in full)
- [ ] Analytics provider in `js/nav.js`
- [ ] Form submission endpoint in `js/forms.js`

---

## Content rules applied throughout

- No patient photographs, testimonials, or before-and-after images anywhere.
- No guarantees or overpromising: "may help", "designed to support",
  "where clinically appropriate", "based on assessment".
- A medical disclaimer appears in the footer of every page, and near treatment
  descriptions on the clinical pages.
