import { FOOTER_COLUMNS, FOOTER_WORDMARK_CHUNKS } from '../data.js';
import { scrollToTarget } from '../engine/scrollExperience.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

export async function initFooter() {
  await waitForSectionCss();
  const footerEl = document.querySelector('#footer');
  if (!footerEl) return () => {};
  if (footerEl.dataset.hydrated === 'true') return () => {};

  const cleanups = [];
  const colsEl = footerEl.querySelector('.footer-cols');
  if (colsEl && colsEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    FOOTER_COLUMNS.forEach((col) => {
      const colDiv = document.createElement('div');
      colDiv.className = 'footer-col';

      const h3 = document.createElement('h3');
      h3.className = 'footer-col-heading';
      h3.textContent = col.heading;

      const ul = document.createElement('ul');
      ul.className = 'footer-col-list';

      col.links.forEach((item) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.target;
        a.className = 'footer-link link-underline';
        a.textContent = item.label;
        if (item.target.startsWith('#')) {
          const onClick = (e) => {
            e.preventDefault();
            scrollToTarget(item.target, 1.6);
          };
          a.addEventListener('click', onClick);
          cleanups.push(() => a.removeEventListener('click', onClick));
        }
        li.appendChild(a);
        ul.appendChild(li);
      });

      colDiv.append(h3, ul);
      frag.appendChild(colDiv);
    });
    colsEl.appendChild(frag);
  }

  const wordmarkEl = footerEl.querySelector('.footer-wordmark');
  if (wordmarkEl && wordmarkEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    FOOTER_WORDMARK_CHUNKS.forEach((chunk) => {
      const span = document.createElement('span');
      span.className = chunk.spaceAfter ? 'ch ch-space-after' : 'ch';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = chunk.text;
      frag.appendChild(span);
    });
    wordmarkEl.appendChild(frag);
  }

  const topBtn = footerEl.querySelector('.top-btn');
  if (topBtn) {
    const onTopClick = () => scrollToTarget(0, 2.2);
    topBtn.addEventListener('click', onTopClick);
    cleanups.push(() => topBtn.removeEventListener('click', onTopClick));
  }

  if (colsEl) colsEl.dataset.hydrated = 'true';
  if (wordmarkEl) wordmarkEl.dataset.hydrated = 'true';
  footerEl.dataset.hydrated = 'true';

  return () => cleanups.forEach((fn) => fn());
}
