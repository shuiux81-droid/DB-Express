import { FEATURED_PROJECTS } from '../data.js';
import { SERVICES_V2_THEMES } from '../utils/servicesDeck.js';
import { scrollToTarget } from '../engine/scrollExperience.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

export async function initServices() {
  await waitForSectionCss();
  const dropsEl = document.querySelector('#drops');
  const stageEl = dropsEl?.querySelector('.svc-stage');
  const backdropEl = document.querySelector('.case-modal-backdrop');
  if (!dropsEl || !stageEl) return () => {};
  if (dropsEl.dataset.hydrated === 'true') return () => {};

  const failedImages = {};
  let activeProject = null;
  let lastTriggerBtn = null;

  const modalCloseBtn = backdropEl?.querySelector('.case-modal-close') || null;
  const modalMediaEl = backdropEl?.querySelector('.case-modal-media') || null;
  const modalMetaClientEl = backdropEl?.querySelector('[data-modal="client"]') || null;
  const modalMetaYearEl = backdropEl?.querySelector('[data-modal="year"]') || null;
  const modalTitleEl = backdropEl?.querySelector('#case-modal-title') || null;
  const modalMetricEl = backdropEl?.querySelector('.case-modal-metric') || null;
  const modalSummaryEl = backdropEl?.querySelector('.case-modal-summary') || null;
  const modalCtaBtn = backdropEl?.querySelector('.case-modal-cta') || null;

  const totalStr = String(FEATURED_PROJECTS.length).padStart(2, '0');

  const createFallbackEl = (clientText) => {
    const fb = document.createElement('div');
    fb.className = 'case-fallback';
    fb.setAttribute('aria-hidden', 'true');
    if (clientText) {
      const span = document.createElement('span');
      span.className = 'case-fallback-client';
      span.textContent = clientText;
      fb.appendChild(span);
    }
    return fb;
  };

  const renderModalMedia = (project) => {
    if (!modalMediaEl) return;
    modalMediaEl.innerHTML = '';
    if (!failedImages[project.id]) {
      const img = document.createElement('img');
      img.src = project.image;
      if (project.image640) {
        img.srcset = `${project.image640} 640w, ${project.image} 1024w`;
        img.sizes = '(max-width: 600px) 92vw, 720px';
      }
      img.alt = project.imageAlt;
      img.width = 1024;
      img.height = 572;
      img.decoding = 'async';
      img.className = 'case-modal-img';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        failedImages[project.id] = true;
        if (activeProject && activeProject.id === project.id) {
          renderModalMedia(project);
        }
      });
      modalMediaEl.appendChild(img);
    } else {
      modalMediaEl.appendChild(createFallbackEl(''));
    }
    const tag = document.createElement('span');
    tag.className = 'case-tag';
    tag.textContent = project.category;
    modalMediaEl.appendChild(tag);
  };

  const openModal = (project, triggerBtn) => {
    if (!backdropEl) return;
    activeProject = project;
    lastTriggerBtn = triggerBtn;

    renderModalMedia(project);
    if (modalMetaClientEl) modalMetaClientEl.textContent = project.client;
    if (modalMetaYearEl) modalMetaYearEl.textContent = project.year;
    if (modalTitleEl) modalTitleEl.textContent = project.title;
    if (modalMetricEl) modalMetricEl.textContent = project.metric;
    if (modalSummaryEl) modalSummaryEl.textContent = project.summary;

    backdropEl.hidden = false;
    if (modalCloseBtn) modalCloseBtn.focus();
  };

  const closeModal = (restoreFocus = true) => {
    if (!backdropEl || !activeProject) return;
    activeProject = null;
    backdropEl.hidden = true;
    if (restoreFocus && lastTriggerBtn) {
      lastTriggerBtn.focus();
    }
  };

  // Render the 5 service cards into .svc-stage before ScrollTrigger runs
  if (stageEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    FEATURED_PROJECTS.forEach((project, idx) => {
      const theme = SERVICES_V2_THEMES[idx] ?? 'red';
      const indexLabel = `${String(idx + 1).padStart(2, '0')} / ${totalStr}`;

      const article = document.createElement('article');
      article.className = 'svc-card case-slide';
      article.dataset.slideIndex = String(idx);
      article.dataset.i = String(idx + 1);
      article.dataset.theme = theme;
      article.style.zIndex = String(idx + 1);

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'svc-card-btn case-frame';
      btn.setAttribute('aria-label', `${indexLabel} ${project.title} — ${project.category}`);
      btn.addEventListener('click', () => openModal(project, btn));

      const textWrap = document.createElement('div');
      textWrap.className = 'svc-card-text';

      const pill = document.createElement('span');
      pill.className = 'svc-card-pill';
      pill.setAttribute('dir', 'ltr');
      pill.setAttribute('aria-hidden', 'true');
      pill.textContent = indexLabel;

      const title = document.createElement('h3');
      title.className = 'svc-card-title';
      title.textContent = project.title;

      textWrap.append(pill, title);

      const media = document.createElement('div');
      media.className = 'svc-card-media case-media';

      const img = document.createElement('img');
      img.src = project.image;
      if (project.image640) {
        img.srcset = `${project.image640} 640w, ${project.image} 1024w`;
        img.sizes = '(max-width: 600px) 92vw, 50vw';
      }
      img.alt = project.imageAlt;
      img.width = 1024;
      img.height = 572;
      img.className = 'svc-card-img case-image';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        failedImages[project.id] = true;
        if (img.parentNode === media) {
          media.replaceChild(createFallbackEl(project.client), img);
        }
      });

      const gradient = document.createElement('div');
      gradient.className = 'case-gradient';
      gradient.setAttribute('aria-hidden', 'true');

      media.append(img, gradient);
      btn.append(textWrap, media);
      article.appendChild(btn);
      frag.appendChild(article);
    });
    stageEl.appendChild(frag);
  }

  const cleanups = [];

  if (backdropEl) {
    const onBackdropClick = (e) => {
      if (e.target === backdropEl) closeModal(true);
    };
    backdropEl.addEventListener('click', onBackdropClick);
    cleanups.push(() => backdropEl.removeEventListener('click', onBackdropClick));
  }

  if (modalCloseBtn) {
    const onCloseClick = () => closeModal(true);
    modalCloseBtn.addEventListener('click', onCloseClick);
    cleanups.push(() => modalCloseBtn.removeEventListener('click', onCloseClick));
  }

  if (modalCtaBtn) {
    const onCtaClick = () => {
      if (!activeProject) return;
      const msgEl = document.querySelector('#contact-msg');
      if (msgEl && !msgEl.value.trim()) {
        msgEl.value = `أرغب في الاستفسار عن خدمة: ${activeProject.serviceChip}.`;
        msgEl.dispatchEvent(new Event('input', { bubbles: true }));
      }
      closeModal(false);
      scrollToTarget('#contact', 1.6);
    };
    modalCtaBtn.addEventListener('click', onCtaClick);
    cleanups.push(() => modalCtaBtn.removeEventListener('click', onCtaClick));
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && activeProject) {
      closeModal(true);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  cleanups.push(() => window.removeEventListener('keydown', onKeyDown));

  stageEl.dataset.hydrated = 'true';
  dropsEl.dataset.hydrated = 'true';

  return () => cleanups.forEach((fn) => fn());
}
