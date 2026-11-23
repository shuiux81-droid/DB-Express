import { NEWSLETTER_PLACEHOLDERS } from '../../data.js';
import { computeHalftoneDotSize } from '../../utils/typewriterBeats.js';
import { createScopedTextRevealSteps, runChunkedSectionInit } from './shared.js';

export function setupNewsletterForm() {
  const nlForm = document.querySelector('.newsletter-form');
  if (!nlForm) return () => {};
  const nlInput = nlForm.querySelector('.newsletter-input');
  const nlNote = nlForm.querySelector('.newsletter-note');

  const onSubmit = (e) => {
    e.preventDefault();
    if (!nlInput) return;
    const val = nlInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      nlInput.classList.add('is-invalid');
      nlInput.setAttribute('aria-invalid', 'true');
      if (nlNote) {
        nlNote.textContent = 'يرجى إدخال بريد إلكتروني صحيح.';
        nlNote.classList.add('is-error');
      }
      nlInput.focus();
      return;
    }
    nlInput.classList.remove('is-invalid');
    nlInput.setAttribute('aria-invalid', 'false');
    nlInput.value = '';
    if (nlNote) {
      nlNote.classList.remove('is-error');
      nlNote.textContent = `تم الاشتراك بنجاح: ${val}`;
    }
  };

  nlForm.addEventListener('submit', onSubmit);
  return () => nlForm.removeEventListener('submit', onSubmit);
}

