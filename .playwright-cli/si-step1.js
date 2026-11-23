async (page) => {
  const browser = page.context().browser();

  async function runOne(width, height, throttled, runIdx, opts = {}) {
    const context = await browser.newContext({
      viewport: { width, height },
      hasTouch: Boolean(opts.mobile),
      isMobile: Boolean(opts.mobile),
    });
    const p = await context.newPage();
    const client = await context.newCDPSession(p);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });

    if (throttled) {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 150,
        downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
        uploadThroughput: Math.floor((750 * 1024) / 8),
      });
    }

    await p.addInitScript(() => {
      window.__extraEvents = {};
      window.addEventListener('DOMContentLoaded', () => { window.__extraEvents.dcl = Math.round(performance.now()); });
      window.addEventListener('load', () => { window.__extraEvents.load = Math.round(performance.now()); });
      window.addEventListener('loader:reveal', () => { window.__extraEvents.loaderReveal = Math.round(performance.now()); });
      window.addEventListener('loader:done', () => { window.__extraEvents.loaderDone = Math.round(performance.now()); });
      if (document.fonts) {
        document.fonts.ready.then(() => { window.__extraEvents.fontsReady = Math.round(performance.now()); });
      }
      const pElCheck = setInterval(() => {
        const poster = document.querySelector('.hero-poster-img');
        if (poster && poster.complete && poster.naturalWidth > 0) {
          window.__extraEvents.posterComplete = Math.round(performance.now());
          clearInterval(pElCheck);
        }
      }, 20);
    });

    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 25000 });
    await p.waitForTimeout(800);

    if (opts.screenshotPath) {
      await p.screenshot({ path: opts.screenshotPath });
    }

    const data = await p.evaluate(() => {
      const fcpEntry = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
      const cls = +(window.__shifts || []).reduce((s, e) => s + e.value, 0).toFixed(4);
      const prePaint = typeof window.__prePaint === 'function' ? window.__prePaint() : null;
      return {
        marks: window.__loaderMarks || {},
        extra: window.__extraEvents || {},
        fcp: fcpEntry ? Math.round(fcpEntry.startTime) : null,
        lcp: window.__lcp || null,
        cls,
        prePaint: prePaint ? { cutoffMs: prePaint.cutoffMs, count: prePaint.count, kib: prePaint.kib } : null,
      };
    });

    await context.close();
    return {
      setting: `${width}x${height} ${throttled ? 'Fast4G' : 'NoThrottle'} r${runIdx}`,
      ...data,
    };
  }

  const results = [];
  for (const [w, h] of [[1350, 940], [1440, 900]]) {
    for (const throttled of [true, false]) {
      for (let r = 1; r <= 3; r++) {
        const shot = (w === 1440 && !throttled && r === 1) ? '.playwright-cli/si-step1-1440.png' : null;
        results.push(await runOne(w, h, throttled, r, { screenshotPath: shot }));
      }
    }
  }
  results.push(await runOne(390, 844, true, 1, { mobile: true, screenshotPath: '.playwright-cli/si-step1-390.png' }));
  results.push(await runOne(390, 844, false, 1, { mobile: true }));

  return results;
}
