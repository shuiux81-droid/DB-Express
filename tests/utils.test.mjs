import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_FIT_MAX,
  CONTACT_FIT_MIN,
  computeContactFitScale,
  segmentGraphemes,
} from '../js/utils/contactFit.js';
import {
  FORGE_ATOMS,
  FORGE_BURST_HEARTS,
  FORGE_FIG_BEATS,
  FORGE_NOTIF_CHIPS,
  FORGE_OUTLINE_RECTS,
  FORGE_SOCIAL_ICONS,
  FORGE_SPARK_VERTICES,
  FORGE_Z_PATH_ORDER,
  formatSocialCounter,
  scaleForgeBeat,
} from '../js/utils/forgeFigure.js';
import {
  computeWeightedTarget,
  quantizeReducedMotionPercent,
  stepDisplayedProgress,
} from '../js/utils/loaderMath.js';
import {
  SECTION_SPACING_CONFIGS,
  SPACING_MAX_REM,
  SPACING_MIN_REM,
  applySpacingOverridesToStyle,
  clampSpacingRem,
  clearSectionOverride,
  countActiveOverrides,
  filterSections,
  formatSpacingCss,
  sanitizeSpacingOverrides,
  updateSectionSideOverride,
} from '../js/utils/sectionSpacing.js';
import {
  SERVICES_DECK_DURATION,
  SERVICES_DECK_STEPS,
  SERVICES_MOBILE_TILTS,
  SERVICES_V2_THEMES,
  computeCardStartYPx,
  computeServicesFitScale,
} from '../js/utils/servicesDeck.js';
import {
  BEATS,
  EYEBROW_TEXT,
  HEAD_AFTER_SELF,
  HEAD_BEFORE_SELF,
  HEAD_FIRST,
  HEAD_SELF,
  PARAGRAPH_TEXT,
  buildGraphemeTypingThresholds,
  buildTypingThresholds,
  computeHalftoneDotSize,
  computePingPongTime,
  computeSyncedTimelineTime,
  countCharsFromProgress,
  formatCardCounter,
  shouldLoadHeroVideo,
  shouldPlayHeroEntrance,
  splitArabicGraphemes,
  validateContactForm,
  validateContactFields,
  isValidPhone,
} from '../js/utils/typewriterBeats.js';
import {
  IDLE_TIMEOUT_MS,
  PIN_OR_SCRUB_SECTIONS,
  REFRESH_DEBOUNCE_MS,
  SECTION_ORDER,
  createDebouncedTask,
  resolveSectionIndexFromTarget,
  resolveTargetSectionIndex,
  scheduleDoubleRafThenIdle,
  scheduleIdleSlot,
  yieldToMain,
} from '../js/utils/bootScheduler.js';

// contactFit tests
test('computeContactFitScale returns 1 when content fits comfortably', () => {
  assert.deepEqual(computeContactFitScale(760, 530), {
    fit: CONTACT_FIT_MAX,
    isTall: false,
  });
  assert.deepEqual(computeContactFitScale(600, 600), {
    fit: CONTACT_FIT_MAX,
    isTall: false,
  });
});

test('computeContactFitScale scales proportionally between 0.55 and 1', () => {
  const res = computeContactFitScale(500, 650);
  assert.equal(res.isTall, false);
  assert.ok(Math.abs(res.fit - 500 / 650) < 0.001);
});

test('computeContactFitScale clamps to 0.55 and enables tall fallback when below floor', () => {
  assert.deepEqual(computeContactFitScale(250, 600), {
    fit: CONTACT_FIT_MIN,
    isTall: true,
  });
});

test('computeContactFitScale handles invalid inputs safely', () => {
  assert.deepEqual(computeContactFitScale(0, 500), { fit: 1, isTall: false });
  assert.deepEqual(computeContactFitScale(500, 0), { fit: 1, isTall: false });
  assert.deepEqual(computeContactFitScale(NaN, 500), { fit: 1, isTall: false });
});

test('segmentGraphemes preserves Arabic words and diacritics as intact graphemes', () => {
  const graphemes = segmentGraphemes('نموذج 114 — طلب عرض سعر', 'ar');
  assert.equal(graphemes.join(''), 'نموذج 114 — طلب عرض سعر');
  assert.ok(graphemes.length > 0);
  assert.deepEqual(segmentGraphemes('', 'ar'), []);
});

