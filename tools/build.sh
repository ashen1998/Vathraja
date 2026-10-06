#!/usr/bin/env bash
# =============================================================================
# Vathraja Facial Chambers — static page assembler
#
# The shipped site is plain HTML: this script only exists so the shared header,
# footer, and CTA band stay byte-identical across every page. Run it after
# editing a partial or a page body:
#
#     bash tools/build.sh
#
# Page bodies live in tools/pages/<slug>.html
# Optional per-page <head> extras (e.g. JSON-LD) in tools/pages/<slug>.head.html
# =============================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PAGES="$ROOT/tools/pages"

PHONE_DISPLAY="+94 11 234 5678"
PHONE_HREF="tel:+94112345678"
WHATSAPP_HREF="https://wa.me/94112345678"
EMAIL_HREF="mailto:hello@vathraja.lk"

# slug|nav key|title|meta description
MANIFEST=$(cat <<'EOF'
index|home|Vathraja Facial Chambers &mdash; Specialist-Led Facial Aesthetics, Colombo|Dermatology, facial aesthetics, injectables and doctor-led cosmetic care in a premium clinical environment at One Galle Face, Colombo. Consultation-first, always.
about|about|About Vathraja Facial Chambers &mdash; One Galle Face, Colombo|Vathraja Facial Chambers is the facial aesthetics arm of a premium dentofacial aesthetics destination at One Galle Face, Colombo. Specialist-led, consultation-first care.
dermatology-skin-health|dermatology|Dermatology and Skin Health &mdash; Vathraja Facial Chambers|Specialist dermatology consultations for acne, pigmentation, sensitivity, scars and long-term skin health at One Galle Face, Colombo.
facial-aesthetics|facial-aesthetics|Facial Aesthetics and Rejuvenation &mdash; Vathraja Facial Chambers|Consultation-led facial aesthetics designed to support refreshed, balanced and natural-looking results where clinically appropriate.
injectables-facial-balance|injectables|Injectables and Facial Balance &mdash; Vathraja Facial Chambers|Injectable treatments guided by anatomy, safety and suitability, beginning with a professional assessment by a consultant.
doctor-led-cosmetic-procedures|cosmetic-procedures|Doctor-Led Cosmetic Procedures &mdash; Vathraja Facial Chambers|Medically responsible cosmetic care with clear assessment, safety guidance and realistic expectations in a premium clinical setting.
skin-consultation|dermatology|Skin Consultation &mdash; Vathraja Facial Chambers|A professional skin consultation helps us understand your skin before recommending any treatment. Here is what we review together.
safety-aftercare|safety|Safety, Suitability and Aftercare &mdash; Vathraja Facial Chambers|Safe facial care starts with the right assessment. Read our approach to suitability, safety and aftercare at Vathraja Facial Chambers.
face-and-smile-before-the-big-day|campaign|Face and Smile Before the Big Day &mdash; Danthaja and Vathraja|Plan aligner assessment, facial consultation, skin planning and realistic timelines ahead of weddings and milestone events.
patient-journey|patient-journey|Patient Journey &mdash; Vathraja Facial Chambers|From first consultation to aftercare and review — a clear, consultation-first pathway at Vathraja Facial Chambers, One Galle Face.
faqs|faqs|FAQs &mdash; Vathraja Facial Chambers|Answers to common questions about consultations, facial treatments, suitability, results and downtime.
blog|blog|Skin Education and Insights &mdash; Vathraja Facial Chambers|Clinically grounded articles on skin health, facial aesthetics, aftercare and planning your face and smile.
blog-healthy-skin-begins-with-the-right-diagnosis|blog|Healthy Skin Begins with the Right Diagnosis &mdash; Vathraja Facial Chambers|Why a diagnosis-first approach matters more than choosing a treatment by name, and what a specialist assessment involves.
gallery|gallery|Clinic Gallery &mdash; Vathraja Facial Chambers|A look inside Vathraja Facial Chambers at One Galle Face, Colombo: consultation rooms, treatment spaces, and the clinical environment.
contact-booking|contact|Contact and Appointment Booking &mdash; Vathraja Facial Chambers|Request a consultation at Vathraja Facial Chambers, One Galle Face, Colombo. Call, WhatsApp or send an enquiry.
launch-consultation-week|campaign|Vathraja Launch Consultation Week &mdash; Vathraja Facial Chambers|Meet the Vathraja team and explore skin health, facial aesthetics and doctor-led care with consultation-first guidance.
thank-you|contact|Thank You &mdash; Vathraja Facial Chambers|Your consultation request has been received. Our team will contact you to confirm the details.
EOF
)

