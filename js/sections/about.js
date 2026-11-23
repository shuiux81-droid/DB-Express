import { MANIFESTO_COPY } from '../data.js';
import {
  FORGE_ATOMS,
  FORGE_BURST_HEARTS,
  FORGE_NOTIF_CHIPS,
  FORGE_OUTLINE_RECTS,
  FORGE_SOCIAL_ICONS,
  FORGE_SPARK_PATH,
  FORGE_SPARK_VERTICES,
  formatSocialCounter,
} from '../utils/forgeFigure.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, String(value));
  }
  return el;
}

export async function initAbout() {
  await waitForSectionCss();
  const aboutEl = document.querySelector('#about');
  if (!aboutEl) return () => {};
  if (aboutEl.dataset.hydrated === 'true') return () => {};

  // Hydrate manifesto copy from data.js
  const headingEl = aboutEl.querySelector('#manifesto-card-heading');
  const beforeGhost = aboutEl.querySelector('[data-manifesto="before-ghost"]');
  const replGhost = aboutEl.querySelector('.m-repl-ghost');
  const afterGhost = aboutEl.querySelector('[data-manifesto="after-ghost"]');
  const beforeLive = aboutEl.querySelector('.m-before');
  const replLive = aboutEl.querySelector('.m-repl');
  const afterLive = aboutEl.querySelector('.m-after');
  const figureEl = aboutEl.querySelector('.manifesto-figure');
  const capAEl = aboutEl.querySelector('.figure-caption .cap-a');

  if (headingEl) headingEl.textContent = MANIFESTO_COPY.heading;
  if (beforeGhost) beforeGhost.textContent = MANIFESTO_COPY.before;
  if (replGhost) replGhost.textContent = MANIFESTO_COPY.replace;
  if (afterGhost) afterGhost.textContent = MANIFESTO_COPY.after;
  if (beforeLive) beforeLive.textContent = MANIFESTO_COPY.before;
  if (replLive) replLive.textContent = MANIFESTO_COPY.replace;
  if (afterLive) afterLive.textContent = MANIFESTO_COPY.after;
  if (figureEl) figureEl.setAttribute('aria-label', MANIFESTO_COPY.caption);
  if (capAEl) capAEl.textContent = MANIFESTO_COPY.caption;

  // 1. 8 decorative atoms around panel margin
  const stageEl = aboutEl.querySelector('.figure-stage');
  if (stageEl && !stageEl.querySelector('.atom')) {
    const atomFrag = document.createDocumentFragment();
    FORGE_ATOMS.forEach((atom) => {
      const span = document.createElement('span');
      span.className = `atom atom-${atom.shape} ${atom.outlined ? 'is-outlined' : 'is-filled'}`;
      span.dataset.speed = String(atom.speed);
      span.dataset.rotSign = String(atom.rotSign);
      span.setAttribute('aria-hidden', 'true');
      span.style.left = atom.left;
      span.style.top = atom.top;
      span.style.width = `${atom.sizeRem}rem`;
      span.style.height = `${atom.sizeRem}rem`;
      atomFrag.appendChild(span);
    });
    stageEl.insertBefore(atomFrag, stageEl.firstChild);
  }

  // 2. Wireframe 3x3 grid cards
  const wireGridEl = aboutEl.querySelector('.wire-grid');
  if (wireGridEl && wireGridEl.children.length === 0) {
    const frag = document.createDocumentFragment();
    for (let idx = 0; idx < 9; idx += 1) {
      const card = document.createElement('div');
      card.className = 'wire-card';
      card.dataset.wireCard = String(idx);
      const thumb = document.createElement('div');
      thumb.className = 'wire-thumb';
      const barLg = document.createElement('div');
      barLg.className = 'wire-bar wire-bar-lg';
      const barSm = document.createElement('div');
      barSm.className = 'wire-bar wire-bar-sm';
      card.append(thumb, barLg, barSm);
      frag.appendChild(card);
    }
    wireGridEl.appendChild(frag);
  }

  // 3. DrawSVG card outline SVG rects
  const wireOutlinesSvg = aboutEl.querySelector('.wire-outlines');
  if (wireOutlinesSvg && wireOutlinesSvg.children.length === 0) {
    FORGE_OUTLINE_RECTS.forEach((rect) => {
      wireOutlinesSvg.appendChild(
        createSvgEl('rect', {
          class: 'wire-outline-rect',
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          rx: rect.rx,
        })
      );
    });
  }

  // 4. Brand spark SVG pen guides + path
  const sparkGuidesEl = aboutEl.querySelector('.spark-pen-guides');
  if (sparkGuidesEl && sparkGuidesEl.children.length === 0) {
    FORGE_SPARK_VERTICES.forEach((v) => {
      const g = createSvgEl('g');
      g.appendChild(
        createSvgEl('line', {
          class: 'spark-handle',
          x1: v.hx1,
          y1: v.hy1,
          x2: v.hx2,
          y2: v.hy2,
        })
      );
      g.appendChild(
        createSvgEl('rect', {
          class: 'spark-anchor',
          x: v.cx - 3.5,
          y: v.cy - 3.5,
          width: 7,
          height: 7,
        })
      );
      sparkGuidesEl.appendChild(g);
    });
  }

  aboutEl
    .querySelectorAll('.brand-spark-path, .story-spark path, .post-avatar path, .post-media-spark path')
    .forEach((p) => p.setAttribute('d', FORGE_SPARK_PATH));

  // 5. Social icon paths
  const iconMap = {
    '.post .act-heart path': FORGE_SOCIAL_ICONS.heart,
    '.post .act-comment path': FORGE_SOCIAL_ICONS.comment,
    '.post .act-share path': FORGE_SOCIAL_ICONS.share,
    '.post .act-bookmark path': FORGE_SOCIAL_ICONS.bookmark,
    '.post-likes-icon path': FORGE_SOCIAL_ICONS.heart,
  };
  for (const [selector, d] of Object.entries(iconMap)) {
    const el = aboutEl.querySelector(selector);
    if (el) el.setAttribute('d', d);
  }

  // 6. Social layer notification chips & burst hearts
  const socialLayerEl = aboutEl.querySelector('.social-layer');
  if (socialLayerEl) {
    if (!socialLayerEl.querySelector('.notif-slot')) {
      FORGE_NOTIF_CHIPS.forEach((chip) => {
        const slot = document.createElement('div');
        slot.className = `notif-slot notif-slot-${chip.id}`;

        const badge = document.createElement('span');
        badge.className = `notif notif-${chip.id}`;

        const dot = document.createElement('span');
        dot.className = 'notif-dot';

        const svg = createSvgEl('svg', {
          class: 'notif-icon',
          width: 24,
          height: 24,
          viewBox: '0 0 24 24',
        });
        svg.appendChild(createSvgEl('path', { d: FORGE_SOCIAL_ICONS[chip.icon] }));

        const count = document.createElement('span');
        count.className = 'notif-count';
        count.setAttribute('dir', 'ltr');
        count.textContent = formatSocialCounter(chip.target, chip.withPlus);

        badge.append(dot, svg, count);
        slot.appendChild(badge);
        socialLayerEl.appendChild(slot);
      });
    }

    if (!socialLayerEl.querySelector('.burst-heart')) {
      FORGE_BURST_HEARTS.forEach((heart) => {
        const svg = createSvgEl('svg', {
          class: `burst burst-heart is-${heart.tone}`,
          width: 24,
          height: 24,
          viewBox: '0 0 24 24',
        });
        svg.style.width = `${heart.sizeU}cqw`;
        svg.style.height = `${heart.sizeU}cqw`;
        svg.appendChild(createSvgEl('path', { d: FORGE_SOCIAL_ICONS.heart }));
        socialLayerEl.appendChild(svg);
      });
    }
  }

  aboutEl.dataset.hydrated = 'true';
  aboutEl.querySelector('.manifesto-copy')?.setAttribute('data-hydrated', 'true');

  return () => {};
}