// forgeFigure tests
test('FORGE_ATOMS has 8 shapes: 3 circles, 3 squares, 2 triangles inside 6% margin', () => {
  assert.equal(FORGE_ATOMS.length, 8);
  const counts = FORGE_ATOMS.reduce(
    (acc, atom) => {
      acc[atom.shape] += 1;
      return acc;
    },
    { circle: 0, square: 0, triangle: 0 }
  );
  assert.deepEqual(counts, { circle: 3, square: 3, triangle: 2 });
  FORGE_ATOMS.forEach((atom) => {
    assert.ok(atom.sizeRem >= 1.2 && atom.sizeRem <= 2.0);
    assert.ok(atom.speed >= 0.6 && atom.speed <= 1.4);
  });
});

test('FORGE_OUTLINE_RECTS covers 3x3 grid cleanly inside 78 x 73.8 viewBox', () => {
  assert.equal(FORGE_OUTLINE_RECTS.length, 9);
  FORGE_OUTLINE_RECTS.forEach((rect) => {
    assert.equal(rect.width, 24);
    assert.equal(rect.height, 22.6);
    assert.ok(rect.x >= 0 && rect.x + rect.width <= 78 + 1e-6);
    assert.ok(rect.y >= 0 && rect.y + rect.height <= 73.8 + 1e-6);
  });
});

test('FORGE_Z_PATH_ORDER visits cards 1, 2, 3, 6, 5, 4, 7, 8, 9 in continuous snake', () => {
  assert.deepEqual(FORGE_Z_PATH_ORDER, [0, 1, 2, 5, 4, 3, 6, 7, 8]);
});

test('FORGE_SPARK_VERTICES provides 6 anchor points and scaleForgeBeat scales linearly', () => {
  assert.equal(FORGE_SPARK_VERTICES.length, 6);
  assert.equal(scaleForgeBeat(FORGE_FIG_BEATS.SELECT_START, 10), 6.2);
  assert.equal(scaleForgeBeat(FORGE_FIG_BEATS.SELECT_START, 20), 12.4);
  assert.equal(scaleForgeBeat(NaN, 10), 0);
});

test('FORGE_BURST_HEARTS has 7 alternating maroon and pink hearts within spec trajectory bounds', () => {
  assert.equal(FORGE_BURST_HEARTS.length, 7);
  const dxSet = new Set(FORGE_BURST_HEARTS.map((h) => h.dxU));
  assert.equal(dxSet.size, 7);
  FORGE_BURST_HEARTS.forEach((h, idx) => {
    assert.equal(h.tone, idx % 2 === 0 ? 'maroon' : 'pink');
    assert.ok(h.sizeU >= 3 && h.sizeU <= 5);
    assert.ok(h.dxU >= -8 && h.dxU <= 8);
    assert.ok(h.dyU >= 16 && h.dyU <= 28);
    assert.ok(Math.abs(h.rotDeg) <= 25);
  });
});

test('formatSocialCounter formats integers, K values, plus prefixes, and notification targets', () => {
  assert.equal(formatSocialCounter(0), '0');
  assert.equal(formatSocialCounter(-5), '0');
  assert.equal(formatSocialCounter(NaN, true), '0');
  assert.equal(formatSocialCounter(248), '248');
  assert.equal(formatSocialCounter(96), '96');
  assert.equal(formatSocialCounter(12400), '12.4K');
  assert.equal(formatSocialCounter(1200, true), '+1.2K');
  assert.deepEqual(
    FORGE_NOTIF_CHIPS.map((c) => formatSocialCounter(c.target, c.withPlus)),
    ['+1.2K', '248', '96']
  );
  assert.ok(FORGE_SOCIAL_ICONS.heart && FORGE_SOCIAL_ICONS.comment && FORGE_SOCIAL_ICONS.share && FORGE_SOCIAL_ICONS.bookmark);
});

