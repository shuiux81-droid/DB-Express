import { yieldToMain } from '../../utils/bootScheduler.js';

export function waitForSectionCss(timeoutMs = 4000, key = '') {
  if (typeof window.__loadSectionCss === 'function') {
    window.__loadSectionCss();
  }
  /* R6-A */
  const perKeyReady =
    key && window.__sectionCssByKey && window.__sectionCssByKey[key];
  if (perKeyReady && typeof perKeyReady.then === 'function') {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timerId);
        resolve();
      };
      const timerId = window.setTimeout(finish, timeoutMs);
      perKeyReady.then(finish, finish);
    });
  }
  /* /R6-A */
  if (window.__sectionCssDone) return Promise.resolve();
  const ready = window.__sectionCssReady;
  if (!ready || typeof ready.then !== 'function') return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      resolve();
    };
    const timerId = window.setTimeout(finish, timeoutMs);
    ready.then(finish, finish);
  });
}

export async function activateDeferredCss(key) {
  await waitForSectionCss(4000, key);
  if (!key) return;
  const link = document.querySelector(`link[rel="stylesheet"][data-defer-css="${key}"]`);
  if (!link) return;

  const alreadyLoaded = Boolean(link.sheet);
  if (link.media !== 'all') {
    link.media = 'all';
  }
  if (alreadyLoaded || link.sheet) {
    return;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timerId);
      resolve();
    };
    const timerId = window.setTimeout(finish, 1500);
    link.addEventListener('load', finish, { once: true });
    link.addEventListener('error', finish, { once: true });
  });
}

export function activateAllDeferredCssSync() {
  if (typeof window.__loadSectionCss === 'function') {
    window.__loadSectionCss();
  }
  document.querySelectorAll('link[rel="stylesheet"][data-defer-css]').forEach((link) => {
    if (link.media !== 'all') {
      link.media = 'all';
    }
  });
}

const VENDOR_SCRIPT_MAP = {
  SplitText: 'assets/vendor/SplitText.min.js',
  ScrambleTextPlugin: 'assets/vendor/ScrambleTextPlugin.min.js',
  DrawSVGPlugin: 'assets/vendor/DrawSVGPlugin.min.js',
  Lenis: 'assets/vendor/lenis.min.js',
};

const vendorLoadPromises = new Map();
const registeredPlugins = new Set();

export function loadVendorScript(src, globalName) {
  if (globalName && window[globalName]) {
    return Promise.resolve(window[globalName]);
  }
  if (vendorLoadPromises.has(src)) {
    return vendorLoadPromises.get(src);
  }
  const p = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (globalName && window[globalName]) {
        resolve(window[globalName]);
        return;
      }
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), {
        once: true,
      });
      existing.addEventListener('error', () => resolve(null), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(globalName ? window[globalName] : true);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  vendorLoadPromises.set(src, p);
  return p;
}

export async function ensureGsapPlugins(pluginNames = []) {
  const gsap = window.gsap;
  if (!gsap || !Array.isArray(pluginNames) || pluginNames.length === 0) return;

  const missing = pluginNames.filter((name) => VENDOR_SCRIPT_MAP[name] && !window[name]);
  if (missing.length > 0) {
    await Promise.all(missing.map((name) => loadVendorScript(VENDOR_SCRIPT_MAP[name], name)));
  }

  const toRegister = [];
  for (const name of pluginNames) {
    const plugin = window[name];
    if (plugin && !registeredPlugins.has(name)) {
      registeredPlugins.add(name);
      toRegister.push(plugin);
    }
  }
  if (toRegister.length > 0) {
    try {
      gsap.registerPlugin(...toRegister);
    } catch {
      // ignore if already registered
    }
  }
}

export function loadLenis() {
  return loadVendorScript(VENDOR_SCRIPT_MAP.Lenis, 'Lenis');
}

export function recordSectionInit(sectionName, detail = {}) {
  const list = (window.__dxSectionInits = window.__dxSectionInits || []);
  const entry = {
    section: sectionName,
    atMs: Math.round(performance.now()),
    totalMs: Number((detail.totalMs ?? 0).toFixed(1)),
    maxChunkMs: Number((detail.maxChunkMs ?? detail.totalMs ?? 0).toFixed(1)),
    chunks: detail.chunks ?? 1,
  };
  list.push(entry);
  if (typeof window.__perf === 'function') {
    console.log(
      `[dx-init] ${entry.section} @ ${entry.atMs}ms (${entry.chunks} chunks, total ${entry.totalMs}ms, max chunk ${entry.maxChunkMs}ms)`
    );
  }
  return entry;
}

