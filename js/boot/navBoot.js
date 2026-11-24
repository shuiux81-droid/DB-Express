const scrollToTargetAsync = (target, duration = 1.6) =>
  import('../engine/scrollExperience.js').then((m) => m.scrollToTarget(target, duration));

export function initNavBoot() {
  const cleanups = [];

  document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
    const onClick = (e) => {
      const target = link.getAttribute('href');
      if (target && target.startsWith('#')) {
        e.preventDefault();
        scrollToTargetAsync(target, 1.6);
      }
    };
    link.addEventListener('click', onClick);
    cleanups.push(() => link.removeEventListener('click', onClick));
  });

  const navTicketBtn = document.querySelector('.site-nav .ticket-btn');
  if (navTicketBtn) {
    const onClick = () => scrollToTargetAsync('#contact', 1.6);
    navTicketBtn.addEventListener('click', onClick);
    cleanups.push(() => navTicketBtn.removeEventListener('click', onClick));
  }

  if (window.__pendingCtaClick) {
    window.__pendingCtaClick = false;
    scrollToTargetAsync('#contact', 1.6);
  }

  const siteNavEl = document.querySelector('.site-nav');
  const gsap = window.gsap;
  if (
    siteNavEl &&
    gsap &&
    !window.__dxNavRevealArmed &&
    !window.__loaderDone &&
    !document.documentElement.classList.contains('loader-revealing')
  ) {
    window.__dxNavRevealArmed = true;
    gsap.set(siteNavEl, { y: -18, opacity: 0 });
    let navCancelled = false;
    cleanups.push(() => {
      navCancelled = true;
    });
    const revealPromise = window.__loaderReveal ?? Promise.resolve();
    revealPromise.then(() => {
      if (navCancelled) return;
      gsap.to(siteNavEl, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: 'expo.out',
        clearProps: 'transform,opacity',
      });
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