# --- nav model: key|label|href -----------------------------------------------
# The four clinical pathways sit inside a "Treatments" dropdown, so the top
# level stays short. `@treatments` is the marker for that submenu.
NAV_MAIN="home|Home|index.html
about|About|about.html
treatments|Treatments|@treatments
patient-journey|Patient Journey|patient-journey.html
gallery|Gallery|gallery.html
faqs|FAQs|faqs.html
blog|Blog|blog.html
contact|Contact|contact-booking.html"

NAV_MOBILE="$NAV_MAIN
dermatology|Skin Consultation|skin-consultation.html
safety|Safety and Aftercare|safety-aftercare.html
campaign|Face and Smile Before the Big Day|face-and-smile-before-the-big-day.html
campaign|Launch Consultation Week|launch-consultation-week.html"

# Treatments submenu: key|label|href|short description
NAV_TREATMENTS="dermatology|Dermatology|dermatology-skin-health.html|Skin health, led by a consultant dermatologist
facial-aesthetics|Facial Aesthetics|facial-aesthetics.html|Balance, proportion, natural-looking results
injectables|Injectables|injectables-facial-balance.html|Anatomy-led assessment and suitability
cosmetic-procedures|Cosmetic Procedures|doctor-led-cosmetic-procedures.html|Doctor-led facial rejuvenation"

# Keys that light up the Treatments parent
TREATMENT_KEYS=" dermatology facial-aesthetics injectables cosmetic-procedures "

# --- reusable booking CTA band ----------------------------------------------
# Page bodies drop `<!--@CTA-->` (or `<!--@CTA_CREAM-->` on a cream section)
# wherever the band should appear — near the top, middle and end of long pages.
read -r -d '' CTA_BAND <<'CTA' || true
<!-- Booking CTA band (shared component — edit in tools/build.sh) -->
<section class="cta-band" data-reveal="up">
  <div class="shell">
    <div class="cta-band__panel on-violet">
      <p class="cta-band__eyebrow">Begin with a conversation</p>
      <h2 class="cta-band__title">Ready to take the first step?</h2>
      <p class="cta-band__copy">Book a consultation at the Danthaja and Vathraja dentofacial aesthetics destination at One Galle Face, Colombo. Our team will help you understand your options, the right pathway, and what to expect.</p>
      <div class="btn-row btn-row--center">
        <a class="btn btn--light btn--lg" href="contact-booking.html" data-track="cta_book_consultation" data-track-label="CTA band">Book a Consultation</a>
        <a class="btn btn--outline-light btn--lg" href="tel:+94112345678" data-track="cta_call" data-track-label="CTA band">Call the clinic</a>
      </div>
      <p class="cta-band__note">Treatment outcomes vary by individual and require a professional consultation.</p>
    </div>
  </div>
</section>
CTA

CTA_BAND_CREAM="${CTA_BAND/<section class=\"cta-band\"/<section class=\"cta-band cta-band--on-cream\"}"

render_body() {
  local file="$1"
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *'<!--@CTA_CREAM-->'*) printf '%s\n' "$CTA_BAND_CREAM" ;;
      *'<!--@CTA-->'*)       printf '%s\n' "$CTA_BAND" ;;
      *)                     printf '%s\n' "$line" ;;
    esac
  done < "$file"
}

in_treatments() {
  case "$TREATMENT_KEYS" in *" $1 "*) return 0 ;; *) return 1 ;; esac
}

# Desktop: Treatments renders as a hover/click dropdown (see js/nav.js).
render_treatments_desktop() {
  local active="$1" parent_cls=""
  if in_treatments "$active"; then parent_cls=" is-active"; fi

  printf '        <div class="nav-item nav-item--menu" data-nav-menu>\n'
  printf '          <button class="nav__link nav__link--menu%s" type="button" aria-expanded="false" aria-controls="nav-treatments" aria-haspopup="true">Treatments<svg class="nav__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>\n' "$parent_cls"
  printf '          <div class="nav__menu" id="nav-treatments" hidden>\n'
  printf '            <ul class="nav__menu-list">\n'
  while IFS='|' read -r key label href desc; do
    if [ -z "$key" ]; then continue; fi
    local cls="" aria=""
    if [ "$key" = "$active" ]; then cls=" is-active"; aria=' aria-current="page"'; fi
    printf '              <li><a class="nav__menu-link%s" href="%s"%s><span class="nav__menu-title">%s</span><span class="nav__menu-desc">%s</span></a></li>\n' \
      "$cls" "$href" "$aria" "$label" "$desc"
  done <<< "$NAV_TREATMENTS"
  printf '            </ul>\n'
  printf '            <a class="nav__menu-foot" href="skin-consultation.html">Not sure which applies to you? Start with a consultation &rarr;</a>\n'
  printf '          </div>\n'
  printf '        </div>\n'
}

