import { scrollToTarget } from '../engine/scrollExperience.js';

export function initNavBoot() {
  const cleanups = [];

  document.querySelectorAll('.site-nav a[href^="#"]').forEach((link) => {
    const onClick = (e) => {
      const target = link.getAttribute('href');
      if (target && target.startsWith('#')) {
        e.preventDefault();
        scrollToTarget(target, 1.6);
      }
    };
    link.addEventListener('click', onClick);
    cleanups.push(() => link.removeEventListener('click', onClick));
  });

  const navTicketBtn = document.querySelector('.site-nav .ticket-btn');
  if (navTicketBtn) {
    const onClick = () => scrollToTarget('#contact', 1.6);
    navTicketBtn.addEventListener('click', onClick);
    cleanups.push(() => navTicketBtn.removeEventListener('click', onClick));
  }

  if (window.__pendingCtaClick) {
    window.__pendingCtaClick = false;
    scrollToTarget('#contact', 1.6);
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
