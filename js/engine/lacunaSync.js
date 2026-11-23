import {
  BEATS,
  EYEBROW_TEXT,
  HEAD_AFTER_SELF,
  HEAD_BEFORE_SELF,
  HEAD_SELF,
  HERO_VIDEO_MP4_URL,
  HERO_VIDEO_WEBM_URL,
  buildGraphemeTypingThresholds,
  countCharsFromProgress,
  shouldLoadHeroVideo,
  shouldPlayHeroEntrance,
  splitArabicGraphemes,
} from '../utils/typewriterBeats.js';
import { scheduleIdleSlot } from '../utils/bootScheduler.js';

// Set to true to keep a static block cursor once typing finishes
export const SHOW_CURSOR_AFTER = false;

export function initLacunaSync(refs) {
  const cleanups = [];
  const docEl = document.documentElement;
  const gsap = window.gsap;
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* R7-E */
  const isPhoneViewport = window.matchMedia('(max-width: 600px)').matches;
  /* /R7-E */

  let heroTextStarted = false;
  let heroTextPlayed = false;

  const eyebrowGraphemes = splitArabicGraphemes(EYEBROW_TEXT);
  const headBeforeGraphemes = splitArabicGraphemes(HEAD_BEFORE_SELF);
  const headSelfGraphemes = splitArabicGraphemes(HEAD_SELF);
  const head1Graphemes = [...headBeforeGraphemes, ...headSelfGraphemes];
  const headAfterGraphemes = splitArabicGraphemes(HEAD_AFTER_SELF);

  let lastEyebrowCount = -1;
  let lastHead1Count = -1;
  let lastSelfText = null;
  let lastSelFrac = null;
  let lastHead2Count = -1;
  let lastCaretHidden = null;
  let lastCaretTyping = null;

  const measureRange = document.createRange();

  const positionCaretAtEnd = () => {
    const liveW = refs.headlineLiveEl.offsetWidth;
    const liveH = refs.headlineLiveEl.offsetHeight;
    if (liveW <= 0) return;

    const live = refs.headlineLiveEl.getBoundingClientRect();
    const sx = live.width > 0 ? live.width / liveW : 1;
    const sy = liveH > 0 && live.height > 0 ? live.height / liveH : sx;
    const caretW = refs.caretEl.offsetWidth || 24;
    const caretH = refs.caretEl.offsetHeight || 48;
    const cs = window.getComputedStyle(refs.headlineLiveEl);
    const lh = parseFloat(cs.lineHeight);
    const lineH = Number.isFinite(lh) && lh > 0 ? lh : caretH * 1.28;

    const gap = Math.round(caretW * 0.14);
    let x = liveW - caretW;
    let y = Math.max(0, (lineH - caretH) * 0.5);

    const pickLastRect = (el) => {
      if (!el || !el.textContent) return null;
      measureRange.selectNodeContents(el);
      const rects = measureRange.getClientRects();
      for (let i = rects.length - 1; i >= 0; i -= 1) {
        if (rects[i].width > 0.5 || rects[i].height > 0.5) return rects[i];
      }
      return null;
    };

    let targetRect = null;
    if (lastHead2Count > 0) {
      targetRect = pickLastRect(refs.headAfterEl);
    }
    if (!targetRect && lastSelfText) {
      const sr = refs.selfBaseEl.getBoundingClientRect();
      if (sr.width > 0.5 || sr.height > 0.5) targetRect = sr;
    }
    if (!targetRect && lastHead1Count > 0) {
      targetRect = pickLastRect(refs.headBeforeEl);
    }

    if (targetRect) {
      x = (targetRect.left - live.left) / sx - caretW - gap;
      y = (targetRect.top - live.top) / sy + (targetRect.height / sy - caretH) * 0.5;
    }

    refs.caretEl.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  };

  const onResizeMetrics = () => {
    if (heroTextStarted && !heroTextPlayed) {
      positionCaretAtEnd();
    }
  };
  window.addEventListener('resize', onResizeMetrics, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', onResizeMetrics));

  const resetRenderCaches = () => {
    lastEyebrowCount = -1;
    lastHead1Count = -1;
    lastSelfText = null;
    lastSelFrac = null;
    lastHead2Count = -1;
    lastCaretHidden = null;
    lastCaretTyping = null;
  };

  const setTypingCaret = (typing) => {
    if (lastCaretTyping === typing) return;
    lastCaretTyping = typing;
    if (typing) refs.caretEl.classList.add('is-typing');
    else refs.caretEl.classList.remove('is-typing');
  };

  const setSelfText = (text) => {
    if (lastSelfText === text) return;
    lastSelfText = text;
    refs.selfBaseEl.textContent = text;
    refs.selfHighlightEl.textContent = text;
    refs.selfWrapEl.classList.toggle('is-empty', text.length === 0);
  };

  const setSelFrac = (val) => {
    if (lastSelFrac === val) return;
    lastSelFrac = val;
    refs.selfWrapEl.style.setProperty('--sel-frac', val);
  };

  const isHeroInViewport = () => {
    const rect = refs.heroEl.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    if (rect.height <= 0 || vh <= 0) return false;
    const visiblePx = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return visiblePx >= rect.height * 0.1 || visiblePx > 0;
  };

  const lockHeroFinalStyles = () => {
    const heroCopyEl = refs.heroEl.querySelector('.hero-copy');
    if (heroCopyEl) {
      heroCopyEl.style.opacity = '1';
      heroCopyEl.style.transform = 'none';
      heroCopyEl.style.filter = 'none';
      heroCopyEl.style.willChange = 'auto';
    }

    const headlineEl = refs.headBeforeEl.closest('.hero-headline');
    if (headlineEl) {
      headlineEl.style.opacity = '1';
      headlineEl.style.transform = 'none';
      headlineEl.style.filter = 'none';
      headlineEl.style.clipPath = 'none';
      headlineEl.style.willChange = 'auto';
    }

    refs.paragraphWrapEl.style.opacity = '1';
    refs.paragraphWrapEl.style.visibility = 'visible';
    refs.paragraphWrapEl.style.transform = 'none';
    refs.paragraphWrapEl.style.filter = 'none';
    refs.paragraphWrapEl.style.clipPath = 'none';
    refs.paragraphWrapEl.style.willChange = 'auto';

    refs.paragraphEl.style.opacity = '1';
    refs.paragraphEl.style.transform = 'none';
    refs.paragraphEl.style.filter = 'none';
    refs.paragraphEl.style.clipPath = 'none';
    refs.paragraphEl.style.willChange = 'auto';

    refs.actionsEl.style.opacity = '1';
    refs.actionsEl.style.transform = 'none';
    refs.actionsEl.style.filter = 'none';
    refs.actionsEl.style.willChange = 'auto';

    refs.ctaEl.style.opacity = '1';
    refs.ctaEl.style.visibility = 'visible';
    refs.ctaEl.style.pointerEvents = 'auto';
    refs.ctaEl.style.transform = '';
    refs.ctaEl.style.filter = 'none';
    refs.ctaEl.style.willChange = 'auto';
  };

  const applyFinishedStaticState = (hideCaret) => {
    resetRenderCaches();
    if (refs.eyebrowEl) refs.eyebrowEl.textContent = EYEBROW_TEXT;
    refs.headBeforeEl.textContent = HEAD_BEFORE_SELF;
    setSelfText(HEAD_SELF);
    setSelFrac('0');
    refs.selfWrapEl.style.color = 'var(--paper)';
    refs.selfHighlightEl.style.clipPath = 'none';
    refs.selfHighlightEl.style.display = 'none';
    refs.headAfterEl.textContent = HEAD_AFTER_SELF;
    lastHead1Count = head1Graphemes.length;
    lastHead2Count = headAfterGraphemes.length;
    lockHeroFinalStyles();

    setTypingCaret(false);
    if (hideCaret) {
      refs.caretEl.classList.remove('is-static');
      refs.caretEl.classList.add('is-hidden', 'is-done');
      refs.caretEl.style.opacity = '0';
      refs.caretEl.style.visibility = 'hidden';
      lastCaretHidden = true;
    } else {
      refs.caretEl.classList.remove('is-hidden', 'is-done');
      refs.caretEl.classList.add('is-static');
      refs.caretEl.style.opacity = '1';
      refs.caretEl.style.visibility = 'visible';
      positionCaretAtEnd();
      lastCaretHidden = false;
    }
  };

  const applyClearedState = () => {
    resetRenderCaches();
    if (refs.eyebrowEl) refs.eyebrowEl.textContent = '';
    refs.headBeforeEl.textContent = '';
    setSelfText('');
    setSelFrac('0');
    refs.selfWrapEl.style.color = 'var(--paper)';
    refs.selfHighlightEl.style.clipPath = '';
    refs.selfHighlightEl.style.display = '';
    refs.headAfterEl.textContent = '';
    refs.paragraphWrapEl.style.opacity = '0';
    refs.paragraphWrapEl.style.visibility = 'hidden';
    refs.ctaEl.style.opacity = '0';
    refs.ctaEl.style.visibility = 'hidden';
    refs.ctaEl.style.pointerEvents = 'none';
    refs.caretEl.classList.remove('is-hidden', 'is-static', 'is-done');
    refs.caretEl.style.opacity = '1';
    refs.caretEl.style.visibility = 'visible';
    lastCaretHidden = false;
    setTypingCaret(false);
  };

  const activateFallbackState = () => {
    const revealPromise = window.__loaderReveal ?? Promise.resolve();
    revealPromise.then(() => {
      window.__dxReady = true;
      docEl.setAttribute('data-page-ready', 'true');
      docEl.setAttribute('data-reveal-fallback', 'true');
      heroTextStarted = true;
      heroTextPlayed = true;
      applyFinishedStaticState(reducedMotionQuery.matches || !SHOW_CURSOR_AFTER);
      if (!reducedMotionQuery.matches) {
        refs.videoEl.play().catch(() => {});
      }
    });
  };

  // Ensure hero starts cleared before reveal
  applyClearedState();

  // Fallback if GSAP fails to load
  if (!gsap) {
    activateFallbackState();
    return () => cleanups.forEach((fn) => fn());
  }

  // Deterministic grapheme typing thresholds (headline only)
  const eyebrowThresholds = buildGraphemeTypingThresholds(
    eyebrowGraphemes,
    BEATS.EYEBROW_END - BEATS.EYEBROW_START,
    0,
    101
  );
  const head1Thresholds = buildGraphemeTypingThresholds(
    head1Graphemes,
    BEATS.HEAD_1_END - BEATS.HEAD_1_START,
    0.02,
    202
  );
  const idxAfterFirstWord = splitArabicGraphemes(' تُحدث').length;
  const head2Thresholds = buildGraphemeTypingThresholds(
    headAfterGraphemes,
    BEATS.HEAD_2_END - BEATS.HEAD_2_START,
    0.02,
    303,
    idxAfterFirstWord,
    0.18
  );

  let heroTl = null;
  const eyebrowState = { p: 0 };
  const head1State = { p: 0 };
  const selectState = { n: 0 };
  const head2State = { p: 0 };

  try {
    heroTl = gsap.timeline({ paused: true, repeat: 0, yoyo: false });

    // 0.00–0.35: Eyebrow types (if present)
    heroTl.fromTo(
      eyebrowState,
      { p: 0 },
      {
        p: 1,
        duration: BEATS.EYEBROW_END - BEATS.EYEBROW_START,
        ease: 'none',
        immediateRender: true,
        onUpdate: () => {
          if (!refs.eyebrowEl) return;
          const count = countCharsFromProgress(eyebrowState.p, eyebrowThresholds);
          if (count === lastEyebrowCount) return;
          lastEyebrowCount = count;
          refs.eyebrowEl.textContent = eyebrowGraphemes.slice(0, count).join('');
        },
      },
      BEATS.EYEBROW_START
    );

    // 0.10–0.90: Headline types first part by grapheme
    heroTl.fromTo(
      head1State,
      { p: 0 },
      {
        p: 1,
        duration: BEATS.HEAD_1_END - BEATS.HEAD_1_START,
        ease: 'none',
        immediateRender: true,
        onUpdate: () => {
          const count = countCharsFromProgress(head1State.p, head1Thresholds);
          if (count === lastHead1Count) return;
          lastHead1Count = count;
          const beforeLen = headBeforeGraphemes.length;
          refs.headBeforeEl.textContent = headBeforeGraphemes
            .slice(0, Math.min(count, beforeLen))
            .join('');
          const selfCount = Math.max(0, count - beforeLen);
          setSelfText(headSelfGraphemes.slice(0, selfCount).join(''));
          /* R7-E */
          if (!isPhoneViewport || heroTextStarted) positionCaretAtEnd();
          /* /R7-E */
        },
      },
      BEATS.HEAD_1_START
    );

    // 1.00–1.30: Select "رقمية" one grapheme at a time, then collapse cleanly
    heroTl.fromTo(
      selectState,
      { n: 0 },
      {
        n: headSelfGraphemes.length,
        duration: BEATS.SELECT_END - BEATS.SELECT_START,
        ease: 'none',
        immediateRender: true,
        onUpdate: () => {
          const t = heroTl.time();
          const selCount = Math.min(
            headSelfGraphemes.length,
            Math.round(selectState.n)
          );
          if (t >= BEATS.SELECT_START && t < BEATS.STRIKE_AT) {
            setSelFrac(String(selCount / headSelfGraphemes.length));
          } else {
            setSelFrac('0');
          }
        },
      },
      BEATS.SELECT_START
    );

    // 1.90–3.50: Headline continues by grapheme
    heroTl.fromTo(
      head2State,
      { p: 0 },
      {
        p: 1,
        duration: BEATS.HEAD_2_END - BEATS.HEAD_2_START,
        ease: 'none',
        immediateRender: true,
        onUpdate: () => {
          const count = countCharsFromProgress(head2State.p, head2Thresholds);
          if (count === lastHead2Count) return;
          lastHead2Count = count;
          refs.headAfterEl.textContent = headAfterGraphemes.slice(0, count).join('');
          /* R7-E */
          if (!isPhoneViewport || heroTextStarted) positionCaretAtEnd();
          /* /R7-E */
        },
      },
      BEATS.HEAD_2_START
    );

    // Mark exact end of the headline typing tween
    heroTl.addLabel('headEnd');

    // headEnd + 0.20s: Caret fades out (0.1s) and description appears once as a whole (0.35s)
    heroTl.fromTo(
      refs.caretEl,
      { autoAlpha: 1 },
      {
        autoAlpha: 0,
        duration: BEATS.CARET_HIDE_DUR,
        ease: 'none',
        immediateRender: true,
      },
      `headEnd+=${BEATS.CARET_HIDE_DELAY}`
    );

    heroTl.fromTo(
      refs.paragraphWrapEl,
      { autoAlpha: 0, y: 10 },
      {
        autoAlpha: 1,
        y: 0,
        duration: BEATS.DESC_DUR,
        ease: 'power2.out',
        immediateRender: true,
      },
      `headEnd+=${BEATS.DESC_DELAY}`
    );

    // Mark exact end of description entrance; button timing derives from this label
    heroTl.addLabel('descEnd');

    // descEnd + 0.25s: Button fades & rises in once, never visible before description ends
    heroTl.fromTo(
      refs.ctaEl,
      { autoAlpha: 0, y: 14, scale: 0.96, pointerEvents: 'none' },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        pointerEvents: 'auto',
        duration: BEATS.BUTTONS_DUR,
        ease: 'power3.out',
        immediateRender: true,
      },
      `descEnd+=${BEATS.BUTTONS_DELAY}`
    );
  } catch {
    heroTl = null;
  }

  if (!heroTl) {
    activateFallbackState();
    return () => cleanups.forEach((fn) => fn());
  }

  const syncCaretAndSelection = (t) => {
    if (t < BEATS.SELECT_START || t >= BEATS.STRIKE_AT) {
      setSelFrac('0');
    }
    const hideDuringSelection = t >= BEATS.SELECT_START && t < BEATS.STRIKE_AT;
    if (hideDuringSelection) {
      if (lastCaretHidden !== true) {
        lastCaretHidden = true;
        refs.caretEl.classList.add('is-hidden');
        refs.caretEl.classList.remove('is-static');
      }
      setTypingCaret(false);
    } else {
      if (lastCaretHidden !== false) {
        lastCaretHidden = false;
        refs.caretEl.classList.remove('is-hidden', 'is-static');
      }
      const isTypingNow =
        (t >= BEATS.HEAD_1_START && t < BEATS.HEAD_1_END) ||
        (t >= BEATS.HEAD_2_START && t < BEATS.HEAD_2_END);
      setTypingCaret(isTypingNow);
    }
  };

  const tl = heroTl;

  const finishHeroText = (forceHideCursor = false) => {
    if (heroTextPlayed) return;
    heroTextPlayed = true;
    heroTextStarted = true;
    tl.progress(1, true);
    tl.pause();
    applyFinishedStaticState(forceHideCursor || !SHOW_CURSOR_AFTER);
  };

  tl.eventCallback('onStart', () => {
    positionCaretAtEnd();
  });
  tl.eventCallback('onUpdate', () => {
    syncCaretAndSelection(tl.time());
  });
  tl.eventCallback('onComplete', () => {
    heroTextPlayed = true;
    heroTextStarted = true;
    lockHeroFinalStyles();
    if (!SHOW_CURSOR_AFTER) {
      refs.caretEl.classList.add('is-hidden', 'is-done');
      refs.caretEl.classList.remove('is-static', 'is-typing');
    } else {
      refs.caretEl.classList.remove('is-hidden', 'is-typing', 'is-done');
      refs.caretEl.classList.add('is-static');
    }
  });

  // Hero video playback (decoupled from text timeline; deferred past window.load + idle)
  const vidEl = refs.videoEl;
  let isHeroVisible = true;
  let isTabVisible = !document.hidden;
  let playAttemptInFlight = false;
  let hasUnlockedByGesture = false;
  let videoBootReady = false;
  let videoScheduleStarted = false;
  let cancelVideoIdle = null;

  const getNetworkConnection = () =>
    navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;

  const isVideoAllowed = () =>
    shouldLoadHeroVideo({
      reducedMotion: reducedMotionQuery.matches,
      connection: getNetworkConnection(),
    });

  const ensureMutedInline = () => {
    vidEl.muted = true;
    vidEl.defaultMuted = true;
    vidEl.playsInline = true;
    vidEl.loop = true;
    if (!vidEl.hasAttribute('muted')) vidEl.setAttribute('muted', '');
    if (!vidEl.hasAttribute('playsinline')) vidEl.setAttribute('playsinline', '');
    if (!vidEl.hasAttribute('loop')) vidEl.setAttribute('loop', '');
  };
  ensureMutedInline();

  const ensureVideoSources = () => {
    if (!videoBootReady || !isVideoAllowed()) return false;
    if (vidEl.querySelector('source')) return false;
    if (HERO_VIDEO_WEBM_URL) {
      const webm = document.createElement('source');
      webm.src = HERO_VIDEO_WEBM_URL;
      webm.type = 'video/webm';
      vidEl.appendChild(webm);
    }
    const mp4 = document.createElement('source');
    mp4.src = HERO_VIDEO_MP4_URL;
    mp4.type = 'video/mp4';
    vidEl.appendChild(mp4);
    vidEl.preload = 'auto';
    vidEl.load();
    return true;
  };

  const tryPlayVideo = () => {
    if (!videoBootReady || !isVideoAllowed() || !isHeroVisible || !isTabVisible) return;
    ensureVideoSources();
    if (vidEl.error) return;
    ensureMutedInline();
    if (vidEl.preload !== 'auto') {
      vidEl.preload = 'auto';
    }
    if (!vidEl.paused || playAttemptInFlight) return;
    if (vidEl.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      vidEl.load();
    }
    playAttemptInFlight = true;
    const playPromise = vidEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          playAttemptInFlight = false;
        })
        .catch(() => {
          playAttemptInFlight = false;
        });
    } else {
      playAttemptInFlight = false;
    }
  };

  const scheduleDeferredHeroVideo = () => {
    if (videoScheduleStarted || !isVideoAllowed()) return;
    videoScheduleStarted = true;

    const queueIdleBoot = () => {
      cancelVideoIdle = scheduleIdleSlot(() => {
        cancelVideoIdle = null;
        videoBootReady = true;
        if (isVideoAllowed() && isHeroVisible && isTabVisible) {
          tryPlayVideo();
        }
      }, 1000);
    };

    if (document.readyState === 'complete') {
      queueIdleBoot();
    } else {
      const onWindowLoad = () => {
        window.removeEventListener('load', onWindowLoad);
        queueIdleBoot();
      };
      window.addEventListener('load', onWindowLoad, { once: true });
      cleanups.push(() => window.removeEventListener('load', onWindowLoad));
    }
  };

  cleanups.push(() => {
    if (cancelVideoIdle) {
      cancelVideoIdle();
      cancelVideoIdle = null;
    }
  });

  const hasNonHeroHash = () => {
    const hash = window.location.hash;
    if (!hash || hash.length < 2 || hash === '#top') return false;
    try {
      const target = document.querySelector(hash);
      return Boolean(target && !refs.heroEl.contains(target));
    } catch {
      return false;
    }
  };

  const startHeroTextOnce = () => {
    if (heroTextPlayed || heroTextStarted) return;
    const heroInView = isHeroInViewport() && !hasNonHeroHash();
    if (
      !shouldPlayHeroEntrance({
        reducedMotion: reducedMotionQuery.matches,
        heroInViewport: heroInView,
        alreadyPlayed: heroTextPlayed,
      })
    ) {
      finishHeroText(reducedMotionQuery.matches);
      return;
    }
    heroTextStarted = true;
    window.__mark?.('hero headline typing start');
    tl.play(0);
  };

  const applyMotionMode = () => {
    if (reducedMotionQuery.matches) {
      vidEl.pause();
      finishHeroText(true);
    } else {
      startHeroTextOnce();
      if (videoBootReady) {
        tryPlayVideo();
      } else {
        scheduleDeferredHeroVideo();
      }
    }
  };

  const onVideoCanPlay = () => {
    if (videoBootReady && isVideoAllowed() && isHeroVisible && isTabVisible && vidEl.paused) {
      tryPlayVideo();
    }
  };

  refs.videoEl.addEventListener('loadeddata', onVideoCanPlay);
  refs.videoEl.addEventListener('canplay', onVideoCanPlay);
  cleanups.push(() => {
    refs.videoEl.removeEventListener('loadeddata', onVideoCanPlay);
    refs.videoEl.removeEventListener('canplay', onVideoCanPlay);
  });

  const onUserGestureUnlock = () => {
    if (hasUnlockedByGesture) return;
    hasUnlockedByGesture = true;
    if (videoBootReady && isVideoAllowed() && isHeroVisible && isTabVisible && vidEl.paused) {
      tryPlayVideo();
    }
    window.removeEventListener('pointerdown', onUserGestureUnlock);
    window.removeEventListener('touchstart', onUserGestureUnlock);
    window.removeEventListener('keydown', onUserGestureUnlock);
  };
  window.addEventListener('pointerdown', onUserGestureUnlock, { passive: true });
  window.addEventListener('touchstart', onUserGestureUnlock, { passive: true });
  window.addEventListener('keydown', onUserGestureUnlock);
  cleanups.push(() => {
    window.removeEventListener('pointerdown', onUserGestureUnlock);
    window.removeEventListener('touchstart', onUserGestureUnlock);
    window.removeEventListener('keydown', onUserGestureUnlock);
  });

  const updateVideoPlaybackState = () => {
    if (!initialized || !videoBootReady) return;
    if (isVideoAllowed() && isHeroVisible && isTabVisible) {
      tryPlayVideo();
    } else if (!vidEl.paused) {
      vidEl.pause();
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      isHeroVisible = Boolean(entry && entry.intersectionRatio >= 0.1);
      updateVideoPlaybackState();
    },
    { threshold: 0.1 }
  );
  io.observe(refs.heroEl);
  cleanups.push(() => io.disconnect());

  const onVisibilityChange = () => {
    isTabVisible = !document.hidden;
    updateVideoPlaybackState();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibilityChange));

  reducedMotionQuery.addEventListener('change', applyMotionMode);
  cleanups.push(() => reducedMotionQuery.removeEventListener('change', applyMotionMode));

  let initialized = false;
  let fontsReadyResolved = false;
  let revealResolved = false;

  const maybeStartHero = () => {
    if (initialized || !fontsReadyResolved || !revealResolved) return;
    initialized = true;
    window.__dxReady = true;
    docEl.setAttribute('data-page-ready', 'true');
    if (reducedMotionQuery.matches) {
      applyMotionMode();
    } else {
      startHeroTextOnce();
      scheduleDeferredHeroVideo();
    }
  };

  const fontTimer = window.setTimeout(() => {
    fontsReadyResolved = true;
    maybeStartHero();
  }, 1500);
  cleanups.push(() => window.clearTimeout(fontTimer));

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(
      () => {
        fontsReadyResolved = true;
        maybeStartHero();
      },
      () => {
        fontsReadyResolved = true;
        maybeStartHero();
      }
    );
  } else {
    fontsReadyResolved = true;
  }

  const revealPromise = window.__loaderReveal ?? Promise.resolve();
  revealPromise.then(() => {
    revealResolved = true;
    maybeStartHero();
  });

  // Also listen directly in case __loaderReveal was created after mount or skipped
  const onLoaderReveal = () => {
    revealResolved = true;
    maybeStartHero();
  };
  window.addEventListener('loader:reveal', onLoaderReveal, { once: true });
  cleanups.push(() => window.removeEventListener('loader:reveal', onLoaderReveal));

  cleanups.push(() => {
    tl.kill();
  });

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