# Mobile: the same four links as a labelled, always-visible indented group —
# one fewer tap than a nested disclosure for someone trying to book.
render_treatments_mobile() {
  local active="$1"
  printf '          <li class="mobile-nav__group">\n'
  printf '            <span class="mobile-nav__grouplabel">Treatments</span>\n'
  printf '            <ul class="mobile-nav__sublist">\n'
  while IFS='|' read -r key label href desc; do
    if [ -z "$key" ]; then continue; fi
    local cls="" aria=""
    if [ "$key" = "$active" ]; then cls="is-active"; aria=' aria-current="page"'; fi
    printf '              <li><a class="%s" href="%s"%s>%s</a></li>\n' "$cls" "$href" "$aria" "$label"
  done <<< "$NAV_TREATMENTS"
  printf '            </ul>\n'
  printf '          </li>\n'
}

render_nav() {
  local active="$1" list="$2" tpl="$3"
  while IFS='|' read -r key label href; do
    if [ -z "$key" ]; then continue; fi

    if [ "$href" = "@treatments" ]; then
      if [ "$tpl" = "desktop" ]; then render_treatments_desktop "$active"
      else render_treatments_mobile "$active"; fi
      continue
    fi

    local cls="" aria=""
    if [ "$key" = "$active" ]; then cls=" is-active"; aria=' aria-current="page"'; fi
    if [ "$tpl" = "desktop" ]; then
      printf '        <a class="nav__link%s" href="%s"%s>%s</a>\n' "$cls" "$href" "$aria" "$label"
    else
      printf '          <li><a class="%s" href="%s"%s>%s</a></li>\n' "${cls# }" "$href" "$aria" "$label"
    fi
  done <<< "$list"
}

build_page() {
  local slug="$1" navkey="$2" title="$3" desc="$4"
  local out="$ROOT/$slug.html"
  local body="$PAGES/$slug.html"
  local headextra="$PAGES/$slug.head.html"

  [ -f "$body" ] || { echo "  ! missing body: tools/pages/$slug.html"; return; }

  {
    cat <<HEAD
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>$title</title>
<meta name="description" content="$desc">
<meta name="theme-color" content="#7A6AC0">
<link rel="canonical" href="https://www.vathraja.lk/$slug.html">

<!-- Open Graph / social -->
<meta property="og:type" content="website">
<meta property="og:site_name" content="Vathraja Facial Chambers">
<meta property="og:title" content="$title">
<meta property="og:description" content="$desc">
<meta property="og:image" content="images/og-default.jpg">

<link rel="icon" href="images/logo-mark.svg" type="image/svg+xml">

<!-- Webfonts: Poppins (display) + Inter (body) -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">

<link rel="stylesheet" href="css/styles.css">
<link rel="stylesheet" href="css/animations.css">
<script>document.documentElement.classList.add('js');</script>
HEAD

    if [ -f "$headextra" ]; then cat "$headextra"; fi

    cat <<'ORG'

<!-- Organisation schema (same on every page) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "MedicalClinic",
  "name": "Vathraja Facial Chambers",
  "alternateName": "Vathraja Facial Chambers — Dermatology and Facial Aesthetics",
  "description": "Specialist-led dermatology, facial aesthetics, injectables and doctor-led cosmetic care at One Galle Face, Colombo.",
  "url": "https://www.vathraja.lk/",
  "logo": "https://www.vathraja.lk/images/logo-mark.svg",
  "image": "https://www.vathraja.lk/images/og-default.jpg",
  "telephone": "+94-11-234-5678",
  "email": "hello@vathraja.lk",
  "medicalSpecialty": ["Dermatology", "PlasticSurgery"],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "One Galle Face",
    "addressLocality": "Colombo",
    "addressRegion": "Western Province",
    "addressCountry": "LK"
  },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],
    "opens": "09:00",
    "closes": "19:00"
  }],
  "parentOrganization": {
    "@type": "Organization",
    "name": "Danthaja and Vathraja — Pinnacle in Dentofacial Aesthetics"
  }
}
</script>
ORG

    cat <<'HEADEND'
</head>
<body>
<div class="page-veil" aria-hidden="true"></div>
<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="shell header-inner">
    <a class="brand" href="index.html" aria-label="Vathraja Facial Chambers — home">
      <img class="brand__mark" src="images/logo-mark.svg" alt="" width="38" height="38">
      <span class="brand__text">
        <span class="brand__name">Vathraja</span>
        <span class="brand__sub">Facial Chambers</span>
      </span>
    </a>

    <nav class="nav" aria-label="Primary">