export async function runChunkedSectionInit(
  sectionName,
  steps,
  { context, isDisposed = () => false, yieldBetween = true } = {}
) {
  if (!Array.isArray(steps) || steps.length === 0 || isDisposed()) return false;
  let totalMs = 0;
  let maxChunkMs = 0;
  let chunks = 0;

  for (let i = 0; i < steps.length; i += 1) {
    if (isDisposed()) return false;
    const stepFn = steps[i];
    if (typeof stepFn !== 'function') continue;

    const t0 = performance.now();
    if (context && typeof context.add === 'function') {
      context.add(stepFn);
    } else {
      stepFn();
    }
    const dt = performance.now() - t0;
    totalMs += dt;
    if (dt > maxChunkMs) maxChunkMs = dt;
    chunks += 1;

    if (yieldBetween && i + 1 < steps.length && !isDisposed()) {
      await yieldToMain();
    }
  }

  if (!isDisposed()) {
    recordSectionInit(sectionName, { totalMs, maxChunkMs, chunks });
    return true;
  }
  return false;
}

function performScrollToTarget(target, duration = 1.6) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lenis = window.__dxLenis;
  if (target === '#footer') {
    const bottomY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (!reduced && lenis && typeof lenis.scrollTo === 'function') {
      lenis.scrollTo(bottomY, { duration });
      return;
    }
    window.scrollTo({ top: bottomY, behavior: reduced ? 'auto' : 'smooth' });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector(target) : null;
  let resolvedTarget = target;
  if (el) {
    const pinWrap = el.closest('.readers-contact-pin');
    const pinSpacer = pinWrap?.parentElement?.classList.contains('pin-spacer')
      ? pinWrap.parentElement
      : null;
    if (pinWrap && pinSpacer) {
      const pinDistance = Math.max(0, pinSpacer.offsetHeight - pinWrap.offsetHeight);
      const offsetInPin = el === pinWrap ? 0 : el.offsetTop;
      resolvedTarget = pinSpacer.offsetTop + (offsetInPin > 0 ? pinDistance + offsetInPin : 0);
    }
  }
  const immediate = duration === 0 || reduced;
  if (!reduced && lenis && typeof lenis.scrollTo === 'function') {
    lenis.scrollTo(resolvedTarget, immediate ? { immediate: true, force: true } : { duration });
    return;
  }
  if (typeof resolvedTarget === 'number') {
    window.scrollTo({ top: resolvedTarget, behavior: immediate ? 'auto' : 'smooth' });
    return;
  }
  if (target === '#top' || target === '#home') {
    window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
    return;
  }
  if (el) {
    el.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth' });
  }
}

export function scrollToTarget(target, duration = 1.6) {
  if (typeof window.__ensureSectionsBuiltAsync === 'function') {
    const ready = window.__ensureSectionsBuiltAsync(target);
    if (ready && typeof ready.then === 'function') {
      ready.then(() => performScrollToTarget(target, duration));
      return;
    }
    performScrollToTarget(target, duration);
    return;
  }
  if (typeof window.__ensureSectionsBuilt === 'function') {
    window.__ensureSectionsBuilt(target);
  }
  performScrollToTarget(target, duration);
}

export function createScopedTextRevealSteps(rootEl, { gsap, ScrollTrigger, SplitText, ScrambleTextPlugin }) {
  if (!rootEl) return [];
  const steps = [];

  if (SplitText) {
    const headlines = Array.from(rootEl.querySelectorAll('[data-split="headline"]'));
    headlines.forEach((el) => {
      steps.push(() => {
        const split = new SplitText(el, {
          type: 'words,lines',
          mask: 'lines',
          linesClass: 'line',
          wordsClass: 'word',
        });
        gsap.from(split.words, {
          yPercent: 110,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          stagger: 0.045,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            once: true,
          },
        });
      });
    });

    const bodies = Array.from(rootEl.querySelectorAll('[data-split="body"]'));
    bodies.forEach((el) => {
      steps.push(() => {
        const split = new SplitText(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'line',
          aria: 'none',
        });
        if (el.tagName === 'P' || el.tagName === 'BLOCKQUOTE') {
          el.removeAttribute('aria-label');
        }
        gsap.from(split.lines, {
          yPercent: 100,
          opacity: 0,
          duration: 0.8,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        });
      });
    });
  }

  const eyebrows = Array.from(rootEl.querySelectorAll('[data-scramble="eyebrow"]'));
  if (eyebrows.length > 0) {
    steps.push(() => {
      eyebrows.forEach((el) => {
        const targetText = el.dataset.text || el.textContent || '';
        ScrollTrigger.create({
          trigger: el,
          start: 'top 90%',
          once: true,
          onEnter: () => {
            if (ScrambleTextPlugin) {
              gsap.fromTo(
                el,
                { textContent: '' },
                {
                  duration: 0.9,
                  scrambleText: {
                    text: targetText,
                    chars: '01ABCDEF/[]—',
                    speed: 0.5,
                  },
                }
              );
            } else {
              el.textContent = targetText;
            }
          },
        });
      });
    });
  }

  return steps;
}
