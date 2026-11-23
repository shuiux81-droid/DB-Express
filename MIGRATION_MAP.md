# Migration Inventory & Native Mapping (`MIGRATION_MAP.md`)

Complete inventory of the React + TypeScript + Vite application (`index.html`, `src/`) and the exact 1:1 native HTML, CSS, and vanilla JavaScript ES module equivalents.

---

## 1. Components in `src/components/` (and `src/App.tsx`)

### 1.1 `src/App.tsx` (Root Component)
- **Props**: None.
- **State (`useState`)**:
  - `activeProject: ProjectItem | null` — active service item opened in modal; passed into `<DropsSection />` (`activeProject`, `onSelectProject`, `onCloseProject`, `onRequestProject`), replaced by local module state + DOM toggle in `js/sections/services.js` (also pre-fills `#contact-msg` via `onRequestProject`).
  - `formState: { name, email, phone, company, message }` — controlled form inputs; replaced by direct DOM `<input>` / `<textarea>` values read on `input`/`submit` in `js/sections/contact.js`.
  - `formErrors: { name?, email? }` — inline validation error messages and `.is-invalid` class + `aria-invalid`; replaced by DOM class toggles and `.sheet-error` `textContent` updates in `js/sections/contact.js`.
  - `isSubmitted: boolean` — toggles `#contact` form confirmation state (`.sheet-confirm` visibility vs form inputs); replaced by `submitted` boolean + `dataset.submitted` / `[hidden]` DOM updates in `js/sections/contact.js`.
  - `submitCount: number` — triggers `.sheet-confirm` stamp reveal in `useEffect`; replaced by calling the stamp animation directly upon valid submission in `js/sections/contact.js`.
- **Refs (`useRef`)**:
  - `rootRef: HTMLDivElement` — top wrapper for GSAP context scoping; replaced by explicit section/module initializers and cleanup callbacks in `js/main.js` & `js/engine/scrollExperience.js`.
  - `heroVideoRef: HTMLVideoElement` — passed to `initHeroMediaSync()` (`lacunaSync`); replaced by `document.querySelector('.hero-video')` in `js/sections/hero.js`.
  - `confirmRef: HTMLDivElement` — `.sheet-confirm` target for stamp entrance animation (`gsap.fromTo`); replaced by `document.querySelector('.sheet-confirm')` in `js/sections/contact.js`.
- **Effects (`useEffect`)**:
  1. `initHeroMediaSync(heroVideoRef.current)` → runs Hero media ping-pong/synced video playback (`HERO_SYNC_FRAMES`, `HERO_SYNC_DURATION`), wordmark/headline typing + RTL highlight on `رقمية` + caret blink + CTA settle. Mapped to `js/sections/hero.js` + `js/engine/lacunaSync.js`.
  2. `initScrollExperience(rootRef.current)` → runs Lenis + GSAP ScrollTrigger master choreography (scroll progress bar, manifesto pinned typewriter + Interface Forge beats, services card deck pin + mobile stack, testimonials pinned horizontal track + counter scramble + card word reveals, contact fit + platen unroll + grapheme typing + magnetic keycap, footer curtain parallax + wordmark assembly + halftone pointer proximity + back-to-top DrawSVG ring). Mapped to `js/main.js`, `js/engine/scrollExperience.js`, and `js/sections/{about,services,testimonials,contact,footer}.js`.
  3. `[isSubmitted, submitCount]` effect → animates `.sheet-confirm` stamp (`fromTo` scale/rotation/opacity) and triggers `fitContact(false)` + `ScrollTrigger.refresh()`. Mapped directly into `handleContactSubmit()` in `js/sections/contact.js`.
  4. `footerHeight` ResizeObserver / resize effect → sets `--footer-h` on `.site-footer` or `document.documentElement`? (Sets `root.style.setProperty('--footer-h', ...)` via `.site-footer` height observer). Mapped to `initFooter()` in `js/sections/footer.js`.
- **Event Handlers**:
  - `handleNavClick(e, targetId)` → calls `scrollToSection(targetId)` (Lenis `scrollTo` with smooth fallback, closes mobile menu if any, blurs or focuses). Mapped to `scrollToSection()` in `js/main.js` / `js/sections/hero.js` & `js/sections/footer.js`.
  - `handleFieldChange` / `handleFormSubmit` → validates via `validateContactForm()` (`utils/typewriterBeats.js`) and reveals `.sheet-confirm`. Mapped to `js/sections/contact.js`.
  - `handleRequestProject(project)` → pre-fills `#contact-msg` with `أرغب في الاستفسار عن خدمة: ${project.title}`, closes modal, scrolls to `#contact`. Mapped to `js/sections/services.js` + `js/sections/contact.js`.

