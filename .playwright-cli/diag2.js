async page => {
  const browser = page.context().browser();

  async function runOne(width, height, throttled, runIdx, useWheel) {
    const context = await browser.newContext({ viewport: { width, height } });
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
      window.__diagEvents = [];
      const logEv = (type, detail) => {
        window.__diagEvents.push({
          t: Math.round(performance.now()),
          type,
          detail: detail || ''
        });
      };
      window.__logEv = logEv;

      window.addEventListener('DOMContentLoaded', () => logEv('DOMContentLoaded', `h=${document.documentElement.scrollHeight}`));
      window.addEventListener('load', () => logEv('load', `h=${document.documentElement.scrollHeight}`));
      window.addEventListener('loader:reveal', () => logEv('loader:reveal', `h=${document.documentElement.scrollHeight}`));
      window.addEventListener('loader:done', () => logEv('loader:done', `h=${document.documentElement.scrollHeight}`));
      window.addEventListener('dx:dom-hydrated', () => logEv('dx:dom-hydrated', `h=${document.documentElement.scrollHeight}`));

      if (document.fonts) {
        document.fonts.addEventListener('loadingdone', (ev) => {
          const faces = [...new Set((ev.fontfaces || []).map(f => `${f.family}:${f.weight}`))];
          logEv('fonts:loadingdone', faces.join(', '));
        });
        document.fonts.ready.then(() => logEv('fonts:ready'));
      }

      const startMo = () => {
        const mo = new MutationObserver((muts) => {
          for (const m of muts) {
            if (m.type === 'attributes' && m.target === document.documentElement && m.attributeName === 'class') {
              logEv('html.class', document.documentElement.className);
            }
            if (m.type === 'attributes' && m.target instanceof HTMLElement && m.attributeName === 'data-pin-built') {
              logEv('pin-built', `${m.target.id || m.target.className} h=${document.documentElement.scrollHeight}`);
            }
            if (m.type === 'attributes' && m.target instanceof HTMLElement && m.attributeName === 'data-hydrated') {
              logEv('hydrated', `${m.target.id || m.target.className} h=${document.documentElement.scrollHeight}`);
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
                  logEv('pin-spacer:added', `${n.firstElementChild ? (n.firstElementChild.id || n.firstElementChild.className) : ''} h=${document.documentElement.scrollHeight}`);
                }
              });
            }
          }
        });
        mo.observe(document.documentElement, { attributes: true, childList: true, subtree: true, attributeFilter: ['class', 'data-pin-built', 'data-hydrated'] });
      };
      if (document.documentElement) startMo();
      else document.addEventListener('DOMContentLoaded', startMo, { once: true });
    });

    await p.goto('http://localhost:3000/', { waitUntil: 'load' });
    await p.waitForFunction(() => Boolean(window.__loaderDone && window.__appReady), { timeout: 20000 });
    await p.waitForTimeout(1000);

    const beforeScroll = await p.evaluate(() => {
      const shifts = (window.__shifts || []).slice();
      return {
        cls: +shifts.reduce((s, e) => s + e.value, 0).toFixed(4),
        shifts,
        scrollHeight: document.documentElement.scrollHeight,
        innerWidth: window.innerWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });

    // Scroll top to bottom
    const totalH = await p.evaluate(() => document.documentElement.scrollHeight);
    if (useWheel) {
      let y = 0;
      for (let i = 0; i < 30; i++) {
        await p.mouse.wheel(0, 600);
        await p.waitForTimeout(180);
        y = await p.evaluate(() => window.scrollY);
        const maxY = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
        if (y >= maxY - 5) break;
      }
      await p.waitForTimeout(1000);
    } else {
      for (let frac = 0.08; frac <= 1.01; frac += 0.08) {
        await p.evaluate((f) => {
          const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
          window.scrollTo(0, Math.round(maxY * f));
        }, Math.min(1, frac));
        await p.waitForTimeout(300);
      }
      await p.waitForTimeout(1000);
    }

    const afterScroll = await p.evaluate(() => {
      const shifts = (window.__shifts || []).slice();
      const docHeight = document.documentElement.scrollHeight;
      const pinSpacers = Array.from(document.querySelectorAll('.pin-spacer')).map(ps => ({
        child: ps.firstElementChild ? (ps.firstElementChild.id || ps.firstElementChild.className) : '',
        height: Math.round(ps.getBoundingClientRect().height),
        styleHeight: ps.style.height,
        paddingBottom: ps.style.paddingBottom,
      }));
      const sections = ['#top', '#about', '.manifesto', '#drops', '.readers-contact-pin', '#readers', '#contact', '#footer'].map(sel => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        return {
          sel,
          offsetHeight: el.offsetHeight,
          scrollHeight: el.scrollHeight,
          hydrated: el.getAttribute('data-hydrated'),
          pinBuilt: el.getAttribute('data-pin-built'),
        };
      });
      return {
        cls: +shifts.reduce((s, e) => s + e.value, 0).toFixed(4),
        shifts,
        docHeight,
        pinSpacers,
        sections,
        events: window.__diagEvents,
      };
    });

    await context.close();
    return {
      setting: `${width}x${height} ${throttled ? 'Fast4G' : 'NoThrottle'} ${useWheel ? 'wheel' : 'scrollTo'} r${runIdx}`,
      beforeScrollCls: beforeScroll.cls,
      beforeScrollHeight: beforeScroll.scrollHeight,
      scrollbarWidth: beforeScroll.innerWidth - beforeScroll.clientWidth,
      beforeScrollShifts: beforeScroll.shifts.filter(s => s.value > 0.0005),
      afterScrollCls: afterScroll.cls,
      docHeight: afterScroll.docHeight,
      afterScrollShiftsOver001: afterScroll.shifts.filter(s => s.value > 0.001),
      pinSpacers: runIdx === 1 ? afterScroll.pinSpacers : undefined,
      sections: runIdx === 1 ? afterScroll.sections : undefined,
      events: runIdx === 1 ? afterScroll.events : undefined,
    };
  }

  const out = [];
  // Check 1350x940 and 1440x900 with scrollTo (3 runs throttled, 3 runs unthrottled) + 1 wheel check
  for (const [w, h] of [[1350, 940], [1440, 900]]) {
    for (const throttled of [true, false]) {
      for (let r = 1; r <= 3; r++) {
        out.push(await runOne(w, h, throttled, r, false));
      }
    }
    out.push(await runOne(w, h, true, 1, true));
  }
  // Mobile 390x844
  out.push(await runOne(390, 844, true, 1, false));
  out.push(await runOne(390, 844, false, 1, false));

  return out;
}
