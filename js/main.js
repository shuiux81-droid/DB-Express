import { bootHero, registerCoreGsapOnce } from './boot/heroBoot.js';
import { initScrollExperience } from './engine/scrollExperience.js';
import {
  yieldToMain,
  /* R6-C */ yieldPhoneMacrotask, /* /R6-C */
} from './utils/bootScheduler.js';

async function bootstrap() {
  try {
    await bootHero();
    if (typeof window.__resolveHeroReady === 'function') {
      window.__resolveHeroReady();
    } else {
      window.__heroReady = true;
    }
    await yieldToMain();
    /* R6-C */
    await yieldPhoneMacrotask();
    /* /R6-C */

    if (typeof window.__loadScrollTrigger === 'function') {
      await window.__loadScrollTrigger();
    } else if (window.__scrollTriggerReady) {
      await window.__scrollTriggerReady;
    }
    registerCoreGsapOnce();

    initScrollExperience({
      hydrators: {
        about: () => import('./sections/about.js').then((m) => m.initAbout()),
        services: () => import('./sections/services.js').then((m) => m.initServices()),
        testimonials: () => import('./sections/testimonials.js').then((m) => m.initTestimonials()),
        contact: () => import('./sections/contact.js').then((m) => m.initContact()),
        footer: () => import('./sections/footer.js').then((m) => m.initFooter()),
        spacingFilter: () =>
          import('./sections/spacingFilter.js').then((m) => m.initSpacingFilter()),
      },
    });
    /* R6-C */
    await yieldPhoneMacrotask();
    /* /R6-C */
  } finally {
    if (typeof window.__resolveHeroReady === 'function') {
      window.__resolveHeroReady();
    } else {
      window.__heroReady = true;
    }
    if (typeof window.__resolveAppReady === 'function') {
      window.__resolveAppReady();
    } else {
      window.__appReady = true;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    () => {
      bootstrap();
    },
    { once: true }
  );
} else {
  bootstrap();
}