### 1.2 `src/components/ManifestoFigure.tsx`
- **Props**: None (`ManifestoFigure` renders pure static + data-driven SVG/HTML inside `.manifesto-visual.figure-col`).
- **State / Refs / Effects**: None (no hooks; driven externally by `addFigureStoryBeats` inside `scrollExperience.ts`).
- **Render**:
  - 8 `.atom` decorative shapes (`FORGE_ATOMS`: `circle` / `square` / `triangle`).
  - `.manifesto-figure.figure` with `figure-inner` → `figure-scene`:
    - Top bar captions (`cap-a`: `شَكْل 01 — مختبر الإبداع`, `cap-b`: `شَكْل 02 — علامات لا تُنسى`)
    - `.win` browser window (`digitalexpress.sa` pill + 3 dots)
    - `.layer-wire` (`wire-grid` 3x3 wireframe cards, SVG `wire-outlines` paths for `FORGE_OUTLINE_RECTS`, `marquee` selection overlay, `marquee-tag` toggle pill `واجهات مكررة` → `علامات لا تُنسى`, SVG `wire-strike` diagonal strike line)
    - `.layer-brand` (rendered branded preview: `.brand-nav`, `.brand-wordmark` "DB Express", `.brand-bars`, `.brand-media`, `.brand-spark` pen vector + guides, `.brand-btn` "ابدأ مشروعك" + `.brand-ripple`)
    - `.forge-chips` (`chip-ui`, `chip-ux`, `chip-code` + `.forge-connector`) & `.forge-cursor` SVG arrow
  - Unclipped sibling `.social-layer`: `.story` ring SVG + `@digitalexpress`, `.hashtag` `#علامات_لا_تُنسى`, `.post` card with `.post-likes-count` (`0`) & heart action icon, 7 `.burst-heart` SVGs (`FORGE_BURST_HEARTS`), 3 `.notif-slot` notification chips (`FORGE_NOTIF_CHIPS`).
- **Native Equivalent**: Container markup in `index.html` inside `#about .manifesto`; dynamic atoms, wireframe outlines, notifications, and burst hearts populated at startup by `renderManifestoFigure()` in `js/sections/about.js` before any animation setup; styles in `css/about.css`.

### 1.3 `src/components/DropsSection.tsx`
- **Props**:
  - `projects: ProjectItem[]` (from `FEATURED_PROJECTS`)
  - `activeProject: ProjectItem | null`
  - `onSelectProject: (project: ProjectItem) => void`
  - `onCloseProject: () => void`
  - `onRequestProject: (project: ProjectItem) => void`
- **State / Refs / Effects**:
  - `useEffect` listening for `Escape` key when `activeProject !== null` (`window.addEventListener('keydown', ...)`).
  - Body/Lenis pause or modal open state handled via backdrop click, close button, and "اطلب هذه الخدمة ←" CTA.
  - Note: Uses `<X />` from `lucide-react` inside `.case-modal-close`. Replaced with an exact inline `<svg>` `X` icon in static HTML so zero external icon library is needed.
- **Native Equivalent**: `#services > #drops.drops-section.services` section + `.case-modal-backdrop` dialog markup in `index.html`; cards + modal behavior managed by `js/sections/services.js`; styles in `css/services.css`.

### 1.4 `src/components/SectionSpacingFilter.tsx`
- **Props**: None.
- **State**:
  - `isOpen: boolean` — toggles `.spacing-filter-panel`.
  - `activeSectionId: 'all' | SectionSpacingId` — filters displayed section cards.
  - `overrides: SpacingOverridesMap` — loaded from `localStorage['dx_section_spacing_v1']` via `loadSpacingOverrides()`.
- **Refs**:
  - `panelRef` / `toggleBtnRef` (for outside-click close & focus management).
- **Effects**:
  1. Applies `overrides` CSS variables (`--hero-pt`, `--about-pt`, etc.) to `document.documentElement.style`, persists to `localStorage`, and dispatches custom `dx:spacing-change` event (picked up by `scrollExperience` to run `fitServices(false)`, `fitContact(false)`, and `ScrollTrigger.refresh()`).
  2. Outside click / `Escape` listener to close panel when open.
- **Native Equivalent**: Floating `.spacing-filter-wrap` markup in `index.html` + `js/sections/spacingFilter.js` + `js/utils/sectionSpacing.js` + `css/spacing-filter.css`.

