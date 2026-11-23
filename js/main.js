import { bootHero } from './boot/heroBoot.js';
import { initScrollExperience } from './engine/scrollExperience.js';
import {
  yieldToMain,
  /* R6-C */ yieldPhoneMacrotask, /* /R6-C */
} from './utils/bootScheduler.js';

async function bootstrap() {
  try {
    await bootHero();
    await yieldToMain();
    /* R6-C */
    await yieldPhoneMacrotask();
    /* /R6-C */

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
