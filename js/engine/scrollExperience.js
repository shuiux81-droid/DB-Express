import {
  IDLE_TIMEOUT_MS,
  REFRESH_DEBOUNCE_MS,
  SECTION_ORDER,
  createDebouncedTask,
  resolveTargetSectionIndex,
  scheduleDoubleRafThenIdle,
  scheduleIdleSlot,
  yieldToMain,
  /* R6-C */
  yieldPhoneMacrotask,
  /* /R6-C */
} from '../utils/bootScheduler.js';
import {
  activateAllDeferredCssSync,
  activateDeferredCss,
  ensureGsapPlugins,
  loadLenis,
  scrollToTarget,
} from './scroll/shared.js';
import { initHeroScroll } from './scroll/hero.js';

export { scrollToTarget };

const SECTION_SCROLL_LOADERS = {
  about: () => import('./scroll/about.js'),
  services: () => import('./scroll/services.js'),
  testimonials: () => import('./scroll/testimonials.js'),
  contact: () => import('./scroll/contact.js'),
  footer: () => import('./scroll/footer.js'),
};

const SECTION_PLUGINS = {
  about: ['SplitText', 'ScrambleTextPlugin', 'DrawSVGPlugin'],
  services: ['SplitText', 'ScrambleTextPlugin'],
  testimonials: ['SplitText', 'ScrambleTextPlugin'],
  contact: ['SplitText', 'ScrambleTextPlugin'],
  footer: ['SplitText', 'ScrambleTextPlugin', 'DrawSVGPlugin'],
};

function hasSpacingFilterDemand() {
  try {
    if (/[?&]spacing\b/.test(window.location.search)) return true;
    const raw = window.localStorage.getItem('dx-section-spacing-v1');
    return Boolean(raw && raw !== '{}');
  } catch {
    return false;
  }
}

