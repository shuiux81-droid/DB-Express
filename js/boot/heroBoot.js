import { initHero } from '../sections/hero.js';
import { initNavBoot } from './navBoot.js';
import {
  yieldToMain,
  /* R6-C */ yieldPhoneMacrotask, /* /R6-C */
} from '../utils/bootScheduler.js';
import { recordSectionInit } from '../engine/scroll/shared.js';

export function registerCoreGsapOnce() {
  const { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin, DrawSVGPlugin } = window;
  if (!gsap || !ScrollTrigger) return;
  try {
    gsap.registerPlugin(
      ScrollTrigger,
      ...(SplitText ? [SplitText] : []),
      ...(ScrambleTextPlugin ? [ScrambleTextPlugin] : []),
      ...(DrawSVGPlugin ? [DrawSVGPlugin] : [])
    );
  } catch {
    // fallback handled downstream
  }
}

export async function bootHero() {
  const cleanups = [];

  registerCoreGsapOnce();
  await yieldToMain();
  /* R6-C */
  await yieldPhoneMacrotask();
  /* /R6-C */

  // First screen: run only what the hero needs to paint and type
  const t0 = performance.now();
  const cleanupHero = initHero();
  const heroMs = performance.now() - t0;
  recordSectionInit('hero', { totalMs: heroMs, maxChunkMs: heroMs, chunks: 1 });
  if (typeof cleanupHero === 'function') cleanups.push(cleanupHero);
  await yieldToMain();
  /* R6-C */
  await yieldPhoneMacrotask();
  /* /R6-C */

  // Bind navigation links & header CTA in their own yielded task
  const cleanupNav = initNavBoot();
  if (typeof cleanupNav === 'function') cleanups.push(cleanupNav);

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
