/* Research pages: theme toggle, section index, before/after sliders, scene toggles. */
(() => {
  const root = document.documentElement;
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  document.getElementById('theme')?.addEventListener('click', () => {
    const n = isDark() ? 'light' : 'dark'; root.dataset.theme = n;
    try { localStorage.setItem('lh-theme', n); } catch (e) {}
  });
  const bar = document.querySelector('.topbar');
  const onScroll = () => bar && bar.classList.toggle('scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  const toc = [...document.querySelectorAll('.toc a[href^="#"]')];
  if ('IntersectionObserver' in window && toc.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) toc.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-30% 0px -60% 0px' });
    toc.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }

  document.querySelectorAll('.compare').forEach(c => {
    const r = c.querySelector('input');
    const set = v => c.style.setProperty('--pos', v + '%');
    r.addEventListener('input', () => set(r.value)); set(r.value);
  });

  // scene toggles: buttons with data-scene swap every [data-src-N] image in the group
  document.querySelectorAll('[data-scenes]').forEach(g => {
    const btns = [...g.querySelectorAll('.seg button')];
    btns.forEach(b => b.addEventListener('click', () => {
      btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      const k = b.dataset.scene;
      g.querySelectorAll('img[data-base]').forEach(img => { img.src = img.dataset.base + k + '.jpg'; });
    }));
  });
})();
