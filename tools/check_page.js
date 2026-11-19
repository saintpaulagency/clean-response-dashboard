// Browser check for the Clean Response sample: overlaps, sideways scroll, slide/page overflow, contrast, console errors.
// Usage: serve the repo (python3 -m http.server 8765), then  node tools/check_page.js http://localhost:8765/index.html <screenshot folder>
const { chromium } = require('playwright');
const BASE = process.argv[2], OUT = process.argv[3];
const CONFIGS = [
  { name: 'desktop-light', w: 1440, h: 900, scheme: 'light' }, { name: 'desktop-dark', w: 1440, h: 900, scheme: 'dark' },
  { name: 'tablet', w: 820, h: 1180, scheme: 'light' }, { name: 'phone-light', w: 390, h: 844, scheme: 'light' },
  { name: 'phone-dark', w: 390, h: 844, scheme: 'dark' }];
const PAGES = [];
for (const p of ['flight', 'l30']) for (const t of ['overview', 'ctv', 'ooh', 'results']) PAGES.push(`v=dashboard&t=${t}&p=${p}`);
for (let s = 1; s <= 13; s++) PAGES.push(`v=slides&s=${s}&p=flight`);
PAGES.push('v=report&p=flight', 'v=data&p=flight', 'v=report&p=l7');
const probe = () => {
  const issues = [];
  const de = document.scrollingElement;
  if (de.scrollWidth > de.clientWidth + 1) issues.push(`sideways scroll ${de.scrollWidth}>${de.clientWidth}`);
  const vis = el => { const s = getComputedStyle(el); if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[hidden]'); };
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode; if (!n.textContent.trim()) continue;
    const el = n.parentElement; if (!el || seen.has(el) || !vis(el)) continue;
    if (el.closest('script,style,noscript,.tip,[aria-hidden="true"] title')) continue;
    seen.add(el);
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) { const k = r.height * 0.15; leaves.push({ el, r: { left: r.left, right: r.right, top: r.top + k, bottom: r.bottom - k }, t: n.textContent.trim().slice(0, 30) }); }
  }
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    const a = leaves[i], b = leaves[j]; if (a.el === b.el || a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x > 2 && y > 2) issues.push(`overlap "${a.t}" / "${b.t}"`);
  }
  // map labels on markers
  document.querySelectorAll('svg').forEach(svg => {
    const marks = [...svg.querySelectorAll('circle, rect.mk, .mk, [class*="marker"]')].filter(vis).map(m => m.getBoundingClientRect());
    svg.querySelectorAll('text').forEach(t => { if (!vis(t) || t.closest('.mk,[class*="marker"]')) return; const r = t.getBoundingClientRect();
      marks.forEach(m => { const x = Math.min(r.right, m.right) - Math.max(r.left, m.left), y = Math.min(r.bottom, m.bottom) - Math.max(r.top, m.top); if (x > 2 && y > 2 && m.width < 40 && !(r.left >= m.left && r.right <= m.right && r.top >= m.top && r.bottom <= m.bottom)) issues.push(`label on marker "${t.textContent.slice(0, 20)}"`); }); });
  });
  // slide / report page overflow
  document.querySelectorAll('.slide, .sheet').forEach(box => { if (!vis(box)) return; const B = box.getBoundingClientRect();
    box.querySelectorAll('*').forEach(e => { if (!vis(e) || getComputedStyle(e).position === 'fixed') return; let r = e.getBoundingClientRect(); const sv = e.ownerSVGElement; if (sv && getComputedStyle(sv).overflow !== 'visible') { const q = sv.getBoundingClientRect(); r = { right: Math.min(r.right, q.right), bottom: Math.min(r.bottom, q.bottom) }; } if (r.right > B.right + 1 || r.bottom > B.bottom + 1) issues.push(`runs past ${box.className.split(' ')[0]}: ${e.tagName}.${(e.className && e.className.baseVal !== undefined ? e.className.baseVal : e.className) || ''} "${(e.textContent || '').trim().slice(0, 25)}"`); }); });
  // contrast of text against the nearest solid background
  const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const st = getComputedStyle(e); if (st.backgroundImage.includes('gradient')) { const g = st.backgroundImage.match(/rgba?\([^)]*\)/g); if (g) return rgb(g[g.length - 1]); } const c = rgb(st.backgroundColor); if (c && (c.length < 4 || c[3] > 0.9)) return c; } return rgb(getComputedStyle(document.body).backgroundColor); };
  let low = 0, worst = 99, wt = '';
  seen.forEach(el => { if (el.closest('svg') || el.closest('button.chip,.chipid')) return; const fg = rgb(getComputedStyle(el).color), bg = bgOf(el); if (!fg || !bg) return;
    const a = fg.length > 3 ? fg[3] : 1; const f = fg.slice(0, 3).map((v, k) => v * a + bg[k] * (1 - a));
    const L1 = lum(f), L2 = lum(bg), cr = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (cr < 7) { low++; if (cr < worst) { worst = cr; wt = el.textContent.trim().slice(0, 30); } } });
  if (low) issues.push(`contrast under 7:1 on ${low} elements (worst ${worst.toFixed(2)} "${wt}")`);
  return [...new Set(issues)];
};
(async () => {
  const browser = await chromium.launch(); let total = 0; const report = [];
  for (const c of CONFIGS) {
    const ctx = await browser.newContext({ viewport: { width: c.w, height: c.h }, colorScheme: c.scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
    for (const h of PAGES) {
      await page.goto(`${BASE}?n=${Math.random()}#${h}`); await page.waitForTimeout(350); const want = new URLSearchParams(h); const got = await page.evaluate(() => [document.querySelector("#views button.on")?.dataset.v, document.querySelector("#tabs button.on")?.dataset.t, location.hash]); if (got[0] !== want.get("v") || (want.get("t") && got[1] !== want.get("t"))) errs.push("did not open " + h + " got " + got.join(","));
      const iss = (await page.evaluate(probe)).concat(errs.splice(0));
      if (iss.length) { total += iss.length; report.push(`${c.name} ${h}: ${iss.slice(0, 6).join(' | ')}`); }
      if (c.name === 'desktop-light' && /t=overview&p=flight|t=ooh&p=flight|t=ctv&p=flight|t=results&p=flight|s=2&/.test(h)) await page.screenshot({ path: `${OUT}/${c.name}-${h.replace(/[=&]/g, '_')}.png`, fullPage: true });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(report.join('\n') || 'no issues'); console.log('issues', total);
})();
