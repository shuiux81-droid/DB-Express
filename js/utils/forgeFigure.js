export const FORGE_ATOMS = [
  { id: 'a1', shape: 'circle', left: '1.4%', top: '11%', sizeRem: 1.45, speed: 0.9, rotSign: 1, outlined: false },
  { id: 'a2', shape: 'square', left: '1.8%', top: '44%', sizeRem: 1.3, speed: 1.25, rotSign: -1, outlined: true },
  { id: 'a3', shape: 'triangle', left: '1.2%', top: '79%', sizeRem: 1.65, speed: 0.7, rotSign: 1, outlined: false },
  { id: 'a4', shape: 'circle', left: '24%', top: '1.1%', sizeRem: 1.25, speed: 1.0, rotSign: -1, outlined: true },
  { id: 'a5', shape: 'square', left: '75%', top: '1.3%', sizeRem: 1.55, speed: 1.35, rotSign: 1, outlined: false },
  { id: 'a6', shape: 'triangle', left: '96.4%', top: '19%', sizeRem: 1.75, speed: 0.85, rotSign: -1, outlined: true },
  { id: 'a7', shape: 'circle', left: '96.2%', top: '57%', sizeRem: 1.4, speed: 1.4, rotSign: 1, outlined: false },
  { id: 'a8', shape: 'square', left: '95.6%', top: '87%', sizeRem: 1.9, speed: 0.6, rotSign: -1, outlined: true },
];

export const FORGE_OUTLINE_RECTS = Array.from({ length: 9 }, (_, idx) => {
  const row = Math.floor(idx / 3);
  const colFromRight = idx % 3;
  const visualCol = 2 - colFromRight;
  return {
    index: idx,
    x: Number((visualCol * 27).toFixed(2)),
    y: Number((row * 25.6).toFixed(2)),
    width: 24,
    height: 22.6,
    rx: 2,
  };
});

export const FORGE_Z_PATH_ORDER = [0, 1, 2, 5, 4, 3, 6, 7, 8];

export const FORGE_SPARK_PATH =
  'M50 6 L61 39 L94 50 L61 61 L50 94 L39 61 L6 50 L39 39 Z';

export const FORGE_SPARK_VERTICES = [
  { cx: 50, cy: 6, hx1: 38, hy1: 6, hx2: 62, hy2: 6 },
  { cx: 61, cy: 39, hx1: 55, hy1: 31, hx2: 69, hy2: 43 },
  { cx: 94, cy: 50, hx1: 94, hy1: 38, hx2: 94, hy2: 62 },
  { cx: 61, cy: 61, hx1: 69, hy1: 57, hx2: 55, hy2: 69 },
  { cx: 50, cy: 94, hx1: 62, hy1: 94, hx2: 38, hy2: 94 },
  { cx: 39, cy: 61, hx1: 45, hy1: 69, hx2: 31, hy2: 57 },
];

export const FORGE_FIG_BEATS = {
  LENGTH: 10,
  IDEAS_START: 0,
  CHIPS_START: 3.0,
  CONNECTOR_START: 3.9,
  MARQUEE_START: 4.6,
  SELECT_START: 6.2,
  STRIKE_START: 6.8,
  SWAP_START: 7.2,
  BRAND_START: 7.2,
  STORY_START: 7.4,
  POST_START: 7.8,
  CLICK_START: 8.4,
  NOTIFS_START: 8.6,
  HOLD_START: 9.2,
  RING_SPIN_START: 9.6,
};

export function scaleForgeBeat(time, masterLength = FORGE_FIG_BEATS.LENGTH) {
  if (!Number.isFinite(time) || !Number.isFinite(masterLength) || masterLength <= 0) {
    return 0;
  }
  return time * (masterLength / FORGE_FIG_BEATS.LENGTH);
}

export const FORGE_SOCIAL_ICONS = {
  heart:
    'M12 20.5s-7.2-4.4-9.3-9.1C1.4 8.3 3.1 5 6.3 5c2 0 3.9 1 5.7 3.1C13.8 6 15.7 5 17.7 5c3.2 0 4.9 3.3 3.6 6.4-2.1 4.7-9.3 9.1-9.3 9.1z',
  comment: 'M4 5h16v11H9.5L4 20.5z',
  share: 'M3 11.5 21 3.5l-6.2 17-3.3-7.2z M11.5 13.3 21 3.5',
  bookmark: 'M6.5 3.5h11v17.5L12 16.8 6.5 21z',
};

export const FORGE_BURST_HEARTS = [
  { id: 0, sizeU: 3.6, dxU: -6.8, dyU: 20, rotDeg: -22, tone: 'maroon' },
  { id: 1, sizeU: 4.5, dxU: 3.4, dyU: 26, rotDeg: 18, tone: 'pink' },
  { id: 2, sizeU: 3.2, dxU: -2.2, dyU: 17, rotDeg: -14, tone: 'maroon' },
  { id: 3, sizeU: 4.8, dxU: 7.4, dyU: 23, rotDeg: 24, tone: 'pink' },
  { id: 4, sizeU: 3.9, dxU: -7.9, dyU: 28, rotDeg: -25, tone: 'maroon' },
  { id: 5, sizeU: 4.2, dxU: 1.1, dyU: 24, rotDeg: 12, tone: 'pink' },
  { id: 6, sizeU: 3.4, dxU: 5.5, dyU: 18, rotDeg: -19, tone: 'maroon' },
];

export const FORGE_NOTIF_CHIPS = [
  { id: 'heart', target: 1200, withPlus: true, icon: 'heart' },
  { id: 'comment', target: 248, withPlus: false, icon: 'comment' },
  { id: 'share', target: 96, withPlus: false, icon: 'share' },
];

export function formatSocialCounter(value, withPlus = false) {
  const safe = Number.isFinite(value) && value > 0 ? value : 0;
  const prefix = withPlus && safe > 0 ? '+' : '';
  if (safe < 1000) {
    return `${prefix}${Math.round(safe)}`;
  }
  return `${prefix}${(safe / 1000).toFixed(1)}K`;
}
