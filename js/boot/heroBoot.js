import { initHero } from '../sections/hero.js';
import { initNavBoot } from './navBoot.js';
import {
  yieldToMain,
  /* R6-C */ yieldPhoneMacrotask, /* /R6-C */
} from '../utils/bootScheduler.js';

function recordHeroInit(totalMs) {
  const list = (window.__dxSectionInits = window.__dxSectionInits || []);
  const rounded = Number((totalMs ?? 0).toFixed(1));
  list.push({
    section: 'hero',
    atMs: Math.round(performance.now()),
    totalMs: rounded,
    maxChunkMs: rounded,
    chunks: 1,
  });
}

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
  recordHeroInit(heroMs);
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