// loaderMath tests (fast curtain-split loader)
test('computeWeightedTarget starts at 10, weights Fonts=40/Poster=40/DOM=20, and forces 100 after 2.0s', () => {
  assert.equal(
    computeWeightedTarget({ fontsDone: false, posterDone: false, domDone: false }, 0),
    10
  );
  assert.equal(
    computeWeightedTarget({ fontsDone: true, posterDone: false, domDone: false }, 0.2),
    40
  );
  assert.equal(
    computeWeightedTarget({ fontsDone: true, posterDone: false, domDone: true }, 0.3),
    60
  );
  assert.equal(
    computeWeightedTarget({ fontsDone: true, posterDone: true, domDone: true }, 0.4),
    100
  );
  assert.equal(
    computeWeightedTarget({ fontsDone: false, posterDone: false, domDone: false }, 2.0),
    100
  );
});

test('stepDisplayedProgress enforces 0.7s minimum duration, 0.2 ease, monotonicity, and snaps at >= 99.5', () => {
  const early = stepDisplayedProgress(0, 100, 0.07, 0.7);
  assert.ok(Math.abs(early - 10) < 1e-9);

  const neverDecreases = stepDisplayedProgress(50, 40, 0.2, 0.7);
  assert.equal(neverDecreases, 50);

  const eased = stepDisplayedProgress(50, 100, 1.0, 0.7);
  assert.ok(Math.abs(eased - 60) < 1e-9);

  const snap = stepDisplayedProgress(99.45, 100, 0.8, 0.7);
  assert.equal(snap, 100);
});

test('quantizeReducedMotionPercent steps reduced-motion counter by 10%', () => {
  assert.equal(quantizeReducedMotionPercent(0), 0);
  assert.equal(quantizeReducedMotionPercent(29), 20);
  assert.equal(quantizeReducedMotionPercent(99), 90);
  assert.equal(quantizeReducedMotionPercent(99.6), 100);
  assert.equal(quantizeReducedMotionPercent(100), 100);
});

// sectionSpacing tests
test('SECTION_SPACING_CONFIGS covers all 8 sections with unique pt/pb CSS variables', () => {
  assert.equal(SECTION_SPACING_CONFIGS.length, 8);
  const vars = new Set();
  for (const cfg of SECTION_SPACING_CONFIGS) {
    assert.ok(cfg.ptVar.startsWith('--'));
    assert.ok(cfg.pbVar.startsWith('--'));
    assert.notEqual(cfg.ptVar, cfg.pbVar);
    vars.add(cfg.ptVar);
    vars.add(cfg.pbVar);
  }
  assert.equal(vars.size, 16);
  const byId = Object.fromEntries(SECTION_SPACING_CONFIGS.map((c) => [c.id, c]));
  assert.equal(byId.about.defaultDesktopPtRem, 0);
  assert.equal(byId.about.defaultDesktopPbRem, 0);
  assert.equal(byId.services.defaultDesktopPtRem, 2.75);
  assert.equal(byId.services.defaultDesktopPbRem, 2);
  assert.equal(byId.readers.defaultDesktopPtRem, 2.75);
  assert.equal(byId.readers.defaultDesktopPbRem, 2.75);
  assert.equal(byId.reviewCard.defaultDesktopPtRem, 2.25);
  assert.equal(byId.reviewCard.defaultDesktopPbRem, 2.25);
  assert.equal(byId.reviewCardText.defaultDesktopPtRem, 4.5);
  assert.equal(byId.reviewCardText.defaultDesktopPbRem, 4.5);
  assert.equal(byId.reviewCardText.defaultMobilePtRem, 2);
  assert.equal(byId.reviewCardText.defaultMobilePbRem, 2);
  assert.equal(byId.contact.defaultDesktopPtRem, 1);
  assert.equal(byId.contact.defaultDesktopPbRem, 1);
});

test('clampSpacingRem clamps bounds and snaps to 0.25rem increments', () => {
  assert.equal(clampSpacingRem(-3), SPACING_MIN_REM);
  assert.equal(clampSpacingRem(99), SPACING_MAX_REM);
  assert.equal(clampSpacingRem(3.12), 3);
  assert.equal(clampSpacingRem(3.14), 3.25);
  assert.equal(clampSpacingRem(NaN), 0);
});

