(() => {
  self.__mark?.('loader start');
  const D = document;
  const R = D.documentElement;
  const C = R.classList;
  const Q = (s) => D.querySelector(s);
  const S = setTimeout;
  const F = requestAnimationFrame;
  const T = (fn) => {
    try {
      return fn();
    } catch {
      return undefined;
    }
  };

  if (self.__loaderBootFail) {
    clearTimeout(self.__loaderBootFail);
    self.__loaderBootFail = 0;
  }

  let r = self.__loaderResolveReveal;
  if (!self.__loaderReveal || typeof r !== 'function') {
    self.__loaderReveal = new Promise((f) => {
      r = f;
    });
    self.__loaderResolveReveal = r;
  }

  const e = Q('.loader');
  let V = 0;
  let q = 0;
  let H;

  const B = 'cubic-bezier(';
  const E = [
    'ease-out',
    'ease-in',
    B + '.65,0,.35,1)',
    B + '.76,0,.24,1)',
    B + '.22,1,.36,1)',
  ];
  const M = 'اكتمل التحميل';
  const K = 'dx-loader';
  const z = 'none';
  const O = 'opacity';
  const X = 'transform';
  const L = location;
  const G = T(() => sessionStorage);

  const U = (fn, m, a) => S(() => !V && fn(a), m);
  const A = (n, k, u, l = 0, i = 0, f = 'forwards') =>
    n?.animate(k, { duration: u, delay: l, easing: E[i], fill: f });
  const o = (n, u, l, i) => A(n, { [O]: i ? [0, 1] : [1, 0] }, u, l);
  const v = (s) => (s ? `translateY(${s})` : z);
  const y = (n, a, b, u, l, i, p) =>
    A(
      n,
      {
        ...(p && { [O]: p > 0 ? [0, 1] : [1, 0] }),
        [X]: [v(a), v(b)],
      },
      u,
      l,
      i
    );
  const W = (t) => dispatchEvent(new CustomEvent('loader:' + t));
  const Z = () => {
    if (q < 0) return;
    q = -1;
    C.add('loader-revealing');
    r();
    W('reveal');
  };

  function N(s, k) {
    if (V) return;
    V = 1;
    self.__mark?.('curtain end');
    self.__loaderDone = 1;
    cancelAnimationFrame(q);
    H?.cancel();
    Z();
    if (e) {
      e.ariaBusy = 'false';
      e.ariaLabel = M;
      e.remove();
    }
    C.remove('is-loading', 'loader-revealing');
    if (s) T(() => (G[K] = 1));
    const { __dxLenis: l } = self;
    l?.start();
    if (!k) {
      const t = L.hash && T(() => Q(L.hash));
      if (t) {
        if (typeof self.__dxScrollToTarget === 'function') {
          self.__dxScrollToTarget(L.hash, 0);
        } else if (l) {
          l.scrollTo(t, { immediate: 1 });
        } else {
          t.scrollIntoView();
        }
      } else {
        scrollTo(0, 0);
        Q('main')?.focus({ preventScroll: 1 });
      }
    }
    W('done');
  }

  const I = S(N, 6e3);

  const mob = matchMedia('(max-width:600px)').matches;

  const waitForAppReady = (fn) => {
    const heroP = self.__heroReadyPromise;
    const appPending = mob
      ? heroP
        ? !self.__heroReady && heroP
        : !self.__appReady && self.__appReadyPromise
      : !self.__appReady && self.__appReadyPromise;
    const cssPending = !mob && !self.__sectionCssDone && self.__sectionCssReady;
    if (!appPending && !cssPending) {
      fn();
      return;
    }
    let fired = 0;
    const go = () => {
      if (fired || V) return;
      fired = 1;
      clearTimeout(cap);
      fn();
    };
    const cap = S(go, 4e3);
    Promise.all([
      appPending || Promise.resolve(),
      cssPending || Promise.resolve(),
    ]).then(go, go);
  };

  try {
    if (!e || /[?&]noloader\b/.test(L.search) || 'noLoader' in R.dataset) {
      clearTimeout(I);
      return N(0, 1);
    }

    C.add('is-loading');
    T(() => (history.scrollRestoration = 'manual'));
    scrollTo(0, 0);

    const m = matchMedia('(prefers-reduced-motion:reduce)').matches;
    const ret = !m && G?.[K] == 1;
    if (m || ret) e.classList.add(m ? 'dx-rm' : 'dx-ret');

    const first = (n) => n.firstChild;
    const [a, c, d, g, h, j, k, u, s] = e.children;
    const [x, Y] = first(g).children;
    const P = first(h);
    const $ = first(j);
    const _ = first(k);

    const J = (l, t, p, vv, w, xx, i) => {
      y(P, 0, '-14px', t, l, 1, -1);
      A(u, { [X]: ['scaleX(0)', 'scaleX(1)'], [O]: [0, 1] }, vv, p, 2);
      U(Z, w);
      U(() => self.__mark?.('curtain start'), xx);
      y(a, 0, '-100%', i, xx, 3);
      y(c, 0, '100%', i, xx, 3);
      o(u, 200, xx);
      H = A(Q('.hero'), { [X]: ['translateY(3vh) scale(1.03)', z] }, i, xx, 3, 'backwards');
      U(N, xx + i, 1);
    };

    if (ret) {
      return waitForAppReady(() => J(120, 160, 120, 80, 200, 200, 550));
    }

    let w = 0;
    let shown = 0;
    let p = 0;
    let t0 = 0;
    let lastShown = -1;

    const showMark = () => {
      if (shown) return;
      shown = 1;
      o(g, 400, 0, 1);
      y(P, '12px', 0, 400, 0, 4, 1);
    };

    const bump = () => {
      w += 40;
    };

    if (D.readyState < 'l') w = 20;
    else addEventListener('DOMContentLoaded', () => (w += 20));
    D.fonts.ready.then(bump, bump);
    if (!m) {
      U(showMark, 800);
      D.fonts.load('700 1em "IBM Plex Sans Arabic","د"').then(showMark, showMark);
    }

    const posterEl = Q('.hero-poster-img');
    if (posterEl && typeof posterEl.decode === 'function') {
      posterEl.decode().then(bump, bump);
    } else {
      const poster = new Image();
      poster.src =
        innerWidth <= 600 ? 'assets/hero-poster-800.webp' : 'assets/hero-poster.webp';
      poster.decode().then(bump, bump);
    }

    const f0 = (now) => {
      if (!t0) t0 = now;
      const elapsed = now - t0;
      const target = mob ? w || 10 : elapsed < 2e3 ? w || 10 : 100;
      const eased = p + (target - p) * 0.2;
      const cap = elapsed / 7;
      p = mob ? eased : eased < cap ? eased : cap;
      if (target > 99 && p >= 99.5) p = 100;

      const rounded = (p + 0.5) | 0;
      const disp = m && rounded < 100 ? ((p / 10) | 0) * 10 : rounded;
      if (disp !== lastShown) {
        if (lastShown < 50 && disp > 49 && disp < 100) {
          s.textContent = x.textContent + ' 50%';
        }
        lastShown = disp;
        $.textContent = disp;
        _.style.transform = `scaleX(${p / 100})`;
      }

      if (rounded < 100) {
        q = F(f0);
        return;
      }

      clearTimeout(I);
      self.__mark?.('counter finished');
      self.__mark?.('minimum hold finished');
      waitForAppReady(() => {
        if (V) return;
        S(N, mob ? 1000 : 1600, 1);
        s.textContent = M;

        if (m) {
          Z();
          o(e, 300);
          U(N, 300, 1);
          return;
        }

        showMark();
        if (mob) {
          A(
            x,
            [
              { '--sel': '0%', color: '#f3f0eab3', easing: E[2] },
              { '--sel': '100%', color: '#050505', offset: 0.652 },
              { '--sel': '0%', color: '#f3f0ea73' },
            ],
            100
          );
          A(x, { '--strike-w': ['0%', '100%'] }, 60, 60, 2);
          o(x, 60, 110);
          y(Y, '6px', 0, 60, 110, 0, 1);
          [j, g, k].forEach((el) => o(el, 120, 80));
          U(() => d.classList.add('is-fading'), 60);
          J(120, 160, 120, 80, 200, 200, 550);
          return;
        }
        A(
          x,
          [
            { '--sel': '0%', color: '#f3f0eab3', easing: E[2] },
            { '--sel': '100%', color: '#050505', offset: 0.652 },
            { '--sel': '0%', color: '#f3f0ea73' },
          ],
          230
        );
        A(x, { '--strike-w': ['0%', '100%'] }, 150, 150, 2);
        o(x, 120, 300);
        y(Y, '6px', 0, 120, 300, 0, 1);
        [j, g, k].forEach((el) => o(el, 200, 400));
        U(() => d.classList.add('is-fading'), 460);
        J(400, 200, 500, 100, 500, 580, 700);
      });
    };

    q = F(f0);
  } catch {
    clearTimeout(I);
    N(0);
  }
})();