### 1.5 Preloader (`index.html` inline `<head>` + `<body>`)
- **Markup**: `<div class="loader">` (`.loader-dots` canvas, `.loader-top` label slots + `.loader-year`, `.loader-mark-wrap` > `h1.loader-mark`, `.loader-bottom` `.loader-stages` + `.loader-counter-wrap`, `.loader-track` > `.loader-fill`, `.loader-sr`).
- **State / Logic**:
  - Pre-paint head check: `?noloader` / `data-no-loader`, `prefers-reduced-motion`, `sessionStorage['dx-loader'] === '1'`, `is-loading` lock, `window.__loaderReveal` promise, 10s failsafe.
  - Preloader script: font-gated entrance, `Intl.Segmenter('ar')` typing, 2D dot-field canvas + radial mask, resource progress tracking (`fontsDone`, `imagesLoaded`, `videoDone`, `windowLoaded`), exit timeline (`lab-a` select/strike → `lab-b`, `--dot` merge, dots dissolve, curtain lift `yPercent: -100` synchronized with `.hero` rise).
- **Native Equivalent**: Lightweight inline `<style>` (< 3 KB) + pre-paint `<script>` in `<head>` and inline WAAPI/rAF curtain-split `<script>` (< 3 KB) right after `.loader` in `index.html` (zero canvas, zero GSAP dependency).

### 1.6 Unused Legacy Components in `src/components/` (Documented Only — Not Rendered in Live Site)
The following files exist in `src/components/` and `src/data/` using `.dx-*` classes that have no CSS rules in `src/index.css` and are never imported or rendered by `src/App.tsx`:
- `src/components/AboutSection.tsx` (superseded by `.manifesto` + `ManifestoFigure` inside `App.tsx`)
- `src/components/TestimonialsSection.tsx` (superseded by `#readers.readers-section` inside `App.tsx`)
- `src/components/ContactSection.tsx` (superseded by `#contact.contact-section` inside `App.tsx`)
- `src/components/SiteFooter.tsx` (superseded by `#footer.site-footer` inside `App.tsx`)
- `src/data/agencyContent.ts` & `src/data/agencyContent.test.ts` (unused by `App.tsx`).

---

## 2. Page Structure & Render / Z-Order (`App.tsx`)

Render sequence inside root (preserved 1:1 in `index.html`):
1. `.loader` (`z-index: 1000`, `position: fixed; inset: 0`) — preloader overlay, removed on `hardCleanup`.
2. `.scroll-progress` (`z-index: 60`, `position: fixed`) — top scroll progress bar.
3. `.grain-overlay` (`z-index: 50`, `position: fixed`, `pointer-events: none`) — SVG noise texture overlay.
4. `<nav class="site-nav">` (`z-index: 40`, `position: fixed; top: 0`) — brand logo (`assets/aistudio/Frame_4__1__9768d946.png`), 4 nav links (`#top`, `#about`, `#services`, `#readers`), `.ticket-btn` (`احجز استشارة مجانية` → `#contact`).
5. `<main id="top" tabindex="-1">` (`position: relative; z-index: 2` — sits above sticky curtain `.site-footer`):
   - **Hero**: `<section class="hero">` (`z-index: 1` inside `main`) — `<video class="hero-video">` (`poster="assets/hero-poster.webp"`, `<source src="assets/aistudio/Add_coding_elements_to_video_381ad5a9_4de7f34c.mp4" type="video/mp4">`), `.hero-fade`, `.hero-copy` (`.hero-headline` with `.hero-headline-ghost` & `.hero-headline-live`, `.hero-paragraph-wrap` with ghost & live, `.hero-actions` with `.keycap-btn.hero-cta`).
   - **About + Services**: `<section id="about" class="about-section">`:
     - `<div class="manifesto">` (`pin: true` on desktop) — `.manifesto-copy` (`MANIFESTO_COPY`) + `.manifesto-visual.figure-col` (`ManifestoFigure`).
     - `<div id="services">` → `<section id="drops" class="drops-section services">` (`pin: true` on desktop) — `.svc-head` + `.svc-stage` with 5 `.svc-card` slides.
   - **Testimonials + Contact**: `<div class="readers-contact-pin">` (desktop pin wrapper):
     - `<section id="readers" class="readers-section">` — `.readers-bg-word`, `.readers-track` (`.readers-intro` + 4 `.reader-card` articles), `.readers-progress` (`.readers-counter` + `.readers-progress-track`).
     - `<section id="contact" class="contact-section">` — `.contact-inner` (`.contact-left` with `CONTACT_DETAILS` + `.sheet-wrap` with `.platen-rod`, knobs, `.sheet` punch-holes, `.sheet-form`, `.sheet-confirm`).
