import { validateContactFields } from '../../utils/typewriterBeats.js';
import { computeContactFitScale, segmentGraphemes } from '../../utils/contactFit.js';
import { createScopedTextRevealSteps, runChunkedSectionInit } from './shared.js';

export function createContactFit({ ScrollTrigger, landscapeTouchQuery, getLayoutKey }) {
  let lastContactFitKey = '';
  return (shouldRefresh = false, force = false) => {
    const contactEl = document.querySelector('#contact');
    const innerEl = contactEl?.querySelector('.contact-inner');
    if (!contactEl || !innerEl) return;

    const key = getLayoutKey();
    if (!force && lastContactFitKey === key) return;
    lastContactFitKey = key;

    const isDesktopFit = window.innerWidth >= 992 && !landscapeTouchQuery.matches;
    if (!isDesktopFit) {
      if (contactEl.dataset.fit) {
        delete contactEl.dataset.fit;
        contactEl.style.removeProperty('--fit');
      }
      contactEl.classList.remove('contact--tall');
      if (shouldRefresh) ScrollTrigger.refresh();
      return;
    }

    const prevFit = Number(contactEl.dataset.fit) || 1;
    const cs = getComputedStyle(contactEl);
    const pt = parseFloat(cs.paddingTop) || 0;
    const pb = parseFloat(cs.paddingBottom) || 0;
    const available = Math.max(1, window.innerHeight - pt - pb);
    const measuredHeight = Math.max(
      innerEl.scrollHeight,
      Math.ceil(innerEl.getBoundingClientRect().height)
    );
    const naturalEquivalent = measuredHeight / Math.max(0.55, prevFit);
    const result = computeContactFitScale(available, naturalEquivalent);

    if (String(result.fit) !== contactEl.dataset.fit) {
      contactEl.dataset.fit = String(result.fit);
      contactEl.style.setProperty('--fit', String(result.fit));
    }
    contactEl.classList.toggle('contact--tall', result.isTall);
    if (shouldRefresh) ScrollTrigger.refresh();
  };
}

