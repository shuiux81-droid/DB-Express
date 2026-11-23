import { segmentGraphemes } from './contactFit.js';

export const HERO_VIDEO_MP4_URL =
  'assets/aistudio/Add_coding_elements_to_video_381ad5a9_4de7f34c.mp4';
export const HERO_VIDEO_WEBM_URL = 'assets/aistudio/hero-coding.webm';
export const HERO_POSTER_URL = 'assets/hero-poster.webp';
export const STATUE_VIDEO_URL = HERO_VIDEO_MP4_URL;

export const BEATS = {
  LOOP: 8.0,
  EYEBROW_START: 0.0,
  EYEBROW_END: 0.35,
  HEAD_1_START: 0.1,
  HEAD_1_END: 0.9,
  SELECT_START: 1.0,
  SELECT_END: 1.3,
  STRIKE_AT: 1.3,
  STRIKE_COLOR_DUR: 0.2,
  STRIKE_LINE_DUR: 0.25,
  HEAD_2_START: 1.9,
  HEAD_2_END: 3.5,
  CARET_HIDE_DELAY: 0.2,
  CARET_HIDE_DUR: 0.1,
  DESC_DELAY: 0.2,
  DESC_DUR: 0.35,
  BUTTONS_DELAY: 0.25,
  BUTTONS_DUR: 0.5,
  HERO_ENTRANCE_END: 4.8,
  REDUCED_TIME: 7.0,
};

export function shouldPlayHeroEntrance(params) {
  return !params.reducedMotion && params.heroInViewport && !params.alreadyPlayed;
}

export const EYEBROW_TEXT = '[ شريكك في التحول الرقمي ]';
export const HEAD_BEFORE_SELF = 'نصنع لك تجارب ';
export const HEAD_SELF = 'رقمية';
export const HEAD_FIRST = `${HEAD_BEFORE_SELF}${HEAD_SELF}`;
export const HEAD_AFTER_SELF = ' تُحدث فرقًا';
export const PARAGRAPH_TEXT =
  'شريكك في تحويل الأفكار إلى حلول رقمية متكاملة، نجمع فيها الإبداع والتكنولوجيا لتنمو علامتك التجارية وتتميز.';

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStepThresholds(
  len,
  totalDurationSec,
  jitterSec = 0,
  seed = 1337,
  extraPauseIndex = -1,
  extraPauseSec = 0
) {
  if (len <= 0) return [];
  const rand = createSeededRandom(seed);
  const rawSteps = [];
  const basePerChar = totalDurationSec / len;

  for (let i = 0; i < len; i += 1) {
    const jitter = jitterSec > 0 ? (rand() * 2 - 1) * jitterSec : 0;
    let step = Math.max(basePerChar * 0.35, basePerChar + jitter);
    if (i === extraPauseIndex) {
      step += extraPauseSec;
    }
    rawSteps.push(step);
  }

  const totalRaw = rawSteps.reduce((acc, v) => acc + v, 0);
  const thresholds = [];
  let acc = 0;
  for (let i = 0; i < len; i += 1) {
    acc += rawSteps[i];
    thresholds.push(acc / totalRaw);
  }
  thresholds[len - 1] = 1;
  return thresholds;
}

export function buildTypingThresholds(
  text,
  totalDurationSec,
  jitterSec = 0,
  seed = 1337,
  extraPauseIndex = -1,
  extraPauseSec = 0
) {
  return buildStepThresholds(
    text.length,
    totalDurationSec,
    jitterSec,
    seed,
    extraPauseIndex,
    extraPauseSec
  );
}

export function buildGraphemeTypingThresholds(
  graphemes,
  totalDurationSec,
  jitterSec = 0,
  seed = 1337,
  extraPauseIndex = -1,
  extraPauseSec = 0
) {
  return buildStepThresholds(
    graphemes.length,
    totalDurationSec,
    jitterSec,
    seed,
    extraPauseIndex,
    extraPauseSec
  );
}

export function splitArabicGraphemes(text) {
  return segmentGraphemes(text, 'ar');
}

export function countCharsFromProgress(progress, thresholds) {
  if (progress <= 0 || thresholds.length === 0) return 0;
  if (progress >= 1) return thresholds.length;

  let count = 0;
  for (let i = 0; i < thresholds.length; i += 1) {
    if (progress >= thresholds[i]) {
      count = i + 1;
    } else {
      break;
    }
  }
  return count;
}