6. `<footer id="footer" class="site-footer">` (`position: sticky; bottom: 0; z-index: 1` — curtain reveal behind `<main>`):
   - `.footer-pattern` (9 floating decorative SVG glyphs `.fpi-1`..`.fpi-9`)
   - `.footer-inner` → `.footer-top` (`.footer-brand` logo `assets/aistudio/new_version_1-01_9eb52a4a.png` + statement, `.footer-cols` 3 columns from `FOOTER_COLUMNS`), `.footer-wordmark` (`FOOTER_WORDMARK_CHUNKS`), `.footer-bottom` (copyright + `.top-btn` with DrawSVG `.top-btn-ring-progress`).
7. `.case-modal-backdrop` (`z-index: 120`, `position: fixed; inset: 0`) — modal dialog for active service card (hidden when closed via `hidden` + `.is-open` / ARIA attributes).
8. `.spacing-filter-wrap` (`z-index: 80`, `position: fixed; right: 1.4rem; bottom: 1.4rem`) — interactive section spacing debug/filter panel.

---

## 3. Data Exports (`src/data/`) → `js/data.js`

| Source File | Exports | Consumers |
|---|---|---|
| `src/data/landingContent.ts` | `HERO_POSTER_URL`, `HERO_VIDEO_MP4_URL`, `HERO_VIDEO_WEBM_URL`, `HERO_COPY`, `HERO_SYNC_FRAMES`, `HERO_SYNC_DURATION`, `ABOUT_COPY`, `FEATURED_PROJECTS`, `SERVICES_COPY`, `TESTIMONIALS_COPY`, `TESTIMONIALS`, `CONTACT_COPY`, `CONTACT_DETAILS`, `CONTACT_FORM_COPY`, `FOOTER_COPY`, `FOOTER_COLUMNS`, `FOOTER_WORDMARK_CHUNKS`, `NEWSLETTER_PLACEHOLDERS`, `BRAND_LOGOS` (plus legacy unrendered `HOUSE_RULES`, `STATS_ITEMS`, `SERVICE_CHIPS`, `MARQUEE_TEXT`, `LOOSE_GLYPHS`, `FIGURE_DOTS`, `FIGURE_RAYS`, `FIGURE_LIFT_LETTERS`) | `js/sections/hero.js`, `js/engine/lacunaSync.js`, `js/sections/about.js`, `js/sections/services.js`, `js/sections/testimonials.js`, `js/sections/contact.js`, `js/sections/footer.js`, `js/engine/scrollExperience.js` |
| `src/data/manifestoCopy.ts` | `MANIFESTO_COPY` (`before`, `strike`, `replace`, `after`, `cardHeading`) | `js/sections/about.js`, `js/engine/scrollExperience.js` |

*(Asset imports in `landingContent.ts` for `service_*.jpg` become plain relative path strings `"assets/images/service_*.jpg"`.)*

---

## 4. Engine & Utils Exports → `js/engine/` & `js/utils/`

### `src/engine/`
- `src/engine/lacunaSync.ts` → `js/engine/lacunaSync.js`
  - Exports: `initHeroMediaSync(videoEl)` (drives `lacunaSync` ping-pong video playback, headline/paragraph typing with thresholds, `رقمية` RTL highlight sweep, CTA settle reveal, `prefers-reduced-motion`, and `loader:reveal` gating). Called by `js/sections/hero.js`.
- `src/engine/scrollExperience.ts` → `js/engine/scrollExperience.js` (delegated from `js/sections/*.js` & `js/main.js`)
  - Exports: `initScrollExperience(rootEl)` (scroll progress bar, manifesto pinned typewriter + Interface Forge beats, `#drops` services deck + fit, `#readers` pinned horizontal scroll + card tilt/quote animations, `#contact` fit + platen unroll + grapheme typing + magnetic submit, `#footer` curtain parallax + halftone wordmark proximity + top progress ring, resize & `dx:spacing-change` listeners). Called by `js/main.js`.

### `src/utils/`
- `src/utils/typewriterBeats.ts` → `js/utils/typewriterBeats.js`
  - Exports: `segmentGraphemes`, `buildTypingThresholds`, `countCharsFromProgress`, `computeSyncedTimelineTime`, `computePingPongTime`, `validateContactForm`, `computeHalftoneDotSize`, `formatCardCounter`, `shouldPlayHeroEntrance`.
  - Called by: `lacunaSync.js`, `scrollExperience.js`, `sections/contact.js`.
