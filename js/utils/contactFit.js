export const CONTACT_FIT_MIN = 0.55;
export const CONTACT_FIT_MAX = 1;

export function computeContactFitScale(availablePx, naturalHeightPx) {
  if (
    !Number.isFinite(availablePx) ||
    !Number.isFinite(naturalHeightPx) ||
    availablePx <= 0 ||
    naturalHeightPx <= 0
  ) {
    return { fit: CONTACT_FIT_MAX, isTall: false };
  }

  const rawRatio = availablePx / naturalHeightPx;
  if (rawRatio < CONTACT_FIT_MIN) {
    return { fit: CONTACT_FIT_MIN, isTall: true };
  }

  const fit = Math.min(CONTACT_FIT_MAX, Math.max(CONTACT_FIT_MIN, rawRatio));
  return { fit: Number(fit.toFixed(4)), isTall: false };
}

export function segmentGraphemes(text, locale = 'ar') {
  if (!text) return [];
  /* R7-E */
  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 600px)').matches &&
    !/[\u200D\uD800-\uDFFF]/.test(text)
  ) {
    return text.match(/\P{M}\p{M}*/gu) || [];
  }
  /* /R7-E */
  const SegmenterCtor = Intl.Segmenter;

  if (typeof SegmenterCtor === 'function') {
    const segmenter = new SegmenterCtor(locale, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }

  return Array.from(text);
}