test('filterSections returns all sections or filters down to one section cleanly', () => {
  assert.equal(filterSections('all').length, 8);
  const onlyServices = filterSections('services');
  assert.equal(onlyServices.length, 1);
  assert.equal(onlyServices[0].id, 'services');
  const onlyReviewCard = filterSections('reviewCard');
  assert.equal(onlyReviewCard.length, 1);
  assert.equal(onlyReviewCard[0].ptVar, '--review-card-pt');
  assert.equal(onlyReviewCard[0].pbVar, '--review-card-pb');
  const onlyReviewCardText = filterSections('reviewCardText');
  assert.equal(onlyReviewCardText.length, 1);
  assert.equal(onlyReviewCardText[0].ptVar, '--review-text-pt');
  assert.equal(onlyReviewCardText[0].pbVar, '--review-text-pb');
});

test('updateSectionSideOverride manages top and bottom sides independently per section', () => {
  let state = updateSectionSideOverride({}, 'about', 'pt', 8);
  assert.deepEqual(state, { about: { pt: 8 } });

  state = updateSectionSideOverride(state, 'about', 'pb', 3.5);
  assert.deepEqual(state, { about: { pt: 8, pb: 3.5 } });

  state = updateSectionSideOverride(state, 'services', 'pt', 4);
  assert.equal(countActiveOverrides(state), 3);

  state = updateSectionSideOverride(state, 'about', 'pt', null);
  assert.deepEqual(state, { about: { pt: null, pb: 3.5 }, services: { pt: 4 } });

  state = clearSectionOverride(state, 'about');
  assert.deepEqual(state, { services: { pt: 4 } });
});

test('applySpacingOverridesToStyle sets overridden variables and removes cleared ones', () => {
  const map = new Map();
  const mockStyle = {
    setProperty: (k, v) => map.set(k, v),
    removeProperty: (k) => {
      map.delete(k);
    },
  };

  applySpacingOverridesToStyle({ hero: { pt: 2.5 }, contact: { pb: 7 } }, mockStyle);
  assert.equal(map.get('--hero-pt'), '2.5rem');
  assert.equal(map.has('--hero-pb'), false);
  assert.equal(map.get('--contact-pb'), '7rem');
  assert.equal(map.has('--contact-pt'), false);

  applySpacingOverridesToStyle({}, mockStyle);
  assert.equal(map.size, 0);
});

test('formatSpacingCss and sanitizeSpacingOverrides handle valid and invalid inputs cleanly', () => {
  const sanitized = sanitizeSpacingOverrides({
    about: { pt: 6.2, pb: 'bad' },
    unknown: { pt: 4 },
  });
  assert.deepEqual(sanitized, { about: { pt: 6.25, pb: null } });
  const css = formatSpacingCss(sanitized);
  assert.match(css, /--about-pt: 6\.25rem;/);
  assert.doesNotMatch(css, /--about-pb/);
});

// servicesDeck tests
test('SERVICES_V2_THEMES alternates red, ink, paper, red, ink across 5 cards', () => {
  assert.deepEqual(SERVICES_V2_THEMES, ['red', 'ink', 'paper', 'red', 'ink']);
});

test('SERVICES_DECK_STEPS alternates clockwise and counter-clockwise tilts within 5.6 duration', () => {
  assert.equal(SERVICES_DECK_DURATION, 5.6);
  assert.equal(SERVICES_DECK_STEPS.length, 4);
  const signs = SERVICES_DECK_STEPS.map((s) => Math.sign(s.restRotation));
  assert.deepEqual(signs, [1, -1, 1, -1]);
  assert.deepEqual(
    SERVICES_DECK_STEPS.map((s) => s.peakRotation),
    [5, -5, 4, -4]
  );
  assert.deepEqual(
    SERVICES_DECK_STEPS.map((s) => s.restRotation),
    [3.5, -3, 2, -2.5]
  );
});

test('SERVICES_MOBILE_TILTS matches +3, -3, +2, -2, +3 resting angles', () => {
  assert.deepEqual(
    SERVICES_MOBILE_TILTS.map((t) => t.rest),
    [3, -3, 2, -2, 3]
  );
});

