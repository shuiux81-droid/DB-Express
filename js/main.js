import { bootHero, registerCoreGsapOnce } from './boot/heroBoot.js';
import {
  yieldToMain,
  /* R6-C */ yieldPhoneMacrotask, /* /R6-C */
} from './utils/bootScheduler.js';

const resolveHeroReady = () => {
  if (typeof window.__resolveHeroReady === 'function') {
    window.__resolveHeroReady();
  } else {
    window.__heroReady = true;
  }
};

async function bootstrap() {
  try {
    const isDesktopBoot = window.matchMedia('(min-width: 601px)').matches;
    const scrollModPromise = isDesktopBoot
      ? import('./engine/scrollExperience.js')
      : null;

    if (window.__gsapReadyPromise) {
      await window.__gsapReadyPromise;
    }

    await bootHero();
    resolveHeroReady();
    await yieldToMain();
    /* R6-C */
    await yieldPhoneMacrotask();
    /* /R6-C */

    if (window.__stReadyPromise) {
      await window.__stReadyPromise;
      registerCoreGsapOnce();
    }

    const { initScrollExperience } = await (
      scrollModPromise || import('./engine/scrollExperience.js')
    );

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
    resolveHeroReady();
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
