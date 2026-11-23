import {
  SERVICES_DECK_DURATION,
  SERVICES_DECK_STEPS,
  SERVICES_MOBILE_TILTS,
  computeCardStartYPx,
  computeServicesFitScale,
} from '../../utils/servicesDeck.js';
import { createScopedTextRevealSteps, runChunkedSectionInit } from './shared.js';

export function createServicesFit({ ScrollTrigger, landscapeTouchQuery, getLayoutKey }) {
  let lastServicesFitKey = '';
  return (shouldRefresh = false, force = false) => {
    const svcEl = document.querySelector('#drops');
    const headEl = svcEl?.querySelector('.svc-head');
    if (!svcEl || !headEl) return;

    const key = getLayoutKey();
    if (!force && lastServicesFitKey === key) return;
    lastServicesFitKey = key;

    const isDesktopFit = window.innerWidth >= 992 && !landscapeTouchQuery.matches;
    if (!isDesktopFit) {
      if (svcEl.dataset.fit) {
        delete svcEl.dataset.fit;
        svcEl.style.removeProperty('--fit');
      }
      if (shouldRefresh) ScrollTrigger.refresh();
      return;
    }

    const prevFit = Number(svcEl.dataset.fit) || 1;
    const csSvc = getComputedStyle(svcEl);
    const pt = parseFloat(csSvc.paddingTop) || 0;
    const pb = parseFloat(csSvc.paddingBottom) || 0;
    const emPx = parseFloat(csSvc.fontSize) || 16;
    const available = Math.max(1, window.innerHeight - pt - pb);
    const headHeight = Math.ceil(headEl.getBoundingClientRect().height);
    const nextFit = computeServicesFitScale(available, headHeight, emPx, prevFit);

    if (String(nextFit) !== svcEl.dataset.fit) {
      svcEl.dataset.fit = String(nextFit);
      svcEl.style.setProperty('--fit', String(nextFit));
    }
    if (shouldRefresh) ScrollTrigger.refresh();
  };
}

