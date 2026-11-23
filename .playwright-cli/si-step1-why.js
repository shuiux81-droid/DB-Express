async (page) => {
  const browser = page.context().browser();
  const runs = [];
  for (const throttled of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const client = await ctx.newCDPSession(p);
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
      window.__rafLog = [];
      const origRaf = window.requestAnimationFrame.bind(window);
      let rafCount = 0;
      window.requestAnimationFrame = (cb) => origRaf((ts) => {
        rafCount++;
        if (rafCount <= 10 || rafCount % 15 === 0) {
          const counter = document.querySelector('.loader-counter')?.textContent;
          window.__rafLog.push({ n: rafCount, now: Math.round(performance.now()), ts: Math.round(ts), counter });
        }
        cb(ts);
      });
      const origSetTimeout = window.setTimeout.bind(window);
      window.__toLog = [];
      window.setTimeout = (fn, ms, ...args) => {
        const reg = Math.round(performance.now());
        return origSetTimeout((...a) => {
          const fired = Math.round(performance.now());
          if (ms >= 100 && fired - reg > ms + 200) {
            window.__toLog.push({ reg, ms, fired, drift: fired - reg - ms });
          }
          return fn(...a);
        }, ms, ...args);
      };
    });
    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 25000 });
    await p.waitForTimeout(400);
    const out = await p.evaluate(() => ({
      marks: window.__loaderMarks,
      rafTail: (window.__rafLog || []).slice(-10),
      rafHead: (window.__rafLog || []).slice(0, 8),
      toDrift: window.__toLog,
      longTasks: performance.getEntriesByType('longtask').map(e => ({ s: Math.round(e.startTime), d: Math.round(e.duration) })),
    }));
    runs.push({ throttled, ...out });
    await ctx.close();
  }
  return runs;
}
