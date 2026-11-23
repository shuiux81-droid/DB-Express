import { TESTIMONIALS } from '../../data.js';
import { formatCardCounter } from '../../utils/typewriterBeats.js';
import { createScopedTextRevealSteps, runChunkedSectionInit } from './shared.js';

export function createTestimonialsSteps(env) {
  const {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    isDesktop,
    isMobile,
    docEl,
    ctxCleanups,
    registerResponsiveTimeline,
    getLayoutKey,
  } = env;

  const readersSection = document.querySelector('#readers');
  if (!readersSection) return [];
  const readersTrack = document.querySelector('.readers-track');
  const giantWord = document.querySelector('.readers-bg-word');
  const progressCounter = document.querySelector('.readers-counter');
  const progressFill = document.querySelector('.readers-progress-fill');
  const cardEls = Array.from(document.querySelectorAll('.reader-card'));
  const readersPinTarget =
    readersSection.closest('.readers-contact-pin') || readersSection;

  let cachedScrollDist = 0;
  let cachedHalfVw = (window.innerWidth || 1440) / 2;
  let cachedCardCenters = [];
  let lastCounterIdx = 1;
  let trackTween = null;
  let lastReadersKey = '';

  const measureReaders = () => {
    if (!readersTrack) return;
    const key = getLayoutKey();
    if (lastReadersKey === key) return;
    lastReadersKey = key;
    const vw = window.innerWidth || 1440;
    const remPx = parseFloat(getComputedStyle(docEl).fontSize) || 16;
    cachedHalfVw = vw / 2;
    cachedScrollDist = Math.max(0, readersTrack.scrollWidth - vw + remPx * 3.8);
    const trackOffsetLeft = readersTrack.offsetLeft || 0;
    cachedCardCenters = cardEls.map(
      (c) => trackOffsetLeft + c.offsetLeft + c.offsetWidth / 2
    );
  };
  const getScrollDistance = () => cachedScrollDist;

  const buildDesktopCard = (card) => {
    const baseRot = Number(card.dataset.rotation || '0');
    const quoteEl = card.querySelector('.card-quote');
    let words = null;
    if (quoteEl) {
      words = SplitText
        ? new SplitText(quoteEl, { type: 'words', aria: 'none' }).words
        : [quoteEl];
      if (quoteEl.tagName === 'P' || quoteEl.tagName === 'BLOCKQUOTE') {
        quoteEl.removeAttribute('aria-label');
      }
    }

    gsap.set(card, { rotation: baseRot });

    gsap.fromTo(
      card,
      { rotation: baseRot },
      {
        rotation: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: card,
          containerAnimation: trackTween,
          start: 'left 85%',
          end: 'center 50%',
          scrub: true,
        },
      }
    );

    gsap.fromTo(
      card,
      { rotation: 0 },
      {
        rotation: baseRot,
        ease: 'none',
        immediateRender: false,
        scrollTrigger: {
          trigger: card,
          containerAnimation: trackTween,
          start: 'center 50%',
          end: 'right 15%',
          scrub: true,
        },
      }
    );

    if (words) {
      gsap.set(words, { opacity: 0 });
      ScrollTrigger.create({
        trigger: card,
        containerAnimation: trackTween,
        start: 'left 80%',
        once: true,
        onEnter: () => {
          gsap.to(words, {
            opacity: 1,
            duration: 0.01,
            ease: 'none',
            stagger: 0.045,
          });
        },
      });
    }
  };

  const buildMobileCard = (card) => {
    const baseRot = Number(card.dataset.rotation || '0') * 0.5;
    const quoteEl = card.querySelector('.card-quote');
    const words =
      quoteEl && SplitText
        ? new SplitText(quoteEl, { type: 'words', aria: 'none' }).words
        : [];
    if (quoteEl && (quoteEl.tagName === 'P' || quoteEl.tagName === 'BLOCKQUOTE')) {
      quoteEl.removeAttribute('aria-label');
    }

    gsap.fromTo(
      card,
      { y: 60, rotation: baseRot + 4, opacity: 0 },
      {
        y: 0,
        rotation: baseRot,
        opacity: 1,
        duration: 0.9,
        ease: 'expo.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true,
        },
      }
    );

    if (words.length > 0) gsap.set(words, { opacity: 0 });

    ScrollTrigger.create({
      trigger: card,
      start: 'top 65%',
      once: true,
      onEnter: () => {
        if (words.length > 0) {
          gsap.to(words, {
            opacity: 1,
            duration: 0.01,
            ease: 'none',
            stagger: 0.045,
          });
        }
      },
    });
  };

  const scopedRevealSteps = createScopedTextRevealSteps(readersSection, {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
  });

  return [
    ...scopedRevealSteps,
    () => {
      if ('IntersectionObserver' in window) {
        const readersIo = new IntersectionObserver(
          (entries) => {
            const isNear = entries.some((entry) => entry.isIntersecting);
            readersSection.classList.toggle('is-in-view', isNear);
          },
          { rootMargin: '100px 0px' }
        );
        readersIo.observe(readersSection);
        ctxCleanups.push(() => {
          readersIo.disconnect();
          readersSection.classList.remove('is-in-view');
        });
      } else {
        readersSection.classList.add('is-in-view');
      }

      if (readersTrack && isDesktop) {
        const readersIntroEl = readersSection.querySelector('.readers-intro');
        if (readersIntroEl) {
          gsap.fromTo(
            readersIntroEl,
            {
              transformPerspective: 1200,
              rotationY: 28,
              rotationZ: -4,
              xPercent: -14,
              yPercent: 16,
              scale: 0.9,
              opacity: 0,
            },
            {
              rotationY: 0,
              rotationZ: 0,
              xPercent: 0,
              yPercent: 0,
              scale: 1,
              opacity: 1,
              ease: 'power3.out',
              scrollTrigger: {
                trigger: readersSection,
                start: 'top 95%',
                end: 'top 20%',
                scrub: 0.5,
              },
            }
          );
        }
        measureReaders();
        ScrollTrigger.addEventListener('refreshInit', measureReaders);
        ctxCleanups.push(() =>
          ScrollTrigger.removeEventListener('refreshInit', measureReaders)
        );
      }
    },
    () => {
      if (readersTrack && isDesktop) {
        readersPinTarget.dataset.pinBuilt = 'true';
        ctxCleanups.push(() => {
          delete readersPinTarget.dataset.pinBuilt;
        });

        trackTween = gsap.to(readersTrack, {
          x: () => -getScrollDistance(),
          ease: 'none',
          onUpdate: () => {
            const progress = trackTween ? trackTween.progress() : 0;
            const trackX = -progress * cachedScrollDist;
            let closestIdx = 1;
            let minDist = Infinity;
            for (let i = 0; i < cachedCardCenters.length; i += 1) {
              const dist = Math.abs(cachedCardCenters[i] + trackX - cachedHalfVw);
              if (dist < minDist) {
                minDist = dist;
                closestIdx = i + 1;
              }
            }
            if (closestIdx !== lastCounterIdx && progressCounter) {
              lastCounterIdx = closestIdx;
              const formatted = formatCardCounter(closestIdx, TESTIMONIALS.length);
              if (ScrambleTextPlugin) {
                gsap.to(progressCounter, {
                  duration: 0.25,
                  overwrite: true,
                  scrambleText: { text: formatted, chars: '0123456/', speed: 0.8 },
                });
              } else {
                progressCounter.textContent = formatted;
              }
            }
          },
          scrollTrigger: {
            trigger: readersPinTarget,
            start: 'top top',
            end: () => `+=${getScrollDistance()}`,
            pin: true,
            scrub: 1,
            anticipatePin: 1,
          },
        });
        registerResponsiveTimeline(trackTween);

        if (giantWord) {
          const giantWordTween = gsap.to(giantWord, {
            x: '-30vw',
            ease: 'none',
            scrollTrigger: {
              trigger: readersPinTarget,
              start: 'top top',
              end: () => `+=${getScrollDistance()}`,
              scrub: 1,
            },
          });
          registerResponsiveTimeline(giantWordTween);
        }

        if (progressFill) {
          gsap.fromTo(
            progressFill,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: readersPinTarget,
                start: 'top top',
                end: () => `+=${getScrollDistance()}`,
                scrub: 1,
              },
            }
          );
        }
      }
    },
    // Step 4: 1 testimonial card + 1 SplitText per yielded task
    ...cardEls.map((card) => () => {
      if (readersTrack && isDesktop) buildDesktopCard(card);
      else if (isMobile) buildMobileCard(card);
    }),
  ];
}

export function initTestimonials(env, runnerOpts) {
  return runChunkedSectionInit('testimonials', createTestimonialsSteps(env), runnerOpts);
}