export function initScrollExperience(options = {}) {
  const { hydrators = {} } = options;
  const cleanups = [];
  const docEl = document.documentElement;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;

  const HYDRATE_KEYS = [...SECTION_ORDER, 'spacingFilter'];
  const hydratedState = Object.fromEntries(HYDRATE_KEYS.map((k) => [k, false]));
  const hydratePromises = new Map();
  const scrollModuleCache = new Map();
  let domHydratedEmitted = false;

  const markAllHydratedIfDone = () => {
    if (domHydratedEmitted) return;
    if (HYDRATE_KEYS.every((k) => hydratedState[k])) {
      domHydratedEmitted = true;
      window.__dxDomHydrated = true;
      window.dispatchEvent(new CustomEvent('dx:dom-hydrated'));
    }
  };

  const hydrateSectionAsync = (key) => {
    if (!Object.prototype.hasOwnProperty.call(hydratedState, key)) {
      return Promise.resolve(false);
    }
    if (hydratedState[key]) return Promise.resolve(false);
    if (hydratePromises.has(key)) return hydratePromises.get(key);

    const p = (async () => {
      await activateDeferredCss(key);
      const fn = hydrators[key];
      if (typeof fn === 'function') {
        const result = await fn();
        if (typeof result === 'function') cleanups.push(result);
      }
      hydratedState[key] = true;
      markAllHydratedIfDone();
      return true;
    })();
    hydratePromises.set(key, p);
    return p;
  };

  const loadScrollModule = (key) => {
    if (scrollModuleCache.has(key)) return scrollModuleCache.get(key);
    const loader = SECTION_SCROLL_LOADERS[key];
    if (!loader) return Promise.resolve(null);
    const p = loader();
    scrollModuleCache.set(key, p);
    return p;
  };

  const hydrateUpToIndexAsync = async (targetIdx) => {
    for (let i = 0; i <= targetIdx && i < SECTION_ORDER.length; i += 1) {
      await hydrateSectionAsync(SECTION_ORDER[i]);
    }
  };

  const scheduleFallbackIdleHydration = (onEachHydrated) => {
    let idx = 0;
    let cancelIdle = null;
    let disposed = false;

    const step = () => {
      if (disposed || idx >= HYDRATE_KEYS.length) return;
      while (idx < HYDRATE_KEYS.length && hydratedState[HYDRATE_KEYS[idx]]) {
        idx += 1;
      }
      if (idx >= HYDRATE_KEYS.length) return;
      const key = HYDRATE_KEYS[idx];
      idx += 1;
      hydrateSectionAsync(key).then((didRun) => {
        if (disposed) return;
        if (didRun && typeof onEachHydrated === 'function') {
          onEachHydrated(key);
        }
        if (!disposed && idx < HYDRATE_KEYS.length) {
          cancelIdle = scheduleIdleSlot(step, IDLE_TIMEOUT_MS);
        }
      });
    };

    cancelIdle = scheduleIdleSlot(step, IDLE_TIMEOUT_MS);
    return () => {
      disposed = true;
      if (cancelIdle) cancelIdle();
    };
  };

  const markPageReadyWhenRevealed = () => {
    const revealPromise = window.__loaderReveal ?? Promise.resolve();
    revealPromise.then(() => {
      docEl.setAttribute('data-page-ready', 'true');
    });
  };

  const showStaticFallback = () => {
    docEl.setAttribute('data-reveal-fallback', 'true');
    activateAllDeferredCssSync();
    markPageReadyWhenRevealed();
  };

  if (!gsap || !ScrollTrigger) {
    showStaticFallback();
    const initialHash = window.location.hash;
    if (initialHash && initialHash.length > 1) {
      hydrateUpToIndexAsync(
        resolveTargetSectionIndex(initialHash, (sel) => document.querySelector(sel))
      );
    }
    const ensureStaticAsync = (target) =>
      hydrateUpToIndexAsync(
        resolveTargetSectionIndex(target, (sel) => document.querySelector(sel))
      );
    window.__ensureSectionsBuiltAsync = ensureStaticAsync;
    cleanups.push(() => {
      if (window.__ensureSectionsBuiltAsync === ensureStaticAsync) {
        window.__ensureSectionsBuiltAsync = undefined;
      }
    });
    cleanups.push(scheduleFallbackIdleHydration());
    return () => cleanups.forEach((fn) => fn());
  }

  try {
    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,resize',
    });
  } catch {
    // ignore if unsupported
  }

  const mm = gsap.matchMedia();
  const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  const landscapeTouchQuery = window.matchMedia('(max-height: 540px) and (pointer: coarse)');

  let layoutVersion = 0;
  const getLayoutKey = () => `${window.innerWidth}x${window.innerHeight}x${layoutVersion}`;

  mm.add(
    {
      isDesktop: '(min-width: 992px) and (prefers-reduced-motion: no-preference)',
      isMobile: '(max-width: 991px) and (prefers-reduced-motion: no-preference)',
      isReduce: '(prefers-reduced-motion: reduce)',
    },
    (context) => {
      const { isDesktop, isMobile, isReduce } = context.conditions;

      const ctxCleanups = [];
      let ctxDisposed = false;
      const isDisposed = () => ctxDisposed;
      ctxCleanups.push(() => {
        ctxDisposed = true;
      });

      let contactFitFn = null;
      let servicesFitFn = null;
      let contactFormWired = false;
      let newsletterFormWired = false;

      const wireContactFromMod = (contactMod) => {
        if (!contactMod || ctxDisposed) return;
        if (!contactFitFn && typeof contactMod.createContactFit === 'function') {
          contactFitFn = contactMod.createContactFit({
            ScrollTrigger,
            landscapeTouchQuery,
            getLayoutKey,
          });
        }
        if (!contactFormWired && typeof contactMod.setupContactForm === 'function') {
          contactFormWired = true;
          ctxCleanups.push(
            contactMod.setupContactForm(isReduce, () => scheduleRefresh(), {
              gsap,
              SplitText: window.SplitText,
            })
          );
        }
      };

      const wireNewsletterFromMod = (footerMod) => {
        if (!footerMod || newsletterFormWired || ctxDisposed) return;
        if (typeof footerMod.setupNewsletterForm === 'function') {
          newsletterFormWired = true;
          ctxCleanups.push(footerMod.setupNewsletterForm());
        }
      };

      const responsiveTimelines = [];
      const registerResponsiveTimeline = (tl) => {
        if (tl && typeof tl.invalidate === 'function') {
          responsiveTimelines.push(tl);
        }
      };

      let stRefreshEpoch = 0;
      const onStRefreshEpoch = () => {
        stRefreshEpoch += 1;
      };
      ScrollTrigger.addEventListener('refresh', onStRefreshEpoch);
      ctxCleanups.push(() => ScrollTrigger.removeEventListener('refresh', onStRefreshEpoch));

      let refreshScheduledHook = () => {};
      let forceRefreshRequested = false;
      let lazyRefreshBaseEpoch = -1;
      const refreshTask = createDebouncedTask(() => {
        if (ctxDisposed) return;
        refreshScheduledHook();
        const shouldForce = forceRefreshRequested;
        const baseEpoch = lazyRefreshBaseEpoch;
        forceRefreshRequested = false;
        lazyRefreshBaseEpoch = -1;
        if (!shouldForce && baseEpoch >= 0 && stRefreshEpoch > baseEpoch) {
          return;
        }
        ScrollTrigger.refresh();
      }, REFRESH_DEBOUNCE_MS);
      const scheduleRefresh = () => {
        if (ctxDisposed) return;
        forceRefreshRequested = true;
        refreshTask.schedule();
      };
      const scheduleLazyRefresh = (baseEpoch = stRefreshEpoch) => {
        if (ctxDisposed) return;
        if (!forceRefreshRequested) {
          lazyRefreshBaseEpoch =
            lazyRefreshBaseEpoch >= 0 ? Math.min(lazyRefreshBaseEpoch, baseEpoch) : baseEpoch;
        }
        refreshTask.schedule();
      };
      const flushRefresh = () => {
        if (ctxDisposed) return false;
        forceRefreshRequested = true;
        return refreshTask.flush();
      };
      ctxCleanups.push(() => refreshTask.cancel());

      // Reduced-motion branch
      if (isReduce) {
        showStaticFallback();
        if (window.__dxLenis) {
          window.__dxLenis.destroy();
          window.__dxLenis = undefined;
        }
        docEl.classList.remove('lenis', 'lenis-smooth');

        const applyReduceContactState = async () => {
          const contactMod = await loadScrollModule('contact');
          if (ctxDisposed) return;
          wireContactFromMod(contactMod);
          contactFitFn?.(false);
          scheduleRefresh();
        };

        const applyReduceFooterState = async () => {
          const footerMod = await loadScrollModule('footer');
          if (ctxDisposed) return;
          wireNewsletterFromMod(footerMod);
          document.querySelectorAll('.ch').forEach((ch) => {
            ch.style.setProperty('--halftone-dot', '1.6');
          });
        };

        if (hydratedState.contact) applyReduceContactState();
        if (hydratedState.footer) applyReduceFooterState();

        const initialReduceHash = window.location.hash;
        if (initialReduceHash && initialReduceHash.length > 1) {
          hydrateUpToIndexAsync(
            resolveTargetSectionIndex(initialReduceHash, (sel) => document.querySelector(sel))
          ).then(() => {
            if (ctxDisposed) return;
            if (hydratedState.contact) applyReduceContactState();
            if (hydratedState.footer) applyReduceFooterState();
          });
        }

        const ensureReduceSectionsAsync = async (target) => {
          await hydrateUpToIndexAsync(
            resolveTargetSectionIndex(target, (sel) => document.querySelector(sel))
          );
          if (ctxDisposed) return;
          if (hydratedState.contact) await applyReduceContactState();
          if (hydratedState.footer) await applyReduceFooterState();
        };
        window.__ensureSectionsBuiltAsync = ensureReduceSectionsAsync;
        ctxCleanups.push(() => {
          if (window.__ensureSectionsBuiltAsync === ensureReduceSectionsAsync) {
            window.__ensureSectionsBuiltAsync = undefined;
          }
        });

        ctxCleanups.push(
          scheduleFallbackIdleHydration((key) => {
            if (ctxDisposed) return;
            if (key === 'contact') applyReduceContactState();
            if (key === 'footer') applyReduceFooterState();
          })
        );

        let reduceResizeTimer = null;
        const onReduceResize = () => {
          if (reduceResizeTimer) window.clearTimeout(reduceResizeTimer);
          reduceResizeTimer = window.setTimeout(() => {
            if (hydratedState.contact) contactFitFn?.(false);
            scheduleRefresh();
          }, 150);
        };
        const onReduceSpacing = () => {
          if (hydratedState.contact) contactFitFn?.(false);
          scheduleRefresh();
        };
        window.addEventListener('resize', onReduceResize);
        window.addEventListener('dx:spacing-change', onReduceSpacing);
        ctxCleanups.push(() => {
          window.removeEventListener('resize', onReduceResize);
          window.removeEventListener('dx:spacing-change', onReduceSpacing);
          if (reduceResizeTimer) window.clearTimeout(reduceResizeTimer);
        });
        if (document.fonts && document.fonts.ready) {
          document.fonts.ready.then(() => {
            if (!ctxDisposed && hydratedState.contact) {
              contactFitFn?.(false);
              scheduleRefresh();
            }
          });
        }

        return () => ctxCleanups.forEach((fn) => fn());
      }

      docEl.removeAttribute('data-reveal-fallback');
      markPageReadyWhenRevealed();

      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.style.visibility = 'visible';
      });

      const revealPromise = window.__loaderReveal ?? Promise.resolve();
      let postRevealRafId = 0;
      ctxCleanups.push(() => {
        if (postRevealRafId) window.cancelAnimationFrame(postRevealRafId);
      });

      // Smooth scroll (Lenis 1.3.17, fine-pointer desktop only; loaded after loader:done -> 2x rAF -> idle)
      let activeLenis = null;
      let lenisTick = null;
      let cancelLenisSchedule = null;
      const startLenis = async () => {
        if (!finePointerQuery.matches || ctxDisposed || activeLenis) return;
        if (document.querySelector('.loader') || docEl.classList.contains('is-loading')) return;

        const LenisCtor = await loadLenis();
        if (!LenisCtor || !finePointerQuery.matches || ctxDisposed || activeLenis) return;

        const currentY = window.scrollY || window.pageYOffset || docEl.scrollTop || 0;
        activeLenis = new LenisCtor({ lerp: 0.165, wheelMultiplier: 1.25 });
        window.__dxLenis = activeLenis;
        activeLenis.on('scroll', ScrollTrigger.update);
        if (currentY > 0 && typeof activeLenis.scrollTo === 'function') {
          activeLenis.scrollTo(currentY, { immediate: true, force: true });
        }
        ScrollTrigger.update();

        lenisTick = (time) => {
          activeLenis.raf(time * 1000);
        };
        gsap.ticker.add(lenisTick);
        gsap.ticker.lagSmoothing(0);
      };

      const isLoaderDone = () =>
        !document.querySelector('.loader') && !docEl.classList.contains('is-loading');

      const scheduleLenisAfterLoader = () => {
        if (!finePointerQuery.matches || cancelLenisSchedule || activeLenis || ctxDisposed) return;
        cancelLenisSchedule = scheduleDoubleRafThenIdle(
          () => {
            cancelLenisSchedule = null;
            startLenis();
          },
          { timeoutMs: IDLE_TIMEOUT_MS }
        );
      };

      if (finePointerQuery.matches) {
        if (isLoaderDone()) {
          scheduleLenisAfterLoader();
        } else {
          const onLoaderDone = () => {
            window.removeEventListener('loader:done', onLoaderDone);
            scheduleLenisAfterLoader();
          };
          window.addEventListener('loader:done', onLoaderDone, { once: true });
          ctxCleanups.push(() => window.removeEventListener('loader:done', onLoaderDone));
        }
      }

      ctxCleanups.push(() => {
        if (cancelLenisSchedule) {
          cancelLenisSchedule();
          cancelLenisSchedule = null;
        }
        if (lenisTick) gsap.ticker.remove(lenisTick);
        if (activeLenis) {
          activeLenis.destroy();
          if (window.__dxLenis === activeLenis) window.__dxLenis = undefined;
        }
      });

      // Hero / global first-screen scroll features
      const { startGrain, initTopScrollTriggers } = initHeroScroll({
        gsap,
        ScrollTrigger,
        context,
        isDesktop,
        ctxCleanups,
        isDisposed,
        revealPromise,
      });

      // Ordered lazy section initializers (dynamically imported per section, initialized once only)
      const SECTION_BUILDERS = [
        { name: 'about', el: document.querySelector('.manifesto'), completed: false },
        { name: 'services', el: document.querySelector('#drops'), completed: false },
        { name: 'testimonials', el: document.querySelector('#readers'), completed: false },
        { name: 'contact', el: document.querySelector('#contact'), completed: false },
        { name: 'footer', el: document.querySelector('#footer'), completed: false },
      ];

      refreshScheduledHook = () => {
        if (SECTION_BUILDERS[1]?.completed) servicesFitFn?.(false);
        if (SECTION_BUILDERS[3]?.completed) contactFitFn?.(false);
      };

      const runSectionInitializer = async (name, { yieldBetween = true } = {}) => {
        const [mod] = await Promise.all([
          loadScrollModule(name),
          ensureGsapPlugins(SECTION_PLUGINS[name] || []),
        ]);
        if (!mod || ctxDisposed) return false;
        const baseEnv = {
          gsap,
          ScrollTrigger,
          SplitText: window.SplitText,
          ScrambleTextPlugin: window.ScrambleTextPlugin,
          DrawSVGPlugin: window.DrawSVGPlugin,
          isDesktop,
          isMobile,
          docEl,
          finePointerQuery,
          ctxCleanups,
          isDisposed,
          registerResponsiveTimeline,
          getLayoutKey,
        };
        const runnerOpts = { context, isDisposed, yieldBetween };

        if (name === 'about') return mod.initAbout(baseEnv, runnerOpts);
        if (name === 'services') {
          if (!servicesFitFn && typeof mod.createServicesFit === 'function') {
            servicesFitFn = mod.createServicesFit({
              ScrollTrigger,
              landscapeTouchQuery,
              getLayoutKey,
            });
          }
          return mod.initServices({ ...baseEnv, fitServices: servicesFitFn }, runnerOpts);
        }
        if (name === 'testimonials') return mod.initTestimonials(baseEnv, runnerOpts);
        if (name === 'contact') {
          wireContactFromMod(mod);
          return mod.initContact(
            {
              ...baseEnv,
              ensureContactFormWired: () => wireContactFromMod(mod),
              fitContact: (shouldRefresh, force) => contactFitFn?.(shouldRefresh, force),
            },
            runnerOpts
          );
        }
        if (name === 'footer') {
          return mod.initFooter(
            {
              ...baseEnv,
              ensureNewsletterFormWired: () => wireNewsletterFromMod(mod),
            },
            runnerOpts
          );
        }
        return false;
      };

      let builtCount = 0;
      let buildChain = Promise.resolve();
      let sectionIo = null;
      let pendingDeferredRefresh = false;

      const finishSectionStepsAsync = async (idx, { fast = false } = {}) => {
        if (ctxDisposed) return false;
        const entry = SECTION_BUILDERS[idx];
        if (!entry || entry.completed) return false;

        const didHydrate = await hydrateSectionAsync(entry.name);
        if (ctxDisposed || entry.completed) return false;
        if (didHydrate) {
          await yieldToMain();
          /* R6-C */
          await yieldPhoneMacrotask();
          /* /R6-C */
        }
        if (ctxDisposed || entry.completed) return false;

        await runSectionInitializer(entry.name, { yieldBetween: !fast });
        if (ctxDisposed) return false;
        /* R6-C */
        await yieldPhoneMacrotask();
        if (ctxDisposed) return false;
        /* /R6-C */

        if (!entry.completed) {
          entry.completed = true;
          if (idx + 1 > builtCount) builtCount = idx + 1;
          if (sectionIo && entry.el) {
            sectionIo.unobserve(entry.el);
          }
          return true;
        }
        return false;
      };

      const ensureSectionsForTargetAsync = (target) => {
        if (ctxDisposed) return Promise.resolve();
        initTopScrollTriggers();
        const targetIdx = resolveTargetSectionIndex(target, (sel) => document.querySelector(sel));
        if (targetIdx < 0) return Promise.resolve();

        const alreadyDone =
          targetIdx < SECTION_BUILDERS.length &&
          SECTION_BUILDERS[targetIdx].completed &&
          !pendingDeferredRefresh;
        if (alreadyDone) return Promise.resolve();

        buildChain = buildChain.then(async () => {
          if (ctxDisposed) return;
          let builtAny = false;
          for (let i = 0; i <= targetIdx && i < SECTION_BUILDERS.length && !ctxDisposed; i += 1) {
            if (await finishSectionStepsAsync(i, { fast: false })) {
              builtAny = true;
            }
          }
          if (ctxDisposed) return;
          if (builtAny || pendingDeferredRefresh) {
            pendingDeferredRefresh = false;
            scheduleRefresh();
          }
          if (builtAny || refreshTask.hasPending()) {
            flushRefresh();
          }
        });
        return buildChain;
      };

      window.__ensureSectionsBuiltAsync = ensureSectionsForTargetAsync;
      window.__dxScrollToTarget = scrollToTarget;
      ctxCleanups.push(() => {
        if (window.__ensureSectionsBuiltAsync === ensureSectionsForTargetAsync) {
          window.__ensureSectionsBuiltAsync = undefined;
        }
        if (window.__dxScrollToTarget === scrollToTarget) {
          window.__dxScrollToTarget = undefined;
        }
      });

      const enqueueSectionAsync = (idx, { deferRefresh = false } = {}) => {
        if (ctxDisposed) return buildChain;
        buildChain = buildChain.then(async () => {
          if (ctxDisposed) return;
          const epochBefore = stRefreshEpoch;
          let builtAny = false;
          for (let i = 0; i <= idx && i < SECTION_BUILDERS.length && !ctxDisposed; i += 1) {
            if (await finishSectionStepsAsync(i)) {
              builtAny = true;
            }
          }
          if (!builtAny || ctxDisposed) return;

          const allBuilt = SECTION_BUILDERS.every((item) => item.completed);
          const userScrolled = (window.scrollY || window.pageYOffset || 0) > 10;
          if (deferRefresh && !allBuilt && !userScrolled) {
            pendingDeferredRefresh = true;
          } else {
            pendingDeferredRefresh = false;
            scheduleLazyRefresh(epochBefore);
          }
        });
        return buildChain;
      };

      const enqueueUpToTargetAsync = (targetIdx) => {
        if (ctxDisposed || targetIdx < 0) return buildChain;
        buildChain = buildChain.then(async () => {
          const epochBefore = stRefreshEpoch;
          let builtAny = false;
          for (let i = 0; i <= targetIdx && i < SECTION_BUILDERS.length && !ctxDisposed; i += 1) {
            if (await finishSectionStepsAsync(i)) {
              builtAny = true;
            }
          }
          if ((builtAny || pendingDeferredRefresh) && !ctxDisposed) {
            pendingDeferredRefresh = false;
            scheduleLazyRefresh(epochBefore);
          }
        });
        return buildChain;
      };

      const onHashChange = () => {
        const hash = window.location.hash;
        if (hash && hash.length > 1) {
          ensureSectionsForTargetAsync(hash);
        }
      };
      window.addEventListener('hashchange', onHashChange);
      ctxCleanups.push(() => window.removeEventListener('hashchange', onHashChange));

      const armSectionObserver = () => {
        if (ctxDisposed || sectionIo || !('IntersectionObserver' in window)) return;
        const elToIndex = new Map();
        SECTION_BUILDERS.forEach((entry, idx) => {
          if (!entry.el || entry.completed) return;
          let observeEl = entry.el;
          if (entry.name === 'footer') {
            const pos = window.getComputedStyle(entry.el).position;
            if (pos === 'sticky' || pos === 'fixed') {
              observeEl = SECTION_BUILDERS[3]?.el || entry.el;
            }
          }
          elToIndex.set(observeEl, idx);
        });
        if (elToIndex.size === 0) return;

        sectionIo = new IntersectionObserver(
          (entries) => {
            if (ctxDisposed) return;
            let maxIdx = -1;
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const idx = elToIndex.get(entry.target);
              if (typeof idx === 'number' && !SECTION_BUILDERS[idx].completed) {
                sectionIo.unobserve(entry.target);
                if (idx > maxIdx) maxIdx = idx;
              }
            });
            if (maxIdx >= 0) {
              enqueueUpToTargetAsync(maxIdx);
            }
          },
          { rootMargin: '100% 0px' }
        );
        elToIndex.forEach((_, el) => sectionIo.observe(el));
      };

      let belowFoldArmed = false;
      let detachScrollIntent = null;
      const armBelowFoldWork = ({ immediateObserver = false } = {}) => {
        if (belowFoldArmed || ctxDisposed) return;
        belowFoldArmed = true;

        if (hasSpacingFilterDemand()) {
          hydrateSectionAsync('spacingFilter');
        }

        const initialHash = window.location.hash;
        if (initialHash && initialHash.length > 1) {
          armSectionObserver();
          const hashTargetIdx = resolveTargetSectionIndex(
            initialHash,
            (sel) => document.querySelector(sel)
          );
          if (hashTargetIdx >= 0) {
            enqueueUpToTargetAsync(hashTargetIdx);
            return;
          }
        }

        const alreadyScrolled = (window.scrollY || window.pageYOffset || 0) > 10;
        if (immediateObserver || alreadyScrolled) {
          armSectionObserver();
        } else {
          const onScrollIntent = () => {
            if (detachScrollIntent) {
              detachScrollIntent();
              detachScrollIntent = null;
            }
            if (!ctxDisposed) armSectionObserver();
          };
          const onKeyIntent = (ev) => {
            if (
              ev.key === 'ArrowDown' ||
              ev.key === 'PageDown' ||
              ev.key === 'End' ||
              ev.key === ' '
            ) {
              onScrollIntent();
            }
          };
          window.addEventListener('wheel', onScrollIntent, { passive: true, once: true });
          window.addEventListener('touchstart', onScrollIntent, { passive: true, once: true });
          window.addEventListener('scroll', onScrollIntent, { passive: true, once: true });
          window.addEventListener('keydown', onKeyIntent);
          detachScrollIntent = () => {
            window.removeEventListener('wheel', onScrollIntent);
            window.removeEventListener('touchstart', onScrollIntent);
            window.removeEventListener('scroll', onScrollIntent);
            window.removeEventListener('keydown', onKeyIntent);
          };
        }
      };

      const onEarlyScroll = () => {
        if ((window.scrollY || window.pageYOffset || 0) > 20) {
          window.removeEventListener('scroll', onEarlyScroll);
          armBelowFoldWork({ immediateObserver: true });
        }
      };

      const startPostFirstPaint = () => {
        if (ctxDisposed) return;
        postRevealRafId = window.requestAnimationFrame(async () => {
          postRevealRafId = 0;
          if (ctxDisposed) return;

          startGrain();
          /* R6-C */
          await yieldPhoneMacrotask();
          if (ctxDisposed) return;
          /* /R6-C */
          initTopScrollTriggers();
          /* R6-C */
          await yieldPhoneMacrotask();
          if (ctxDisposed) return;
          /* /R6-C */

          if (isLoaderDone() || (window.location.hash && window.location.hash.length > 1)) {
            armBelowFoldWork();
          } else {
            const onDoneForSections = () => {
              window.removeEventListener('loader:done', onDoneForSections);
              window.removeEventListener('scroll', onEarlyScroll);
              armBelowFoldWork();
            };
            window.addEventListener('loader:done', onDoneForSections, { once: true });
            window.addEventListener('scroll', onEarlyScroll, { passive: true });
            ctxCleanups.push(() => {
              window.removeEventListener('loader:done', onDoneForSections);
              window.removeEventListener('scroll', onEarlyScroll);
            });
          }
        });
      };

      if (isLoaderDone()) {
        startPostFirstPaint();
      } else {
        revealPromise.then(startPostFirstPaint);
      }

      ctxCleanups.push(() => {
        if (detachScrollIntent) {
          detachScrollIntent();
          detachScrollIntent = null;
        }
        if (sectionIo) sectionIo.disconnect();
      });

      // Refresh fit & triggers on resize (150ms debounce), font settle, & spacing overrides
      let lastVw = window.innerWidth;
      let lastVh = window.innerHeight;
      let resizeTimer = null;
      const onResize = () => {
        if (resizeTimer) window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          if (ctxDisposed) return;
          const nextVw = window.innerWidth;
          const nextVh = window.innerHeight;
          if (nextVw === lastVw && nextVh === lastVh) return;
          lastVw = nextVw;
          lastVh = nextVh;
          layoutVersion += 1;
          responsiveTimelines.forEach((tl) => {
            if (tl && typeof tl.invalidate === 'function') tl.invalidate();
          });
          scheduleRefresh();
        }, 150);
      };
      window.addEventListener('resize', onResize);

      let spacingRaf = 0;
      const onSpacingChange = () => {
        if (spacingRaf) window.cancelAnimationFrame(spacingRaf);
        spacingRaf = window.requestAnimationFrame(() => {
          spacingRaf = 0;
          if (ctxDisposed) return;
          layoutVersion += 1;
          responsiveTimelines.forEach((tl) => {
            if (tl && typeof tl.invalidate === 'function') tl.invalidate();
          });
          scheduleRefresh();
        });
      };
      window.addEventListener('dx:spacing-change', onSpacingChange);

      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          if (!ctxDisposed && builtCount > 0) {
            layoutVersion += 1;
            scheduleRefresh();
          }
        });
      }

      ctxCleanups.push(() => {
        window.removeEventListener('resize', onResize);
        window.removeEventListener('dx:spacing-change', onSpacingChange);
        if (resizeTimer) window.clearTimeout(resizeTimer);
        if (spacingRaf) window.cancelAnimationFrame(spacingRaf);
      });

      return () => {
        ctxCleanups.forEach((fn) => fn());
      };
    }
  );

  return () => {
    mm.revert();
    cleanups.forEach((fn) => fn());
  };
}
