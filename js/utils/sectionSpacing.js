export const SPACING_MIN_REM = 0;
export const SPACING_MAX_REM = 14;
export const SPACING_STEP_REM = 0.25;
export const SPACING_STORAGE_KEY = 'dx_section_spacing_v1';

export const SECTION_SPACING_CONFIGS = [
  {
    id: 'hero',
    labelAr: 'الرئيسية',
    labelEn: 'Hero',
    scrollTarget: '#top',
    selector: '.hero',
    ptVar: '--hero-pt',
    pbVar: '--hero-pb',
    defaultDesktopPtRem: 0,
    defaultDesktopPbRem: 0,
    defaultMobilePtRem: 0,
    defaultMobilePbRem: 0,
  },
  {
    id: 'about',
    labelAr: 'من نحن',
    labelEn: 'About',
    scrollTarget: '#about',
    selector: '.manifesto',
    ptVar: '--about-pt',
    pbVar: '--about-pb',
    defaultDesktopPtRem: 0,
    defaultDesktopPbRem: 0,
    defaultMobilePtRem: 0,
    defaultMobilePbRem: 0,
  },
  {
    id: 'services',
    labelAr: 'خدماتنا',
    labelEn: 'Services',
    scrollTarget: '#services',
    selector: '#drops',
    ptVar: '--services-pt',
    pbVar: '--services-pb',
    defaultDesktopPtRem: 2.75,
    defaultDesktopPbRem: 2,
    defaultMobilePtRem: 2.75,
    defaultMobilePbRem: 2,
  },
  {
    id: 'readers',
    labelAr: 'آراء العملاء',
    labelEn: 'Testimonials',
    scrollTarget: '#readers',
    selector: '#readers',
    ptVar: '--readers-pt',
    pbVar: '--readers-pb',
    defaultDesktopPtRem: 2.75,
    defaultDesktopPbRem: 2.75,
    defaultMobilePtRem: 2.75,
    defaultMobilePbRem: 2.75,
  },
  {
    id: 'reviewCard',
    labelAr: 'بطاقة التقييم',
    labelEn: 'Review Card',
    scrollTarget: '#readers',
    selector: '.reader-card',
    ptVar: '--review-card-pt',
    pbVar: '--review-card-pb',
    defaultDesktopPtRem: 2.25,
    defaultDesktopPbRem: 2.25,
    defaultMobilePtRem: 2.25,
    defaultMobilePbRem: 2.25,
  },
  {
    id: 'reviewCardText',
    labelAr: 'نص بطاقة التقييم',
    labelEn: 'Review Card Text',
    scrollTarget: '#readers',
    selector: '.reader-card .card-quote',
    ptVar: '--review-text-pt',
    pbVar: '--review-text-pb',
    defaultDesktopPtRem: 4.5,
    defaultDesktopPbRem: 4.5,
    defaultMobilePtRem: 2,
    defaultMobilePbRem: 2,
  },
  {
    id: 'contact',
    labelAr: 'تواصل معنا',
    labelEn: 'Contact',
    scrollTarget: '#contact',
    selector: '#contact',
    ptVar: '--contact-pt',
    pbVar: '--contact-pb',
    defaultDesktopPtRem: 1,
    defaultDesktopPbRem: 1,
    defaultMobilePtRem: 1,
    defaultMobilePbRem: 1,
  },
  {
    id: 'footer',
    labelAr: 'التذييل',
    labelEn: 'Footer',
    scrollTarget: '#footer',
    selector: '#footer',
    ptVar: '--footer-pt',
    pbVar: '--footer-pb',
    defaultDesktopPtRem: 4.5,
    defaultDesktopPbRem: 2.2,
    defaultMobilePtRem: 5,
    defaultMobilePbRem: 2,
  },
];

export function clampSpacingRem(value) {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.max(SPACING_MIN_REM, Math.min(SPACING_MAX_REM, value));
  return Math.round(clamped / SPACING_STEP_REM) * SPACING_STEP_REM;
}