HEADEND

    render_nav "$navkey" "$NAV_MAIN" desktop

    cat <<ACTIONS
    </nav>

    <div class="header-actions">
      <a class="btn btn--sm" href="contact-booking.html" data-track="cta_book_consultation" data-track-label="Header">Book a Consultation</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="mobile-nav" aria-label="Open menu">
        <span class="nav-toggle__bars" aria-hidden="true"><span></span><span></span><span></span></span>
      </button>
    </div>
  </div>
</header>

<div class="nav-scrim"></div>
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile">
  <div class="mobile-nav__head">
    <span class="brand__name">Menu</span>
    <button class="mobile-nav__close" type="button" aria-label="Close menu">&times;</button>
  </div>
  <ul class="mobile-nav__list">
ACTIONS

    render_nav "$navkey" "$NAV_MOBILE" mobile

    cat <<MOBILEEND
  </ul>
  <div class="mobile-nav__foot">
    <a class="btn btn--block" href="contact-booking.html" data-track="cta_book_consultation" data-track-label="Mobile menu">Book a Consultation</a>
    <a class="btn btn--ghost btn--block" href="$PHONE_HREF" data-track="cta_call" data-track-label="Mobile menu">Call the clinic</a>
    <p class="mobile-nav__meta">One Galle Face, Colombo, Sri Lanka<br>$PHONE_DISPLAY</p>
  </div>
</nav>

<main id="main">
MOBILEEND

    render_body "$body"

    cat <<FOOTER
</main>

