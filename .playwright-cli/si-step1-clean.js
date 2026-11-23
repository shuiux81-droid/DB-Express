async (page) => {
  const browser = page.context().browser();
  async function runOne(label, w, h, net) {
    await page.waitForTimeout(300);
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p = await ctx.newPage();
    const client = await ctx.newCDPSession(p);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    if (net) {
      await client.send('Network.emulateNetworkConditions', net);
    }
    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 25000 });
    await p.waitForTimeout(300);
    const res = await p.evaluate(() => ({
      marks: window.__loaderMarks || {},
      fcp: Math.round(performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint')?.startTime || 0),
      cls: +(window.__shifts || []).reduce((s, e) => s + e.value, 0).toFixed(4),
    }));
    await ctx.close();
    return { label, ...res };
  }
  const out = [];
  for (let i = 1; i <= 3; i++) {
    out.push(await runOne(`1350x940 NoThrottle r${i}`, 1350, 940, null));
  }
  for (let i = 1; i <= 3; i++) {
    out.push(await runOne(`1440x900 NoThrottle r${i}`, 1440, 900, null));
  }
  out.push(await runOne('1350x940 PSI-10Mbps r1', 1350, 940, {
    offline: false,
    latency: 40,
    downloadThroughput: Math.floor((10 * 1024 * 1024) / 8),
    uploadThroughput: Math.floor((10 * 1024 * 1024) / 8),
  }));
  return out;
}