export function createServicesSteps(env) {
  const {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    isDesktop,
    isMobile,
    ctxCleanups,
    registerResponsiveTimeline,
    getLayoutKey,
    fitServices,
  } = env;

  const dropsSection = document.querySelector('#drops');
  if (!dropsSection) return [];
  const dropsStageEl = dropsSection.querySelector('.svc-stage');
  const caseSlides = Array.from(dropsSection.querySelectorAll('.svc-card'));
  const revealEyebrow = dropsSection.querySelector('[data-scroll-reveal="eyebrow"]');
  const revealHeading = dropsSection.querySelector('[data-scroll-reveal="heading"]');
  const revealBody = dropsSection.querySelector('[data-scroll-reveal="body"]');

  const cachedCardStarts = new Map();
  let lastCardStartsKey = '';
  const recomputeCardStarts = (force = false) => {
    const key = getLayoutKey();
    if (!force && lastCardStartsKey === key) return;
    lastCardStartsKey = key;
    const secRect = dropsSection.getBoundingClientRect();
    const slideMetrics = caseSlides.map((slide) => ({
      slide,
      cardRect: slide.getBoundingClientRect(),
      currentY: Number(gsap.getProperty(slide, 'y')) || 0,
    }));
    slideMetrics.forEach(({ slide, cardRect, currentY }) => {
      const restCenterY = cardRect.top - currentY + cardRect.height / 2;
      cachedCardStarts.set(
        slide,
        computeCardStartYPx(secRect.bottom, restCenterY, cardRect.height)
      );
    });
  };
  const getCardStartY = (slide) => cachedCardStarts.get(slide) ?? 800;

  let splitBodyLines = null;

  const scopedRevealSteps = createScopedTextRevealSteps(dropsSection, {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
  });

  return [
    () => {
      fitServices(false);
      recomputeCardStarts(true);
      const onCardsRefreshInit = () => recomputeCardStarts(false);
      ScrollTrigger.addEventListener('refreshInit', onCardsRefreshInit);
      ctxCleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', onCardsRefreshInit));
    },
    ...scopedRevealSteps,
    // Yielded SplitText step for services body description (1 SplitText element per task)
    () => {
      if (revealBody) {
        splitBodyLines = SplitText
          ? new SplitText(revealBody, {
              type: 'lines',
              mask: 'lines',
              linesClass: 'line',
              aria: 'none',
            }).lines
          : [revealBody];
        if (revealBody.tagName === 'P' || revealBody.tagName === 'BLOCKQUOTE') {
          revealBody.removeAttribute('aria-label');
        }
      }
    },
    () => {
      dropsSection.dataset.pinBuilt = 'true';
      ctxCleanups.push(() => {
        delete dropsSection.dataset.pinBuilt;
      });

      const dropsIntroTl = gsap.timeline({
        scrollTrigger: {
          trigger: dropsSection,
          start: 'top 75%',
          toggleActions: 'play none none none',
          once: true,
        },
      });
      registerResponsiveTimeline(dropsIntroTl);

      if (revealEyebrow) {
        dropsIntroTl.fromTo(
          revealEyebrow,
          { scale: 0, rotation: -12, opacity: 0 },
          { scale: 1, rotation: -3, opacity: 1, duration: 0.6, ease: 'back.out(2.2)' },
          0
        );
      }

      if (revealHeading) {
        const h2LineInners = Array.from(revealHeading.querySelectorAll('.h2-line-inner'));
        if (h2LineInners.length > 0) {
          dropsIntroTl.fromTo(
            h2LineInners,
            { yPercent: 105 },
            { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.12 },
            0.1
          );
        }
      }

      if (splitBodyLines && splitBodyLines.length > 0) {
        dropsIntroTl.fromTo(
          splitBodyLines,
          { yPercent: 100, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.07 },
          0.3
        );
      }

      if (isDesktop && caseSlides.length > 0) {
        dropsIntroTl.fromTo(
          caseSlides[0],
          { y: () => getCardStartY(caseSlides[0]), opacity: 1 },
          { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out' },
          0.3
        );
      }

      if (isDesktop && caseSlides.length > 1) {
        const dropsDeckTl = gsap.timeline({
          scrollTrigger: {
            trigger: dropsSection,
            start: 'top top',
            end: () => `+=${window.innerHeight * 0.75 * SERVICES_DECK_DURATION}`,
            pin: true,
            scrub: 0.5,
            anticipatePin: 1,
          },
        });
        registerResponsiveTimeline(dropsDeckTl);

        SERVICES_DECK_STEPS.forEach((step) => {
          const slide = caseSlides[step.index];
          if (!slide) return;
          dropsDeckTl
            .fromTo(
              slide,
              {
                y: () => getCardStartY(slide),
                rotation: 0,
              },
              {
                y: 0,
                rotation: step.peakRotation,
                duration: 0.55,
                ease: 'power3.out',
              },
              step.startAt
            )
            .to(
              slide,
              {
                rotation: step.restRotation,
                duration: 0.35,
                ease: 'power2.inOut',
              },
              step.startAt + 0.55
            );
        });

        dropsDeckTl.to(
          caseSlides,
          {
            rotation: 0,
            duration: 0.8,
            ease: 'power3.inOut',
          },
          4.0
        );

        if (dropsStageEl) {
          dropsDeckTl.to(
            dropsStageEl,
            {
              scale: 1.03,
              duration: 0.4,
              ease: 'power2.inOut',
              yoyo: true,
              repeat: 1,
            },
            4.0
          );
        }

        dropsDeckTl.set({}, {}, SERVICES_DECK_DURATION);
      } else if (isMobile && caseSlides.length > 0) {
        caseSlides.forEach((slide, idx) => {
          const tilt = SERVICES_MOBILE_TILTS[idx] ?? { enter: 6, rest: 3 };
          gsap.fromTo(
            slide,
            { y: 80, rotation: tilt.enter, opacity: 0 },
            {
              y: 0,
              rotation: tilt.rest,
              opacity: 1,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: slide,
                start: 'top 85%',
                once: true,
              },
            }
          );
        });
      }
    },
  ];
}

export function initServices(env, runnerOpts) {
  return runChunkedSectionInit('services', createServicesSteps(env), runnerOpts);
}
