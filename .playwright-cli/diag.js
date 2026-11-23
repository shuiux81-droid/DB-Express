async page => {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });

  await page.addInitScript(() => {
    window.__diagEvents = [];
    const logEv = (type, detail) => {
      window.__diagEvents.push({
        t: Math.round(performance.now()),
        type,
        detail: detail || ''
      });
    };
    window.__logEv = logEv;

    window.addEventListener('DOMContentLoaded', () => logEv('DOMContentLoaded'));
    window.addEventListener('load', () => logEv('load'));
    window.addEventListener('loader:reveal', () => logEv('loader:reveal'));
    window.addEventListener('loader:done', () => logEv('loader:done'));
    window.addEventListener('dx:dom-hydrated', () => logEv('dx:dom-hydrated'));

    if (document.fonts) {
      document.fonts.addEventListener('loadingdone', (ev) => {
        const faces = (ev.fontfaces || []).map(f => `${f.family}:${f.weight}:${f.status}`);
        logEv('fonts:loadingdone', faces.join(', '));
      });
      document.fonts.ready.then(() => logEv('fonts:ready'));
    }

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === 'attributes' && m.target === document.documentElement && m.attributeName === 'class') {
          logEv('html.class', document.documentElement.className);
        }
        if (m.type === 'attributes' && m.target instanceof HTMLElement && m.attributeName === 'data-pin-built') {
          logEv('pin-built', m.target.id || m.target.className);
        }
        if (m.type === 'attributes' && m.target instanceof HTMLElement && m.attributeName === 'data-hydrated') {
          logEv('hydrated', m.target.id || m.target.className);
        }
        if (m.type === 'childList') {
          m.addedNodes.forEach((n) => {
            if (n instanceof HTMLElement && n.tagName === 'LINK' && n.dataset.deferCss) {
              n.addEventListener('load', () => logEv('css:load', n.dataset.deferCss));
            }
            if (n instanceof HTMLElement && n.tagName === 'SCRIPT' && n.src) {
              n.addEventListener('load', () => logEv('script:load', n.src.split('/').slice(-2).join('/')));
            }
            if (n instanceof HTMLElement && n.classList.contains('pin-spacer')) {
              logEv('pin-spacer:added', n.firstElementChild ? (n.firstElementChild.id || n.firstElementChild.className) : '');
            }
          });
        }
      }
    });
    mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'data-pin-built', 'data-hydrated'] });
  });

  async function runOne(width, height, throttled, runIdx, takeShot) {
    await page.setViewportSize({ width, height });
    if (throttled) {
      // Chrome DevTools Fast 4G preset
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.floor((750 * 1024) / 8),
      });
    } else {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
    }

    await page.goto('http://localhost:3000/?_r=' + Math.random(), { waitUntil: 'load' });
    await page.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 15000 });
    await page.waitForTimeout(800);

    const beforeScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    // Scroll from top to bottom in steps to trigger all lazy sections and pins
    for (let frac = 0.1; frac <= 1.01; frac += 0.1) {
      await page.evaluate((f) => {
        const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.round(maxY * f));
      }, Math.min(1, frac));
      await page.waitForTimeout(250);
    }
    await page.waitForTimeout(600);
    // Scroll once more to very bottom in case scrollHeight grew while scrolling
    await page.evaluate(() => {
      const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      window.scrollTo(0, maxY);
    });
    await page.waitForTimeout(600);

    if (takeShot) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.screenshot({ path: `.playwright-cli/step1-${width}x${height}-${throttled ? '4g' : 'fast'}-r${runIdx}.png` });
    }

    const report = await page.evaluate(() => {
      const shifts = window.__shifts || [];
      const totalCls = shifts.reduce((s, e) => s + e.value, 0);
      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').slice(-2).join('/'),
        initiatorType: r.initiatorType,
        start: Math.round(r.startTime),
        end: Math.round(r.responseEnd),
        kb: Math.round((r.transferSize || r.encodedBodySize || 0) / 1024),
      }));
      const docHeight = document.documentElement.scrollHeight;
      const sections = ['#top', '#about', '#drops', '#readers', '#contact', '#footer'].map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        const rect = el.getBoundingClientRect();
        return {
          sel,
          top: Math.round(rect.top + window.scrollY),
          height: Math.round(rect.height),
          hydrated: el.getAttribute('data-hydrated'),
          pinBuilt: el.getAttribute('data-pin-built'),
        };
      });
      const prePaint = typeof window.__prePaint === 'function' ? window.__prePaint() : null;
      return {
        totalCls: +totalCls.toFixed(4),
        shifts,
        events: window.__diagEvents,
        resources,
        docHeight,
        sections,
        prePaintKib: prePaint ? prePaint.kib : null,
      };
    });

    return {
      width,
      height,
      throttled,
      runIdx,
      beforeScrollHeight,
      ...report,
    };
  }

  const results = [];
  for (const [w, h] of [[1350, 940], [1440, 900]]) {
    for (const throttled of [true, false]) {
      for (let r = 1; r <= 3; r++) {
        results.push(await runOne(w, h, throttled, r, r === 1 && w === 1440 && !throttled));
      }
    }
  }
  // Mobile baseline at 390x844
  results.push(await runOne(390, 844, true, 1, true));
  results.push(await runOne(390, 844, false, 1, false));

  // Return compact summary plus full detail for run 1 of each setting
  return results.map(res => ({
    setting: `${res.width}x${res.height} ${res.throttled ? 'Fast4G' : 'NoThrottle'} r${res.runIdx}`,
    totalCls: res.totalCls,
    docHeight: res.docHeight,
    beforeScrollHeight: res.beforeScrollHeight,
    prePaintKib: res.prePaintKib,
    shiftsOver001: res.shifts.filter(s => s.value > 0.001),
    allShiftsCount: res.shifts.length,
    events: res.runIdx === 1 ? res.events : undefined,
    sections: res.runIdx === 1 ? res.sections : undefined,
    resources: (res.runIdx === 1 && res.width === 1440 && res.throttled) ? res.resources : undefined,
  }));
}