export function setupContactForm(isReduced, onHeightChange, { gsap, SplitText }) {
  const notifyHeightChange = typeof onHeightChange === 'function' ? onHeightChange : () => {};
  const formEl = document.querySelector('.sheet-form');
  const sheetEl = document.querySelector('.sheet');
  if (!formEl || !sheetEl) return () => {};

  const nameInput = formEl.querySelector('#contact-name');
  const emailInput = formEl.querySelector('#contact-email');
  const phoneInput = formEl.querySelector('#contact-phone');
  const companyInput = formEl.querySelector('#contact-company');
  const msgInput = formEl.querySelector('#contact-msg');
  const submitBtn = formEl.querySelector('.sheet-submit');
  const confirmBox = formEl.querySelector('.sheet-confirm');
  const confirmTitle = formEl.querySelector('.sheet-confirm-title');
  const confirmBody = formEl.querySelector('.sheet-confirm-body');
  const confirmStamp = formEl.querySelector('.confirm-stamp');
  const formFieldsWrap = formEl.querySelector('.sheet-fields-area');

  const nameError = formEl.querySelector('#contact-name-error');
  const emailError = formEl.querySelector('#contact-email-error');
  const phoneError = formEl.querySelector('#contact-phone-error');
  const companyError = formEl.querySelector('#contact-company-error');
  const msgError = formEl.querySelector('#contact-msg-error');
  const allErrorEls = Array.from(formEl.querySelectorAll('.sheet-error'));

  const fieldEntries = [
    { key: 'name', input: nameInput, errorEl: nameError },
    { key: 'email', input: emailInput, errorEl: emailError },
    { key: 'phone', input: phoneInput, errorEl: phoneError },
    { key: 'company', input: companyInput, errorEl: companyError },
    { key: 'message', input: msgInput, errorEl: msgError },
  ].filter((entry) => Boolean(entry.input));

  if (!nameInput || !emailInput || !submitBtn) return () => {};

  const wideQuery = window.matchMedia('(min-width: 601px)');
  const isWideContact = () => wideQuery.matches;
  const fadeTimers = new Map();
  let submitted = false;

  const clearPendingFade = (errorEl) => {
    const existingTimer = fadeTimers.get(errorEl);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      fadeTimers.delete(errorEl);
    }
  };

  const syncErrorNodesForViewport = () => {
    const wide = isWideContact();
    allErrorEls.forEach((errEl) => {
      clearPendingFade(errEl);
      const fieldEl = errEl.closest('.sheet-field');
      const isInvalid = Boolean(fieldEl?.classList.contains('is-invalid'));
      if (wide) {
        errEl.hidden = false;
        if (!isInvalid) errEl.textContent = '';
      } else {
        errEl.hidden = !isInvalid;
        if (!isInvalid) errEl.textContent = '';
      }
    });
  };

  syncErrorNodesForViewport();
  wideQuery.addEventListener('change', syncErrorNodesForViewport);

  const setFieldError = (input, errorEl, message) => {
    const invalid = Boolean(message);
    const fieldEl = input.closest('.sheet-field');
    input.classList.toggle('is-invalid', invalid);
    fieldEl?.classList.toggle('is-invalid', invalid);
    input.setAttribute('aria-invalid', invalid ? 'true' : 'false');

    if (!errorEl) return;
    clearPendingFade(errorEl);

    if (isWideContact()) {
      errorEl.hidden = false;
      if (invalid && message) {
        errorEl.textContent = message;
      } else if (errorEl.textContent) {
        const timerId = window.setTimeout(() => {
          fadeTimers.delete(errorEl);
          if (!fieldEl?.classList.contains('is-invalid')) {
            errorEl.textContent = '';
          }
        }, 220);
        fadeTimers.set(errorEl, timerId);
      }
      return;
    }

    errorEl.hidden = !invalid;
    errorEl.textContent = message ?? '';
  };

  const onInputStroke = (e) => {
    if (submitted) return;
    const target = e.currentTarget;
    let clearedError = false;
    const matchingEntry = fieldEntries.find((entry) => entry.input === target);
    if (matchingEntry && matchingEntry.input.classList.contains('is-invalid')) {
      setFieldError(matchingEntry.input, matchingEntry.errorEl, null);
      clearedError = true;
    }
    if (clearedError && !isWideContact()) notifyHeightChange();
    if (isReduced || !gsap) return;
    gsap.fromTo(
      sheetEl,
      { y: 0 },
      { y: 1, duration: 0.06, yoyo: true, repeat: 1, ease: 'power1.inOut' }
    );
  };

  const inputs = fieldEntries.map((entry) => entry.input);
  inputs.forEach((el) => el.addEventListener('input', onInputStroke));

  const typeIntoEl = (el, text, durationSec) => {
    if (isReduced || !gsap) {
      el.textContent = text;
      return;
    }
    const state = { n: 0 };
    gsap.to(state, {
      n: text.length,
      duration: durationSec,
      ease: 'none',
      onUpdate: () => {
        el.textContent = text.slice(0, Math.round(state.n));
      },
    });
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (submitted) return;

    const validation = validateContactFields({
      name: nameInput.value,
      email: emailInput.value,
      phone: phoneInput?.value ?? '',
      company: companyInput?.value ?? '',
      message: msgInput?.value ?? '',
    });

    const invalidEls = [];
    fieldEntries.forEach(({ key, input, errorEl }) => {
      const errMsg = validation.errors[key];
      setFieldError(input, errorEl, errMsg);
      if (errMsg) invalidEls.push(input);
    });

    if (!validation.isValid) {
      if (!isWideContact()) notifyHeightChange();
      if (invalidEls[0]) invalidEls[0].focus();
      if (!isReduced && gsap && invalidEls.length > 0) {
        if (isWideContact()) {
          invalidEls.forEach((inputEl) => {
            gsap.fromTo(
              inputEl,
              { x: 0 },
              {
                keyframes: [{ x: -6 }, { x: 6 }, { x: -4 }, { x: 0 }],
                duration: 0.35,
                clearProps: 'transform',
              }
            );
          });
        } else {
          gsap.fromTo(
            invalidEls,
            { x: -6 },
            {
              x: 6,
              duration: 0.06,
              repeat: 4,
              yoyo: true,
              ease: 'power1.inOut',
              onComplete: () => gsap.set(invalidEls, { x: 0 }),
            }
          );
        }
      }
      return;
    }

    submitted = true;
    const submittedEmail = emailInput.value.trim();
    submitBtn.disabled = true;
    submitBtn.textContent = 'جارٍ الإرسال…';

    const finishSubmit = () => {
      if (isReduced || !gsap) {
        if (formFieldsWrap) formFieldsWrap.style.display = 'none';
        if (confirmBox) confirmBox.hidden = false;
        if (confirmTitle) confirmTitle.textContent = 'تم استلام طلبك.';
        if (confirmBody) {
          confirmBody.textContent = `سنتواصل معك عبر ${submittedEmail} خلال يوم عمل واحد.`;
        }
        if (confirmStamp) {
          confirmStamp.style.opacity = '0.9';
          confirmStamp.style.transform = 'scale(1) rotate(-10deg)';
        }
        submitBtn.textContent = 'تم الإرسال ✓';
        notifyHeightChange();
        return;
      }

      const targets = formFieldsWrap
        ? Array.from(formFieldsWrap.querySelectorAll('.sheet-heading, .sheet-label'))
        : [];
      const flyingWords = [];

      targets.forEach((el) => {
        if (SplitText) {
          const split = new SplitText(el, { type: 'words', aria: 'none' });
          if (el.tagName === 'P' || el.tagName === 'BLOCKQUOTE' || el.tagName === 'LABEL') {
            el.removeAttribute('aria-label');
          }
          flyingWords.push(...split.words);
        } else {
          flyingWords.push(el);
        }
      });

      if (flyingWords.length > 0) {
        gsap.to(flyingWords, {
          x: () => gsap.utils.random(-260, 260),
          y: () => gsap.utils.random(-440, -110),
          rotation: () => gsap.utils.random(-65, 65),
          opacity: 0,
          duration: 1.1,
          ease: 'power2.in',
          stagger: { amount: 0.5, from: 'random' },
        });
      }

      const fieldFadeEls = formFieldsWrap
        ? Array.from(formFieldsWrap.querySelectorAll('.sheet-input, .sheet-textarea'))
        : [];

      gsap.to(fieldFadeEls, {
        opacity: 0,
        duration: 0.6,
        ease: 'power2.in',
      });

      gsap.delayedCall(0.75, () => {
        if (formFieldsWrap) formFieldsWrap.style.display = 'none';
        if (confirmBox) confirmBox.hidden = false;
        if (confirmTitle) {
          typeIntoEl(confirmTitle, 'تم استلام طلبك.', 0.6);
        }
        if (confirmBody) {
          gsap.delayedCall(0.5, () => {
            typeIntoEl(
              confirmBody,
              `سنتواصل معك عبر ${submittedEmail} خلال يوم عمل واحد.`,
              0.9
            );
          });
        }
        if (confirmStamp) {
          gsap.fromTo(
            confirmStamp,
            { scale: 2.4, opacity: 0, rotation: 8 },
            {
              scale: 1,
              opacity: 0.9,
              rotation: -10,
              duration: 0.22,
              ease: 'power4.in',
              delay: 0.5,
              onComplete: () => {
                gsap.fromTo(
                  sheetEl,
                  { x: 5, y: 2 },
                  {
                    x: -4,
                    y: 0,
                    duration: 0.04,
                    repeat: 3,
                    yoyo: true,
                    ease: 'none',
                    onComplete: () => gsap.set(sheetEl, { x: 0, y: 0 }),
                  }
                );
              },
            }
          );
        }
        submitBtn.textContent = 'تم الإرسال ✓';
        notifyHeightChange();
      });
    };

    window.setTimeout(finishSubmit, isReduced ? 0 : 600);
  };

  formEl.addEventListener('submit', onSubmit);

  return () => {
    wideQuery.removeEventListener('change', syncErrorNodesForViewport);
    fadeTimers.forEach((id) => window.clearTimeout(id));
    fadeTimers.clear();
    inputs.forEach((el) => el.removeEventListener('input', onInputStroke));
    formEl.removeEventListener('submit', onSubmit);
  };
}

