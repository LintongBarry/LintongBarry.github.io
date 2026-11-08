/* Lintong Han homepage: avatar "denoising" canvas, filters, theme, nav state. */
(() => {
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* theme */
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.getElementById('theme')?.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('lh-theme', next); } catch (e) {}
  });

  /* top bar border + active section */
  const bar = document.querySelector('.topbar');
  const onScroll = () => bar.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const links = [...document.querySelectorAll('.topbar nav a')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(a => { const s = document.querySelector(a.getAttribute('href')); if (s) io.observe(s); });
  }

  /* filters */
  document.querySelectorAll('[data-filter]').forEach(group => {
    const list = document.getElementById(group.dataset.filter);
    const items = [...list.children];
    group.addEventListener('click', ev => {
      const btn = ev.target.closest('.chip'); if (!btn) return;
      group.querySelectorAll('.chip').forEach(c => { c.classList.toggle('on', c === btn); c.setAttribute('aria-pressed', String(c === btn)); });
      const tag = btn.dataset.tag;
      items.forEach(it => {
        const show = tag === 'all' || it.dataset.tags.split(' ').includes(tag);
        it.classList.toggle('hide', !show);
        if (show && !reduce) { it.classList.remove('fade'); void it.offsetWidth; it.classList.add('fade'); }
      });
    });
    group.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.classList.contains('on'))));
  });

  /* avatar: particles denoise into the initials, cursor re-noises them */
  const cv = document.getElementById('avatar');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let W, H, pts = [], start = 0, mx = -1e4, my = -1e4, heat = 0, running = true;
  const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

  function build() {
    const r = cv.getBoundingClientRect(); if (!r.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const o = off.getContext('2d');
    o.fillStyle = '#fff'; o.textAlign = 'center'; o.textBaseline = 'middle';
    o.font = `800 ${Math.round(W * 0.46)}px Montserrat, system-ui, sans-serif`;
    o.fillText('LH', W / 2, H * 0.47);
    const data = o.getImageData(0, 0, W, H).data;
    const step = Math.max(3, Math.round(W / 70)), cand = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 128) cand.push([x, y, 1]);
      else if (Math.random() < 0.035) cand.push([x, y, 0]);
    }
    pts = cand.map(([x, y, inL]) => ({ tx: x, ty: y, inL, nx: gauss(), ny: gauss(), k: 0, ph: Math.random() * 6.28 }));
  }

  const DUR = reduce ? 0 : 2600;
  function frame(now) {
    if (!running) return;
    if (!start) start = now;
    const p = DUR ? Math.min(1, (now - start) / DUR) : 1;
    const e = 1 - Math.pow(1 - p, 3);
    const sigma = (1 - e) * W * 0.55;
    ctx.clearRect(0, 0, W, H);
    heat *= 0.93;
    const t = now * 0.001;
    for (const q of pts) {
      const dx = q.tx - mx, dy = q.ty - my, d = Math.hypot(dx, dy);
      if (d < W * 0.22) q.k = Math.min(1, q.k + 0.14 * heat * (1 - d / (W * 0.22)));
      q.k *= 0.95;
      const s = sigma + q.k * W * 0.12 + (q.inL ? 0.5 : 2.5);
      const x = q.tx + q.nx * s + (reduce ? 0 : Math.sin(t * 1.4 + q.ph) * 0.5);
      const y = q.ty + q.ny * s + (reduce ? 0 : Math.cos(t * 1.2 + q.ph) * 0.5);
      const hue = 228 - (q.tx / W) * 55;
      const a = q.inL ? 0.35 + 0.65 * e : 0.25;
      ctx.fillStyle = q.inL ? `hsla(${hue}, 90%, ${76 + q.k * 14}%, ${a})` : `hsla(${hue}, 70%, 75%, ${a})`;
      const rr = q.inL ? 1.25 : 0.9;
      ctx.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    requestAnimationFrame(frame);
  }

  const go = () => { build(); start = 0; };
  (document.fonts?.ready || Promise.resolve()).then(() => { go(); requestAnimationFrame(frame); });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(go, 200); });
  const box = cv.parentElement;
  box.addEventListener('pointermove', ev => { const r = cv.getBoundingClientRect(); mx = ev.clientX - r.left; my = ev.clientY - r.top; heat = 1; });
  box.addEventListener('pointerleave', () => { mx = my = -1e4; });
  box.addEventListener('click', () => { pts.forEach(q => { q.nx = gauss(); q.ny = gauss(); }); start = 0; });
  if ('IntersectionObserver' in window) new IntersectionObserver(([en]) => {
    const was = running; running = en.isIntersecting; if (running && !was) requestAnimationFrame(frame);
  }).observe(box);
})();
