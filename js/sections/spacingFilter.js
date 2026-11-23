import { scrollToTarget } from '../engine/scrollExperience.js';
import {
  SECTION_SPACING_CONFIGS,
  SPACING_MAX_REM,
  SPACING_MIN_REM,
  SPACING_STEP_REM,
  applySpacingOverridesToStyle,
  clampSpacingRem,
  clearSectionOverride,
  countActiveOverrides,
  filterSections,
  formatSpacingCss,
  getEffectiveDefaultRem,
  loadSpacingOverrides,
  saveSpacingOverrides,
  updateSectionSideOverride,
} from '../utils/sectionSpacing.js';
import { waitForSectionCss } from '../engine/scroll/shared.js';

export async function initSpacingFilter() {
  await waitForSectionCss();
  const wrapEl = document.querySelector('.spacing-filter-wrap');
  if (!wrapEl) return () => {};
  if (wrapEl.dataset.hydrated === 'true') return () => {};

  const panelId = 'dx-spacing-filter-panel';
  let open = false;
  let sectionFilter = 'all';
  let sideFilter = 'both';
  let overrides = loadSpacingOverrides();
  let isMobileViewport = window.innerWidth <= 991;
  let copyTimer = null;

  const toggleBtn = wrapEl.querySelector('.spacing-filter-toggle');
  const badgeEl = wrapEl.querySelector('.spacing-filter-badge');
  const panelEl = wrapEl.querySelector('.spacing-filter-panel');
  const closeBtn = wrapEl.querySelector('.spacing-filter-close');
  const sectionPillsEl = wrapEl.querySelector('[data-filter-group="section"]');
  const sidePillsEl = wrapEl.querySelector('[data-filter-group="side"]');
  const listEl = wrapEl.querySelector('.spacing-filter-list');
  const copyBtn = wrapEl.querySelector('[data-action="copy-css"]');
  const resetAllBtn = wrapEl.querySelector('[data-action="reset-all"]');

  if (toggleBtn && panelEl) {
    panelEl.id = panelId;
    toggleBtn.setAttribute('aria-controls', panelId);
  }

  const syncOverridesSideEffects = () => {
    applySpacingOverridesToStyle(overrides, document.documentElement.style);
    saveSpacingOverrides(overrides);
    window.dispatchEvent(new CustomEvent('dx:spacing-change'));
  };

  const syncBadgeAndFooter = () => {
    const activeCount = countActiveOverrides(overrides);
    if (badgeEl) {
      if (activeCount > 0) {
        badgeEl.hidden = false;
        badgeEl.textContent = String(activeCount);
        badgeEl.setAttribute('aria-label', `${activeCount} تعديلات`);
      } else {
        badgeEl.hidden = true;
        badgeEl.textContent = '';
      }
    }
    if (resetAllBtn) {
      resetAllBtn.disabled = activeCount === 0;
    }
  };

  const syncSectionPills = () => {
    if (!sectionPillsEl) return;
    sectionPillsEl.querySelectorAll('.spacing-pill').forEach((btn) => {
      const id = btn.dataset.sectionFilter;
      const isActive = sectionFilter === id;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
      if (id !== 'all') {
        const entry = overrides[id];
        const hasCustom = entry?.pt != null || entry?.pb != null;
        btn.classList.toggle('has-custom', hasCustom);
      }
    });
  };

  const syncSidePills = () => {
    if (!sidePillsEl) return;
    sidePillsEl.querySelectorAll('.spacing-pill').forEach((btn) => {
      const side = btn.dataset.sideFilter;
      const isActive = sideFilter === side;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });
  };

  const updateCardInPlace = (sectionId) => {
    if (!listEl) return;
    const sec = SECTION_SPACING_CONFIGS.find((item) => item.id === sectionId);
    const cardEl = listEl.querySelector(`.spacing-sec-card[data-section-id="${sectionId}"]`);
    if (!sec || !cardEl) return;

    const entry = overrides[sec.id];
    const ptOverride = entry?.pt ?? null;
    const pbOverride = entry?.pb ?? null;
    const hasSectionOverride = ptOverride !== null || pbOverride !== null;

    const resetSecBtn = cardEl.querySelector('[data-action="reset-section"]');
    if (resetSecBtn) {
      resetSecBtn.hidden = !hasSectionOverride;
    }

    ['pt', 'pb'].forEach((side) => {
      const row = cardEl.querySelector(`.spacing-side-row[data-side="${side}"]`);
      if (!row) return;
      const sideOverride = side === 'pt' ? ptOverride : pbOverride;
      const defaultVal = getEffectiveDefaultRem(sec, isMobileViewport, side);
      const displayVal = sideOverride ?? defaultVal;

      const valEl = row.querySelector('.spacing-side-val');
      if (valEl) {
        valEl.classList.toggle('is-custom', sideOverride !== null);
        valEl.textContent =
          sideOverride !== null
            ? `${displayVal.toFixed(2).replace(/\.00$/, '')}rem`
            : `auto (${defaultVal}rem)`;
      }

      const sideResetBtn = row.querySelector('[data-action="reset-side"]');
      if (sideResetBtn) {
        sideResetBtn.hidden = sideOverride === null;
      }

      const rangeInput = row.querySelector('.spacing-range');
      if (rangeInput && Number(rangeInput.value) !== displayVal) {
        rangeInput.value = String(displayVal);
      }
    });
  };

  const buildSectionPills = () => {
    if (!sectionPillsEl) return;
    sectionPillsEl.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'spacing-pill';
    allBtn.dataset.sectionFilter = 'all';
    allBtn.textContent = 'الكل';
    allBtn.addEventListener('click', () => {
      sectionFilter = 'all';
      syncSectionPills();
      renderSectionCards();
    });
    sectionPillsEl.appendChild(allBtn);

    SECTION_SPACING_CONFIGS.forEach((sec) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spacing-pill';
      btn.dataset.sectionFilter = sec.id;
      btn.textContent = sec.labelAr;
      btn.addEventListener('click', () => {
        sectionFilter = sec.id;
        syncSectionPills();
        renderSectionCards();
      });
      sectionPillsEl.appendChild(btn);
    });
  };

  const buildSidePills = () => {
    if (!sidePillsEl) return;
    sidePillsEl.innerHTML = '';
    const items = [
      { id: 'both', label: 'أعلى وأسفل' },
      { id: 'pt', label: 'الأعلى فقط' },
      { id: 'pb', label: 'الأسفل فقط' },
    ];
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spacing-pill';
      btn.dataset.sideFilter = item.id;
      btn.textContent = item.label;
      btn.addEventListener('click', () => {
        sideFilter = item.id;
        syncSidePills();
        renderSectionCards();
      });
      sidePillsEl.appendChild(btn);
    });
  };

  const handleSideChange = (sectionId, side, rawValue) => {
    overrides = updateSectionSideOverride(overrides, sectionId, side, rawValue);
    syncOverridesSideEffects();
    syncBadgeAndFooter();
    syncSectionPills();
    updateCardInPlace(sectionId);
  };

  const handleSideStep = (sectionId, side, delta) => {
    const sec = SECTION_SPACING_CONFIGS.find((item) => item.id === sectionId);
    if (!sec) return;
    const currentOverride = overrides[sectionId]?.[side];
    const baseVal =
      currentOverride != null
        ? currentOverride
        : getEffectiveDefaultRem(sec, isMobileViewport, side);
    handleSideChange(sectionId, side, clampSpacingRem(baseVal + delta));
  };

  const handleSideReset = (sectionId, side) => {
    overrides = updateSectionSideOverride(overrides, sectionId, side, null);
    syncOverridesSideEffects();
    syncBadgeAndFooter();
    syncSectionPills();
    updateCardInPlace(sectionId);
  };

  const handleSectionReset = (sectionId) => {
    overrides = clearSectionOverride(overrides, sectionId);
    syncOverridesSideEffects();
    syncBadgeAndFooter();
    syncSectionPills();
    updateCardInPlace(sectionId);
  };

  const buildSideRow = (sec, side, sideOverride, defaultVal, displayVal) => {
    const row = document.createElement('div');
    row.className = 'spacing-side-row';
    row.dataset.side = side;

    const inputId = `${panelId}-${sec.id}-${side}`;
    const isTop = side === 'pt';
    const labelText = isTop ? '↑ المسافة العلوية (Top)' : '↓ المسافة السفلية (Bottom)';
    const sideWord = isTop ? 'العلوية' : 'السفلية';

    const meta = document.createElement('div');
    meta.className = 'spacing-side-meta';

    const label = document.createElement('label');
    label.setAttribute('for', inputId);
    label.className = 'spacing-side-label';
    label.textContent = labelText;

    const valWrap = document.createElement('div');
    valWrap.className = 'spacing-side-val-wrap';

    const valSpan = document.createElement('span');
    valSpan.className = `spacing-side-val ${sideOverride !== null ? 'is-custom' : ''}`;
    valSpan.setAttribute('dir', 'ltr');
    valSpan.textContent =
      sideOverride !== null
        ? `${displayVal.toFixed(2).replace(/\.00$/, '')}rem`
        : `auto (${defaultVal}rem)`;

    const sideResetBtn = document.createElement('button');
    sideResetBtn.type = 'button';
    sideResetBtn.className = 'spacing-side-reset';
    sideResetBtn.dataset.action = 'reset-side';
    sideResetBtn.setAttribute('aria-label', `إعادة ضبط المسافة ${sideWord} لقسم ${sec.labelAr}`);
    sideResetBtn.textContent = '↺';
    sideResetBtn.hidden = sideOverride === null;
    sideResetBtn.addEventListener('click', () => handleSideReset(sec.id, side));

    valWrap.append(valSpan, sideResetBtn);
    meta.append(label, valWrap);

    const sliderRow = document.createElement('div');
    sliderRow.className = 'spacing-slider-row';
    sliderRow.setAttribute('dir', 'ltr');

    const decBtn = document.createElement('button');
    decBtn.type = 'button';
    decBtn.className = 'spacing-step-btn';
    decBtn.setAttribute('aria-label', `إنقاص المسافة ${sideWord} لقسم ${sec.labelAr}`);
    decBtn.textContent = '−';
    decBtn.addEventListener('click', () => handleSideStep(sec.id, side, -SPACING_STEP_REM));

    const range = document.createElement('input');
    range.id = inputId;
    range.type = 'range';
    range.className = 'spacing-range';
    range.min = String(SPACING_MIN_REM);
    range.max = String(SPACING_MAX_REM);
    range.step = String(SPACING_STEP_REM);
    range.value = String(displayVal);
    range.addEventListener('input', (e) => {
      handleSideChange(sec.id, side, parseFloat(e.currentTarget.value));
    });

    const incBtn = document.createElement('button');
    incBtn.type = 'button';
    incBtn.className = 'spacing-step-btn';
    incBtn.setAttribute('aria-label', `زيادة المسافة ${sideWord} لقسم ${sec.labelAr}`);
    incBtn.textContent = '+';
    incBtn.addEventListener('click', () => handleSideStep(sec.id, side, SPACING_STEP_REM));

    sliderRow.append(decBtn, range, incBtn);
    row.append(meta, sliderRow);
    return row;
  };

  const renderSectionCards = () => {
    if (!listEl) return;
    listEl.innerHTML = '';
    const visibleSections = filterSections(sectionFilter);
    const frag = document.createDocumentFragment();

    visibleSections.forEach((sec) => {
      const entry = overrides[sec.id];
      const ptOverride = entry?.pt ?? null;
      const pbOverride = entry?.pb ?? null;
      const defaultPt = getEffectiveDefaultRem(sec, isMobileViewport, 'pt');
      const defaultPb = getEffectiveDefaultRem(sec, isMobileViewport, 'pb');
      const ptDisplay = ptOverride ?? defaultPt;
      const pbDisplay = pbOverride ?? defaultPb;
      const hasSectionOverride = ptOverride !== null || pbOverride !== null;

      const card = document.createElement('div');
      card.className = 'spacing-sec-card';
      card.dataset.sectionId = sec.id;

      const head = document.createElement('div');
      head.className = 'spacing-sec-head';

      const nameWrap = document.createElement('div');
      nameWrap.className = 'spacing-sec-name-wrap';

      const nameAr = document.createElement('span');
      nameAr.className = 'spacing-sec-name';
      nameAr.textContent = sec.labelAr;

      const nameEn = document.createElement('span');
      nameEn.className = 'spacing-sec-en';
      nameEn.setAttribute('dir', 'ltr');
      nameEn.textContent = sec.labelEn;

      nameWrap.append(nameAr, nameEn);

      const actions = document.createElement('div');
      actions.className = 'spacing-sec-actions';

      const jumpBtn = document.createElement('button');
      jumpBtn.type = 'button';
      jumpBtn.className = 'spacing-mini-btn';
      jumpBtn.setAttribute('aria-label', `الانتقال إلى قسم ${sec.labelAr}`);
      jumpBtn.textContent = 'عرض ↗';
      jumpBtn.addEventListener('click', () => scrollToTarget(sec.scrollTarget, 1.0));

      const resetBtn = document.createElement('button');
      resetBtn.type = 'button';
      resetBtn.className = 'spacing-mini-btn is-reset';
      resetBtn.dataset.action = 'reset-section';
      resetBtn.setAttribute('aria-label', `إعادة ضبط قسم ${sec.labelAr}`);
      resetBtn.textContent = 'إعادة';
      resetBtn.hidden = !hasSectionOverride;
      resetBtn.addEventListener('click', () => handleSectionReset(sec.id));

      actions.append(jumpBtn, resetBtn);
      head.append(nameWrap, actions);
      card.appendChild(head);

      if (sideFilter === 'both' || sideFilter === 'pt') {
        card.appendChild(buildSideRow(sec, 'pt', ptOverride, defaultPt, ptDisplay));
      }
      if (sideFilter === 'both' || sideFilter === 'pb') {
        card.appendChild(buildSideRow(sec, 'pb', pbOverride, defaultPb, pbDisplay));
      }

      frag.appendChild(card);
    });

    listEl.appendChild(frag);
  };

  let panelBuilt = false;
  const ensurePanelBuilt = () => {
    if (panelBuilt) return;
    panelBuilt = true;
    buildSectionPills();
    buildSidePills();
    syncSectionPills();
    syncSidePills();
    renderSectionCards();
    syncBadgeAndFooter();
  };

  const setOpen = (nextOpen) => {
    if (nextOpen) ensurePanelBuilt();
    open = nextOpen;
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(open));
    if (panelEl) panelEl.hidden = !open;
  };

  if (Object.keys(overrides).length > 0) {
    applySpacingOverridesToStyle(overrides, document.documentElement.style);
    syncBadgeAndFooter();
  }
  setOpen(false);

  const cleanups = [];

  if (toggleBtn) {
    const onToggle = () => setOpen(!open);
    toggleBtn.addEventListener('click', onToggle);
    cleanups.push(() => toggleBtn.removeEventListener('click', onToggle));
  }

  if (closeBtn) {
    const onClose = () => setOpen(false);
    closeBtn.addEventListener('click', onClose);
    cleanups.push(() => closeBtn.removeEventListener('click', onClose));
  }

  if (copyBtn) {
    const onCopy = async () => {
      const cssText = formatSpacingCss(overrides);
      try {
        await navigator.clipboard.writeText(cssText);
        copyBtn.textContent = 'تم النسخ ✓';
        if (copyTimer) window.clearTimeout(copyTimer);
        copyTimer = window.setTimeout(() => {
          copyBtn.textContent = 'نسخ CSS';
        }, 1800);
      } catch {
        copyBtn.textContent = 'نسخ CSS';
      }
    };
    copyBtn.addEventListener('click', onCopy);
    cleanups.push(() => {
      copyBtn.removeEventListener('click', onCopy);
      if (copyTimer) window.clearTimeout(copyTimer);
    });
  }

  if (resetAllBtn) {
    const onResetAll = () => {
      overrides = {};
      syncOverridesSideEffects();
      syncBadgeAndFooter();
      syncSectionPills();
      renderSectionCards();
    };
    resetAllBtn.addEventListener('click', onResetAll);
    cleanups.push(() => resetAllBtn.removeEventListener('click', onResetAll));
  }

  const onResize = () => {
    const nextMobile = window.innerWidth <= 991;
    if (nextMobile !== isMobileViewport) {
      isMobileViewport = nextMobile;
      renderSectionCards();
    }
  };
  window.addEventListener('resize', onResize, { passive: true });
  cleanups.push(() => window.removeEventListener('resize', onResize));

  const onKeyDown = (e) => {
    if (open && e.key === 'Escape') {
      setOpen(false);
    }
  };
  window.addEventListener('keydown', onKeyDown);
  cleanups.push(() => window.removeEventListener('keydown', onKeyDown));

  wrapEl.dataset.hydrated = 'true';
  return () => cleanups.forEach((fn) => fn());
}
