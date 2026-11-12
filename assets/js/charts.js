/* Saint Paul Agency — small SVG/HTML chart kit for client report pages. No dependencies. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const C = {};

  // ---------- helpers
  C.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, attrs) {
    const t = el('text', Object.assign({ x, y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }
  C.textWidth = (s, px) => String(s).length * (px || 13.5) * 0.6;
  C.nice = function (max, count) {
    if (!(max > 0)) max = 1;
    const raw = max / (count || 4);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
    const top = Math.ceil(max / step - 1e-9) * step;
    const ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { max: top, ticks };
  };
  function newSvg(host, W, H, label) {
    host.innerHTML = '';
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, role: 'img', 'aria-label': label || 'Chart', class: 'viz' }, host);
    svg.style.maxWidth = W + 'px';
    return svg;
  }
  function hostWidth(host, o) { return Math.max(260, Math.round(o.width || host.clientWidth || 640)); }

  // ---------- tooltip
  C.tip = {
    node() { return document.getElementById('tip'); },
    show(html, cx, cy) {
      const t = this.node(); if (!t) return;
      t.innerHTML = html; t.hidden = false;
      const r = t.getBoundingClientRect();
      const vw = window.innerWidth, vh = window.innerHeight;
      let x = cx + 16, y = cy + 16;
      if (x + r.width > vw - 8) x = Math.max(8, cx - r.width - 16);
      if (y + r.height > vh - 8) y = Math.max(8, cy - r.height - 16);
      t.style.left = x + 'px'; t.style.top = y + 'px';
    },
    hide() { const t = this.node(); if (t) t.hidden = true; }
  };
  C.tipRow = (color, label, value) =>
    `<div class="tip-row"><span class="tip-key">${color ? `<i style="background:${color}"></i>` : ''}${C.esc(label)}</span><b>${C.esc(value)}</b></div>`;

  function xTickIdx(n, iw, o) {
    if (o.xTicks && o.xTicks.length) return o.xTicks;
    const max = Math.max(2, Math.floor(iw / 86));
    const step = Math.max(1, Math.ceil(n / max));
    const out = [];
    for (let i = 0; i < n; i += step) out.push(i);
    return out;
  }

  // ---------- line chart (one y-axis), optional area, reference line, bands and event marks
  C.lines = function (host, o) {
    const W = hostWidth(host, o), H = o.height || 260;
    const n = o.labels.length;
    const vals = o.series.flatMap(s => s.values.filter(v => v != null));
    const { max: ymax, ticks } = C.nice(Math.max(...vals, o.ref ? o.ref.value * 1.08 : 0, 1), H < 200 ? 3 : 4);
    const yw = Math.max(...ticks.map(t => C.textWidth(o.yFmt(t), 13.5)));
    const m = { l: Math.ceil(yw) + 14, r: 16, t: 12, b: 30 };
    const iw = W - m.l - m.r;
    const step = n > 1 ? iw / (n - 1) : iw;
    const x = i => m.l + (n > 1 ? i * step : iw / 2);
    // event labels: place each in the first row where it doesn't collide
    const evs = [], rowsEnd = [];
    (o.events || []).forEach(ev => {
      if (ev.i < 0 || ev.i >= n) return;
      const ex = x(ev.i), w = C.textWidth(ev.label, 12.5);
      const right = ex + 4 + w <= W - 4;
      const b0 = right ? ex + 4 : ex - 4 - w, b1 = b0 + w;
      let row = rowsEnd.findIndex(end => end + 10 < b0);
      if (row < 0) { row = rowsEnd.length; rowsEnd.push(-1e9); }
      rowsEnd[row] = b1;
      evs.push({ ex, label: ev.label, row, anchor: right ? 'start' : 'end', tx: right ? ex + 4 : ex - 4 });
    });
    if (rowsEnd.length) m.t = 12 + rowsEnd.length * 16;
    const ih = H - m.t - m.b;
    const y = v => m.t + ih - (v / ymax) * ih;
    const svg = newSvg(host, W, H, o.label);
    const gBand = el('g', {}, svg);
    if (o.bands) {
      const bw = Math.max(3, n > 1 ? step : iw);
      o.bands.forEach((b, i) => { if (b) el('rect', { x: x(i) - bw / 2, y: m.t, width: bw, height: ih, class: 'band' }, gBand); });
    }
    const gGrid = el('g', { class: 'grid' }, svg);
    ticks.forEach(t => {
      el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'axis' : 'gridline' }, gGrid);
      text(gGrid, m.l - 8, y(t) + 4.5, o.yFmt(t), { class: 'tick', 'text-anchor': 'end' });
    });
    xTickIdx(n, iw, o).forEach((i, k, arr) => {
      const anchor = n > 1 && i === 0 ? 'start' : (i === n - 1 && arr.length > 1 ? 'end' : 'middle');
      text(gGrid, x(i), H - 9, o.xFmt(i), { class: 'tick', 'text-anchor': anchor });
    });
    evs.forEach(ev => {
      const ty = 12 + ev.row * 16 + 2;
      el('line', { x1: ev.ex, x2: ev.ex, y1: ty + 3, y2: m.t + ih, class: 'event-line' }, svg);
      text(svg, ev.tx, ty, ev.label, { class: 'event-label', 'text-anchor': ev.anchor });
    });
    if (o.ref) {
      const ry = y(o.ref.value);
      el('line', { x1: m.l, x2: W - m.r, y1: ry, y2: ry, class: 'ref-line' }, svg);
    }
    if (o.ref && o.ref.label) {
      const ry = y(o.ref.value);
      // put the label where the data lines are farthest from it
      const lw = C.textWidth(o.ref.label, 13) + 8, cands = [];
      [[m.l + 6, 'start'], [W - m.r - 4, 'end'], [m.l + iw / 2, 'middle']].forEach(([tx, an]) => [ry + 17, ry - 7].forEach(ty => {
        if (ty - 13 < m.t || ty > m.t + ih - 2) return;
        const x0 = an === 'start' ? tx : an === 'end' ? tx - lw : tx - lw / 2, x1 = x0 + lw;
        let best = 1e9;
        o.series.forEach(se => se.values.forEach((v, i) => {
          if (v == null) return; const px = x(i); if (px < x0 - step || px > x1 + step) return;
          const py = y(v); const d = py < ty - 13 ? (ty - 13) - py : py > ty + 3 ? py - (ty + 3) : 0; best = Math.min(best, d);
        }));
        cands.push({ tx, an, ty, d: best });
      }));
      cands.sort((a, b) => b.d - a.d);
      const c0 = cands[0] || { tx: W - m.r - 2, an: 'end', ty: ry - 7 };
      text(svg, c0.tx, c0.ty, o.ref.label, { class: 'ref-label', 'text-anchor': c0.an });
    }
    o.series.forEach(s => {
      let d = '', pen = false, area = '', first = null, last = null;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1);
        if (first == null) first = i; last = i; pen = true;
      });
      if (s.area && first != null) {
        area = d + `L${x(last).toFixed(1)},${y(0)}L${x(first).toFixed(1)},${y(0)}Z`;
        el('path', { d: area, class: 'area', style: `fill:${s.color}` }, svg);
      }
      el('path', { d, class: 'line' + (s.dash ? ' dashed' : ''), style: `stroke:${s.color}` }, svg);
      if (n === 1 || s.dots) s.values.forEach((v, i) => { if (v != null) el('circle', { cx: x(i), cy: y(v), r: 4, class: 'dot', style: `fill:${s.color}` }, svg); });
    });
    // hover + keyboard
    const cross = el('line', { y1: m.t, y2: m.t + ih, class: 'crosshair', visibility: 'hidden' }, svg);
    const dots = o.series.map(s => el('circle', { r: 5, class: 'hover-dot', style: `fill:${s.color}`, visibility: 'hidden' }, svg));
    const ov = el('rect', { x: m.l - 6, y: m.t, width: iw + 12, height: ih, class: 'overlay', tabindex: 0, 'aria-label': (o.label || 'Chart') + ': use arrow keys to read values' }, svg);
    let cur = n - 1;
    function show(i, cx, cy) {
      cur = Math.max(0, Math.min(n - 1, i));
      cross.setAttribute('x1', x(cur)); cross.setAttribute('x2', x(cur)); cross.setAttribute('visibility', 'visible');
      o.series.forEach((s, k) => {
        const v = s.values[cur];
        if (v == null) { dots[k].setAttribute('visibility', 'hidden'); return; }
        dots[k].setAttribute('cx', x(cur)); dots[k].setAttribute('cy', y(v)); dots[k].setAttribute('visibility', 'visible');
      });
      const html = o.tip ? o.tip(cur) : `<div class="tip-title">${C.esc(o.xFmt(cur, true))}</div>` +
        o.series.map(s => C.tipRow(s.color, s.name, s.values[cur] == null ? 'n/a' : o.yFmt(s.values[cur], true))).join('');
      if (cx == null) { const r = svg.getBoundingClientRect(); const sc = r.width / W; cx = r.left + x(cur) * sc; cy = r.top + m.t * sc + 20; }
      C.tip.show(html, cx, cy);
    }
    function hide() { cross.setAttribute('visibility', 'hidden'); dots.forEach(d => d.setAttribute('visibility', 'hidden')); C.tip.hide(); }
    function idxAt(ev) {
      const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) * (W / r.width);
      return n > 1 ? Math.round((px - m.l) / step) : 0;
    }
    ov.addEventListener('pointermove', ev => show(idxAt(ev), ev.clientX, ev.clientY));
    ov.addEventListener('pointerdown', ev => show(idxAt(ev), ev.clientX, ev.clientY));
    ov.addEventListener('pointerleave', hide);
    ov.addEventListener('blur', hide);
    ov.addEventListener('focus', () => show(cur));
    ov.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowLeft') { show(cur - 1); ev.preventDefault(); }
      if (ev.key === 'ArrowRight') { show(cur + 1); ev.preventDefault(); }
    });
    return svg;
  };

  // ---------- vertical bars, optionally stacked. 2px surface gap between segments, rounded data-end.
  function roundTop(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  C.bars = function (host, o) {
    const W = hostWidth(host, o), H = o.height || 260;
    const n = o.labels.length;
    const totals = o.labels.map((_, i) => o.series.reduce((a, s) => a + (s.values[i] || 0), 0));
    const { max: ymax, ticks } = C.nice(Math.max(...totals, 1), H < 200 ? 3 : 4);
    const yw = Math.max(...ticks.map(t => C.textWidth(o.yFmt(t), 13.5)));
    const m = { l: Math.ceil(yw) + 14, r: 12, t: 12, b: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const band = iw / n, bw = Math.max(4, Math.min(46, band * 0.66));
    const y = v => m.t + ih - (v / ymax) * ih;
    const svg = newSvg(host, W, H, o.label);
    const gGrid = el('g', { class: 'grid' }, svg);
    ticks.forEach(t => {
      el('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t === 0 ? 'axis' : 'gridline' }, gGrid);
      text(gGrid, m.l - 8, y(t) + 4.5, o.yFmt(t), { class: 'tick', 'text-anchor': 'end' });
    });
    const maxLab = Math.max(1, Math.floor(iw / 70));
    const every = Math.max(1, Math.ceil(n / maxLab));
    o.labels.forEach((lab, i) => {
      if (i % every) return;
      text(gGrid, m.l + band * i + band / 2, H - 9, lab, { class: 'tick', 'text-anchor': 'middle' });
    });
    const cols = [];
    o.labels.forEach((_, i) => {
      const bx = m.l + band * i + (band - bw) / 2;
      let base = 0;
      const segs = o.series.map(s => s.values[i] || 0);
      const topIdx = segs.reduce((a, v, k) => (v > 0 ? k : a), -1);
      const g = el('g', { class: 'col' }, svg);
      segs.forEach((v, k) => {
        if (v <= 0) return;
        const y0 = y(base), y1 = y(base + v);
        const gap = base > 0 ? 2 : 0;
        const h = Math.max(0, y0 - y1 - gap);
        if (k === topIdx) el('path', { d: roundTop(bx, y1, bw, h, 4), style: `fill:${o.series[k].color}`, class: 'bar' + (o.partial && o.partial[i] ? ' partial' : '') }, g);
        else el('rect', { x: bx, y: y1, width: bw, height: h, style: `fill:${o.series[k].color}`, class: 'bar' + (o.partial && o.partial[i] ? ' partial' : '') }, g);
        base += v;
      });
      const hit = el('rect', { x: m.l + band * i, y: m.t, width: band, height: ih, class: 'overlay', tabindex: 0 }, svg);
      cols.push(g);
      const html = () => o.tip ? o.tip(i) : `<div class="tip-title">${C.esc(o.labels[i])}</div>` +
        o.series.map(s => C.tipRow(s.color, s.name, o.yFmt(s.values[i] || 0, true))).join('');
      const on = (cx, cy) => { cols.forEach((c, k) => c.classList.toggle('dim', k !== i)); C.tip.show(html(), cx, cy); };
      const off = () => { cols.forEach(c => c.classList.remove('dim')); C.tip.hide(); };
      hit.addEventListener('pointermove', ev => on(ev.clientX, ev.clientY));
      hit.addEventListener('pointerdown', ev => on(ev.clientX, ev.clientY));
      hit.addEventListener('pointerleave', off);
      hit.addEventListener('focus', () => { const r = hit.getBoundingClientRect(); on(r.left + r.width / 2, r.top + 20); });
      hit.addEventListener('blur', off);
    });
    return svg;
  };

  // ---------- horizontal bar list (HTML; wraps nicely on phones)
  C.hbars = function (host, o) {
    const max = o.max || Math.max(...o.rows.map(r => r.value), 1);
    host.innerHTML = `<div class="hb">${o.rows.map(r => `
      <div class="hb-row" tabindex="0" data-tip="${C.esc(r.tip || '')}">
        <div class="hb-top"><span class="hb-label">${C.esc(r.label)}</span><span class="hb-val">${C.esc(r.display)}</span></div>
        <div class="hb-track"><div class="hb-fill" style="width:${Math.max(0.6, r.value / max * 100).toFixed(2)}%;background:${r.color || 'var(--s-ctv)'}"></div></div>
        ${r.sub ? `<div class="hb-sub">${C.esc(r.sub)}</div>` : ''}
      </div>`).join('')}</div>`;
  };

  // ---------- heatmap (CSS grid)
  C.heat = function (host, o) {
    const flat = o.values.flat();
    const max = Math.max(...flat, 1);
    const ramp = o.ramp;
    const colorOf = v => C.interp(ramp, v / max);
    let h = `<div class="heat" style="--cols:${o.cols.length}"><div class="heat-corner"></div>`;
    o.cols.forEach((c, j) => { h += `<div class="heat-col">${j % (o.colEvery || 3) === 0 ? C.esc(c) : ''}</div>`; });
    o.rows.forEach((r, i) => {
      h += `<div class="heat-row">${C.esc(r)}</div>`;
      o.cols.forEach((c, j) => {
        const v = o.values[i][j];
        h += `<div class="heat-cell" tabindex="-1" style="background:${colorOf(v)}" data-i="${i}" data-j="${j}"></div>`;
      });
    });
    h += `</div><div class="ramp-legend"><span>${C.esc(o.lowLabel || 'Fewer')}</span><span class="ramp" style="background:linear-gradient(90deg,${ramp.join(',')})"></span><span>${C.esc(o.highLabel || 'More')}</span></div>`;
    host.innerHTML = h;
    host.querySelectorAll('.heat-cell').forEach(cell => {
      const i = +cell.dataset.i, j = +cell.dataset.j;
      const on = ev => C.tip.show(o.tip(i, j), ev.clientX, ev.clientY);
      cell.addEventListener('pointermove', on);
      cell.addEventListener('pointerdown', on);
      cell.addEventListener('pointerleave', () => C.tip.hide());
    });
  };

  // ---------- colour ramp interpolation
  function hex2rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
  C.interp = function (ramp, t) {
    t = Math.max(0, Math.min(1, t || 0));
    const p = t * (ramp.length - 1), i = Math.min(ramp.length - 2, Math.floor(p)), f = p - i;
    const a = hex2rgb(ramp[i]), b = hex2rgb(ramp[i + 1]);
    return '#' + a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('');
  };
  C.contrast = function (a, b) {
    const L = h => { const v = hex2rgb(h).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
    const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  C.inkOn = function (hex) { const [r, g, b] = hex2rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#0E1830' : '#FFFFFF'; };

  // ---------- map: county shading + billboard markers
  C.map = function (host, o) {
    const g = o.geo; const [, , W, H] = g.viewBox;
    host.innerHTML = '';
    const svg = el('svg', { viewBox: g.viewBox.join(' '), width: '100%', role: 'img', 'aria-label': o.label || 'Map', class: 'viz map' }, host);
    if (o.maxHeight) svg.style.maxHeight = o.maxHeight + 'px';
    // work in screen pixels: k = svg units per screen pixel at the size the map is drawn
    const bb = svg.getBoundingClientRect();
    const rw = bb.width ? Math.min(bb.width, bb.height ? bb.height * W / H : 1e9) : (Math.min(host.clientWidth || 640, (o.maxHeight || 1e9) * W / H) || 640);
    const k = W / rw;
    const rScreen = Math.min(14, 18 / k);          // neighbouring boards never touch
    const withText = rScreen >= 10.5;
    const r = rScreen * k;
    const ctx = el('g', { class: 'map-ctx' }, svg);
    g.context.forEach(c => el('path', { d: c.d }, ctx));
    const vals = g.counties.map(c => o.countyValue(c));
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const fills = vals.map(v => C.interp(o.ramp, 0.08 + (hi > lo ? (v - lo) / (hi - lo) : 0.5) * 0.92));
    const gC = el('g', { class: 'map-counties' }, svg);
    const paths = g.counties.map((c, j) => {
      const p = el('path', { d: c.d, style: `fill:${fills[j]}`, class: 'county', tabindex: 0 }, gC);
      const on = (cx, cy) => C.tip.show(o.countyTip(c, vals[j]), cx, cy);
      p.addEventListener('pointermove', ev => on(ev.clientX, ev.clientY));
      p.addEventListener('pointerdown', ev => on(ev.clientX, ev.clientY));
      p.addEventListener('pointerleave', () => C.tip.hide());
      p.addEventListener('focus', () => { const q = p.getBoundingClientRect(); on(q.left + q.width / 2, q.top + q.height / 2); });
      p.addEventListener('blur', () => C.tip.hide());
      return p;
    });
    // keep-out boxes: every board marker plus a margin
    const pad = 4 * k, taken = (o.boards || []).map(b => [b.x - r - pad, b.y - r - pad, b.x + r + pad, b.y + r + pad]);
    const hit = (a, b) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
    const gL = el('g', { class: 'map-labels' }, svg);
    const cs = getComputedStyle(svg), ink = (cs.getPropertyValue('--ink') || '#0E1830').trim();
    function place(str, cx, cy, cls, box, rot, fsPx, under) {
      const fs = fsPx * k;
      const t = text(gL, cx, cy, str, { class: 'map-label ' + cls, 'font-size': fs, 'stroke-width': 4 * k, 'text-anchor': 'middle' });
      if (under) { // pick the clearer of light or dark text for this county's colour
        const cw = C.contrast('#FFFFFF', under), ci = C.contrast(ink, under), best = cw > ci ? '#FFFFFF' : ink;
        t.style.fill = best;
        if (Math.max(cw, ci) >= 7) t.style.stroke = under;
        else t.style.stroke = best === '#FFFFFF' ? '#0E1830' : (C.contrast(ink, '#FFFFFF') > 7 ? '#FFFFFF' : '#0E1830');
      }
      let len = 0; try { len = t.getComputedTextLength(); } catch (e) { /* not rendered */ }
      if (!len) len = str.length * fs * 0.62;
      const cands = [[0, 0], [0, -1.4], [0, 1.4], [-0.55, 0], [0.55, 0], [0, -2.8], [0, 2.8], [-0.55, -1.4], [0.55, -1.4], [-0.55, 1.4], [0.55, 1.4]];
      for (const [dx, dy] of cands) {
        const x = rot ? cx + dy * fs : cx + dx * len, y = rot ? cy + dx * len : cy + dy * fs;
        const bx = rot ? [x - fs * 0.8, y - len / 2 - 2 * k, x + fs * 0.3, y + len / 2 + 2 * k] : [x - len / 2 - 3 * k, y - fs * 0.8, x + len / 2 + 3 * k, y + fs * 0.3];
        if (box && (bx[0] < box.x || bx[2] > box.x + box.width || bx[1] < box.y || bx[3] > box.y + box.height)) continue;
        if (taken.some(q => hit(bx, q))) continue;
        t.setAttribute('x', x); t.setAttribute('y', y);
        if (rot) t.setAttribute('transform', `rotate(-90 ${x} ${y})`);
        taken.push(bx);
        return;
      }
      t.remove();
    }
    g.counties.forEach((c, j) => {
      let box = null; try { box = paths[j].getBBox(); } catch (e) { /* ignore */ }
      const rot = !!((o.countyLab || {})[c.name] || {}).rot;
      place(c.name.toUpperCase(), c.cx, c.cy + 4 * k, 'county', box, rot, rw < 420 ? 10.5 : 12.5, fills[j]);
    });
    (o.cities || []).forEach(ct => place(ct.name, ct.x, ct.y + 4 * k, 'city', null, false, rw < 420 ? 11 : 13.5));
    const gB = el('g', { class: 'map-boards' }, svg);
    (o.boards || []).forEach(b => {
      const live = o.boardLive ? o.boardLive(b) : true;
      const grp = el('g', { class: 'board' + (withText ? '' : ' small') + (live ? '' : ' off') + (o.selected === b.id ? ' sel' : ''), tabindex: 0, 'data-id': b.id, transform: `translate(${b.x},${b.y})`, 'aria-label': `${o.boardShort(b)}: ${b.name}` }, gB);
      el('circle', { r: Math.max(r, 14 * k), class: 'hit' }, grp);
      const sw = (withText ? 3 : 2.5) * k;
      if (b.type.startsWith('Digital')) el('circle', { r, class: 'mk', 'stroke-width': sw }, grp);
      else el('rect', { x: -r * 0.92, y: -r * 0.92, width: r * 1.84, height: r * 1.84, rx: 3.5 * k, class: 'mk', 'stroke-width': sw }, grp);
      if (withText) text(grp, 0, 4.2 * k, o.boardShort(b), { class: 'mk-text', 'font-size': 12 * k, 'text-anchor': 'middle' });
      const on = (cx, cy) => C.tip.show(o.boardTip(b), cx, cy);
      grp.addEventListener('pointermove', ev => on(ev.clientX, ev.clientY));
      grp.addEventListener('pointerdown', ev => on(ev.clientX, ev.clientY));
      grp.addEventListener('pointerleave', () => C.tip.hide());
      grp.addEventListener('focus', () => { const q = grp.getBoundingClientRect(); on(q.right, q.top); });
      grp.addEventListener('blur', () => C.tip.hide());
      if (o.onBoard) grp.addEventListener('click', () => o.onBoard(b));
    });
    return { lo, hi, svg };
  };

  // ---------- sparkline
  C.spark = function (host, values, color) {
    const W = 120, H = 30;
    const max = Math.max(...values, 1), min = Math.min(...values, 0);
    const n = values.length;
    host.innerHTML = '';
    if (n < 2) return;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: '100%', height: H, preserveAspectRatio: 'none', class: 'spark', 'aria-hidden': 'true' }, host);
    const d = values.map((v, i) => (i ? 'L' : 'M') + (i * W / (n - 1)).toFixed(1) + ',' + (H - 3 - (v - min) / (max - min || 1) * (H - 6)).toFixed(1)).join('');
    el('path', { d, style: `stroke:${color}`, 'vector-effect': 'non-scaling-stroke' }, svg);
  };

  // ---------- sortable table
  C.table = function (host, o) {
    let sortKey = o.sort ? o.sort.key : null, dir = o.sort ? o.sort.dir : -1;
    const maxOf = {};
    o.columns.forEach(c => { if (c.bar) maxOf[c.key] = Math.max(...o.rows.map(r => r[c.key] || 0), 1); });
    function render() {
      const rows = o.rows.slice();
      if (sortKey) {
        const col = o.columns.find(c => c.key === sortKey);
        rows.sort((a, b) => {
          const av = a[sortKey], bv = b[sortKey];
          if (typeof av === 'string' && !col.num) return dir * av.localeCompare(bv);
          return dir * ((av || 0) - (bv || 0));
        });
      }
      const head = o.columns.map(c => `<th scope="col" class="${c.num ? 'num' : ''}${sortKey === c.key ? ' sorted' : ''}" data-k="${c.key}" ${o.noSort ? '' : 'tabindex="0"'} aria-sort="${sortKey === c.key ? (dir > 0 ? 'ascending' : 'descending') : 'none'}">${C.esc(c.label)}${sortKey === c.key ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('');
      const body = rows.map(r => `<tr${o.rowAttr ? ' ' + o.rowAttr(r) : ''}>` + o.columns.map((c, ci) => {
        const v = r[c.key];
        const shown = c.fmt ? c.fmt(v, r) : C.esc(v);
        const tag = ci === 0 ? 'th scope="row"' : 'td';
        if (c.bar) return `<${tag} class="num barcell"><span class="cellbar" style="width:${(v / maxOf[c.key] * 100).toFixed(1)}%;background:${c.bar}"></span><span class="cellval">${shown}</span></${ci === 0 ? 'th' : 'td'}>`;
        return `<${tag} class="${c.num ? 'num' : ''}">${shown}</${ci === 0 ? 'th' : 'td'}>`;
      }).join('') + '</tr>').join('');
      const foot = o.total ? `<tfoot><tr>${o.columns.map((c, ci) => `<${ci === 0 ? 'th scope="row"' : 'td'} class="${c.num ? 'num' : ''}">${o.total[c.key] == null ? '' : (ci === 0 ? C.esc(o.total[c.key]) : (c.fmt ? c.fmt(o.total[c.key], o.total) : C.esc(o.total[c.key])))}</${ci === 0 ? 'th' : 'td'}>`).join('')}</tr></tfoot>` : '';
      host.innerHTML = `<div class="tbl-wrap"><table class="tbl${o.compact ? ' compact' : ''}">${o.caption ? `<caption>${C.esc(o.caption)}</caption>` : ''}<thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>`;
      if (!o.noSort) host.querySelectorAll('th[data-k]').forEach(th => {
        const go = () => { const k = th.dataset.k; if (sortKey === k) dir = -dir; else { sortKey = k; dir = o.columns.find(c => c.key === k).num ? -1 : 1; } render(); };
        th.addEventListener('click', go);
        th.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      });
      if (o.after) o.after(host);
    }
    render();
  };

  window.VC = C;
})();