test('computeServicesFitScale returns 1 at 1440x900 and ~0.79 at 1440x650 with 0.6 floor', () => {
  assert.equal(computeServicesFitScale(770, 220, 16, 1), 1);
  const fit650 = computeServicesFitScale(539, 220, 16, 1);
  assert.ok(fit650 >= 0.72 && fit650 <= 0.84, `Expected ~0.79, got ${fit650}`);
  assert.equal(computeServicesFitScale(320, 265, 16, 1), 0.6);
  assert.equal(computeServicesFitScale(0, 265, 16, 1), 1);
});

test('computeCardStartYPx positions card top completely below sectionBottom + 40px', () => {
  const startY = computeCardStartYPx(900, 620, 414);
  const cardTopAtStart = 620 + startY - 414 / 2;
  assert.ok(cardTopAtStart >= 940, `Expected card top >= 940, got ${cardTopAtStart}`);
  assert.equal(computeCardStartYPx(900, 620, 0), 600);
});

// typewriterBeats tests
test('Arabic copy strings match Digital Express specification', () => {
  assert.equal(EYEBROW_TEXT, '[ شريكك في التحول الرقمي ]');
  assert.equal(HEAD_BEFORE_SELF, 'نصنع لك تجارب ');
  assert.equal(HEAD_SELF, 'رقمية');
  assert.equal(HEAD_FIRST, 'نصنع لك تجارب رقمية');
  assert.equal(HEAD_AFTER_SELF, ' تُحدث فرقًا');
  assert.equal(
    PARAGRAPH_TEXT,
    'شريكك في تحويل الأفكار إلى حلول رقمية متكاملة، نجمع فيها الإبداع والتكنولوجيا لتنمو علامتك التجارية وتتميز.'
  );
});

test('buildTypingThresholds is strictly monotonic and ends at 1.0', () => {
  const idxAfterSpace = HEAD_AFTER_SELF.indexOf('تُحدث ') + 5;
  const thresholds = buildTypingThresholds(
    HEAD_AFTER_SELF,
    BEATS.HEAD_2_END - BEATS.HEAD_2_START,
    0.02,
    42,
    idxAfterSpace,
    0.18
  );
  assert.equal(thresholds.length, HEAD_AFTER_SELF.length);
  for (let i = 1; i < thresholds.length; i += 1) {
    assert.ok(thresholds[i] > thresholds[i - 1], `threshold ${i} increases`);
  }
  assert.equal(thresholds[thresholds.length - 1], 1);
});

test('countCharsFromProgress maps boundary and mid progress cleanly', () => {
  const thresholds = buildTypingThresholds(HEAD_FIRST, 0.75, 0.02, 7);
  assert.equal(countCharsFromProgress(0, thresholds), 0);
  assert.equal(countCharsFromProgress(1, thresholds), HEAD_FIRST.length);
  const mid = countCharsFromProgress(0.5, thresholds);
  assert.ok(mid > 0 && mid < HEAD_FIRST.length);
});

test('computeSyncedTimelineTime scales video duration to 8.0s loop and clamps safely', () => {
  assert.equal(computeSyncedTimelineTime(4.0, 8.0), 4.0);
  assert.equal(computeSyncedTimelineTime(5.0, 10.0), 4.0);
  assert.equal(computeSyncedTimelineTime(0, 8.0), 0);
  assert.equal(computeSyncedTimelineTime(12, 8.0), 8.0);
  assert.equal(computeSyncedTimelineTime(NaN, 8.0), 0);
});

test('computePingPongTime maps forward half, peak, reverse half, and wrap smoothly', () => {
  const bounceDur = 16.0;
  const cleanDur = 8.0;
  assert.equal(computePingPongTime(0, bounceDur, cleanDur), 0);
  assert.equal(computePingPongTime(4.0, bounceDur, cleanDur), 4.0);
  assert.equal(computePingPongTime(8.0, bounceDur, cleanDur), 8.0);
  assert.equal(computePingPongTime(12.0, bounceDur, cleanDur), 4.0);
  assert.ok(Math.abs(computePingPongTime(15.9, bounceDur, cleanDur) - 0.1) < 1e-9);
  assert.equal(computePingPongTime(16.0, bounceDur, cleanDur), 0);
  assert.equal(computePingPongTime(NaN, bounceDur, cleanDur), 0);
  assert.equal(computePingPongTime(2, 0, cleanDur), 0);
});