<footer class="site-footer">
  <div class="shell">
    <div class="footer-grid">
      <div class="footer__brand">
        <a class="brand" href="index.html" aria-label="Vathraja Facial Chambers — home">
          <img class="brand__mark" src="images/logo-mark.svg" alt="" width="38" height="38">
          <span class="brand__text">
            <span class="brand__name">Vathraja</span>
            <span class="brand__sub">Facial Chambers</span>
          </span>
        </a>
        <p class="footer__text mt-5">Specialist-led dermatology, facial aesthetics, injectables and doctor-led cosmetic care — part of the Danthaja and Vathraja dentofacial aesthetics destination at One Galle Face, Colombo.</p>
        <div class="social">
          <a href="#" aria-label="Vathraja Facial Chambers on Facebook" data-track="social_click" data-track-label="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6A22 22 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8Z"/></svg>
          </a>
          <a href="#" aria-label="Vathraja Facial Chambers on Instagram" data-track="social_click" data-track-label="Instagram">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.75A3.05 3.05 0 1 1 15.05 12 3.05 3.05 0 0 1 12 15.05ZM18 7.1a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1ZM21 7.15a5.4 5.4 0 0 0-1.48-3.82A5.44 5.44 0 0 0 15.7 1.85C14.2 1.77 9.8 1.77 8.3 1.85A5.43 5.43 0 0 0 4.48 3.33 5.42 5.42 0 0 0 3 7.15c-.08 1.5-.08 5.9 0 7.4a5.4 5.4 0 0 0 1.48 3.82 5.45 5.45 0 0 0 3.82 1.48c1.5.08 5.9.08 7.4 0a5.4 5.4 0 0 0 3.82-1.48A5.44 5.44 0 0 0 21 14.55c.08-1.5.08-5.9 0-7.4Zm-1.96 9a3.09 3.09 0 0 1-1.74 1.74c-1.2.48-4.06.37-5.3.37s-4.1.1-5.3-.37a3.09 3.09 0 0 1-1.74-1.74c-.48-1.2-.37-4.06-.37-5.3s-.1-4.1.37-5.3A3.09 3.09 0 0 1 6.7 3.91c1.2-.48 4.06-.37 5.3-.37s4.1-.1 5.3.37a3.09 3.09 0 0 1 1.74 1.74c.48 1.2.37 4.06.37 5.3s.11 4.1-.37 5.3Z"/></svg>
          </a>
          <a href="$WHATSAPP_HREF" aria-label="Message Vathraja Facial Chambers on WhatsApp" data-track="cta_whatsapp" data-track-label="Footer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.89.9-3.03-.2-.31a8.2 8.2 0 1 1 6.88 3.77Zm4.5-6.15c-.25-.12-1.46-.72-1.68-.8s-.39-.13-.55.12-.63.8-.78.96-.29.19-.53.07a6.7 6.7 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5s.25-.29.37-.44a1.7 1.7 0 0 0 .25-.41.46.46 0 0 0 0-.44c0-.12-.55-1.33-.76-1.82s-.4-.42-.55-.43h-.47a.9.9 0 0 0-.65.3 2.75 2.75 0 0 0-.86 2.05 4.77 4.77 0 0 0 1 2.53 10.9 10.9 0 0 0 4.18 3.7 13.9 13.9 0 0 0 1.4.51 3.35 3.35 0 0 0 1.54.1 2.52 2.52 0 0 0 1.65-1.17 2.05 2.05 0 0 0 .14-1.16c-.06-.1-.22-.17-.47-.29Z"/></svg>
          </a>
        </div>
      </div>

      <div>
        <h2 class="footer__title">Clinical pathways</h2>
        <ul class="footer-list">
          <li><a href="dermatology-skin-health.html">Dermatology and Skin Health</a></li>
          <li><a href="facial-aesthetics.html">Facial Aesthetics and Rejuvenation</a></li>
          <li><a href="injectables-facial-balance.html">Injectables and Facial Balance</a></li>
          <li><a href="doctor-led-cosmetic-procedures.html">Doctor-Led Cosmetic Procedures</a></li>
          <li><a href="skin-consultation.html">Skin Consultation</a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__title">Quick links</h2>
        <ul class="footer-list">
          <li><a href="about.html">About the chambers</a></li>
          <li><a href="patient-journey.html">Patient journey</a></li>
          <li><a href="safety-aftercare.html">Safety and aftercare</a></li>
          <li><a href="face-and-smile-before-the-big-day.html">Face and smile before the big day</a></li>
          <li><a href="launch-consultation-week.html">Launch Consultation Week</a></li>
          <li><a href="gallery.html">Clinic gallery</a></li>
          <li><a href="faqs.html">FAQs</a></li>
          <li><a href="blog.html">Skin education</a></li>
        </ul>
      </div>

      <div>
        <h2 class="footer__title">Visit us</h2>
        <p class="footer__text">
          Vathraja Facial Chambers<br>
          One Galle Face<br>
          Colombo, Sri Lanka
        </p>
        <p class="footer__text mt-4">
          <a href="$PHONE_HREF" data-track="cta_call" data-track-label="Footer">$PHONE_DISPLAY</a><br>
          <a href="$EMAIL_HREF" data-track="cta_email" data-track-label="Footer">hello@vathraja.lk</a>
        </p>
        <p class="footer__text mt-4"><a href="$WHATSAPP_HREF" data-track="cta_whatsapp" data-track-label="Footer link">WhatsApp the clinic</a></p>
      </div>
    </div>

    <p class="footer-disclaimer">
      <strong>Medical disclaimer:</strong> The information on this website is provided for general education only and is not medical advice, diagnosis, or a treatment recommendation. Treatment outcomes vary by individual, and suitability for any procedure can only be confirmed after a professional consultation and clinical assessment. Not every treatment is appropriate for every person. Images used on this site are illustrative placeholders and do not depict patients or treatment results.
    </p>

    <div class="footer-bottom">
      <span>&copy; <span data-year>2026</span> Vathraja Facial Chambers. All rights reserved.</span>
      <span>Part of the Danthaja and Vathraja destination &mdash; Pinnacle in Dentofacial Aesthetics.</span>
    </div>
  </div>
</footer>

<!-- Sticky mobile conversion bar -->
<div class="mobile-cta" role="group" aria-label="Quick actions">
  <a class="btn" href="contact-booking.html" data-track="cta_book_consultation" data-track-label="Sticky mobile bar">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/></svg>
    Book Now
  </a>
  <a class="btn btn--ghost" href="$WHATSAPP_HREF" data-track="cta_whatsapp" data-track-label="Sticky mobile bar">
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2a9.9 9.9 0 0 0-8.5 14.9L2 22l5.25-1.5A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.1.89.9-3.03-.2-.31a8.2 8.2 0 1 1 6.88 3.77Z"/></svg>
    WhatsApp
  </a>
</div>

<!-- Motion (motion.dev) — vanilla build of the Framer Motion animation engine -->
<script src="https://cdn.jsdelivr.net/npm/motion@11.11.13/dist/motion.js"></script>
<script src="js/animations.js"></script>
<script src="js/nav.js"></script>
<script src="js/carousel.js"></script>
<script src="js/gallery.js"></script>
<script src="js/forms.js"></script>
</body>
</html>
FOOTER
  } > "$out"

  echo "  built $slug.html"
}

echo "Building Vathraja Facial Chambers pages..."
while IFS='|' read -r slug navkey title desc; do
  [ -z "${slug:-}" ] && continue
  build_page "$slug" "$navkey" "$title" "$desc"
done <<< "$MANIFEST"
echo "Done."
