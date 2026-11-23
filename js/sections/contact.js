import { CONTACT_DETAILS } from '../data.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

export async function initContact() {
  await waitForSectionCss();
  const contactEl = document.querySelector('#contact');
  if (!contactEl) return () => {};
  if (contactEl.dataset.hydrated === 'true') return () => {};

  const detailsListEl = contactEl.querySelector('.contact-details');
  if (detailsListEl && detailsListEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    CONTACT_DETAILS.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'contact-detail-row';

      const dt = document.createElement('dt');
      dt.className = 'eyebrow-index contact-detail-label';
      dt.textContent = item.label;

      const dd = document.createElement('dd');
      if (item.href.startsWith('mailto:')) {
        const a = document.createElement('a');
        a.href = item.href;
        a.className = 'contact-detail-value link-underline';
        a.textContent = item.value;
        dd.appendChild(a);
      } else {
        const span = document.createElement('span');
        span.className = 'contact-detail-value';
        span.textContent = item.value;
        dd.appendChild(span);
      }

      row.append(dt, dd);
      frag.appendChild(row);
    });
    detailsListEl.appendChild(frag);
  }

  const punchHolesEl = contactEl.querySelector('.punch-holes');
  if (punchHolesEl && punchHolesEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 12; i += 1) {
      const hole = document.createElement('span');
      hole.className = 'punch-hole';
      frag.appendChild(hole);
    }
    punchHolesEl.appendChild(frag);
  }

  if (detailsListEl) detailsListEl.dataset.hydrated = 'true';
  contactEl.dataset.hydrated = 'true';

  return () => {};
}
