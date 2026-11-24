export function initHeroScroll({
  gsap,
  ScrollTrigger,
  context,
  isDesktop,
  ctxCleanups,
  isDisposed,
  revealPromise,
}) {
  // Nav slide-down on loader:reveal
  const siteNavEl = document.querySelector('.site-nav');
  if (
    siteNavEl &&
    !window.__dxNavRevealArmed &&
    !window.__loaderDone &&
    !document.documentElement.classList.contains('loader-revealing')
  ) {
    window.__dxNavRevealArmed = true;
    gsap.set(siteNavEl, { y: -18, opacity: 0 });
    let navCancelled = false;
    ctxCleanups.push(() => {
      navCancelled = true;
    });
    revealPromise.then(() => {
      if (navCancelled || isDisposed()) return;
      gsap.to(siteNavEl, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'expo.out',
        clearProps: 'transform,opacity',
      });
    });
  }

  // Global 6.3: Film grain jitter (90ms, starts after reveal, paused when hidden)
  const grainEl = document.querySelector('.grain-overlay');
  let startGrain = () => {};
  if (grainEl) {
    let grainId = 0;
    let grainAllowed = false;
    const beginGrainLoop = () => {
      if (!grainAllowed || grainId || isDisposed() || document.hidden) return;
      grainId = window.setInterval(() => {
        const rx = Math.round(Math.random() * 220 - 110);
        const ry = Math.round(Math.random() * 220 - 110);
        grainEl.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }, 90);
    };
    startGrain = () => {
      grainAllowed = true;
      beginGrainLoop();
    };
    const stopGrain = () => {
      if (grainId) {
        window.clearInterval(grainId);
        grainId = 0;
      }
    };
    const onVisChange = () => {
      if (document.hidden) stopGrain();
      else beginGrainLoop();
    };
    document.addEventListener('visibilitychange', onVisChange);
    ctxCleanups.push(() => {
      stopGrain();
      document.removeEventListener('visibilitychange', onVisChange);
    });
  }

  // Top ScrollTriggers (created after loader reveal / first paint)
  let topTriggersBuilt = false;
  const initTopScrollTriggers = () => {
    if (topTriggersBuilt || isDisposed()) return;
    topTriggersBuilt = true;
    context.add(() => {
      const progressEl = document.querySelector('.scroll-progress');
      if (progressEl) {
        gsap.fromTo(
          progressEl,
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 0.2,
              refreshPriority: -1,
            },
          }
        );
      }

      // Toggle high-contrast dark foreground on fixed UI when light sections are in view
      const lightSections = [
        document.querySelector('.manifesto'),
        document.querySelector('#drops'),
        document.querySelector('#contact'),
      ].filter(Boolean);
      const lightUiTargets = [document.querySelector('.scroll-progress')].filter(Boolean);

      if (lightSections.length > 0 && lightUiTargets.length > 0) {
        const activeLightSet = new Set();
        const syncLightUi = () => {
          const isAnyLightActive = activeLightSet.size > 0;
          lightUiTargets.forEach((el) => el.classList.toggle('is-on-light', isAnyLightActive));
        };
        lightSections.forEach((sec) => {
          ScrollTrigger.create({
            trigger: sec,
            start: 'top 6%',
            end: 'bottom 6%',
            refreshPriority: -1,
            onEnter: () => {
              activeLightSet.add(sec);
              syncLightUi();
            },
            onLeave: () => {
              activeLightSet.delete(sec);
              syncLightUi();
            },
            onEnterBack: () => {
              activeLightSet.add(sec);
              syncLightUi();
            },
            onLeaveBack: () => {
              activeLightSet.delete(sec);
              syncLightUi();
            },
          });
        });
      }

      // 6.2: Hero exit (desktop)
      const heroEl = document.querySelector('.hero');
      const heroMediaEl =
        document.querySelector('.hero-media') || document.querySelector('.hero-video');

      if (isDesktop && heroEl && heroMediaEl) {
        const heroExitTl = gsap.timeline({
          scrollTrigger: {
            trigger: heroEl,
            start: 'top top',
            end: 'bottom top',
            scrub: true,
          },
        });
        heroExitTl.to(
          heroMediaEl,
          {
            y: '8vh',
            scale: 1.06,
            opacity: 0.25,
            ease: 'none',
            duration: 1,
          },
          0
        );
      }
    });
  };

  return { startGrain, initTopScrollTriggers };
}