export function computeSyncedTimelineTime(
  videoCurrentTime,
  videoDuration,
  loopDuration = BEATS.LOOP
) {
  if (!Number.isFinite(videoCurrentTime) || !Number.isFinite(videoDuration) || videoDuration <= 0) {
    return 0;
  }
  const scaled = videoCurrentTime * (loopDuration / videoDuration);
  return Math.max(0, Math.min(loopDuration, scaled));
}

export function computePingPongTime(
  mediaTime,
  bounceDuration,
  cleanDuration = BEATS.LOOP
) {
  if (
    !Number.isFinite(mediaTime) ||
    !Number.isFinite(bounceDuration) ||
    bounceDuration <= 0 ||
    !Number.isFinite(cleanDuration) ||
    cleanDuration <= 0
  ) {
    return 0;
  }
  const wrapped = ((mediaTime % bounceDuration) + bounceDuration) % bounceDuration;
  const half = bounceDuration / 2;
  const frac = wrapped <= half ? wrapped / half : (bounceDuration - wrapped) / half;
  return Math.max(0, Math.min(cleanDuration, frac * cleanDuration));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CHAR_PATTERN = /^\+?[\d\s().-]+$/;

function normalizeDigits(value) {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (ch) => String(ch.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (ch) => String(ch.charCodeAt(0) - 0x06f0));
}

export function isValidPhone(phone) {
  const normalized = normalizeDigits(phone).trim();
  if (!normalized || !PHONE_CHAR_PATTERN.test(normalized)) return false;
  const digits = normalized.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function validateContactForm(name, email) {
  const nameValid = name.trim().length > 0;
  const emailValid = EMAIL_PATTERN.test(email.trim());
  return {
    nameValid,
    emailValid,
    isValid: nameValid && emailValid,
  };
}

export function validateContactFields({
  name = '',
  email = '',
  phone = '',
  company = '',
  message = '',
} = {}) {
  const nameTrimmed = String(name ?? '').trim();
  const emailTrimmed = String(email ?? '').trim();
  const phoneTrimmed = String(phone ?? '').trim();
  const companyTrimmed = String(company ?? '').trim();
  const messageTrimmed = String(message ?? '').trim();

  const nameValid = nameTrimmed.length > 0;
  const emailValid = EMAIL_PATTERN.test(emailTrimmed);
  const phoneValid = isValidPhone(phoneTrimmed);
  const companyValid = companyTrimmed.length > 0;
  const messageValid = messageTrimmed.length > 0;

  return {
    nameValid,
    emailValid,
    phoneValid,
    companyValid,
    messageValid,
    errors: {
      name: nameValid ? null : 'يرجى إدخال الاسم بالكامل.',
      email: emailValid ? null : 'يرجى إدخال بريد إلكتروني صحيح.',
      phone:
        phoneTrimmed.length === 0
          ? 'يرجى إدخال رقم الهاتف.'
          : phoneValid
            ? null
            : 'يرجى إدخال رقم هاتف صحيح.',
      company: companyValid ? null : 'يرجى إدخال اسم الشركة.',
      message: messageValid ? null : 'يرجى كتابة تفاصيل الرسالة.',
    },
    isValid:
      nameValid && emailValid && phoneValid && companyValid && messageValid,
  };
}

export function computeHalftoneDotSize(
  distancePx,
  maxRadius = 300,
  minDot = 0.9,
  maxDot = 2.6
) {
  if (!Number.isFinite(distancePx) || distancePx >= maxRadius) {
    return minDot;
  }
  const clamped = Math.max(0, distancePx);
  const f = 1 - clamped / maxRadius;
  return minDot + (maxDot - minDot) * f;
}

export function formatCardCounter(index, total) {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeIndex = Math.max(1, Math.min(safeTotal, Math.floor(index)));
  return `${String(safeIndex).padStart(2, '0')} / ${String(safeTotal).padStart(2, '0')}`;
}

const SLOW_CONNECTION_TYPES = new Set(['slow-2g', '2g', '3g']);

export function shouldLoadHeroVideo({ reducedMotion = false, connection = null } = {}) {
  if (reducedMotion) return false;
  if (connection && typeof connection === 'object') {
    if (connection.saveData === true) return false;
    if (
      typeof connection.effectiveType === 'string' &&
      SLOW_CONNECTION_TYPES.has(connection.effectiveType.toLowerCase())
    ) {
      return false;
    }
  }
  return true;
}
