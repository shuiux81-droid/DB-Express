async (page) => {
  const browser = page.context().browser();

  // 1) Check 390x844 with realistic CDP Input.synthesizeScrollGesture (hasTouch + Fast4G + NoThrottle)
  const mobileResults = [];
  for (const throttled of [true, false]) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
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
    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 25000 });
    await p.waitForTimeout(800);

    const beforeScroll = await p.evaluate(() => ({
      cls: +(window.__shifts || []).reduce((s, e) => s + e.value, 0).toFixed(4),
      shifts: window.__shifts,
      prePaint: typeof window.__prePaint === 'function' ? window.__prePaint() : null,
      h: document.documentElement.scrollHeight,
    }));

    // Scroll top to bottom with real user-input gestures
    for (let i = 0; i < 16; i++) {
      await client.send('Input.synthesizeScrollGesture', {
        x: 195,
        y: 500,
        yDistance: -420,
        speed: 1200,
        gestureSourceType: 'touch',
      });
      await p.waitForTimeout(600);
      const atBottom = await p.evaluate(() => window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4);
      if (atBottom) break;
    }
    await p.waitForTimeout(1200);

    const afterScroll = await p.evaluate(() => ({
      cls: +(window.__shifts || []).reduce((s, e) => s + e.value, 0).toFixed(4),
      shifts: (window.__shifts || []).filter(s => s.value > 0.0001),
      h: document.documentElement.scrollHeight,
      y: Math.round(window.scrollY),
    }));

    mobileResults.push({ throttled, beforeScroll, afterScroll });
    await ctx.close();
  }

  // 2) Check 1350x940 hero animation & font loading stability (before scroll, waiting 10s for video + deferred fonts + typing)
  const heroCheck = [];
  for (const nl of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1350, height: 940 } });
    const p = await ctx.newPage();
    const client = await ctx.newCDPSession(p);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8),
      uploadThroughput: Math.floor((750 * 1024) / 8),
    });
    await p.goto(nl ? 'http://localhost:3000/?noloader' : 'http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForTimeout(10000);
    const res = await p.evaluate(() => {
      const s = window.__shifts || [];
      return {
        noloader: location.search.includes('noloader'),
        cls: +s.reduce((a, b) => a + b.value, 0).toFixed(4),
        shifts: s,
        videoPlaying: Boolean(document.querySelector('.hero-video.is-playing')),
        loaderDone: Boolean(window.__loaderDone),
        appReady: Boolean(window.__appReady),
      };
    });
    heroCheck.push(res);
    await ctx.close();
  }

  return { mobileResults, heroCheck };
}
