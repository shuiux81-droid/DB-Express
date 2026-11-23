export const SERVICES_V2_THEMES = [
  'red',
  'ink',
  'paper',
  'red',
  'ink',
];

export const SERVICES_FRAME_TOKENS = [
  'var(--svc-red)',
  'var(--ink)',
  'var(--paper)',
  'var(--svc-red)',
  'var(--ink)',
];

export const SERVICES_DECK_DURATION = 5.6;

export const SERVICES_DECK_STEPS = [
  { index: 1, startAt: 0.0, peakRotation: 5, restRotation: 3.5 },
  { index: 2, startAt: 1.0, peakRotation: -5, restRotation: -3 },
  { index: 3, startAt: 2.0, peakRotation: 4, restRotation: 2 },
  { index: 4, startAt: 3.0, peakRotation: -4, restRotation: -2.5 },
];

export const SERVICES_MOBILE_TILTS = [
  { enter: 6, rest: 3 },
  { enter: -6, rest: -3 },
  { enter: 6, rest: 2 },
  { enter: -6, rest: -2 },
  { enter: 6, rest: 3 },
];

export function computeServicesFitScale(
  availablePx,
  headHeightPx,
  currentEmPx,
  currentFit = 1
) {
  if (
    !Number.isFinite(availablePx) ||
    !Number.isFinite(headHeightPx) ||
    !Number.isFinite(currentEmPx) ||
    !Number.isFinite(currentFit) ||
    availablePx <= 0 ||
    headHeightPx <= 0 ||
    currentEmPx <= 0 ||
    currentFit <= 0
  ) {
    return 1;
  }
  const neededAtCurrentFitPx = headHeightPx + (0.8 + 28) * currentEmPx;
  const rawFit = currentFit * (availablePx / neededAtCurrentFitPx);
  const clamped = Math.max(0.6, Math.min(1, rawFit));
  return Math.round(clamped * 1000) / 1000;
}

export function computeCardStartYPx(
  sectionBottomPx,
  cardCenterYPx,
  cardHeightPx
) {
  if (
    !Number.isFinite(sectionBottomPx) ||
    !Number.isFinite(cardCenterYPx) ||
    !Number.isFinite(cardHeightPx) ||
    cardHeightPx <= 0
  ) {
    return 600;
  }
  return Math.ceil(sectionBottomPx - cardCenterYPx + cardHeightPx / 2 + 40);
}
