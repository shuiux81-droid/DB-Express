import { MANIFESTO_COPY } from '../../data.js';
import {
  buildTypingThresholds,
  countCharsFromProgress,
} from '../../utils/typewriterBeats.js';
import {
  FORGE_BURST_HEARTS,
  FORGE_NOTIF_CHIPS,
  FORGE_Z_PATH_ORDER,
  formatSocialCounter,
  scaleForgeBeat,
} from '../../utils/forgeFigure.js';
import { createScopedTextRevealSteps, runChunkedSectionInit } from './shared.js';

export function createAboutSteps(env) {
  const {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    DrawSVGPlugin,
    isDesktop,
    ctxCleanups,
    registerResponsiveTimeline,
    getLayoutKey,
  } = env;

  const manifestoEl = document.querySelector('.manifesto');
  if (!manifestoEl) return [];

  const liveStatementEl =
    manifestoEl.querySelector('.manifesto-statement-live') || manifestoEl;
  const beforeSpan = liveStatementEl.querySelector('.m-before');
  const strikeSpan = liveStatementEl.querySelector('.m-strike');
  const replSpan = liveStatementEl.querySelector('.m-repl');
  const afterSpan = liveStatementEl.querySelector('.m-after');
  const caretBeforeAnchor = liveStatementEl.querySelector('.m-caret-before');
  const caretStrikeAnchor = liveStatementEl.querySelector('.m-caret-strike');
  const caretReplAnchor = liveStatementEl.querySelector('.m-caret-repl');
  const caretEndAnchor = liveStatementEl.querySelector('.m-caret-end');
  const manifestoCaret = liveStatementEl.querySelector('.manifesto-caret');

  const figureStageEl = manifestoEl.querySelector('.figure-stage');
  const figureEl = manifestoEl.querySelector('.figure');
  const figureInnerEl = manifestoEl.querySelector('.figure-inner');
  const figureSceneEl = manifestoEl.querySelector('.figure-scene');
  const atomEls = Array.from(manifestoEl.querySelectorAll('.atom'));
  const winEl = manifestoEl.querySelector('.win');
  const wireCards = Array.from(manifestoEl.querySelectorAll('.wire-card'));
  const outlineRects = Array.from(manifestoEl.querySelectorAll('.wire-outline-rect'));
  const marqueeEl = manifestoEl.querySelector('.marquee');
  const strikeLineEl = manifestoEl.querySelector('.wire-strike-line');
  const tagAEl = manifestoEl.querySelector('.wire-tag.tag-a');
  const tagAStrikeEl = manifestoEl.querySelector('.tag-a-strike');
  const tagBEl = manifestoEl.querySelector('.wire-tag.tag-b');
  const capAEl = manifestoEl.querySelector('.figure-caption .cap-a');
  const capBEl = manifestoEl.querySelector('.figure-caption .cap-b');
  const layerBrandEl = manifestoEl.querySelector('.layer-brand');
  const brandNavEl = manifestoEl.querySelector('.brand-nav');
  const brandWordmarkEl = manifestoEl.querySelector('.brand-wordmark');
  const brandBars = Array.from(manifestoEl.querySelectorAll('.brand-bar'));
  const brandBtnEl = manifestoEl.querySelector('.brand-btn');
  const brandRippleEl = manifestoEl.querySelector('.brand-ripple');
  const brandMediaEl = manifestoEl.querySelector('.brand-media');
  const sparkPathEl = manifestoEl.querySelector('.brand-spark-path');
  const sparkGuidesEl = manifestoEl.querySelector('.spark-pen-guides');
  const chipDesignEl = manifestoEl.querySelector('.chip-design');
  const chipCodeEl = manifestoEl.querySelector('.chip-code');
  const linkMaskPathEl = manifestoEl.querySelector('.link-mask-path');
  const cursorEl = manifestoEl.querySelector('.forge-cursor');
  const wireGridWrapEl = manifestoEl.querySelector('.wire-grid-wrap');

  const socialLayerEl = manifestoEl.querySelector('.social-layer');
  const storyEl = manifestoEl.querySelector('.story');
  const storyRingCircleEl = manifestoEl.querySelector('.story-ring-circle');
  const storyRingSvgEl = manifestoEl.querySelector('.story-ring-svg');
  const hashtagEl = manifestoEl.querySelector('.hashtag');
  const postEl = manifestoEl.querySelector('.post');
  const postActHeartEl = manifestoEl.querySelector('.post .act-heart');
  const postActHeartPathEl = manifestoEl.querySelector('.post .act-heart path');
  const postActionsEl = manifestoEl.querySelector('.post-actions');
  const postActionsStartEl = manifestoEl.querySelector('.post-actions-start');
  const postLikesCountEl = manifestoEl.querySelector('.post-likes-count');
  const notifSlots = Array.from(manifestoEl.querySelectorAll('.notif-slot'));
  const notifCards = Array.from(manifestoEl.querySelectorAll('.notif'));
  const notifCountEls = Array.from(manifestoEl.querySelectorAll('.notif-count'));
  const burstHeartEls = Array.from(manifestoEl.querySelectorAll('.burst-heart'));

  const isPhone = window.innerWidth <= 600;
  let cachedUnit = 5;
  let cachedSocialUnit = 5;
  let cachedHeartOrigin = { x: 20, y: 510 };
  const cachedSceneTargets = new Map();

  const computeScenePosRaw = (sceneRect, scaleX, scaleY, target, xRatio, yRatio, fallbackUnit) => {
    if (!target || !sceneRect) return { x: fallbackUnit * 50, y: fallbackUnit * 50 };
    const tRect = target.getBoundingClientRect();
    return {
      x: (tRect.left - sceneRect.left + tRect.width * xRatio) / (scaleX || 1),
      y: (tRect.top - sceneRect.top + tRect.height * yRatio) / (scaleY || 1),
    };
  };

  let lastForgeKey = '';
  const recomputeForgeMetrics = (force = false) => {
    const key = getLayoutKey();
    if (!force && lastForgeKey === key) return;
    lastForgeKey = key;

    const u = (figureEl?.clientWidth || 500) * 0.01;
    const su = (socialLayerEl?.clientWidth || figureEl?.clientWidth || 500) * 0.01;
    cachedUnit = u;
    cachedSocialUnit = su;

    if (!postEl || !postActionsEl || !postActionsStartEl) {
      cachedHeartOrigin = { x: su * 4, y: su * 102 };
    } else {
      const iconSize = su * 3.2;
      const localX = postActionsStartEl.offsetLeft + postActionsStartEl.offsetWidth - iconSize * 0.5;
      const localY = postActionsEl.offsetTop + postActionsEl.offsetHeight * 0.5;
      const originX = postEl.offsetWidth * 0.5;
      const originY = postEl.offsetHeight * 0.9;
      const rad = (-5 * Math.PI) / 180;
      const dx = localX - originX;
      const dy = localY - originY;
      cachedHeartOrigin = {
        x: postEl.offsetLeft + (dx * Math.cos(rad) - dy * Math.sin(rad) + originX),
        y: postEl.offsetTop + (dx * Math.sin(rad) + dy * Math.cos(rad) + originY),
      };
    }

    cachedSceneTargets.clear();
    if (figureSceneEl) {
      const sceneRect = figureSceneEl.getBoundingClientRect();
      const scaleX = sceneRect.width / (figureSceneEl.offsetWidth || sceneRect.width || 1);
      const scaleY = sceneRect.height / (figureSceneEl.offsetHeight || sceneRect.height || 1);
      wireCards.forEach((card) => {
        cachedSceneTargets.set(
          card,
          computeScenePosRaw(sceneRect, scaleX, scaleY, card, 0.5, 0.5, u)
        );
      });
      if (wireGridWrapEl) {
        cachedSceneTargets.set(
          wireGridWrapEl,
          computeScenePosRaw(sceneRect, scaleX, scaleY, wireGridWrapEl, 0.96, 0.04, u)
        );
      }
      if (brandBtnEl) {
        cachedSceneTargets.set(
          brandBtnEl,
          computeScenePosRaw(sceneRect, scaleX, scaleY, brandBtnEl, 0.5, 0.55, u)
        );
      }
    }
  };

  const unitPx = () => cachedUnit;
  const socialUnitPx = () => cachedSocialUnit;
  const getHeartOriginPx = () => cachedHeartOrigin;
  const getSceneTargetPos = (target) =>
    cachedSceneTargets.get(target) || { x: cachedUnit * 50, y: cachedUnit * 50 };

  const beforeText = MANIFESTO_COPY.before;
  const strikeText = MANIFESTO_COPY.strike;
  const replaceText = MANIFESTO_COPY.replace;
  const afterText = MANIFESTO_COPY.after;

  const hasStrike = Boolean(strikeSpan && strikeText.length > 0);
  const tBeforeEnd = hasStrike ? 5.2 : 6.8;
  const tStrikeTextEnd = hasStrike ? 6.0 : tBeforeEnd;
  const tSelectStart = 6.2;
  const tStrikeStart = 6.8;
  const tStrikeEnd = 7.2;
  const tReplaceStart = hasStrike ? 7.2 : 6.8;
  const tReplaceEnd = 8.4;
  const tAfterEnd = 9.4;

  const beforeThresholds = buildTypingThresholds(beforeText, tBeforeEnd, 0, 501);
  const strikeThresholds = hasStrike
    ? buildTypingThresholds(strikeText, tStrikeTextEnd - tBeforeEnd, 0, 502)
    : [];
  const replThresholds = buildTypingThresholds(
    replaceText,
    tReplaceEnd - tReplaceStart,
    0.015,
    503
  );
  const afterThresholds = buildTypingThresholds(afterText, tAfterEnd - tReplaceEnd, 0, 504);

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  let lastBeforeCount = -1;
  let lastStrikeCount = -1;
  let lastStrikeSelected = null;
  let lastStrikeLine = null;
  let lastReplCount = -1;
  let lastAfterCount = -1;
  let lastMCaretHidden = null;
  let lastMCaretAnchor = null;
  let lastMCaretTyping = null;

  const placeManifestoCaret = (anchor) => {
    if (!manifestoCaret || !anchor) return;
    if (lastMCaretAnchor === anchor && manifestoCaret.parentElement === anchor) return;
    lastMCaretAnchor = anchor;
    if (manifestoCaret.parentElement !== anchor) {
      anchor.appendChild(manifestoCaret);
    }
  };

  const syncManifestoTyping = (t) => {
    if (beforeSpan) {
      const pBefore = clamp01(t / Math.max(0.01, tBeforeEnd));
      const count = countCharsFromProgress(pBefore, beforeThresholds);
      if (count !== lastBeforeCount) {
        lastBeforeCount = count;
        beforeSpan.textContent = beforeText.slice(0, count);
      }
    }

    if (hasStrike && strikeSpan) {
      const pStrikeTxt = clamp01(
        (t - tBeforeEnd) / Math.max(0.01, tStrikeTextEnd - tBeforeEnd)
      );
      const count = countCharsFromProgress(pStrikeTxt, strikeThresholds);
      if (count !== lastStrikeCount) {
        lastStrikeCount = count;
        strikeSpan.textContent = strikeText.slice(0, count);
      }
      const isSelected = t >= tSelectStart && t < tStrikeEnd;
      if (isSelected !== lastStrikeSelected) {
        lastStrikeSelected = isSelected;
        strikeSpan.classList.toggle('is-selected', isSelected);
      }
      const pStrikeLine = clamp01(
        (t - tStrikeStart) / Math.max(0.01, tStrikeEnd - tStrikeStart)
      );
      const strikeStr = String(pStrikeLine);
      if (strikeStr !== lastStrikeLine) {
        lastStrikeLine = strikeStr;
        strikeSpan.style.setProperty('--m-strike', strikeStr);
      }
    }

    if (replSpan) {
      const pRepl = clamp01(
        (t - tReplaceStart) / Math.max(0.01, tReplaceEnd - tReplaceStart)
      );
      const count = countCharsFromProgress(pRepl, replThresholds);
      if (count !== lastReplCount) {
        lastReplCount = count;
        replSpan.textContent = replaceText.slice(0, count);
      }
    }

    if (afterSpan) {
      const pAfter = clamp01((t - tReplaceEnd) / Math.max(0.01, tAfterEnd - tReplaceEnd));
      const count = countCharsFromProgress(pAfter, afterThresholds);
      if (count !== lastAfterCount) {
        lastAfterCount = count;
        afterSpan.textContent = afterText.slice(0, count);
      }
    }

    if (manifestoCaret) {
      const shouldHide = hasStrike && t >= tSelectStart && t < tStrikeEnd;
      if (shouldHide) {
        if (lastMCaretHidden !== true) {
          lastMCaretHidden = true;
          manifestoCaret.classList.add('is-hidden');
        }
        if (lastMCaretTyping !== false) {
          lastMCaretTyping = false;
          manifestoCaret.classList.remove('is-typing');
        }
      } else {
        if (lastMCaretHidden !== false) {
          lastMCaretHidden = false;
          manifestoCaret.classList.remove('is-hidden');
        }
        let isTypingNow = false;
        if (t < tBeforeEnd) {
          placeManifestoCaret(caretBeforeAnchor);
          isTypingNow = t > 0;
        } else if (hasStrike && t < tStrikeTextEnd) {
          placeManifestoCaret(caretStrikeAnchor);
          isTypingNow = true;
        } else if (hasStrike && t < tReplaceStart) {
          placeManifestoCaret(caretStrikeAnchor);
          isTypingNow = false;
        } else if (t < tReplaceEnd) {
          placeManifestoCaret(caretReplAnchor);
          isTypingNow = true;
        } else if (t < tAfterEnd) {
          placeManifestoCaret(caretEndAnchor);
          isTypingNow = true;
        } else {
          placeManifestoCaret(caretEndAnchor);
          isTypingNow = false;
        }
        if (isTypingNow !== lastMCaretTyping) {
          lastMCaretTyping = isTypingNow;
          manifestoCaret.classList.toggle('is-typing', isTypingNow);
        }
      }
    }
  };

  let manifestoTl = null;
  let figureScrubTl = null;
  const masterLen = 10;
  const s = (t) => scaleForgeBeat(t, masterLen);
  const d = (dur) => scaleForgeBeat(dur, masterLen);
  const getTargetTl = () => (isDesktop ? manifestoTl : figureScrubTl);

  const scopedRevealSteps = createScopedTextRevealSteps(manifestoEl, {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
  });

  return [
    ...scopedRevealSteps,
    // Step 1: Forge geometry cache + time-based entrance
    () => {
      recomputeForgeMetrics(true);
      const onForgeRefreshInit = () => recomputeForgeMetrics(false);
      ScrollTrigger.addEventListener('refreshInit', onForgeRefreshInit);
      ctxCleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', onForgeRefreshInit));

      if (figureEl && figureInnerEl) {
        const entranceTl = gsap.timeline({
          scrollTrigger: {
            trigger: manifestoEl,
            start: isDesktop ? 'top 75%' : 'top 80%',
            toggleActions: 'play none none none',
          },
        });

        entranceTl
          .fromTo(
            figureEl,
            { clipPath: 'inset(100% 0 0 0)' },
            {
              clipPath: 'inset(0% 0 0 0)',
              duration: 1.1,
              ease: 'expo.out',
              immediateRender: true,
            },
            0
          )
          .fromTo(
            figureInnerEl,
            { scale: 1.14 },
            {
              scale: 1,
              duration: 1.4,
              ease: 'expo.out',
              immediateRender: true,
            },
            0
          );

        if (winEl) {
          entranceTl.fromTo(
            winEl,
            { y: () => unitPx() * 6, scale: 0.96, opacity: 0 },
            {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 0.7,
              ease: 'power3.out',
              immediateRender: true,
            },
            0.3
          );
        }

        if (wireCards.length > 0) {
          entranceTl.fromTo(
            wireCards,
            { opacity: 0, y: () => unitPx() * 2 },
            {
              opacity: 1,
              y: 0,
              duration: 0.5,
              ease: 'power2.out',
              stagger: { each: 0.05, from: 'start' },
              immediateRender: true,
            },
            0.5
          );
        }

        if (isDesktop && atomEls.length > 0) {
          entranceTl.fromTo(
            atomEls,
            { opacity: 0, scale: 0 },
            {
              opacity: 0.55,
              scale: 1,
              duration: 0.5,
              ease: 'back.out(2)',
              stagger: 0.06,
              immediateRender: true,
            },
            0.4
          );
        }
      }
    },
    // Step 2: Create timeline shell + scene push-in + atom drift (~10 tweens)
    () => {
      manifestoEl.dataset.pinBuilt = 'true';
      ctxCleanups.push(() => {
        delete manifestoEl.dataset.pinBuilt;
      });

      syncManifestoTyping(0);

      manifestoTl = gsap.timeline({
        paused: true,
        onUpdate: () => {
          syncManifestoTyping(manifestoTl.time());
        },
      });
      registerResponsiveTimeline(manifestoTl);

      manifestoTl.addLabel('select', tSelectStart);
      manifestoTl.addLabel('strike', tStrikeStart);
      manifestoTl.addLabel('replace', tReplaceStart);
      manifestoTl.addLabel('click', 8.4);
      manifestoTl.set({}, {}, 10);

      ctxCleanups.push(() => {
        if (beforeSpan) beforeSpan.textContent = beforeText;
        if (strikeSpan) {
          strikeSpan.textContent = strikeText;
          strikeSpan.classList.remove('is-selected');
          strikeSpan.style.setProperty('--m-strike', '1');
        }
        if (replSpan) replSpan.textContent = replaceText;
        if (afterSpan) afterSpan.textContent = afterText;
        if (manifestoCaret) {
          manifestoCaret.classList.remove('is-hidden', 'is-typing');
          placeManifestoCaret(caretEndAnchor);
        }
        if (postLikesCountEl) postLikesCountEl.textContent = formatSocialCounter(12400, false);
        FORGE_NOTIF_CHIPS.forEach((chip, idx) => {
          if (notifCountEls[idx]) {
            notifCountEls[idx].textContent = formatSocialCounter(chip.target, chip.withPlus);
          }
        });
      });

      if (!isDesktop && figureStageEl) {
        figureScrubTl = gsap.timeline({ paused: true });
        registerResponsiveTimeline(figureScrubTl);
      }

      const tl = getTargetTl();
      if (!tl) return;

      if (figureSceneEl) {
        tl.fromTo(
          figureSceneEl,
          { scale: 1 },
          { scale: 1.04, duration: d(10), ease: 'none', immediateRender: true },
          s(0)
        );
      }
      if (isDesktop && atomEls.length > 0) {
        atomEls.forEach((atom) => {
          const speed = Number(atom.dataset.speed || '1');
          const rotSign = Number(atom.dataset.rotSign || '1');
          tl.fromTo(
            atom,
            { y: 0, rotation: 0 },
            {
              y: () => -unitPx() * (3 + speed * 4),
              rotation: rotSign * 40,
              duration: d(10),
              ease: 'none',
              immediateRender: true,
            },
            s(0)
          );
        });
      }
    },
    // Step 3: Wireframe DrawSVG outlines + cursor Z-path tour + design/code chips (~14 tweens)
    () => {
      const tl = getTargetTl();
      if (!tl) return;

      if (outlineRects.length > 0 && DrawSVGPlugin) {
        tl.fromTo(
          outlineRects,
          { drawSVG: '0%', opacity: 1 },
          {
            drawSVG: '100%',
            duration: d(0.85),
            ease: 'power1.inOut',
            stagger: d(0.18),
            immediateRender: true,
          },
          s(0)
        );
      }

      if (cursorEl) {
        if (!isPhone && wireCards.length === 9) {
          const firstCard = wireCards[FORGE_Z_PATH_ORDER[0]];
          tl.fromTo(
            cursorEl,
            {
              opacity: 0,
              x: () => unitPx() * 86,
              y: () => unitPx() * 8,
            },
            {
              opacity: 1,
              x: () => getSceneTargetPos(firstCard).x,
              y: () => getSceneTargetPos(firstCard).y,
              duration: d(0.35),
              ease: 'power1.inOut',
              immediateRender: true,
            },
            s(0.4)
          );

          FORGE_Z_PATH_ORDER.forEach((cardIdx, stepIdx) => {
            const card = wireCards[cardIdx];
            const stepAt = 0.4 + stepIdx * 0.28;
            if (stepIdx > 0 && card) {
              tl.to(
                cursorEl,
                {
                  x: () => getSceneTargetPos(card).x,
                  y: () => getSceneTargetPos(card).y,
                  duration: d(0.28),
                  ease: 'power1.inOut',
                },
                s(stepAt)
              );
            }
            if (card) {
              tl.fromTo(
                card,
                { scale: 1 },
                {
                  scale: 1.04,
                  duration: d(0.1),
                  ease: 'power1.out',
                  yoyo: true,
                  repeat: 1,
                  immediateRender: false,
                },
                s(stepAt + 0.14)
              );
            }
          });
        } else {
          tl.fromTo(
            cursorEl,
            {
              opacity: 0,
              x: () => unitPx() * 76,
              y: () => unitPx() * 20,
            },
            { opacity: 0, duration: d(0.1), immediateRender: true },
            s(0)
          );
        }
      }

      if (chipDesignEl) {
        tl.fromTo(
          chipDesignEl,
          { scale: 0, y: () => unitPx() * 3 },
          {
            scale: 1,
            y: 0,
            duration: d(0.55),
            ease: 'back.out(2)',
            immediateRender: true,
          },
          s(3.0)
        );
      }
      if (chipCodeEl) {
        tl.fromTo(
          chipCodeEl,
          { scale: 0, y: () => unitPx() * 3 },
          {
            scale: 1,
            y: 0,
            duration: d(0.55),
            ease: 'back.out(2)',
            immediateRender: true,
          },
          s(3.45)
        );
      }
      if (linkMaskPathEl && DrawSVGPlugin && !isPhone) {
        tl.fromTo(
          linkMaskPathEl,
          { drawSVG: '0% 0%' },
          {
            drawSVG: '0% 100%',
            duration: d(0.7),
            ease: 'power2.inOut',
            immediateRender: true,
          },
          s(3.9)
        );
      }
    },
    // Step 4: Marquee selection + diagonal strike + tag/caption swap (~15 tweens)
    () => {
      const tl = getTargetTl();
      if (!tl) return;

      if (cursorEl && !isPhone && wireGridWrapEl) {
        tl.to(
          cursorEl,
          {
            x: () => getSceneTargetPos(wireGridWrapEl).x,
            y: () => getSceneTargetPos(wireGridWrapEl).y,
            duration: d(0.6),
            ease: 'power2.inOut',
          },
          s(4.6)
        );
      }
      if (marqueeEl) {
        tl.fromTo(
          marqueeEl,
          { opacity: 0, scale: 0.96, backgroundColor: 'rgba(122, 15, 20, 0.10)' },
          {
            opacity: 1,
            scale: 1,
            duration: d(0.75),
            ease: 'power2.out',
            immediateRender: true,
          },
          s(4.65)
        );
        tl.to(
          marqueeEl,
          {
            backgroundColor: 'rgba(122, 15, 20, 0.22)',
            duration: d(0.55),
            ease: 'power1.inOut',
          },
          s(6.2)
        );
      }
      if (tagAEl) {
        tl.fromTo(
          tagAEl,
          { scale: 1 },
          {
            scale: 1.08,
            duration: d(0.3),
            ease: 'power1.out',
            yoyo: true,
            repeat: 1,
            immediateRender: true,
          },
          s(6.2)
        );
      }
      if (wireCards.length > 0) {
        tl.fromTo(
          wireCards,
          { backgroundColor: '#e6dfdb' },
          {
            backgroundColor: '#f3d9db',
            duration: d(0.55),
            ease: 'power1.inOut',
            immediateRender: true,
          },
          s(6.2)
        );
      }

      if (strikeLineEl && DrawSVGPlugin) {
        tl.fromTo(
          strikeLineEl,
          { drawSVG: '0%', opacity: 1 },
          {
            drawSVG: '100%',
            duration: d(0.35),
            ease: 'power2.out',
            immediateRender: true,
          },
          s(6.8)
        );
        tl.to(
          strikeLineEl,
          { opacity: 0, duration: d(0.25), ease: 'power1.in' },
          s(7.15)
        );
      }
      if (tagAStrikeEl) {
        tl.fromTo(
          tagAStrikeEl,
          { scaleX: 0 },
          {
            scaleX: 1,
            transformOrigin: 'right center',
            duration: d(0.35),
            ease: 'power2.out',
            immediateRender: true,
          },
          s(6.8)
        );
      }
      if (wireCards.length > 0) {
        tl.to(
          wireCards,
          {
            scale: 0.7,
            opacity: 0,
            duration: d(0.3),
            ease: 'power2.in',
            stagger: { each: 0.03, from: 'center' },
          },
          s(6.88)
        );
      }
      if (outlineRects.length > 0) {
        tl.to(
          outlineRects,
          { opacity: 0, duration: d(0.25), ease: 'power1.in' },
          s(6.88)
        );
      }
      if (marqueeEl) {
        tl.to(
          marqueeEl,
          { opacity: 0, duration: d(0.25), ease: 'power1.in' },
          s(6.92)
        );
      }
      if (wireGridWrapEl) {
        tl.fromTo(
          wireGridWrapEl,
          { autoAlpha: 1 },
          { autoAlpha: 0, duration: d(0.15), ease: 'power1.in', immediateRender: true },
          s(7.2)
        );
      }

      if (tagAEl && tagBEl) {
        tl.fromTo(
          tagAEl,
          { opacity: 1 },
          { opacity: 0, duration: d(0.25), ease: 'power1.in', immediateRender: true },
          s(7.2)
        );
        tl.fromTo(
          tagBEl,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: d(0.4), ease: 'power2.out', immediateRender: true },
          s(7.2)
        );
      }
      if (capAEl && capBEl) {
        tl.fromTo(
          capAEl,
          { opacity: 1, y: 0 },
          { opacity: 0, y: -6, duration: d(0.35), ease: 'power2.in', immediateRender: true },
          s(7.2)
        );
        tl.fromTo(
          capBEl,
          { opacity: 0, y: 6 },
          { opacity: 1, y: 0, duration: d(0.4), ease: 'power2.out', immediateRender: true },
          s(7.2)
        );
      }
    },
    // Step 5: Branded page build + CTA click + spark rotation (~15 tweens)
    () => {
      const tl = getTargetTl();
      if (!tl) return;

      if (layerBrandEl) {
        tl.fromTo(
          layerBrandEl,
          { opacity: 0 },
          { opacity: 1, duration: d(0.28), ease: 'power1.out', immediateRender: true },
          s(7.32)
        );
      }
      if (brandNavEl) {
        tl.fromTo(
          brandNavEl,
          { y: () => -unitPx() * 2, opacity: 0 },
          { y: 0, opacity: 1, duration: d(0.45), ease: 'power2.out', immediateRender: true },
          s(7.25)
        );
      }
      if (brandWordmarkEl) {
        tl.fromTo(
          brandWordmarkEl,
          { '--wm-dot': '0.9px' },
          { '--wm-dot': '3.2px', duration: d(0.9), ease: 'power2.out', immediateRender: true },
          s(7.3)
        );
      }
      if (brandBars.length > 0) {
        tl.fromTo(
          brandBars,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: d(0.45),
            stagger: d(0.12),
            ease: 'power2.out',
            immediateRender: true,
          },
          s(7.45)
        );
      }
      if (brandMediaEl) {
        tl.fromTo(
          brandMediaEl,
          { y: () => unitPx() * 4, opacity: 0 },
          { y: 0, opacity: 1, duration: d(0.5), ease: 'power2.out', immediateRender: true },
          s(7.4)
        );
      }
      if (sparkPathEl) {
        if (DrawSVGPlugin) {
          tl.fromTo(
            sparkPathEl,
            { drawSVG: '0%' },
            { drawSVG: '100%', duration: d(0.55), ease: 'power2.inOut', immediateRender: true },
            s(7.45)
          );
        }
        tl.fromTo(
          sparkPathEl,
          { fillOpacity: 0 },
          { fillOpacity: 1, duration: d(0.3), ease: 'power2.out', immediateRender: true },
          s(8.0)
        );
      }
      if (sparkGuidesEl) {
        tl.fromTo(
          sparkGuidesEl,
          { opacity: 0 },
          { opacity: 1, duration: d(0.18), ease: 'power1.out', immediateRender: true },
          s(7.45)
        );
        tl.to(
          sparkGuidesEl,
          { opacity: 0, duration: d(0.22), ease: 'power1.in' },
          s(8.05)
        );
      }
      if (brandBtnEl) {
        tl.fromTo(
          brandBtnEl,
          { scale: 0 },
          {
            scale: 1,
            duration: d(0.7),
            ease: 'elastic.out(1, 0.5)',
            immediateRender: true,
          },
          s(7.7)
        );
      }

      if (cursorEl && brandBtnEl) {
        tl.to(
          cursorEl,
          {
            opacity: 1,
            x: () => getSceneTargetPos(brandBtnEl).x,
            y: () => getSceneTargetPos(brandBtnEl).y,
            duration: d(0.45),
            ease: 'power2.inOut',
          },
          s(8.4)
        );
      }
      if (brandBtnEl) {
        tl.to(
          brandBtnEl,
          {
            scale: 0.94,
            duration: d(0.1),
            ease: 'power1.in',
            yoyo: true,
            repeat: 1,
          },
          s(8.88)
        );
      }
      if (brandRippleEl) {
        tl.fromTo(
          brandRippleEl,
          { scale: 0, opacity: 0.6 },
          {
            scale: 2.4,
            opacity: 0,
            duration: d(0.6),
            ease: 'power2.out',
            immediateRender: true,
          },
          s(8.88)
        );
      }
      if (chipCodeEl) {
        tl.to(
          chipCodeEl,
          {
            scale: 1.08,
            duration: d(0.16),
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
          },
          s(8.92)
        );
      }

      if (sparkPathEl) {
        tl.fromTo(
          sparkPathEl,
          { rotation: 0, svgOrigin: '50 50' },
          {
            rotation: 20,
            svgOrigin: '50 50',
            duration: d(0.8),
            ease: 'none',
            immediateRender: true,
          },
          s(9.2)
        );
      }
    },
    // Step 6: Social layer + story ring + post card + burst hearts (~15 tweens)
    () => {
      const tl = getTargetTl();
      if (!tl) return;

      if (!tl.labels || typeof tl.labels.click !== 'number') {
        tl.addLabel('click', s(8.4));
      }

      if (postLikesCountEl) postLikesCountEl.textContent = formatSocialCounter(0, false);
      FORGE_NOTIF_CHIPS.forEach((chip, idx) => {
        if (notifCountEls[idx]) {
          notifCountEls[idx].textContent = formatSocialCounter(0, chip.withPlus);
        }
      });

      if (socialLayerEl) {
        tl.fromTo(
          socialLayerEl,
          { y: 0 },
          { y: () => -socialUnitPx() * 2, duration: d(10), ease: 'none', immediateRender: true },
          s(0)
        );
      }

      if (storyEl) {
        tl.fromTo(
          storyEl,
          { scale: 0, opacity: 0 },
          {
            scale: 1,
            opacity: 1,
            duration: d(0.55),
            ease: 'back.out(2)',
            immediateRender: true,
          },
          s(7.4)
        );
      }
      if (storyRingCircleEl && DrawSVGPlugin) {
        tl.fromTo(
          storyRingCircleEl,
          { drawSVG: '0%' },
          {
            drawSVG: '100%',
            duration: d(0.7),
            ease: 'power2.inOut',
            immediateRender: true,
          },
          s(7.4)
        );
      }
      if (hashtagEl) {
        tl.fromTo(
          hashtagEl,
          { scale: 0, rotation: -10, opacity: 0 },
          {
            scale: 1,
            rotation: -4,
            opacity: 1,
            duration: d(0.55),
            ease: 'back.out(2.4)',
            immediateRender: true,
          },
          s(7.55)
        );
      }

      if (postEl) {
        tl.fromTo(
          postEl,
          {
            x: () => socialUnitPx() * 10,
            y: () => socialUnitPx() * 12,
            scale: 0.78,
            rotation: 0,
            opacity: 0,
          },
          {
            x: 0,
            y: 0,
            scale: 1,
            rotation: -5,
            opacity: 1,
            duration: d(0.8),
            ease: 'back.out(1.6)',
            immediateRender: true,
          },
          s(7.8)
        );
      }

      if (postActHeartEl) {
        tl.fromTo(
          postActHeartEl,
          { scale: 1 },
          {
            scale: 1.5,
            duration: d(0.125),
            ease: 'power2.out',
            yoyo: true,
            repeat: 1,
            immediateRender: true,
          },
          'click'
        );
      }
      if (postActHeartPathEl) {
        tl.fromTo(
          postActHeartPathEl,
          { fillOpacity: 0, stroke: '#1b1b1b' },
          {
            fillOpacity: 1,
            stroke: '#7a0f14',
            duration: d(0.22),
            ease: 'power2.out',
            immediateRender: true,
          },
          'click'
        );
      }
      if (postLikesCountEl) {
        const likesProxy = { n: 0 };
        let lastLikesText = postLikesCountEl.textContent;
        tl.fromTo(
          likesProxy,
          { n: 0 },
          {
            n: 12400,
            duration: d(0.9),
            ease: 'power2.out',
            immediateRender: true,
            onUpdate: () => {
              const nextText = formatSocialCounter(likesProxy.n, false);
              if (nextText !== lastLikesText) {
                lastLikesText = nextText;
                postLikesCountEl.textContent = nextText;
              }
            },
          },
          'click'
        );
      }

      const activeBurstCount = isPhone ? 4 : FORGE_BURST_HEARTS.length;
      burstHeartEls.slice(0, activeBurstCount).forEach((heartEl, idx) => {
        const spec = FORGE_BURST_HEARTS[idx];
        if (!spec) return;
        const heartAt = `click+=${d(idx * 0.08)}`;
        tl.fromTo(
          heartEl,
          {
            xPercent: -50,
            yPercent: -50,
            x: () => getHeartOriginPx().x,
            y: () => getHeartOriginPx().y,
            rotation: 0,
          },
          {
            x: () => getHeartOriginPx().x + socialUnitPx() * spec.dxU,
            y: () => getHeartOriginPx().y - socialUnitPx() * spec.dyU,
            rotation: spec.rotDeg,
            duration: d(0.9),
            ease: 'power2.out',
            immediateRender: true,
          },
          heartAt
        );
        tl.fromTo(
          heartEl,
          { opacity: 0, scale: 0.4 },
          {
            opacity: 1,
            scale: 1,
            duration: d(0.25),
            ease: 'power2.out',
            immediateRender: true,
          },
          heartAt
        );
        tl.to(
          heartEl,
          {
            opacity: 0,
            scale: 0.8,
            duration: d(0.65),
            ease: 'power1.in',
          },
          `click+=${d(idx * 0.08 + 0.25)}`
        );
      });
    },
    // Step 7: Notification chips + story ring rotate + attach ScrollTrigger
    () => {
      const tl = getTargetTl();
      if (tl) {
        FORGE_NOTIF_CHIPS.forEach((chip, idx) => {
          const cardEl = notifCards[idx];
          const slotEl = notifSlots[idx];
          const countEl = notifCountEls[idx];
          const popAt = s(8.6 + idx * 0.18);

          if (cardEl) {
            tl.fromTo(
              cardEl,
              { scale: 0, y: () => socialUnitPx() * 3, opacity: 0 },
              {
                scale: 1,
                y: 0,
                opacity: 1,
                duration: d(0.45),
                ease: 'back.out(2)',
                immediateRender: true,
              },
              popAt
            );
          }
          if (countEl) {
            const countProxy = { n: 0 };
            let lastChipText = countEl.textContent;
            tl.fromTo(
              countProxy,
              { n: 0 },
              {
                n: chip.target,
                duration: d(0.8),
                ease: 'power2.out',
                immediateRender: true,
                onUpdate: () => {
                  const nextText = formatSocialCounter(countProxy.n, chip.withPlus);
                  if (nextText !== lastChipText) {
                    lastChipText = nextText;
                    countEl.textContent = nextText;
                  }
                },
              },
              popAt
            );
          }
          if (slotEl) {
            tl.fromTo(
              slotEl,
              { y: 0 },
              {
                y: () => -socialUnitPx() * (1 + idx),
                duration: d(1.4),
                ease: 'none',
                immediateRender: true,
              },
              s(8.6)
            );
          }
        });

        if (storyRingSvgEl) {
          tl.fromTo(
            storyRingSvgEl,
            { rotation: 0, svgOrigin: '50 50' },
            {
              rotation: 30,
              svgOrigin: '50 50',
              duration: d(0.4),
              ease: 'none',
              immediateRender: true,
            },
            s(9.6)
          );
        }

        tl.set({}, {}, s(10));
      }

      if (manifestoTl) {
        ScrollTrigger.create(
          isDesktop
            ? {
                animation: manifestoTl,
                trigger: manifestoEl,
                start: 'top top',
                end: '+=300%',
                pin: true,
                scrub: 0.5,
                anticipatePin: 1,
                onRefresh: () => syncManifestoTyping(manifestoTl.time()),
              }
            : {
                animation: manifestoTl,
                trigger: manifestoEl,
                start: 'top 75%',
                end: 'bottom 45%',
                scrub: true,
                onRefresh: () => syncManifestoTyping(manifestoTl.time()),
              }
        );
      }
      if (!isDesktop && figureStageEl && figureScrubTl) {
        ScrollTrigger.create({
          animation: figureScrubTl,
          trigger: figureStageEl,
          start: 'top 70%',
          end: 'bottom 35%',
          scrub: true,
        });
      }
    },
  ];
}

export function initAbout(env, runnerOpts) {
  return runChunkedSectionInit('about', createAboutSteps(env), runnerOpts);
}