export function createFooterSteps(env) {
  const {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    DrawSVGPlugin,
    isDesktop,
    finePointerQuery,
    ctxCleanups,
    isDisposed,
    ensureNewsletterFormWired,
  } = env;

  const mainEl = document.querySelector('main');
  const footerEl = document.querySelector('#footer');
  const footerInnerEl = document.querySelector('.footer-inner');
  const chEls = Array.from(document.querySelectorAll('.footer-wordmark .ch'));

  const scopedRevealSteps = footerEl
    ? createScopedTextRevealSteps(footerEl, {
        gsap,
        ScrollTrigger,
        SplitText,
        ScrambleTextPlugin,
      })
    : [];

  return [
    ...scopedRevealSteps,
    () => {
      ensureNewsletterFormWired();

      if (mainEl && footerEl && footerInnerEl) {
        if (isDesktop) {
          gsap.fromTo(
            footerInnerEl,
            { yPercent: -22 },
            {
              yPercent: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: mainEl,
                start: 'bottom bottom',
                end: () => `+=${Math.max(1, footerEl.offsetHeight)}`,
                scrub: true,
              },
            }
          );

          if (chEls.length > 0) {
            gsap.fromTo(
              chEls,
              {
                x: () => gsap.utils.random(-0.25 * window.innerWidth, 0.25 * window.innerWidth),
                y: () => gsap.utils.random(-0.55 * window.innerHeight, -0.18 * window.innerHeight),
                rotation: () => gsap.utils.random(-70, 70),
                scale: 0.4,
                opacity: 0,
              },
              {
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1,
                opacity: 1,
                ease: 'power3.out',
                stagger: { each: 0.06, from: 'random' },
                scrollTrigger: {
                  trigger: mainEl,
                  start: 'bottom bottom',
                  end: () => `+=${Math.max(1, footerEl.offsetHeight)}`,
                  scrub: true,
                },
              }
            );
          }
        } else if (chEls.length > 0) {
          gsap.fromTo(
            chEls,
            {
              x: () => gsap.utils.random(-80, 80),
              y: () => gsap.utils.random(-140, -40),
              rotation: () => gsap.utils.random(-50, 50),
              scale: 0.4,
              opacity: 0,
            },
            {
              x: 0,
              y: 0,
              rotation: 0,
              scale: 1,
              opacity: 1,
              ease: 'power3.out',
              stagger: { each: 0.05, from: 'random' },
              scrollTrigger: {
                trigger: footerEl,
                start: 'top 85%',
                end: 'top 35%',
                scrub: true,
              },
            }
          );
        }
      }

      const topRingCircle = document.querySelector('.top-btn-ring-progress');
      if (topRingCircle && DrawSVGPlugin) {
        gsap.fromTo(
          topRingCircle,
          { drawSVG: '0% 0%' },
          {
            drawSVG: '0% 100%',
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: true,
            },
          }
        );
      }
    },
    () => {
      if (!mainEl || !footerEl || !footerInnerEl) return;

      let halftoneNear = false;
      let setFooterActive = null;

      if (isDesktop && finePointerQuery.matches && chEls.length > 0) {
        let ptrX = -9999;
        let ptrY = -9999;
        let ptrDirty = false;
        let centers = [];
        let resizeDebounce = 0;
        const lastDots = new Array(chEls.length).fill(1.2);
        const qDots = chEls.map((ch) =>
          gsap.quickTo(ch, '--halftone-dot', { duration: 0.4, ease: 'power2.out' })
        );

        const measureCenters = () => {
          centers = chEls.map((ch) => {
            const r = ch.getBoundingClientRect();
            return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
          });
          ptrDirty = true;
        };

        const onFooterRefresh = () => {
          if (halftoneNear && !isDisposed()) measureCenters();
        };

        const onFooterResize = () => {
          if (resizeDebounce) window.clearTimeout(resizeDebounce);
          resizeDebounce = window.setTimeout(() => {
            resizeDebounce = 0;
            if (halftoneNear && !isDisposed()) measureCenters();
          }, 150);
        };

        const onMove = (e) => {
          ptrX = e.clientX;
          ptrY = e.clientY;
          ptrDirty = true;
        };
        const onLeave = () => {
          ptrX = -9999;
          ptrY = -9999;
          ptrDirty = true;
        };
        const halftoneTick = () => {
          if (!ptrDirty) return;
          ptrDirty = false;
          for (let i = 0; i < chEls.length; i += 1) {
            const c = centers[i];
            if (!c) continue;
            const d = Math.hypot(ptrX - c.cx, ptrY - c.cy);
            const nextDot = computeHalftoneDotSize(d);
            if (Math.abs(nextDot - lastDots[i]) >= 0.05) {
              lastDots[i] = nextDot;
              qDots[i](nextDot);
            }
          }
        };

        setFooterActive = (active) => {
          if (active === halftoneNear) return;
          halftoneNear = active;
          if (active) {
            measureCenters();
            window.addEventListener('mousemove', onMove);
            window.addEventListener('resize', onFooterResize);
            document.addEventListener('mouseleave', onLeave);
            gsap.ticker.add(halftoneTick);
          } else {
            if (resizeDebounce) {
              window.clearTimeout(resizeDebounce);
              resizeDebounce = 0;
            }
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('resize', onFooterResize);
            document.removeEventListener('mouseleave', onLeave);
            gsap.ticker.remove(halftoneTick);
          }
        };

        ScrollTrigger.addEventListener('refresh', onFooterRefresh);
        ctxCleanups.push(() => {
          setFooterActive?.(false);
          ScrollTrigger.removeEventListener('refresh', onFooterRefresh);
        });
      }

      const nlInput = document.querySelector('.newsletter-input');
      let phTl = null;
      if (nlInput) {
        let lastPh = nlInput.placeholder || '';
        const setPlaceholder = (val) => {
          if (val === lastPh) return;
          lastPh = val;
          nlInput.placeholder = val;
        };
        phTl = gsap.timeline({ repeat: -1, paused: true });
        NEWSLETTER_PLACEHOLDERS.forEach((phrase) => {
          const state = { len: 0 };
          phTl
            .to(state, {
              len: phrase.length,
              duration: phrase.length * 0.07,
              ease: 'none',
              onUpdate: () => {
                if (document.activeElement !== nlInput && !nlInput.value) {
                  setPlaceholder(phrase.slice(0, Math.round(state.len)));
                }
              },
            })
            .to({}, { duration: 1.6 })
            .to(state, {
              len: 0,
              duration: phrase.length * 0.04,
              ease: 'none',
              onUpdate: () => {
                if (document.activeElement !== nlInput && !nlInput.value) {
                  setPlaceholder(phrase.slice(0, Math.round(state.len)));
                }
              },
            });
        });

        const pausePh = () => phTl.pause();
        const resumePh = () => {
          if (!nlInput.value) phTl.resume();
        };
        nlInput.addEventListener('focus', pausePh);
        nlInput.addEventListener('blur', resumePh);
        nlInput.addEventListener('input', () => {
          if (nlInput.value) pausePh();
        });
        ctxCleanups.push(() => {
          phTl.kill();
          nlInput.removeEventListener('focus', pausePh);
          nlInput.removeEventListener('blur', resumePh);
        });
      }

      if ('IntersectionObserver' in window) {
        const footerActiveIo = new IntersectionObserver(
          (entries) => {
            const isNear = entries.some((entry) => entry.isIntersecting);
            footerEl.classList.toggle('is-in-view', isNear);
            setFooterActive?.(isNear);
            if (phTl) {
              if (isNear && document.activeElement !== nlInput && !nlInput?.value) {
                phTl.resume();
              } else {
                phTl.pause();
              }
            }
          },
          { rootMargin: '200px 0px' }
        );
        footerActiveIo.observe(footerEl);
        ctxCleanups.push(() => {
          footerActiveIo.disconnect();
          footerEl.classList.remove('is-in-view');
        });
      } else {
        footerEl.classList.add('is-in-view');
        setFooterActive?.(true);
        if (phTl && !nlInput?.value) phTl.resume();
      }
    },
  ];
}

export function initFooter(env, runnerOpts) {
  return runChunkedSectionInit('footer', createFooterSteps(env), runnerOpts);
}
