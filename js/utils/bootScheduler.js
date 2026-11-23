export const SECTION_ORDER = ['about', 'services', 'testimonials', 'contact', 'footer'];

export const PIN_OR_SCRUB_SECTIONS = new Set([
  'about',
  'services',
  'testimonials',
  'footer',
]);

export const IDLE_TIMEOUT_MS = 2000;
export const REFRESH_DEBOUNCE_MS = 120;

export function yieldToMain() {
  if (globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') {
    return globalThis.scheduler.yield();
  }
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}

/* R6-C */
export function isPhoneViewport() {
  return (
    typeof globalThis.matchMedia === 'function' &&
    globalThis.matchMedia('(max-width: 600px)').matches
  );
}

export function yieldPhoneMacrotask() {
  if (!isPhoneViewport()) return Promise.resolve();
  return new Promise((resolve) => globalThis.setTimeout(resolve, 0));
}
/* /R6-C */

export function resolveSectionIndexFromTarget(target) {
  if (target === undefined || target === null) return SECTION_ORDER.length - 1;
  if (typeof target === 'number') {
    return target <= 0 ? -1 : SECTION_ORDER.length - 1;
  }
  if (typeof target !== 'string') return SECTION_ORDER.length - 1;

  const trimmed = target.trim();
  if (!trimmed || trimmed === '#' || trimmed === '#top' || trimmed === '#home') {
    return -1;
  }
  if (trimmed === '#about' || trimmed === '.manifesto') return 0;
  if (trimmed === '#services' || trimmed === '#drops') return 1;
  if (trimmed === '#readers') return 2;
  if (trimmed === '#contact') return 3;
  if (trimmed === '#footer') return 4;
  return SECTION_ORDER.length - 1;
}

export function resolveTargetSectionIndex(target, querySelectorFn) {
  const directIdx = resolveSectionIndexFromTarget(target);
  if (typeof target !== 'string' || typeof querySelectorFn !== 'function') {
    return directIdx;
  }
  if (directIdx !== SECTION_ORDER.length - 1 || target.trim() === '#footer') {
    return directIdx;
  }
  try {
    const el = querySelectorFn(target);
    if (!el || typeof el.closest !== 'function') return directIdx;
    if (el.closest('#footer')) return 4;
    if (el.closest('#contact')) return 3;
    if (el.closest('#readers')) return 2;
    if (el.closest('#services, #drops')) return 1;
    if (el.closest('#about, .manifesto')) return 0;
    if (el.closest('.hero')) return -1;
  } catch {
    return directIdx;
  }
  return directIdx;
}

export function createDebouncedTask(fn, delayMs = REFRESH_DEBOUNCE_MS, timers = {}) {
  const setTimer = timers.setTimeout ?? ((cb, ms) => globalThis.setTimeout(cb, ms));
  const clearTimer = timers.clearTimeout ?? ((id) => globalThis.clearTimeout(id));
  let timerId = null;
  let dirty = false;

  const cancel = () => {
    if (timerId !== null) {
      clearTimer(timerId);
      timerId = null;
    }
    dirty = false;
  };

  const flush = () => {
    if (!dirty && timerId === null) return false;
    cancel();
    fn();
    return true;
  };

  const schedule = () => {
    dirty = true;
    if (timerId !== null) {
      clearTimer(timerId);
    }
    timerId = setTimer(() => {
      timerId = null;
      if (!dirty) return;
      dirty = false;
      fn();
    }, delayMs);
  };

  const hasPending = () => dirty || timerId !== null;

  return { schedule, flush, cancel, hasPending };
}

export function scheduleIdleSlot(fn, timeoutMs = IDLE_TIMEOUT_MS, env = globalThis) {
  let cancelled = false;
  if (typeof env.requestIdleCallback === 'function') {
    const id = env.requestIdleCallback(
      (deadline) => {
        if (!cancelled) fn(deadline);
      },
      { timeout: timeoutMs }
    );
    return () => {
      cancelled = true;
      if (typeof env.cancelIdleCallback === 'function') {
        env.cancelIdleCallback(id);
      }
    };
  }
  const id = (env.setTimeout ?? globalThis.setTimeout)(() => {
    if (!cancelled) fn();
  }, 0);
  return () => {
    cancelled = true;
    (env.clearTimeout ?? globalThis.clearTimeout)(id);
  };
}

export function scheduleDoubleRafThenIdle(fn, options = {}) {
  const env = options.env ?? globalThis;
  const timeoutMs = options.timeoutMs ?? IDLE_TIMEOUT_MS;
  const raf =
    options.raf ??
    (typeof env.requestAnimationFrame === 'function'
      ? (cb) => env.requestAnimationFrame(cb)
      : (cb) => (env.setTimeout ?? globalThis.setTimeout)(cb, 0));
  const cancelRaf =
    options.cancelRaf ??
    (typeof env.cancelAnimationFrame === 'function'
      ? (id) => env.cancelAnimationFrame(id)
      : (id) => (env.clearTimeout ?? globalThis.clearTimeout)(id));

  let cancelled = false;
  let raf1 = 0;
  let raf2 = 0;
  let cancelIdle = null;

  raf1 = raf(() => {
    raf1 = 0;
    if (cancelled) return;
    raf2 = raf(() => {
      raf2 = 0;
      if (cancelled) return;
      cancelIdle = scheduleIdleSlot(() => {
        if (!cancelled) fn();
      }, timeoutMs, env);
    });
  });

  return () => {
    cancelled = true;
    if (raf1) {
      cancelRaf(raf1);
      raf1 = 0;
    }
    if (raf2) {
      cancelRaf(raf2);
      raf2 = 0;
    }
    if (cancelIdle) {
      cancelIdle();
      cancelIdle = null;
    }
  };
}