export function getEffectiveDefaultRem(config, isMobileViewport, side) {
  if (isMobileViewport) {
    return side === 'pt' ? config.defaultMobilePtRem : config.defaultMobilePbRem;
  }
  return side === 'pt' ? config.defaultDesktopPtRem : config.defaultDesktopPbRem;
}

export function filterSections(sectionFilter) {
  if (sectionFilter === 'all') return SECTION_SPACING_CONFIGS;
  return SECTION_SPACING_CONFIGS.filter((sec) => sec.id === sectionFilter);
}

export function updateSectionSideOverride(prev, sectionId, side, value) {
  const current = prev[sectionId] ?? {};
  const nextEntry = {
    ...current,
    [side]: value === null ? null : clampSpacingRem(value),
  };

  if (nextEntry.pt == null && nextEntry.pb == null) {
    const rest = { ...prev };
    delete rest[sectionId];
    return rest;
  }

  return {
    ...prev,
    [sectionId]: nextEntry,
  };
}

export function clearSectionOverride(prev, sectionId) {
  if (!(sectionId in prev)) return prev;
  const next = { ...prev };
  delete next[sectionId];
  return next;
}

export function countActiveOverrides(overrides) {
  let count = 0;
  for (const sec of SECTION_SPACING_CONFIGS) {
    const entry = overrides[sec.id];
    if (entry?.pt != null) count += 1;
    if (entry?.pb != null) count += 1;
  }
  return count;
}

export function formatSpacingCss(overrides) {
  const lines = [];
  for (const sec of SECTION_SPACING_CONFIGS) {
    const entry = overrides[sec.id];
    if (entry?.pt != null) {
      lines.push(`  ${sec.ptVar}: ${clampSpacingRem(entry.pt)}rem;`);
    }
    if (entry?.pb != null) {
      lines.push(`  ${sec.pbVar}: ${clampSpacingRem(entry.pb)}rem;`);
    }
  }
  if (lines.length === 0) return ':root {\n  /* الافتراضي */\n}';
  return `:root {\n${lines.join('\n')}\n}`;
}

export function applySpacingOverridesToStyle(overrides, styleTarget) {
  for (const sec of SECTION_SPACING_CONFIGS) {
    const entry = overrides[sec.id];
    if (entry?.pt != null) {
      styleTarget.setProperty(sec.ptVar, `${clampSpacingRem(entry.pt)}rem`);
    } else {
      styleTarget.removeProperty(sec.ptVar);
    }
    if (entry?.pb != null) {
      styleTarget.setProperty(sec.pbVar, `${clampSpacingRem(entry.pb)}rem`);
    } else {
      styleTarget.removeProperty(sec.pbVar);
    }
  }
}

export function sanitizeSpacingOverrides(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw;
  const result = {};

  for (const sec of SECTION_SPACING_CONFIGS) {
    const item = record[sec.id];
    if (!item || typeof item !== 'object') continue;
    const itemObj = item;
    const pt = typeof itemObj.pt === 'number' && Number.isFinite(itemObj.pt)
      ? clampSpacingRem(itemObj.pt)
      : null;
    const pb = typeof itemObj.pb === 'number' && Number.isFinite(itemObj.pb)
      ? clampSpacingRem(itemObj.pb)
      : null;

    if (pt !== null || pb !== null) {
      result[sec.id] = { pt, pb };
    }
  }

  return result;
}

export function loadSpacingOverrides() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SPACING_STORAGE_KEY);
    if (!raw) return {};
    return sanitizeSpacingOverrides(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveSpacingOverrides(overrides) {
  if (typeof window === 'undefined') return;
  try {
    if (countActiveOverrides(overrides) === 0) {
      window.localStorage.removeItem(SPACING_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SPACING_STORAGE_KEY, JSON.stringify(overrides));
    }
  } catch {
    // Ignore storage quota/private-mode errors
  }
}