test('validateContactForm enforces non-empty name and valid email', () => {
  assert.deepEqual(validateContactForm('', ''), {
    nameValid: false,
    emailValid: false,
    isValid: false,
  });
  assert.deepEqual(validateContactForm('نور', 'bad-email'), {
    nameValid: true,
    emailValid: false,
    isValid: false,
  });
  assert.deepEqual(validateContactForm('نور حمدان', 'noor@digitalexpress.sa'), {
    nameValid: true,
    emailValid: true,
    isValid: true,
  });
});

test('isValidPhone validates international, Saudi, Egyptian, and Arabic-Indic phone numbers', () => {
  assert.equal(isValidPhone(''), false);
  assert.equal(isValidPhone('abc'), false);
  assert.equal(isValidPhone('12345'), false);
  assert.equal(isValidPhone('0501234567'), true);
  assert.equal(isValidPhone('+966 50 123 4567'), true);
  assert.equal(isValidPhone('+20 (10) 1234-5678'), true);
  assert.equal(isValidPhone('٠٥٠١٢٣٤٥٦٧'), true);
});

test('validateContactFields validates all five contact inputs with Arabic error messages', () => {
  const emptyRes = validateContactFields({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  assert.equal(emptyRes.isValid, false);
  assert.equal(emptyRes.nameValid, false);
  assert.equal(emptyRes.emailValid, false);
  assert.equal(emptyRes.phoneValid, false);
  assert.equal(emptyRes.companyValid, false);
  assert.equal(emptyRes.messageValid, false);
  assert.ok(emptyRes.errors.name);
  assert.ok(emptyRes.errors.email);
  assert.ok(emptyRes.errors.phone);
  assert.ok(emptyRes.errors.company);
  assert.ok(emptyRes.errors.message);

  const badPhoneRes = validateContactFields({
    name: 'نور حمدان',
    email: 'noor@digitalexpress.sa',
    phone: '123',
    company: 'أفق',
    message: 'تفاصيل المشروع',
  });
  assert.equal(badPhoneRes.isValid, false);
  assert.equal(badPhoneRes.phoneValid, false);
  assert.equal(badPhoneRes.errors.phone, 'يرجى إدخال رقم هاتف صحيح.');
  assert.equal(badPhoneRes.errors.name, null);
  assert.equal(badPhoneRes.errors.email, null);
  assert.equal(badPhoneRes.errors.company, null);
  assert.equal(badPhoneRes.errors.message, null);

  const validRes = validateContactFields({
    name: 'نور حمدان',
    email: 'noor@digitalexpress.sa',
    phone: '+966 50 123 4567',
    company: 'منصة أفق',
    message: 'نود بناء منصة تجارة إلكترونية.',
  });
  assert.equal(validRes.isValid, true);
  assert.deepEqual(validRes.errors, {
    name: null,
    email: null,
    phone: null,
    company: null,
    message: null,
  });
});

test('computeHalftoneDotSize interpolates cleanly within 300px radius', () => {
  assert.equal(computeHalftoneDotSize(0), 2.6);
  assert.equal(computeHalftoneDotSize(300), 0.9);
  assert.equal(computeHalftoneDotSize(450), 0.9);
  assert.ok(Math.abs(computeHalftoneDotSize(150) - 1.75) < 1e-9);
});

test('formatCardCounter pads single-digit indices and clamps bounds', () => {
  assert.equal(formatCardCounter(1, 6), '01 / 06');
  assert.equal(formatCardCounter(6, 6), '06 / 06');
  assert.equal(formatCardCounter(0, 6), '01 / 06');
  assert.equal(formatCardCounter(9, 6), '06 / 06');
});

test('shouldPlayHeroEntrance runs once only when visible and motion is allowed', () => {
  assert.equal(BEATS.CARET_HIDE_DELAY, 0.2);
  assert.equal(BEATS.CARET_HIDE_DUR, 0.1);
  assert.equal(BEATS.DESC_DELAY, 0.2);
  assert.equal(BEATS.DESC_DUR, 0.35);
  assert.equal(BEATS.BUTTONS_DELAY, 0.25);
  assert.equal(BEATS.BUTTONS_DUR, 0.5);
  const descEnd = BEATS.HEAD_2_END + BEATS.DESC_DELAY + BEATS.DESC_DUR;
  assert.ok(Math.abs(descEnd - 4.05) < 1e-9);
  assert.ok(Math.abs(BEATS.HERO_ENTRANCE_END - (descEnd + BEATS.BUTTONS_DELAY + BEATS.BUTTONS_DUR)) < 1e-9);
  assert.equal(BEATS.HERO_ENTRANCE_END, 4.8);
  assert.equal(
    shouldPlayHeroEntrance({ reducedMotion: false, heroInViewport: true, alreadyPlayed: false }),
    true
  );
  assert.equal(
    shouldPlayHeroEntrance({ reducedMotion: true, heroInViewport: true, alreadyPlayed: false }),
    false
  );
  assert.equal(
    shouldPlayHeroEntrance({ reducedMotion: false, heroInViewport: false, alreadyPlayed: false }),
    false
  );
  assert.equal(
    shouldPlayHeroEntrance({ reducedMotion: false, heroInViewport: true, alreadyPlayed: true }),
    false
  );
});

test('splitArabicGraphemes keeps Arabic diacritics attached and builds valid thresholds', () => {
  const graphemes = splitArabicGraphemes(HEAD_AFTER_SELF);
  assert.equal(graphemes.join(''), HEAD_AFTER_SELF);
  assert.ok(graphemes.length < HEAD_AFTER_SELF.length);
  assert.ok(graphemes.some((g) => g.includes('\u064F') && g.length > 1));
  assert.ok(graphemes.some((g) => g.includes('\u064B') && g.length > 1));

  const head1Graphemes = splitArabicGraphemes(HEAD_FIRST);
  const head1Thresholds = buildGraphemeTypingThresholds(
    head1Graphemes,
    BEATS.HEAD_1_END - BEATS.HEAD_1_START,
    0.02,
    202
  );
  assert.equal(head1Thresholds.length, head1Graphemes.length);
  assert.equal(countCharsFromProgress(0, head1Thresholds), 0);
  assert.equal(countCharsFromProgress(1, head1Thresholds), head1Graphemes.length);
  assert.equal(head1Graphemes.slice(0, head1Thresholds.length).join(''), HEAD_FIRST);
});

// bootScheduler tests (Part A startup splitting & orchestration)
test('SECTION_ORDER and PIN_OR_SCRUB_SECTIONS keep top-to-bottom pin order and Contact IO exemption', () => {
  assert.deepEqual(SECTION_ORDER, ['about', 'services', 'testimonials', 'contact', 'footer']);
  assert.equal(IDLE_TIMEOUT_MS, 2000);
  assert.equal(REFRESH_DEBOUNCE_MS, 120);
  assert.equal(PIN_OR_SCRUB_SECTIONS.has('about'), true);
  assert.equal(PIN_OR_SCRUB_SECTIONS.has('services'), true);
  assert.equal(PIN_OR_SCRUB_SECTIONS.has('testimonials'), true);
  assert.equal(PIN_OR_SCRUB_SECTIONS.has('footer'), true);
  assert.equal(PIN_OR_SCRUB_SECTIONS.has('contact'), false);
});

test('resolveSectionIndexFromTarget and resolveTargetSectionIndex resolve targets accurately', () => {
  assert.equal(resolveSectionIndexFromTarget('#top'), -1);
  assert.equal(resolveSectionIndexFromTarget('#home'), -1);
  assert.equal(resolveSectionIndexFromTarget(0), -1);
  assert.equal(resolveSectionIndexFromTarget('#about'), 0);
  assert.equal(resolveSectionIndexFromTarget('#services'), 1);
  assert.equal(resolveSectionIndexFromTarget('#drops'), 1);
  assert.equal(resolveSectionIndexFromTarget('#readers'), 2);
  assert.equal(resolveSectionIndexFromTarget('#contact'), 3);
  assert.equal(resolveSectionIndexFromTarget('#footer'), 4);
  assert.equal(resolveSectionIndexFromTarget(undefined), 4);

  const nestedEl = {
    closest: (sel) => (sel === '#services, #drops' ? {} : null),
  };
  assert.equal(resolveTargetSectionIndex('.svc-card-3', () => nestedEl), 1);
});

test('createDebouncedTask coalesces bursts into one call and supports flush/cancel', () => {
  let nextId = 1;
  const scheduled = new Map();
  let runCount = 0;

  const task = createDebouncedTask(
    () => {
      runCount += 1;
    },
    120,
    {
      setTimeout: (cb) => {
        const id = nextId++;
        scheduled.set(id, cb);
        return id;
      },
      clearTimeout: (id) => {
        scheduled.delete(id);
      },
    }
  );

  task.schedule();
  task.schedule();
  task.schedule();
  assert.equal(task.hasPending(), true);
  assert.equal(scheduled.size, 1);
  assert.equal(runCount, 0);

  const [onlyCb] = Array.from(scheduled.values());
  scheduled.clear();
  onlyCb();
  assert.equal(runCount, 1);
  assert.equal(task.hasPending(), false);

  task.schedule();
  assert.equal(task.flush(), true);
  assert.equal(runCount, 2);
  assert.equal(task.hasPending(), false);
  assert.equal(task.flush(), false);

  task.schedule();
  task.cancel();
  assert.equal(task.hasPending(), false);
  assert.equal(runCount, 2);
});

test('scheduleIdleSlot uses requestIdleCallback with 2s timeout and falls back cleanly', () => {
  let capturedTimeout = null;
  let idleFired = false;
  let cancelledId = null;

  const cancel = scheduleIdleSlot(
    () => {
      idleFired = true;
    },
    IDLE_TIMEOUT_MS,
    {
      requestIdleCallback: (cb, opts) => {
        capturedTimeout = opts.timeout;
        cb({ timeRemaining: () => 12, didTimeout: false });
        return 77;
      },
      cancelIdleCallback: (id) => {
        cancelledId = id;
      },
    }
  );

  assert.equal(capturedTimeout, 2000);
  assert.equal(idleFired, true);
  cancel();
  assert.equal(cancelledId, 77);
});

test('scheduleDoubleRafThenIdle waits for 2 frames then idle slot before firing and supports cancellation', async () => {
  const events = [];
  const rafQueue = [];
  let rafCount = 0;

  scheduleDoubleRafThenIdle(
    () => events.push('run'),
    {
      env: {
        requestIdleCallback: (cb, opts) => {
          events.push(`idle:${opts.timeout}`);
          cb();
          return 1;
        },
        cancelIdleCallback: () => {},
      },
      raf: (cb) => {
        rafCount += 1;
        events.push(`raf-reg:${rafCount}`);
        rafQueue.push(cb);
        return rafCount;
      },
      cancelRaf: () => {},
    }
  );

  assert.deepEqual(events, ['raf-reg:1']);
  rafQueue.shift()();
  assert.deepEqual(events, ['raf-reg:1', 'raf-reg:2']);
  rafQueue.shift()();
  assert.deepEqual(events, ['raf-reg:1', 'raf-reg:2', 'idle:2000', 'run']);

  const cancelEarly = scheduleDoubleRafThenIdle(
    () => events.push('should-not-run'),
    {
      raf: (cb) => {
        rafQueue.push(cb);
        return rafQueue.length;
      },
      cancelRaf: () => {
        events.push('cancelled');
      },
    }
  );
  cancelEarly();
  assert.equal(events.includes('cancelled'), true);
  assert.equal(events.includes('should-not-run'), false);

  await yieldToMain();
});

test('shouldLoadHeroVideo blocks reduced motion, saveData, and 2g/3g connections while allowing 4g or unknown', () => {
  assert.equal(shouldLoadHeroVideo({ reducedMotion: true, connection: { effectiveType: '4g' } }), false);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: { saveData: true, effectiveType: '4g' } }), false);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: { effectiveType: 'slow-2g' } }), false);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: { effectiveType: '2g' } }), false);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: { effectiveType: '3g' } }), false);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: { effectiveType: '4g', saveData: false } }), true);
  assert.equal(shouldLoadHeroVideo({ reducedMotion: false, connection: null }), true);
  assert.equal(shouldLoadHeroVideo(), true);
});
