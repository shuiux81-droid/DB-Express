import { TESTIMONIALS } from '../data.js';
import { formatCardCounter } from '../utils/typewriterBeats.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

export async function initTestimonials() {
  await waitForSectionCss();
  const readersEl = document.querySelector('#readers');
  const trackEl = readersEl?.querySelector('.readers-track');
  const counterEl = readersEl?.querySelector('.readers-counter');
  if (!readersEl || !trackEl) return () => {};
  if (readersEl.dataset.hydrated === 'true') return () => {};

  if (counterEl) {
    counterEl.textContent = formatCardCounter(1, TESTIMONIALS.length);
  }

  if (!trackEl.querySelector('.reader-card')) {
    const frag = document.createDocumentFragment();
    TESTIMONIALS.forEach((card) => {
      const article = document.createElement('article');
      article.className = 'reader-card';
      article.setAttribute('lang', 'ar');
      article.dataset.rotation = String(card.rotation);
      article.style.marginTop = `${card.offsetRem}rem`;
      article.style.transform = `rotate(${card.rotation}deg)`;

      // Top meta
      const topWrap = document.createElement('div');
      const metaTop = document.createElement('div');
      metaTop.className = 'card-meta-top';

      const noSpan = document.createElement('span');
      noSpan.className = 'mono-small';
      noSpan.textContent = card.no;

      const sinceSpan = document.createElement('span');
      sinceSpan.className = 'mono-small card-since';
      sinceSpan.textContent = card.since;

      metaTop.append(noSpan, sinceSpan);

      const topRule = document.createElement('div');
      topRule.className = 'card-dotted-rule';
      topRule.style.marginTop = '0.8rem';

      topWrap.append(metaTop, topRule);

      // Quote
      const quote = document.createElement('blockquote');
      quote.className = 'card-quote';
      quote.textContent = card.quote;

      // Bottom meta
      const bottomWrap = document.createElement('div');
      const bottomRule = document.createElement('div');
      bottomRule.className = 'card-dotted-rule';
      bottomRule.style.marginBottom = '0.9rem';

      const metaBottom = document.createElement('div');
      metaBottom.className = 'card-meta-bottom';

      const authorWrap = document.createElement('div');
      const authorName = document.createElement('p');
      authorName.className = 'card-author-name';
      authorName.textContent = card.name;

      const authorRole = document.createElement('p');
      authorRole.className = 'card-author-role';
      authorRole.textContent = card.role;

      authorWrap.append(authorName, authorRole);

      const dueWrap = document.createElement('div');
      dueWrap.className = 'card-due';

      const dueLabel = document.createElement('p');
      dueLabel.className = 'mono-small card-due-label';
      dueLabel.textContent = 'تاريخ الإطلاق';

      const dueVal = document.createElement('p');
      dueVal.className = 'due-date-value';
      dueVal.textContent = card.due;

      dueWrap.append(dueLabel, dueVal);
      metaBottom.append(authorWrap, dueWrap);
      bottomWrap.append(bottomRule, metaBottom);

      article.append(topWrap, quote, bottomWrap);
      frag.appendChild(article);
    });
    trackEl.appendChild(frag);
  }

  readersEl.dataset.hydrated = 'true';

  return () => {};
}