- `src/utils/forgeFigure.ts` → `js/utils/forgeFigure.js`
  - Exports: `FORGE_ATOMS`, `FORGE_OUTLINE_RECTS`, `FORGE_Z_PATH_ORDER`, `FORGE_SPARK_VERTICES`, `FORGE_NOTIF_CHIPS`, `FORGE_BURST_HEARTS`, `scaleForgeBeat`, `formatSocialCounter`.
  - Called by: `sections/about.js`, `scrollExperience.js`.
- `src/utils/servicesDeck.ts` → `js/utils/servicesDeck.js`
  - Exports: `SERVICES_V2_THEMES`, `SERVICES_DECK_STEPS`, `SERVICES_MOBILE_TILTS`, `SERVICES_DECK_DURATION`, `computeServicesFitScale`, `computeCardStartYPx`.
  - Called by: `sections/services.js`, `scrollExperience.js`.
- `src/utils/contactFit.ts` → `js/utils/contactFit.js`
  - Exports: `computeContactFitScale`.
  - Called by: `scrollExperience.js`, `sections/contact.js`.
- `src/utils/loaderMath.ts` → `js/utils/loaderMath.js`
  - Exports: `computeWeightedTarget`, `stepDisplayedProgress`, `computeDotsLitRadiusPct`, `quantizeReducedMotionPercent`.
  - Covered by Node unit tests; mirrors the inline curtain-split loader formulas.
- `src/utils/sectionSpacing.ts` → `js/utils/sectionSpacing.js`
  - Exports: `SECTION_SPACING_CONFIGS`, `SPACING_LIMITS`, `SPACING_STORAGE_KEY`, `clampSpacingRem`, `filterSections`, `updateSectionSideOverride`, `applySpacingOverridesToStyle`, `formatSpacingCss`, `sanitizeSpacingOverrides`, `loadSpacingOverrides`, `saveSpacingOverrides`, `countCustomSpacing`.
  - Called by: `sections/spacingFilter.js`.

---

## 5. Global Setup (`src/main.tsx`, `src/index.css`, `index.html`)

- **Lenis**: `new Lenis({ lerp: 0.165, wheelMultiplier: 1.25 })`, synced to `ScrollTrigger.update` (`lenis.on('scroll', ScrollTrigger.update)`), ticked via `gsap.ticker.add((time) => lenis.raf(time * 1000))`, `gsap.ticker.lagSmoothing(0)`. Exposed on `window.__dxLenis` for loader pause/start and smooth anchor scrolling.
- **GSAP Plugins**: CDN `gsap@3.13.0` (`gsap.min.js`, `ScrollTrigger.min.js`, `SplitText.min.js`, `ScrambleTextPlugin.min.js`, `DrawSVGPlugin.min.js`) registered once in `js/main.js` (`gsap.registerPlugin(...)`).
- **Fonts**: Self-hosted `.woff2` (`Readex Pro` 400–700, `IBM Plex Sans Arabic` 400–700, `Playfair Display`, `Archivo`, `Titan One`, `Yellowtail`, `Courier Prime`) moved to `assets/fonts/*.woff2`, preloaded in `index.html`, defined in `css/base.css`.
- **Fluid `rem` & Tokens**: Preserved verbatim in `css/base.css` (`calc(100vw / 90)` desktop, `calc(100vw / 60)` ≤ 991px, `calc(100vw / 24.375)` ≤ 600px, `:root` palette `--void`, `--crimson`, `--paper`, `--ink`, etc., spacing vars `--*-pt` / `--*-pb`).
- **CSS Split Order (`index.html` `<head>`)**:
  1. `css/base.css` (fonts, tokens, reset, fluid rem, shared typography/keycap buttons, `.site-nav`, `.scroll-progress`, `.grain-overlay`, base reduced-motion/responsive rules)
  2. Inline `<style id="loader-css">` in `index.html` (curtain-split preloader styles + responsive + reduced-motion)
  3. `css/hero.css` (hero video, fade, copy, headline/typing/selection/caret, responsive + mobile compaction)
  4. `css/about.css` (manifesto + Interface Forge SVG/social layer, responsive + reduced-motion)
  5. `css/services.css` (`#drops` services v2 deck, cards, case study modal, responsive + reduced-motion)
  6. `css/testimonials.css` (`#readers` pinned track, cards, progress, responsive + reduced-motion)
  7. `css/contact.css` (`#contact` details, platen, `.sheet` form, errors, stamp confirm, desktop width stability `>= 601px`, responsive)
  8. `css/footer.css` (`#footer` sticky curtain, floating pattern, columns, wordmark halftone, `.top-btn`, responsive)
  9. `css/spacing-filter.css` (`.spacing-filter-wrap` floating spacing filter panel)
