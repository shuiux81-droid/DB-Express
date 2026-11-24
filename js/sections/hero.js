import { initLacunaSync } from '../engine/lacunaSync.js';
import {
  HEAD_AFTER_SELF,
  HEAD_BEFORE_SELF,
  HEAD_SELF,
} from '../utils/typewriterBeats.js';

export function initHero() {
  const heroEl = document.querySelector('.hero');
  if (!heroEl) return () => {};

  const videoEl = heroEl.querySelector('.hero-video');
  const headGhostEl = heroEl.querySelector('.hero-headline-ghost');
  const headlineLiveEl = heroEl.querySelector('.hero-headline-live');
  const headBeforeEl = heroEl.querySelector('[data-hero="head-before"]');
  const selfWrapEl = heroEl.querySelector('.sel');
  const selfBaseEl = heroEl.querySelector('.sel-base');
  const selfHighlightEl = heroEl.querySelector('.sel-highlight');
  const headAfterEl = heroEl.querySelector('[data-hero="head-after"]');
  const caretEl = heroEl.querySelector('.caret');
  const paragraphWrapEl = heroEl.querySelector('.hero-paragraph-wrap');
  const paragraphEl = heroEl.querySelector('.hero-paragraph');
  const actionsEl = heroEl.querySelector('.hero-actions');
  const ctaEl = heroEl.querySelector('.hero-cta');

  const fullHead = `${HEAD_BEFORE_SELF}${HEAD_SELF}${HEAD_AFTER_SELF}`;
  if (headGhostEl && headGhostEl.textContent !== fullHead) {
    headGhostEl.textContent = fullHead;
  }

  const cleanups = [];

  if (videoEl) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      videoEl.autoplay = false;
      videoEl.preload = 'none';
      videoEl.querySelectorAll('source').forEach((s) => s.remove());
    }

    const revealVideo = () => {
      videoEl.classList.add('is-playing');
    };
    if (!videoEl.paused && videoEl.readyState >= 2) {
      revealVideo();
    }
    videoEl.addEventListener('playing', revealVideo, { once: true });
    cleanups.push(() => videoEl.removeEventListener('playing', revealVideo));
  }

  // Hero CTA smooth scroll binding
  if (ctaEl) {
    const onClick = () =>
      import('../engine/scrollExperience.js').then((m) => m.scrollToTarget('#contact', 1.6));
    ctaEl.addEventListener('click', onClick);
    cleanups.push(() => ctaEl.removeEventListener('click', onClick));
  }

  if (
    videoEl &&
    headlineLiveEl &&
    headBeforeEl &&
    selfWrapEl &&
    selfBaseEl &&
    selfHighlightEl &&
    headAfterEl &&
    caretEl &&
    paragraphWrapEl &&
    paragraphEl &&
    actionsEl &&
    ctaEl
  ) {
    const cleanupLacuna = initLacunaSync({
      heroEl,
      videoEl,
      headlineLiveEl,
      headBeforeEl,
      selfWrapEl,
      selfBaseEl,
      selfHighlightEl,
      headAfterEl,
      caretEl,
      paragraphWrapEl,
      paragraphEl,
      actionsEl,
      ctaEl,
    });
    cleanups.push(cleanupLacuna);
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