export function createContactSteps(env) {
  const {
    gsap,
    ScrollTrigger,
    SplitText,
    ScrambleTextPlugin,
    isDesktop,
    finePointerQuery,
    ctxCleanups,
    ensureContactFormWired,
    fitContact,
  } = env;

  const contactSection = document.querySelector('#contact');
  const sheetWrap = document.querySelector('.sheet-wrap');
  const sheetInner = document.querySelector('.sheet');
  const knobs = Array.from(document.querySelectorAll('.platen-knob'));
  const sheetHeading = document.querySelector('.sheet-heading');
  const sheetLabels = Array.from(document.querySelectorAll('.sheet-label'));
  const sheetLines = Array.from(document.querySelectorAll('.sheet-field-line'));
  const sheetSubmitBtn = document.querySelector('.sheet-submit');

  let bodySplit = null;
  const scopedRevealSteps = contactSection
    ? createScopedTextRevealSteps(contactSection, {
        gsap,
        ScrollTrigger,
        SplitText,
        ScrambleTextPlugin,
      })
    : [];

  return [
    () => {
      ensureContactFormWired();
      fitContact(false);
    },
    ...scopedRevealSteps,
    // Yielded SplitText step for contact body copy (1 SplitText element per task)
    () => {
      if (!contactSection) return;
      const contactBody = contactSection.querySelector('[data-contact-body]');
      if (contactBody && SplitText) {
        bodySplit = new SplitText(contactBody, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'line',
          aria: 'none',
        });
      }
      if (contactBody && contactBody.tagName === 'P') {
        contactBody.removeAttribute('aria-label');
      }
    },
    () => {
      if (contactSection) {
        const headlineLines = Array.from(
          contactSection.querySelectorAll('.contact-headline-line')
        );
        const contactEyebrow = contactSection.querySelector('[data-contact-eyebrow]');
        const contactBody = contactSection.querySelector('[data-contact-body]');
        const detailsRule = contactSection.querySelector('.contact-details-rule');
        const detailRows = Array.from(contactSection.querySelectorAll('.contact-detail-row'));

        const bodyLines = [
          ...(contactEyebrow ? [contactEyebrow] : []),
          ...(bodySplit ? bodySplit.lines : contactBody ? [contactBody] : []),
        ];

        const triggerStart = isDesktop ? 'top 38%' : 'top 75%';
        const contactTl = gsap.timeline({
          scrollTrigger: {
            trigger: contactSection,
            start: triggerStart,
            toggleActions: 'play none none none',
            once: true,
          },
        });

        if (headlineLines.length > 0) {
          contactTl.fromTo(
            headlineLines,
            { yPercent: 105 },
            {
              yPercent: 0,
              duration: 0.9,
              ease: 'expo.out',
              stagger: 0.12,
              immediateRender: true,
            },
            0
          );
        }

        if (bodyLines.length > 0) {
          contactTl.fromTo(
            bodyLines,
            { yPercent: 100 },
            {
              yPercent: 0,
              duration: 0.8,
              ease: 'expo.out',
              stagger: 0.07,
              immediateRender: true,
            },
            0.2
          );
        }

        if (detailsRule) {
          contactTl.fromTo(
            detailsRule,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.6,
              ease: 'expo.out',
              transformOrigin: 'right center',
              immediateRender: true,
            },
            0.4
          );
        }
        if (detailRows.length > 0) {
          contactTl.fromTo(
            detailRows,
            { opacity: 0, y: 14 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: 'expo.out',
              stagger: 0.08,
              immediateRender: true,
            },
            0.4
          );
        }

        if (sheetInner) {
          contactTl.fromTo(
            sheetInner,
            { clipPath: 'inset(0 0 100% 0)', yPercent: -30 },
            {
              clipPath: 'inset(0 0 0% 0)',
              yPercent: 0,
              duration: 1.1,
              ease: 'power3.inOut',
              immediateRender: true,
            },
            0.3
          );
        }
        if (knobs.length > 0) {
          contactTl.fromTo(
            knobs,
            { rotation: 0 },
            {
              rotation: 360,
              duration: 1.1,
              ease: 'power3.inOut',
              immediateRender: true,
            },
            0.3
          );
        }

        if (sheetHeading) {
          const fullHeading = sheetHeading.dataset.text || sheetHeading.textContent || '';
          const headingGraphemes = segmentGraphemes(fullHeading, 'ar');
          const hState = { count: 0 };
          let lastHeadingCount = 0;
          sheetHeading.textContent = '';
          contactTl.to(
            hState,
            {
              count: headingGraphemes.length,
              duration: 0.4,
              ease: 'none',
              onUpdate: () => {
                const nextCount = Math.round(hState.count);
                if (nextCount === lastHeadingCount) return;
                lastHeadingCount = nextCount;
                sheetHeading.textContent = headingGraphemes.slice(0, nextCount).join('');
              },
            },
            1.2
          );
          ctxCleanups.push(() => {
            sheetHeading.textContent = fullHeading;
          });
        }

        sheetLabels.forEach((lbl, idx) => {
          const fullText = lbl.dataset.text || lbl.textContent || '';
          const labelGraphemes = segmentGraphemes(fullText, 'ar');
          const lState = { count: 0 };
          let lastLabelCount = 0;
          lbl.textContent = '';
          contactTl.to(
            lState,
            {
              count: labelGraphemes.length,
              duration: 0.25,
              ease: 'none',
              onUpdate: () => {
                const nextCount = Math.round(lState.count);
                if (nextCount === lastLabelCount) return;
                lastLabelCount = nextCount;
                lbl.textContent = labelGraphemes.slice(0, nextCount).join('');
              },
            },
            1.4 + idx * 0.12
          );
          ctxCleanups.push(() => {
            lbl.textContent = fullText;
          });
        });

        if (sheetLines.length > 0) {
          contactTl.fromTo(
            sheetLines,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 0.36,
              ease: 'power2.out',
              stagger: 0.06,
              transformOrigin: 'right center',
              immediateRender: true,
            },
            1.5
          );
        }

        if (sheetSubmitBtn) {
          contactTl.set(sheetSubmitBtn, { opacity: 0 }, 0);
          contactTl.to(
            sheetSubmitBtn,
            {
              keyframes: [
                { opacity: 0.4, duration: 0.1, ease: 'steps(1)' },
                { opacity: 0, duration: 0.1, ease: 'steps(1)' },
                { opacity: 1, duration: 0.1, ease: 'steps(1)' },
              ],
            },
            2.0
          );
        }

        let contactMounted = true;
        ctxCleanups.push(() => {
          contactMounted = false;
          if (bodySplit && typeof bodySplit.revert === 'function') {
            bodySplit.revert();
          }
        });
        const thresholdRatio = isDesktop ? 0.55 : 0.75;
        const playIfAlreadyPast = () => {
          if (!contactMounted) return;
          const rect = contactSection.getBoundingClientRect();
          const st = contactTl.scrollTrigger;
          if (
            (rect.top <= window.innerHeight * thresholdRatio || (st && st.progress > 0)) &&
            contactTl.progress() === 0 &&
            !contactTl.isActive()
          ) {
            contactTl.play(0);
          }
        };
        const revealPromise = window.__loaderReveal ?? Promise.resolve();
        revealPromise.then(() => {
          window.requestAnimationFrame(playIfAlreadyPast);
        });
      }

      if (sheetWrap && isDesktop && finePointerQuery.matches && sheetSubmitBtn) {
        const qxBtn = gsap.quickTo(sheetSubmitBtn, 'x', {
          duration: 0.5,
          ease: 'power3',
        });
        const qyBtn = gsap.quickTo(sheetSubmitBtn, 'y', {
          duration: 0.5,
          ease: 'power3',
        });
        let btnDocCenter = null;
        const invalidateBtnCenter = () => {
          btnDocCenter = null;
        };
        const measureBtnCenter = () => {
          const rect = sheetSubmitBtn.getBoundingClientRect();
          const tx = Number(gsap.getProperty(sheetSubmitBtn, 'x')) || 0;
          const ty = Number(gsap.getProperty(sheetSubmitBtn, 'y')) || 0;
          btnDocCenter = {
            cx: rect.left - tx + rect.width / 2 + window.scrollX,
            cy: rect.top - ty + rect.height / 2 + window.scrollY,
          };
        };
        const onSheetEnter = () => {
          measureBtnCenter();
        };
        const onSheetMove = (e) => {
          if (!btnDocCenter) measureBtnCenter();
          const cx = btnDocCenter.cx - window.scrollX;
          const cy = btnDocCenter.cy - window.scrollY;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < 90) {
            qxBtn(dx * 0.35);
            qyBtn(dy * 0.35);
          } else {
            qxBtn(0);
            qyBtn(0);
          }
        };
        const onSheetLeave = () => {
          gsap.to(sheetSubmitBtn, {
            x: 0,
            y: 0,
            duration: 0.8,
            ease: 'elastic.out(1, 0.4)',
          });
        };
        sheetWrap.addEventListener('mouseenter', onSheetEnter);
        sheetWrap.addEventListener('mousemove', onSheetMove);
        sheetWrap.addEventListener('mouseleave', onSheetLeave);
        ScrollTrigger.addEventListener('refreshInit', invalidateBtnCenter);
        ctxCleanups.push(() => {
          sheetWrap.removeEventListener('mouseenter', onSheetEnter);
          sheetWrap.removeEventListener('mousemove', onSheetMove);
          sheetWrap.removeEventListener('mouseleave', onSheetLeave);
          ScrollTrigger.removeEventListener('refreshInit', invalidateBtnCenter);
        });
      }
    },
  ];
}

export function initContact(env, runnerOpts) {
  return runChunkedSectionInit('contact', createContactSteps(env), runnerOpts);
}
