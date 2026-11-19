/* Clean Response — media performance report (sample). Saint Paul Agency. */
(function () {
  'use strict';
  const S = window.SAMPLE, C = window.VC, esc = C.esc;
  const D = S.dates, N = D.length;
  const IX = {}; D.forEach((d, i) => { IX[d] = i; });
  const FS = IX[S.meta.flight_start], FE = IX[S.meta.flight_end];
  const BS = IX[S.meta.baseline_start], BE = FS - 1;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONF = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const WDF = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dt = i => new Date(D[i] + 'T12:00:00Z');
  const wday = i => (dt(i).getUTCDay() + 6) % 7;
  const LOGO = 'assets/img/spa-logo.png';

  // ------------------------------------------------------------------ format
  const F = {
    int: v => Math.round(v).toLocaleString('en-US'),
    compact(v) {
      const a = Math.abs(v);
      if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 1 : 2) + 'M';
      if (a >= 1e4) return (v / 1e3).toFixed(a >= 1e5 ? 0 : 1).replace(/\.0$/, '') + 'K';
      return F.int(v);
    },
    usd: v => '$' + F.int(v),
    usdC: v => '$' + F.compact(v),
    usd2: v => '$' + (+v).toFixed(2),
    pct: (v, d) => (v * 100).toFixed(d == null ? 1 : d) + '%',
    dec: (v, d) => (+v).toFixed(d == null ? 1 : d),
    x: v => (+v).toFixed(1) + '×',
  };
  function fmtDay(i, y) { const d = dt(i); return MON[d.getUTCMonth()] + ' ' + d.getUTCDate() + (y ? ', ' + d.getUTCFullYear() : ''); }
  function period(i0, i1) {
    if (i0 === i1) return fmtDay(i0, true);
    const a = dt(i0), b = dt(i1);
    if (a.getUTCMonth() === b.getUTCMonth()) return `${MON[a.getUTCMonth()]} ${a.getUTCDate()}–${b.getUTCDate()}, ${b.getUTCFullYear()}`;
    return `${fmtDay(i0)} – ${fmtDay(i1)}, ${b.getUTCFullYear()}`;
  }
  const hourLabel = h => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? ' AM' : ' PM');
  const hourShort = h => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? 'a' : 'p');
  const boardShort = b => b.id.replace('CR-', '').replace(/0(\d)$/, '$1');

  // ------------------------------------------------------------------ sums
  function sum(a, i0, i1) { let s = 0; for (let i = i0; i <= i1; i++) s += a[i]; return s; }
  function sumCol(m, k, i0, i1) { let s = 0; for (let i = i0; i <= i1; i++) s += m[i][k]; return s; }
  const sumRow = (m, i) => m[i].reduce((a, b) => a + b, 0);
  function reachOf(imps) { const U = S.lift_model.universe_hh, f = S.lift_model.min_freq; return Math.round(U * (1 - Math.exp(-imps / (U * f)))); }

  function ctvT(i0, i1) {
    const c = S.ctv;
    const t = { spend: sum(c.spend, i0, i1) / 100, imps: sum(c.imps, i0, i1), completes: sum(c.completes, i0, i1), visits: sum(c.visits, i0, i1), leads: sum(c.leads, i0, i1) };
    t.reach = reachOf(t.imps); t.freq = t.imps / t.reach;
    t.vcr = t.completes / t.imps; t.cpm = t.spend / t.imps * 1000; t.cpcv = t.spend / t.completes;
    t.vpk = t.visits / t.imps * 1000; t.cpv = t.spend / t.visits;
    return t;
  }
  function dimRows(name, i0, i1) {
    const b = S.ctv_dims[name];
    return b.keys.map((key, k) => {
      const r = { key, imps: sumCol(b.imps, k, i0, i1), spend: sumCol(b.spend, k, i0, i1) / 100, completes: sumCol(b.completes, k, i0, i1), visits: sumCol(b.visits, k, i0, i1) };
      r.vcr = r.imps ? r.completes / r.imps : 0; r.cpm = r.imps ? r.spend / r.imps * 1000 : 0; r.vpk = r.imps ? r.visits / r.imps * 1000 : 0;
      return r;
    });
  }
  function boardRows(i0, i1) {
    const bd = S.board_daily;
    return S.boards.map((b, k) => {
      let live = 0; for (let i = i0; i <= i1; i++) if (bd.imps[i][k] > 0) live++;
      const r = { id: b.id, b, short: boardShort(b), name: b.name, city: b.city, type: b.type, imps: sumCol(bd.imps, k, i0, i1), plays: sumCol(bd.plays, k, i0, i1), spend: sumCol(bd.spend, k, i0, i1) / 100, live };
      r.contract = b.contract_plays_day * live; r.delivery = r.contract ? r.plays / r.contract : null; r.cpm = r.imps ? r.spend / r.imps * 1000 : 0;
      return r;
    });
  }
  function oohT(i0, i1) {
    const rows = boardRows(i0, i1);
    const t = { rows, imps: 0, plays: 0, spend: 0, contract: 0, live: 0, digital: 0 };
    rows.forEach(r => { t.imps += r.imps; t.plays += r.plays; t.spend += r.spend; t.contract += r.contract; if (r.live) { t.live++; if (r.contract) t.digital++; } });
    t.delivery = t.contract ? t.plays / t.contract : 0; t.cpm = t.spend / t.imps * 1000;
    t.calls = sum(S.halo.board_calls, i0, i1);
    return t;
  }
  function haloT(i0, i1) {
    const H = S.halo, days = i1 - i0 + 1, bd = BE - BS + 1;
    const t = { days };
    ['sessions', 'branded', 'calls'].forEach(k => {
      t[k] = sum(H[k], i0, i1); t[k + 'Day'] = t[k] / days; t[k + 'Base'] = sum(H[k], BS, BE) / bd; t[k + 'Lift'] = t[k + 'Day'] / t[k + 'Base'] - 1;
    });
    t.boardCalls = sum(H.board_calls, i0, i1);
    return t;
  }
  const cache = {};
  function ctxFor(i0, i1) {
    const key = i0 + '-' + i1;
    if (cache[key]) return cache[key];
    const len = i1 - i0 + 1;
    const mk = (a, b) => { const o = { i0: a, i1: b, len: b - a + 1, label: period(a, b), ctv: ctvT(a, b), ooh: oohT(a, b), halo: haloT(a, b) }; o.spend = o.ctv.spend + o.ooh.spend; o.imps = o.ctv.imps + o.ooh.imps; o.cpm = o.spend / o.imps * 1000; return o; };
    const r = mk(i0, i1);
    let p0 = i0 - len, p1 = i0 - 1;
    // Whole calendar months compare with the same number of months before (July against June's length would skew it).
    if (D[i0].slice(8) === '01' && (!D[i1 + 1] || D[i1 + 1].slice(8) === '01')) {
      const n = (+D[i1].slice(0, 4) - +D[i0].slice(0, 4)) * 12 + (+D[i1].slice(5, 7) - +D[i0].slice(5, 7)) + 1;
      p0 = i0; for (let k = 0; k < n && p0 > 0; k++) { p0--; while (p0 > 0 && D[p0].slice(8) !== '01') p0--; }
    }
    r.prev = p0 >= FS ? mk(p0, p1) : null;
    let trig = 0; for (let i = i0; i <= i1; i++) trig += S.trigger[i]; r.trigDays = trig;
    cache[key] = r;
    return r;
  }

  // ------------------------------------------------------------------ state
  const PRESETS = [
    { key: 'flight', label: 'Full flight', i0: FS, i1: FE },
    ...[6, 7, 8, 9].map(m => { const ds = D.map((d, i) => [d, i]).filter(([d, i]) => i >= FS && +d.slice(5, 7) === m + 1); return { key: MON[m].toLowerCase(), label: MONF[m], i0: ds[0][1], i1: ds[ds.length - 1][1] }; }),
    { key: 'l30', label: 'Last 30 days', i0: FE - 29, i1: FE },
    { key: 'l7', label: 'Last 7 days', i0: FE - 6, i1: FE },
  ];
  const state = { view: 'dashboard', tab: 'overview', preset: 'flight', i0: FS, i1: FE, grain: 'auto', slide: 0 };
  const R = () => ctxFor(state.i0, state.i1);
  const grainOf = r => state.grain === 'auto' ? (r.len > 45 ? 'week' : 'day') : state.grain;

  let scopeEl = null;
  function COL() {
    const host = scopeEl && scopeEl.isConnected ? scopeEl : document.documentElement;
    const cs = getComputedStyle(host), g = k => cs.getPropertyValue(k).trim();
    const inSheet = !!(host.closest && host.closest('.sheet'));
    const dark = !inSheet && document.documentElement.dataset.theme === 'dark';
    return {
      ctv: g('--s-ctv'), ooh: g('--s-ooh'), res: g('--s-res'), ref: g('--s-ref'), band: dark ? '#4a2a22' : '#fde3d8', dark,
      seq: dark ? ['#16233d', '#183a6e', '#184f95', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef', '#b7d3f6']
        : ['#eef4fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#104281'],
    };
  }

  // ------------------------------------------------------------------ buckets
  function buckets(r) {
    const out = [];
    if (grainOf(r) === 'day') {
      for (let i = r.i0; i <= r.i1; i++) out.push({ i0: i, i1: i, label: fmtDay(i), long: WDF[wday(i)] + ', ' + fmtDay(i, true) });
      return out;
    }
    let s = r.i0;
    while (s <= r.i1) {
      let e = s; while (e < r.i1 && wday(e + 1) !== 0) e++;
      out.push({ i0: s, i1: e, label: fmtDay(s), long: 'Week of ' + period(s, e) + ((e - s + 1) < 7 ? ` (${e - s + 1} days)` : '') });
      s = e + 1;
    }
    return out;
  }
  const perDay = (a, b) => sum(a, b.i0, b.i1) / (b.i1 - b.i0 + 1);
  const grainWord = r => grainOf(r) === 'day' ? 'per day' : 'per day, weekly average';
  function monthTicks(bk) {
    if (bk.length <= 10) return null;
    const out = [0];
    bk.forEach((b, i) => { if (i && dt(b.i0).getUTCMonth() !== dt(bk[i - 1].i0).getUTCMonth()) out.push(i); });
    if (out.length < 3) return null;
    if (out[1] - out[0] < 3) out.splice(0, 1);
    return out;
  }

  // ------------------------------------------------------------------ html helpers
  function card(host, title, sub, inner, o) {
    o = o || {};
    host.innerHTML = (o.bare ? '' : `<div class="card-h"><h3>${title}</h3>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>`) + inner;
  }
  function legend(items) {
    return `<div class="legend">${items.map(([c, l, kind]) => `<span class="lg"><i class="${kind || ''}" style="${kind === 'dash' ? 'border-color' : 'background'}:${c}"></i>${esc(l)}</span>`).join('')}</div>`;
  }
  function delta(cur, prev, tone, vsLabel) {
    if (prev == null || !isFinite(prev) || prev === 0) return '';
    const d = cur / prev - 1;
    if (Math.abs(d) < 0.0005) return `<div class="delta flat">No change <span class="vs">vs ${esc(vsLabel)}</span></div>`;
    const up = d > 0;
    const cls = tone === 'neutral' ? 'flat' : ((up && tone === 'up-good') || (!up && tone === 'up-bad') ? 'good' : 'bad');
    return `<div class="delta ${cls}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${Math.abs(d * 100).toFixed(1)}% <span class="vs">vs ${esc(vsLabel)}</span></div>`;
  }
  function kpiRow(host, r, tiles, o) {
    o = o || {};
    const list = o.n ? tiles.slice(0, o.n) : tiles;
    const head = o.noHead ? '' : `<p class="kpi-head"><b>${esc(o.head || 'Key numbers')}</b> · ${esc(r.label)}${r.prev && !o.noCompare ? ` · arrows compare with ${esc(r.prev.label)}` : ''}</p>`;
    host.innerHTML = head + `<div class="kpis${list.length === 3 ? ' cols-3' : ''}">${list.map(t => `
      <div class="kpi"><div class="kpi-label">${esc(t.label)}</div><div class="kpi-value">${t.value}</div>${t.delta || ''}${t.note ? `<div class="kpi-note">${t.note}</div>` : ''}</div>`).join('')}</div>`;
  }
  // Average month, shown when the period is two or more whole calendar months (the full flight is four).
  function perMonth(r) {
    const a = D[r.i0], b = D[r.i1], next = D[r.i1 + 1];
    if (a.slice(8) !== '01' || (next && next.slice(8) !== '01')) return '';
    const n = (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7)) + 1;
    return n >= 2 ? `<br>${nw('Per month:')} ${nw('CTV ' + usdK(r.ctv.spend / n))} · ${nw('Billboards ' + usdK(r.ooh.spend / n))}` : '';
  }
  const nw = t => `<span style="white-space:nowrap">${esc(t)}</span>`;
  const usdK = v => v >= 1e6 ? F.usdC(v) : '$' + (v >= 1000 ? String(Math.round(v / 100) / 10) + 'K' : Math.round(v));
  const vsPrev = (r, cur, prev, tone) => r.prev ? delta(cur, prev, tone, 'previous period') : '';

  // ------------------------------------------------------------------ narrative
  function answerText(r) {
    const live = r.ooh.live, up = r.halo.sessionsLift >= 0;
    return `<strong>${esc(r.label)}:</strong> Floyd CTV and ${live} billboard${live === 1 ? '' : 's'} delivered <strong>${F.compact(r.imps)} impressions</strong> across the Twin Cities at a <strong>${F.usd2(r.cpm)} blended CPM</strong>. ` +
      `Website sessions ran <strong>${F.pct(Math.abs(r.halo.sessionsLift), 0)} ${up ? 'above' : 'below'}</strong> June’s pre-campaign baseline.`;
  }
  function appLeaders(r) {
    return dimRows('app', r.i0, r.i1).filter(a => !/^Other/.test(a.key) && a.imps / r.ctv.imps >= 0.04).sort((a, b) => b.vpk - a.vpk);
  }
  function primeShare(r) {
    let p = 0, t = 0;
    for (let i = r.i0; i <= r.i1; i++) S.ctv_hours[i].forEach((v, h) => { t += v; if (h >= 19 && h <= 22) p += v; });
    return t ? p / t : 0;
  }
  function stormStats(r) {
    const a = { n: 0, visits: 0, calls: 0, bcalls: 0, sess: 0 }, b = { n: 0, visits: 0, calls: 0, bcalls: 0, sess: 0 };
    for (let i = r.i0; i <= r.i1; i++) {
      const o = S.trigger[i] ? a : b;
      o.n++; o.visits += S.ctv.visits[i]; o.calls += S.halo.calls[i]; o.bcalls += S.halo.board_calls[i]; o.sess += S.halo.sessions[i];
    }
    const avg = (o, k) => o.n ? o[k] / o.n : 0;
    return { trig: a, norm: b, avg, storms: S.meta.storms.filter(s => IX[s] >= r.i0 && IX[s] <= r.i1).length };
  }
  function highlights(r) {
    const out = [`<b>${F.pct(r.ctv.vcr)}</b> of TV ads were watched to the very end.`];
    const st = stormStats(r);
    if (st.trig.n && st.norm.n) out.push(`On <b>${st.trig.n} storm-alert days</b>, site visits from TV viewers ran <b>${F.x(st.avg(st.trig, 'visits') / st.avg(st.norm, 'visits'))}</b> a normal day.`);
    else { const lead = appLeaders(r)[0]; if (lead) out.push(`<b>${esc(lead.key)}</b> drove the most site visits per impression.`); }
    const live = r.ooh.rows.filter(x => x.live);
    if (live.length) { const cheap = live.slice().sort((a, b) => a.cpm - b.cpm)[0]; out.push(`Best-value board: <b>${esc(cheap.name)}</b> at <b>${F.usd2(cheap.cpm)}</b> per 1,000 impressions.`); }
    return out;
  }
  function nextSteps(r) {
    const out = [];
    const leaders = appLeaders(r).slice(0, 3);
    if (leaders.length) out.push({ t: 'Shift budget to the apps that drive visits', b: `Move about 10% of CTV budget toward ${leaders.map(a => a.key).join(', ')}.` });
    const st = stormStats(r);
    if (st.trig.n && st.norm.n) out.push({ t: 'Keep storm alerts on and widen them', b: `Storm-alert days brought ${F.x(st.avg(st.trig, 'visits') / st.avg(st.norm, 'visits'))} the site visits of a normal day. Add the storm message to the static boards for spring.` });
    const cty = dimRows('county', r.i0, r.i1);
    const withBoard = new Set(r.ooh.rows.filter(x => x.live).map(x => x.b.county));
    const open = cty.filter(c => !withBoard.has(c.key)).sort((a, b) => b.vpk - a.vpk)[0];
    if (open) out.push({ t: `Add a board in ${open.key} County`, b: 'TV viewers there already visit the site, but no board runs there yet.' });
    return out;
  }

  // ------------------------------------------------------------------ blocks
  const B = {};
  B.answer = (h, r) => { h.innerHTML = `<p class="answer">${answerText(r)}</p>`; };

  B.kpisOverview = (h, r, o) => kpiRow(h, r, [
    { label: 'Total investment', value: F.usd(r.spend), delta: vsPrev(r, r.spend, r.prev && r.prev.spend, 'neutral'), note: `${nw('CTV ' + usdK(r.ctv.spend))} · ${nw('Billboards ' + usdK(r.ooh.spend))}` + perMonth(r) },
    { label: 'Total impressions', value: F.compact(r.imps), delta: vsPrev(r, r.imps, r.prev && r.prev.imps, 'up-good'), note: `Blended CPM ${F.usd2(r.cpm)}` },
    { label: 'Households reached by TV', value: F.compact(r.ctv.reach), delta: vsPrev(r, r.ctv.reach, r.prev && r.prev.ctv.reach, 'up-good'), note: `${F.dec(r.ctv.freq, 1)} views per household` },
    { label: 'Website sessions per day', value: F.int(r.halo.sessionsDay), delta: delta(r.halo.sessionsDay, r.halo.sessionsBase, 'up-good', 'June'), note: `June baseline: ${F.int(r.halo.sessionsBase)} per day` },
  ], o);

  B.channels = (h, r, o) => {
    const c = COL();
    const chan = (name, color, share, stats) => `<section class="chan" style="--c:${color}"><div class="chan-h"><h3>${name}</h3><span>${share} of investment</span></div>
      <dl class="chan-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`;
    h.innerHTML = (o.noHead ? '' : `<p class="kpi-head"><b>By channel</b> · ${esc(r.label)}</p>`) + `<div class="channels">` +
      chan('CTV · Floyd', c.ctv, F.pct(r.ctv.spend / r.spend, 0), [['Investment', F.usd(r.ctv.spend)], ['Impressions', F.compact(r.ctv.imps)], ['CPM', F.usd2(r.ctv.cpm)], ['Watched to end', F.pct(r.ctv.vcr)]]) +
      chan('Billboards', c.ooh, F.pct(r.ooh.spend / r.spend, 0), [['Investment', F.usd(r.ooh.spend)], ['Impressions', F.compact(r.ooh.imps)], ['CPM', F.usd2(r.ooh.cpm)], ['Plays delivered', F.pct(r.ooh.delivery)]]) + `</div>`;
  };

  function countyCtv(r) {
    const rows = dimRows('county', r.i0, r.i1), hh = {};
    S.geo.counties.forEach(c => { hh[c.name] = c.hh; });
    rows.forEach(x => { x.hh = hh[x.key]; x.perHH = x.imps / x.hh * 1000; });
    return rows;
  }
  function boardTip(r) {
    const rows = {}; r.ooh.rows.forEach(x => { rows[x.id] = x; });
    return b => {
      const x = rows[b.id];
      return `<div class="tip-title">${esc(boardShort(b))} · ${esc(b.name)}</div><div class="tip-sub">${esc(b.city)} · ${esc(b.facing)} · ${esc(b.type)}</div>` +
        (x.live ? C.tipRow('', 'Impressions', F.int(x.imps)) + (x.contract ? C.tipRow('', 'Plays delivered', F.pct(x.delivery)) : '') + C.tipRow('', 'Investment', F.usd(x.spend)) + C.tipRow('', 'CPM', F.usd2(x.cpm))
          : `<div class="tip-sub">Not live in this period (runs ${esc(period(IX[b.start], IX[b.end]))})</div>`) + `<div class="tip-sub">${esc(r.label)}</div>`;
    };
  }
  const boardLegend = () => `<div class="ml-group"><span class="lg"><i class="mk-dot"></i>Digital billboard</span><span class="lg"><i class="mk-sq"></i>Static billboard</span></div>`;
  const CITIES = () => S.geo.cities.filter(x => ['Minneapolis', 'St. Paul'].includes(x.name));
  const COUNTY_LAB = { Washington: { rot: true } };

  B.mapOverview = (h, r, o) => {
    const c = COL(), rows = countyCtv(r), by = {}; rows.forEach(x => { by[x.key] = x; });
    card(h, 'Where people saw Clean Response', `${r.label} · shading shows CTV impressions per 1,000 households`, '<div class="map-host"></div><div class="map-legend"></div>', o);
    const res = C.map(h.querySelector('.map-host'), {
      geo: S.geo, ramp: c.seq, label: 'Map of CTV delivery by county and billboard locations', maxHeight: o.mh || 520, countyLab: COUNTY_LAB,
      countyValue: cc => by[cc.name].perHH, cities: CITIES(), boardShort,
      countyTip: cc => { const x = by[cc.name]; return `<div class="tip-title">${esc(cc.name)} County</div>` + C.tipRow('', 'CTV impressions', F.int(x.imps)) + C.tipRow('', 'Per 1,000 households', F.int(x.perHH)) + C.tipRow('', 'Site visits', F.int(x.visits)) + `<div class="tip-sub">${esc(r.label)}</div>`; },
      boards: S.boards, boardLive: b => r.ooh.rows.find(x => x.id === b.id).live > 0, boardTip: boardTip(r),
    });
    h.querySelector('.map-legend').innerHTML = `<div class="ml-group"><span class="ml-title">CTV per 1,000 homes</span><span class="ramp-legend"><span>${F.int(res.lo)}</span><span class="ramp" style="background:linear-gradient(90deg,${c.seq.slice(0, 7).join(',')})"></span><span>${F.int(res.hi)}</span></span></div>` + boardLegend();
  };

  B.highlights = (h, r, o) => card(h, 'Highlights', r.label, `<ul class="bullets">${highlights(r).map(x => `<li>${x}</li>`).join('')}</ul>`, o);

  function linesCard(h, r, o, spec) {
    const c = COL(), bk = buckets(r);
    const day = grainOf(r) === 'day';
    const bands = day && spec.bands ? bk.map(b => !!S.trigger[b.i0]) : null;
    const showBand = bands && bands.some(Boolean);
    const items = spec.series.map(s => [s.color, s.name]).concat(spec.ref ? [[c.ref, spec.ref.legend, 'dash']] : []).concat(showBand ? [[c.band, 'Storm-alert day', 'box']] : []);
    const leg = items.length > 1 ? legend(items) : '';
    card(h, spec.title, `${r.label} · ${grainWord(r)}`, leg + '<div class="chart"></div>' + (spec.note ? `<p class="note">${spec.note}</p>` : ''), o);
    C.lines(h.querySelector('.chart'), {
      label: spec.title, labels: bk.map(b => b.label), height: o.h || spec.h || 260, yFmt: spec.yFmt,
      xFmt: (i, long) => long ? bk[i].long : bk[i].label, bands,
      series: spec.series.map(s => ({ name: s.name, color: s.color, area: true, values: bk.map(b => s.fn(b)) })),
      ref: spec.ref ? { value: spec.ref.value } : null, xTicks: monthTicks(bk),
    });
  }

  B.resSessions = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Website sessions from the Twin Cities', bands: true, yFmt: (v, t) => t ? F.int(v) + ' per day' : F.int(v),
      series: [{ name: 'Sessions', color: c.res, fn: b => perDay(S.halo.sessions, b) }],
      ref: { value: r.halo.sessionsBase, legend: `June baseline: ${F.int(r.halo.sessionsBase)} per day` },
    });
  };
  B.resBranded = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'People searching “Clean Response”', bands: true, yFmt: (v, t) => t ? F.dec(v, 1) + ' per day' : F.int(v),
      series: [{ name: 'Searches', color: c.res, fn: b => perDay(S.halo.branded, b) }],
      ref: { value: r.halo.brandedBase, legend: `June baseline: ${F.dec(r.halo.brandedBase, 1)}` },
    });
  };
  B.resCalls = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Inbound calls', bands: true, yFmt: (v, t) => t ? F.dec(v, 1) + ' per day' : F.int(v),
      series: [{ name: 'Calls', color: c.res, fn: b => perDay(S.halo.calls, b) }],
      ref: { value: r.halo.callsBase, legend: `June baseline: ${F.dec(r.halo.callsBase, 1)}` },
    });
  };

  B.kpisCtv = (h, r, o) => {
    const t = r.ctv, p = r.prev ? r.prev.ctv : null;
    kpiRow(h, r, [
      { label: 'Impressions', value: F.compact(t.imps), delta: vsPrev(r, t.imps, p && p.imps, 'up-good'), note: `${F.usd(t.spend)} invested · ${F.usd2(t.cpm)} CPM` },
      { label: 'Watched to the end', value: F.pct(t.vcr), delta: vsPrev(r, t.vcr, p && p.vcr, 'up-good'), note: `${F.int(t.completes)} completed views` },
      { label: 'Households reached', value: F.compact(t.reach), delta: vsPrev(r, t.reach, p && p.reach, 'up-good'), note: `${F.dec(t.freq, 1)} views per household` },
      { label: 'Site visits from viewers', value: F.int(t.visits), delta: vsPrev(r, t.visits, p && p.visits, 'up-good'), note: `${F.dec(t.vpk, 2)} per 1,000 impressions` },
    ], o);
  };
  B.ctvTrend = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'CTV impressions', bands: true, yFmt: (v, t) => t ? F.int(v) + ' per day' : F.compact(v),
      series: [{ name: 'Impressions', color: c.ctv, fn: b => perDay(S.ctv.imps, b) }],
    });
  };
  B.ctvApps = (h, r, o) => {
    const rows = dimRows('app', r.i0, r.i1).sort((a, b) => b.imps - a.imps).slice(0, o.limit || 8), t = r.ctv;
    card(h, 'Top streaming apps', `${r.label} · top ${rows.length} by impressions`, '<div class="t"></div>', o);
    C.table(h.querySelector('.t'), {
      rows, sort: { key: 'imps', dir: -1 }, noSort: !!o.bare,
      total: o.noTotal ? null : { key: 'All apps', imps: t.imps, vcr: t.vcr, vpk: t.vpk },
      columns: [
        { key: 'key', label: 'App' }, { key: 'imps', label: 'Impressions', num: 1, fmt: F.int },
        { key: 'vcr', label: 'Watched to end', num: 1, fmt: v => F.pct(v) }, { key: 'vpk', label: 'Visits per 1K', num: 1, fmt: v => F.dec(v, 2) }],
    });
  };
  B.ctvDevices = (h, r, o) => {
    const c = COL(), rows = dimRows('device', r.i0, r.i1).sort((a, b) => b.imps - a.imps), t = r.ctv;
    card(h, 'Devices', r.label, '<div class="hbars"></div>', o);
    C.hbars(h.querySelector('.hbars'), { rows: rows.map(x => ({ label: x.key.replace(' (Samsung, LG, Vizio)', ''), value: x.imps, display: F.pct(x.imps / t.imps, 0), color: c.ctv })) });
  };
  B.ctvHeat = (h, r, o) => {
    const c = COL(), sums = WD.map(() => Array(24).fill(0)), cnt = Array(7).fill(0);
    for (let i = r.i0; i <= r.i1; i++) { const w = wday(i); cnt[w]++; S.ctv_hours[i].forEach((v, k) => { sums[w][k] += v; }); }
    const vals = sums.map((row, w) => row.map(v => cnt[w] ? v / cnt[w] : 0));
    card(h, 'When the TV ad ran', `${r.label} · average impressions per hour, Central time`, '<div class="heat-host"></div>' + (o.bare ? '' : `<p class="note">Prime time (7–11 PM) carried ${F.pct(primeShare(r), 0)} of impressions.</p>`), o);
    C.heat(h.querySelector('.heat-host'), {
      rows: WD, cols: Array.from({ length: 24 }, (_, k) => hourShort(k)), values: vals, ramp: c.seq, colEvery: 3, lowLabel: 'Fewer', highLabel: 'More impressions',
      tip: (w, k) => `<div class="tip-title">${WDF[w]}s, ${hourLabel(k)}</div>` + C.tipRow('', 'Average impressions', F.int(vals[w][k])) + `<div class="tip-sub">${esc(r.label)}</div>`,
    });
  };
  B.lift = (h, r, o) => {
    const c = COL(), t = ctvT(FS, FE), L = S.lift_model;
    const exposed = t.reach, ev = Math.round(t.visits * 0.82), er = ev / exposed;
    const cr = L.control_visit_rate, x = er / cr;
    const per = period(FS, FE);
    card(h, 'Did the TV ad change behavior?', `Holdout study · ${per} (whole flight)`,
      `<div class="lift-big"><span class="lift-x">${F.x(x)}</span><span>Homes that saw the TV ad were ${F.x(x)} as likely to visit the website as matched homes that didn’t.</span></div><div class="hbars"></div>` +
      (o.bare ? `<p class="note">${F.int(exposed)} homes saw the ad; ${F.int(L.control_hh)} matched homes were held out. Same dates, same metro (${per}).</p>` : ''), o);
    C.hbars(h.querySelector('.hbars'), {
      max: er, rows: [
        { label: 'Saw the TV ad', value: er, display: F.pct(er, 2) + ' visited', color: c.ctv },
        { label: 'Did not see it', value: cr, display: F.pct(cr, 2) + ' visited', color: c.ref }],
    });
  };

  B.kpisOoh = (h, r, o) => {
    const t = r.ooh, p = r.prev ? r.prev.ooh : null;
    kpiRow(h, r, [
      { label: 'Boards live', value: F.int(t.live), note: `${t.digital} digital · ${t.live - t.digital} static` },
      { label: 'Impressions', value: F.compact(t.imps), delta: vsPrev(r, t.imps, p && p.imps, 'up-good'), note: 'Adults 18+, audited' },
      { label: 'Digital plays delivered', value: F.pct(t.delivery), note: `${F.int(t.plays)} of ${F.int(t.contract)} contracted` },
      { label: 'CPM', value: F.usd2(t.cpm), delta: vsPrev(r, t.cpm, p && p.cpm, 'up-bad'), note: `${F.usd(t.spend)} invested` },
    ], o);
  };
  function drawBoardMap(host, r, o) {
    const c = COL();
    return C.map(host, {
      geo: S.geo, ramp: c.dark ? ['#1d2945', '#1d2945'] : ['#E9EEF6', '#E9EEF6'], label: 'Map of billboard locations', maxHeight: o.mh || 520, countyLab: COUNTY_LAB,
      countyValue: () => 1, cities: CITIES(), boardShort,
      countyTip: cc => `<div class="tip-title">${esc(cc.name)} County</div><div class="tip-sub">${r.ooh.rows.filter(x => x.b.county === cc.name && x.live).length} boards live · ${esc(r.label)}</div>`,
      boards: S.boards, boardLive: b => r.ooh.rows.find(x => x.id === b.id).live > 0, boardTip: boardTip(r),
      onBoard: b => { const tr = host.closest('.card, .panel, .rcard, .maplist'); const row = tr && tr.querySelector(`tr[data-board="${b.id}"]`); if (row) { tr.querySelectorAll('tr.hl').forEach(x => x.classList.remove('hl')); row.classList.add('hl'); } },
    });
  }
  function drawBoardTable(host, r, o) {
    const rows = r.ooh.rows.filter(x => x.live).map(x => Object.assign({ board: x.name }, x));
    C.table(host, {
      rows, sort: { key: 'imps', dir: -1 }, noSort: !!o.bare,
      rowAttr: x => `data-board="${x.id}"`,
      total: { board: `All ${rows.length} boards`, imps: r.ooh.imps, cpm: r.ooh.cpm },
      columns: [
        { key: 'board', label: 'Board', fmt: (v, x) => x.b ? `<span class="chipid ${x.b.type.startsWith('Digital') ? 'd' : 's'}">${esc(x.short)}</span><span class="bname">${esc(x.name)}${o.oneLine ? '' : `<small>${esc(x.city)} · ${esc(x.type.replace(' bulletin', ''))}</small>`}</span>` : esc(v) },
        { key: 'imps', label: 'Impressions', num: 1, fmt: F.int }, { key: 'cpm', label: 'CPM', num: 1, fmt: F.usd2 }],
      after: el => {
        el.querySelectorAll('tr[data-board]').forEach(tr => {
          const mk = () => { const scope = el.closest('.card, .panel, .rcard, .maplist') || document; return scope.querySelector(`.board[data-id="${tr.dataset.board}"]`); };
          tr.addEventListener('pointerenter', () => { const m = mk(); if (m) m.classList.add('sel'); });
          tr.addEventListener('pointerleave', () => { const m = mk(); if (m) m.classList.remove('sel'); });
        });
      },
    });
  }
  B.oohMapList = (h, r, o) => {
    card(h, 'Billboard locations', `${r.label} · hover a board for details`, `<div class="maplist${o.stack ? ' stack' : ''}"><div><div class="map-host"></div><div class="map-legend">${boardLegend()}</div></div><div class="t"></div></div>`, o);
    drawBoardMap(h.querySelector('.map-host'), r, o);
    drawBoardTable(h.querySelector('.t'), r, o);
  };
  B.oohMap = (h, r, o) => {
    card(h, 'Billboard locations', r.label, `<div class="map-host"></div><div class="map-legend">${boardLegend()}</div>`, o);
    drawBoardMap(h.querySelector('.map-host'), r, o);
  };
  B.oohBoards = (h, r, o) => {
    card(h, 'Board by board', r.label, '<div class="t"></div>', o);
    drawBoardTable(h.querySelector('.t'), r, o);
  };
  B.oohTrend = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Billboard impressions', yFmt: (v, t) => t ? F.int(v) + ' per day' : F.compact(v),
      series: [{ name: 'Impressions', color: c.ooh, fn: b => { let s = 0; for (let i = b.i0; i <= b.i1; i++) s += sumRow(S.board_daily.imps, i); return s / (b.i1 - b.i0 + 1); } }],
    });
  };
  B.oohProof = (h, r, o) => {
    const t = r.ooh;
    const out = S.meta.outages.filter(x => IX[x.date] >= r.i0 && IX[x.date] <= r.i1);
    const items = out.map(x => {
      const b = S.boards.find(z => z.id === x.board), m = S.meta.makegoods.find(z => z.board === x.board);
      return `<li><b>${fmtDay(IX[x.date])}:</b> ${esc(boardShort(b))} had a screen outage; ${m ? `${F.int(m.plays)} make-good plays ran ${fmtDay(IX[m.date])}.` : 'make-good plays were added.'}</li>`;
    });
    card(h, 'Proof of performance', r.label,
      `<div class="proof"><div class="proof-big">${F.pct(t.delivery)}</div><div>of contracted digital plays delivered, logged play by play.</div></div>` +
      (items.length ? `<ul class="proof-list">${items.join('')}</ul>` : '<p class="note">No outages in this period.</p>'), o);
  };

  B.kpisResults = (h, r, o) => {
    const t = r.halo;
    kpiRow(h, r, [
      { label: 'Website sessions per day', value: F.int(t.sessionsDay), delta: delta(t.sessionsDay, t.sessionsBase, 'up-good', 'June'), note: `June baseline: ${F.int(t.sessionsBase)}` },
      { label: 'Brand searches per day', value: F.dec(t.brandedDay, 1), delta: delta(t.brandedDay, t.brandedBase, 'up-good', 'June'), note: `June baseline: ${F.dec(t.brandedBase, 1)}` },
      { label: 'Inbound calls per day', value: F.dec(t.callsDay, 1), delta: delta(t.callsDay, t.callsBase, 'up-good', 'June'), note: `June baseline: ${F.dec(t.callsBase, 1)}` },
      { label: 'Billboard-line calls', value: F.int(t.boardCalls), note: 'Number shown only on the boards' },
    ], Object.assign({ noCompare: true }, o));
  };
  B.storms = (h, r, o) => {
    const st = stormStats(r);
    if (!st.trig.n) { card(h, 'Storm-alert days', r.label, '<p class="note">No storm alerts in this period. Pick a longer period to compare.</p>', o); return; }
    const rows = [['Site visits from TV viewers', 'visits'], ['Inbound calls', 'calls'], ['Billboard-line calls', 'bcalls'], ['Website sessions', 'sess']].map(([l, k]) => ({ m: l, t: st.avg(st.trig, k), n: st.avg(st.norm, k), x: st.avg(st.norm, k) ? st.avg(st.trig, k) / st.avg(st.norm, k) : 0 }));
    card(h, 'Storm-alert days', `${r.label} · ${st.trig.n} alert days vs ${st.norm.n} normal days, average per day`,
      '<div class="t"></div><p class="note">When a severe-weather alert hits the metro, CTV spend rises and the digital boards switch to the storm message for 48 hours.</p>', o);
    C.table(h.querySelector('.t'), {
      noSort: true, rows, columns: [
        { key: 'm', label: 'Per day' }, { key: 't', label: 'Alert days', num: 1, fmt: v => F.dec(v, 1) },
        { key: 'n', label: 'Normal days', num: 1, fmt: v => F.dec(v, 1) }, { key: 'x', label: 'Difference', num: 1, fmt: v => F.x(v) }],
    });
  };
  B.stormCallout = (h, r) => {
    const st = stormStats(r);
    h.innerHTML = st.trig.n && st.norm.n ? `<div class="callout"><b>${F.x(st.avg(st.trig, 'visits') / st.avg(st.norm, 'visits'))}</b><span>site visits from TV viewers on storm-alert days vs a normal day (${esc(r.label)}).</span></div>` : '';
  };
  B.countyLift = (h, r, o) => {
    const cs = S.county_sessions, bd = BE - BS + 1;
    const rows = cs.keys.map((key, k) => {
      const base = sumCol(cs.sessions, k, BS, BE) / bd, cur = sumCol(cs.sessions, k, r.i0, r.i1) / r.len;
      return { key, base: base / cs.hh[k] * 1e5, cur: cur / cs.hh[k] * 1e5, lift: cur / base - 1, boards: r.ooh.rows.filter(z => z.live && z.b.county === key).length };
    });
    card(h, 'Lift by county', `${r.label} vs June · daily website sessions per 100,000 homes`, '<div class="t"></div>', o);
    C.table(h.querySelector('.t'), {
      rows, sort: { key: 'lift', dir: -1 }, noSort: !!o.bare, columns: [
        { key: 'key', label: 'County' }, { key: 'base', label: 'June', num: 1, fmt: v => F.dec(v, 1) }, { key: 'cur', label: 'This period', num: 1, fmt: v => F.dec(v, 1) },
        { key: 'lift', label: 'Lift', num: 1, fmt: v => (v >= 0 ? '+' : '−') + F.pct(Math.abs(v)) }, { key: 'boards', label: 'Boards', num: 1, fmt: F.int }],
    });
  };
  B.nextSteps = (h, r, o) => card(h, 'What we’d do next', r.label, `<ol class="steps">${nextSteps(r).map(s => `<li><b>${esc(s.t)}</b><span>${esc(s.b)}</span></li>`).join('')}</ol>`, o);

  // ------------------------------------------------------------------ layouts
  const att = o => o ? ` data-o='${JSON.stringify(o)}'` : '';
  const blk = (name, cls, o) => `<section class="card ${cls || ''}" data-b="${name}"${att(o)}></section>`;
  const div = (name, cls, o) => `<div class="${cls || ''}" data-b="${name}"${att(o)}></div>`;
  const TABS = {
    overview: () => div('answer', 'answer-host') + div('kpisOverview', 'kpi-host') + div('channels', 'kpi-host') + `<div class="grid">
      ${blk('mapOverview', 'span-7')}<div class="span-5 stack">${blk('highlights')}${blk('nextSteps')}</div>
      ${blk('resSessions', 'span-12')}</div>`,
    ctv: () => div('kpisCtv', 'kpi-host') + `<div class="grid">
      ${blk('ctvTrend', 'span-12')}
      ${blk('ctvApps', 'span-7')}${blk('ctvDevices', 'span-5')}
      ${blk('ctvHeat', 'span-7')}${blk('lift', 'span-5')}</div>`,
    ooh: () => div('kpisOoh', 'kpi-host') + `<div class="grid">
      ${blk('oohMapList', 'span-12')}
      ${blk('oohTrend', 'span-7')}${blk('oohProof', 'span-5')}</div>`,
    results: () => div('kpisResults', 'kpi-host') + `<div class="grid">
      ${blk('resSessions', 'span-12')}
      ${blk('resBranded', 'span-6')}${blk('resCalls', 'span-6')}
      ${blk('storms', 'span-6')}${blk('countyLift', 'span-6')}</div>`,
  };

  function mount(root) {
    const r = R();
    root.querySelectorAll('[data-b]').forEach(host => {
      const fn = B[host.dataset.b];
      let o = {}; try { o = host.dataset.o ? JSON.parse(host.dataset.o) : {}; } catch (e) { /* ignore */ }
      scopeEl = host;
      try { fn(host, r, o); } catch (e) { console.error('block failed', host.dataset.b, e); host.innerHTML = '<p class="note">This part could not be drawn.</p>'; }
    });
  }

  // ------------------------------------------------------------------ slides
  const slideHead = k => `<div class="slide-top"><span class="st-logo"><img src="${LOGO}" alt=""></span><span class="st-brand">Saint Paul Agency</span><span class="st-kicker">${esc(k)}</span><span class="pill sample">Sample data</span></div>`;
  function slideDefs(r) {
    const live = r.ooh.live;
    const nb = { bare: 1, noHead: 1 };
    return [
      { cls: 'title', html: `<div class="title-wrap"><span class="t-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div><div class="t-eyebrow">Media performance review</div><h2>Clean Response</h2><div class="t-sub">Streaming TV (Floyd CTV) + billboards · Twin Cities</div><div class="t-period">${esc(r.label)}</div><div class="t-by">Prepared by Saint Paul Agency</div></div></div><span class="pill sample t-pill">Sample data · for illustration</span>` },
      { k: 'Summary', title: 'The headline', body: div('answer') + div('kpisOverview', 'kpi-host', nb) },
      { k: 'Channels', title: 'Two channels, one message', body: div('channels', '', nb) + div('highlights', 'panel', { bare: 1 }) },
      { k: 'CTV · Floyd', title: 'Streaming TV delivery', body: div('kpisCtv', 'kpi-host', nb) + div('ctvTrend', 'panel', { bare: 1, h: 250 }) },
      { k: 'CTV · Floyd', title: 'Where the TV ad ran', body: `<div class="cols-2">${div('ctvApps', 'panel', { bare: 1, limit: 7 })}${div('ctvDevices', 'panel', { bare: 1 })}</div>` },
      { k: 'CTV · Floyd', title: 'When the TV ad ran', body: div('ctvHeat', 'panel', { bare: 1 }) + `<p class="note">Prime time (7–11 PM) carried ${F.pct(primeShare(r), 0)} of impressions, when families are home.</p>` },
      { k: 'Billboards', title: `${live} board${live === 1 ? '' : 's'} across the metro`, body: div('oohMapList', 'panel', { bare: 1, mh: 410, oneLine: 1 }) },
      { k: 'Billboards', title: 'Every play delivered', body: `<div class="cols-2">${div('oohProof', 'panel', { bare: 1 })}${div('oohTrend', 'panel', { bare: 1, h: 300 })}</div>` },
      { k: 'Storm alerts', title: 'When storms hit, we turn up', body: `<div class="cols-2" style="grid-template-columns:0.8fr 1.2fr;align-items:center">${div('stormCallout', 'panel')}${div('storms', 'panel', { bare: 1 })}</div>` },
      { k: 'Results', title: 'What it did for the business', body: div('kpisResults', 'kpi-host', Object.assign({ n: 3 }, nb)) + div('resSessions', 'panel', { bare: 1, h: 250 }) },
      { k: 'Results', title: 'TV viewers visited more', body: div('lift', 'panel', { bare: 1 }) },
      { k: 'Next', title: 'What we’d do next', body: div('nextSteps', 'panel', { bare: 1 }) },
      { cls: 'end', html: `<div class="title-wrap"><span class="t-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div><h2>Thank you</h2><div class="t-sub">Want this report shaped differently? Any view, any cadence.</div><div class="t-by">Saint Paul Agency · saintpaulagency.com</div></div></div><span class="pill sample t-pill">Sample data · for illustration</span>` },
    ];
  }
  function renderSlide() {
    const r = R(), defs = slideDefs(r), n = defs.length;
    state.slide = Math.max(0, Math.min(n - 1, state.slide));
    const s = defs[state.slide];
    const stage = document.getElementById('stage');
    stage.innerHTML = s.html ? `<section class="slide ${s.cls}">${s.html}</section>` :
      `<section class="slide ${s.cls || ''}">${slideHead(s.k)}<h2 class="slide-title">${esc(s.title)}</h2><p class="slide-sub">${esc(r.label)}</p><div class="slide-body">${s.body}</div><div class="slide-foot"><span>Clean Response · Media performance</span><span>${state.slide + 1} / ${n}</span></div></section>`;
    mount(stage);
    document.getElementById('slideCount').textContent = `${state.slide + 1} / ${n}`;
    document.getElementById('slideList').innerHTML = defs.map((d, k) => `<button class="sl${k === state.slide ? ' on' : ''}" data-k="${k}"><span>${k + 1}</span>${esc(d.title || (d.cls === 'title' ? 'Title' : 'Thank you'))}</button>`).join('');
    fitStage();
  }
  function fitStage() {
    const vp = document.getElementById('deckViewport'), stage = document.getElementById('stage');
    if (!vp || !stage) return;
    const fs = document.fullscreenElement === vp;
    const w = vp.clientWidth, h = fs ? vp.clientHeight : w * 9 / 16;
    if (!fs) vp.style.height = h + 'px'; else vp.style.height = '';
    const s = Math.min(w / 1280, h / 720);
    stage.style.transform = `translate(${(w - 1280 * s) / 2}px, ${(h - 720 * s) / 2}px) scale(${s})`;
  }

  // ------------------------------------------------------------------ report
  function reportHtml(r) {
    const head = `<header class="sheet-h"><span class="sh-logo"><img src="${LOGO}" alt=""></span><span class="sh-brand">Saint Paul Agency</span><span class="sh-right">Clean Response · Media performance · ${esc(r.label)}</span></header>`;
    const foot = n => `<footer class="sheet-f"><span>Sample data: every number is made up to show the format.</span><span>Page ${n}</span></footer>`;
    const sheet = (n, title, body) => `<article class="sheet">${head}<h2 class="sheet-title">${esc(title)}</h2><div class="sheet-body">${body}</div>${foot(n)}</article>`;
    return [
      `<article class="sheet cover"><div class="cover-in"><span class="c-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div class="c-eyebrow">Media performance report</div><h1>Clean Response</h1><div class="c-sub">Streaming TV (Floyd CTV) + billboards · Twin Cities metro</div><div class="c-period">${esc(r.label)}</div><div class="c-by">Prepared by Saint Paul Agency</div><span class="pill sample">Sample data · for illustration</span></div></article>`,
      sheet(2, 'Summary', div('answer', 'answer-host') + div('kpisOverview', 'kpi-host') + div('channels', 'kpi-host') + div('highlights', 'rcard')),
      sheet(3, 'Streaming TV · Floyd CTV', div('kpisCtv', 'kpi-host') + div('ctvTrend', 'rcard', { h: 130 }) + div('ctvApps', 'rcard', { limit: 7 })),
      sheet(4, 'Streaming TV · devices, timing and lift', `<div class="r-cols">${div('ctvDevices', 'rcard')}${div('lift', 'rcard')}</div>` + div('ctvHeat', 'rcard')),
      sheet(5, 'Billboards', div('kpisOoh', 'kpi-host') + div('oohMap', 'rcard', { mh: 520 })),
      sheet(6, 'Billboards · board by board', div('oohBoards', 'rcard') + `<div class="r-cols">${div('oohProof', 'rcard')}${div('oohTrend', 'rcard', { h: 120 })}</div>`),
      sheet(7, 'Results', div('kpisResults', 'kpi-host') + div('resSessions', 'rcard', { h: 170 }) + `<div class="r-cols">${div('resBranded', 'rcard', { h: 150 })}${div('resCalls', 'rcard', { h: 150 })}</div>`),
      sheet(8, 'Results · storm alerts and counties', div('storms', 'rcard') + div('countyLift', 'rcard')),
      sheet(9, 'Next steps and definitions', div('nextSteps', 'rcard') + `<section class="rcard"><div class="card-h"><h3>Definitions</h3></div>${glossaryHtml()}</section>`),
    ].join('');
  }
  function glossaryHtml() {
    return `<dl class="gloss">
      <dt>CTV (connected TV)</dt><dd>TV ads in streaming apps (Hulu, Roku, Pluto TV and more) on the living-room screen, bought through Floyd.</dd>
      <dt>Impressions</dt><dd>CTV: an ad that started playing. Billboards: audited estimates of adults 18+ who pass the board (Geopath).</dd>
      <dt>CPM</dt><dd>Cost per 1,000 impressions. Blended CPM combines CTV and billboards.</dd>
      <dt>Watched to the end</dt><dd>Share of CTV ads played to the last second.</dd>
      <dt>Households reached</dt><dd>Different homes that saw the CTV ad at least once. Views per household is impressions divided by homes reached.</dd>
      <dt>Site visits from viewers</dt><dd>Website visits within 30 days from homes that saw the CTV ad, matched by household.</dd>
      <dt>Plays</dt><dd>Times the ad showed on a digital board: an 8-second spot that shows once every 128 seconds, 675 plays a day per board.</dd>
      <dt>Storm-alert day</dt><dd>A severe-weather alert for the metro and the day after. CTV spend rises and digital boards switch to the storm message.</dd>
      <dt>June baseline</dt><dd>Daily averages for June 1–30, 2026, before any CTV or billboards ran.</dd></dl>`;
  }
  let printing = false;
  function renderReport() {
    const host = document.getElementById('sheets');
    host.style.zoom = '';
    host.innerHTML = reportHtml(R());
    mount(host);
    fitSheets();
  }
  function fitSheets() {
    const wrap = document.getElementById('sheets');
    if (!wrap) return;
    if (printing) { wrap.style.zoom = ''; return; }
    const avail = document.getElementById('view-report').clientWidth - 16;
    const z = Math.min(1, avail / 816);
    wrap.style.zoom = z < 1 ? z : '';
  }

  // ------------------------------------------------------------------ data view
  function csvEsc(v) { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function rng(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }
  const DATASETS = [
    { file: 'ctv_daily.csv', title: 'Floyd CTV · daily totals', desc: 'Spend, impressions, video quartiles, completed views, site visits, leads, storm-alert flag.', head: ['date', 'spend_usd', 'impressions', 'video_25pct', 'video_50pct', 'video_75pct', 'completed_views', 'site_visits', 'leads', 'weather_trigger'], rows: (a, b) => rng(a, b).map(i => [D[i], (S.ctv.spend[i] / 100).toFixed(2), S.ctv.imps[i], S.ctv.q25[i], S.ctv.q50[i], S.ctv.q75[i], S.ctv.completes[i], S.ctv.visits[i], S.ctv.leads[i], S.trigger[i]]) },
    ...[['app', 'ctv_by_app.csv', 'Floyd CTV · by app'], ['device', 'ctv_by_device.csv', 'Floyd CTV · by device'], ['creative', 'ctv_by_creative.csv', 'Floyd CTV · by TV spot'], ['county', 'ctv_by_county.csv', 'Floyd CTV · by county']].map(([k, f, t]) => ({
      file: f, title: t, desc: 'Daily spend, impressions, completed views and site visits.', head: ['date', k, 'spend_usd', 'impressions', 'completed_views', 'site_visits'],
      rows: (a, b) => { const bl = S.ctv_dims[k], out = []; rng(a, b).forEach(i => bl.keys.forEach((key, j) => { if (bl.imps[i][j]) out.push([D[i], key, (bl.spend[i][j] / 100).toFixed(2), bl.imps[i][j], bl.completes[i][j], bl.visits[i][j]]); })); return out; },
    })),
    { file: 'ctv_by_hour.csv', title: 'Floyd CTV · by hour', desc: 'Impressions by day and hour, Central time.', head: ['date', 'hour_central', 'impressions'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.ctv_hours[i].forEach((v, k) => out.push([D[i], k, v]))); return out; } },
    { file: 'billboards.csv', title: 'Billboards · inventory', desc: 'Every board: location, facing, format, flight, weekly impressions, cost and contracted plays.', fixed: 1, head: ['board_id', 'location', 'city', 'county', 'facing', 'type', 'size', 'flight_start', 'flight_end', 'weekly_impressions_18plus', 'cost_per_month_usd', 'contracted_plays_per_day'], rows: () => S.boards.map(b => [b.id, b.name, b.city, b.county, b.facing, b.type, b.size, b.start, b.end, b.weekly, b.cost_month, b.contract_plays_day]) },
    { file: 'billboard_daily.csv', title: 'Billboards · daily by board', desc: 'Impressions, digital plays and cost per board per day.', head: ['date', 'board_id', 'impressions', 'plays', 'cost_usd'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.boards.forEach((bd, k) => { if (S.board_daily.imps[i][k]) out.push([D[i], bd.id, S.board_daily.imps[i][k], S.board_daily.plays[i][k], (S.board_daily.spend[i][k] / 100).toFixed(2)]); })); return out; } },
    { file: 'billboard_creative_daily.csv', title: 'Billboards · digital creative plays', desc: 'Plays by creative per day across the digital boards.', head: ['date', 'creative', 'plays'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.dooh_creative.keys.forEach((k, j) => { if (S.dooh_creative.plays[i][j]) out.push([D[i], k, S.dooh_creative.plays[i][j]]); })); return out; } },
    { file: 'results_daily.csv', title: 'Results · daily', desc: 'Metro website sessions, brand searches, inbound calls, billboard-line calls. The full file includes the June baseline.', head: ['date', 'metro_site_sessions', 'branded_searches', 'inbound_calls', 'billboard_line_calls', 'paid_media_live'], rows: (a, b) => rng(a, b).map(i => [D[i], S.halo.sessions[i], S.halo.branded[i], S.halo.calls[i], S.halo.board_calls[i], i >= FS ? 1 : 0]) },
  ];
  function summaryText(r) {
    return `Clean Response: CTV + billboard summary (${r.label})\n` +
      `• Investment: ${F.usd(r.spend)} (CTV ${F.usd(r.ctv.spend)} · Billboards ${F.usd(r.ooh.spend)})\n` +
      `• Impressions: ${F.compact(r.imps)} (CTV ${F.compact(r.ctv.imps)} · Billboards ${F.compact(r.ooh.imps)}), blended CPM ${F.usd2(r.cpm)}\n` +
      `• CTV: ${F.pct(r.ctv.vcr)} watched to the end, ${F.compact(r.ctv.reach)} households reached\n` +
      `• Billboards: ${r.ooh.live} boards, ${F.pct(r.ooh.delivery)} of contracted digital plays delivered\n` +
      `• Results: website sessions ${r.halo.sessionsLift >= 0 ? '+' : '−'}${F.pct(Math.abs(r.halo.sessionsLift), 0)} vs June baseline; ${F.int(r.ooh.calls)} billboard-line calls\n` +
      `(Sample data for illustration.)`;
  }
  function renderData() {
    const r = R(), host = document.getElementById('dataBody');
    host.innerHTML = `
      <section class="card span-12"><div class="card-h"><h3>Copy a summary</h3><p class="card-sub">${esc(r.label)} · ready to paste into an email</p></div>
        <pre class="summary" id="summaryText">${esc(summaryText(r))}</pre><button class="btn" id="copySummary">Copy summary</button></section>
      <section class="card span-12"><div class="card-h"><h3>Download the data</h3><p class="card-sub">Every number in this report comes from these files. Full files cover ${esc(period(FS, FE))}; results also include June 1–30 for the baseline.</p></div>
        <div class="ds-list">${DATASETS.map((d, k) => {
          const n = d.rows(r.i0, r.i1).length;
          return `<div class="ds"><div class="ds-main"><div class="ds-title">${esc(d.title)}</div><div class="ds-desc">${esc(d.desc)}</div><div class="ds-meta">${d.fixed ? `${n} rows` : `${F.int(n)} rows in ${esc(r.label)}`}</div></div>
            <div class="ds-btns"><a class="btn ghost" href="data/${d.file}" download>Full file</a>${d.fixed ? '' : `<button class="btn" data-ds="${k}">This period</button>`}<button class="btn ghost" data-pv="${k}" aria-expanded="false">Preview</button></div>
            <div class="ds-preview" id="pv${k}" hidden></div></div>`;
        }).join('')}</div></section>
      <section class="card span-12"><div class="card-h"><h3>Definitions</h3></div>${glossaryHtml()}</section>`;
    host.querySelectorAll('[data-ds]').forEach(b => b.addEventListener('click', () => {
      const d = DATASETS[+b.dataset.ds], rows = d.rows(r.i0, r.i1);
      const csv = [d.head].concat(rows).map(x => x.map(csvEsc).join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = d.file.replace('.csv', `_${D[r.i0]}_to_${D[r.i1]}.csv`);
      document.body.appendChild(a); a.click(); a.remove();
    }));
    host.querySelectorAll('[data-pv]').forEach(b => b.addEventListener('click', () => {
      const k = +b.dataset.pv, d = DATASETS[k], pv = document.getElementById('pv' + k);
      if (!pv.hidden) { pv.hidden = true; b.setAttribute('aria-expanded', 'false'); return; }
      const rows = d.rows(r.i0, r.i1).slice(0, 8);
      pv.innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr>${d.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(x => `<tr>${x.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="note">First ${rows.length} rows · ${esc(r.label)}</p>`;
      pv.hidden = false; b.setAttribute('aria-expanded', 'true');
    }));
    document.getElementById('copySummary').addEventListener('click', ev => {
      const txt = summaryText(r);
      const done = () => { ev.target.textContent = 'Copied'; setTimeout(() => { ev.target.textContent = 'Copy summary'; }, 1600); };
      const selectPre = () => { const sel = window.getSelection(), rgn = document.createRange(); rgn.selectNodeContents(document.getElementById('summaryText')); sel.removeAllRanges(); sel.addRange(rgn); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, selectPre); else selectPre();
    });
  }

  // ------------------------------------------------------------------ render + controls
  function renderFilters() {
    const r = R();
    document.getElementById('presets').innerHTML = PRESETS.map(p => `<button class="chip${state.preset === p.key ? ' on' : ''}" data-p="${p.key}" aria-pressed="${state.preset === p.key}">${esc(p.label)}</button>`).join('');
    document.getElementById('dFrom').value = D[state.i0]; document.getElementById('dTo').value = D[state.i1];
    document.getElementById('periodText').innerHTML = `<b>${esc(r.label)}</b> · ${r.len} day${r.len === 1 ? '' : 's'}`;
    const g = grainOf(r);
    document.querySelectorAll('#grain button').forEach(b => { const on = b.dataset.g === g; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.getElementById('grainWrap').hidden = state.view !== 'dashboard';
  }
  function render() {
    document.querySelectorAll('.view').forEach(v => { v.hidden = v.id !== 'view-' + state.view; });
    document.querySelectorAll('#views button').forEach(b => { const on = b.dataset.v === state.view; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    renderFilters();
    C.tip.hide();
    if (state.view === 'dashboard') {
      document.querySelectorAll('#tabs button').forEach(b => { const on = b.dataset.t === state.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      const body = document.getElementById('tabBody');
      body.innerHTML = TABS[state.tab]();
      mount(body);
    } else if (state.view === 'slides') renderSlide();
    else if (state.view === 'report') renderReport();
    else if (state.view === 'data') renderData();
    writeHash();
  }
  function writeHash() {
    const h = `v=${state.view}${state.view === 'dashboard' ? '&t=' + state.tab : ''}${state.view === 'slides' ? '&s=' + (state.slide + 1) : ''}&p=${state.preset === 'custom' ? D[state.i0] + '_' + D[state.i1] : state.preset}`;
    if (location.hash.slice(1) !== h) history.replaceState(null, '', '#' + h);
  }
  function setCustom(a, b) {
    a = Math.max(FS, Math.min(FE, a)); b = Math.max(FS, Math.min(FE, b));
    if (a > b) [a, b] = [b, a];
    const pr = PRESETS.find(p => p.i0 === a && p.i1 === b);
    state.preset = pr ? pr.key : 'custom'; state.i0 = a; state.i1 = b;
  }
  function readHash() {
    const q = new URLSearchParams(location.hash.slice(1));
    if (['dashboard', 'slides', 'report', 'data'].includes(q.get('v'))) state.view = q.get('v');
    if (TABS[q.get('t')]) state.tab = q.get('t');
    if (q.get('s')) state.slide = Math.max(0, (+q.get('s') || 1) - 1);
    const p = q.get('p');
    if (p) {
      const pr = PRESETS.find(x => x.key === p);
      if (pr) { state.preset = p; state.i0 = pr.i0; state.i1 = pr.i1; }
      else if (/^\d{4}-\d\d-\d\d_\d{4}-\d\d-\d\d$/.test(p)) { const [a, b] = p.split('_'); if (IX[a] != null && IX[b] != null) setCustom(IX[a], IX[b]); }
    }
  }
  const go = { slide(d) { state.slide = d === 'home' ? 0 : d === 'end' ? 99 : state.slide + d; renderSlide(); writeHash(); } };

  function wire() {
    document.getElementById('views').addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (!b) return; state.view = b.dataset.v; render(); window.scrollTo(0, 0); });
    document.getElementById('tabs').addEventListener('click', e => { const b = e.target.closest('button[data-t]'); if (!b) return; state.tab = b.dataset.t; render(); });
    document.getElementById('tabs').addEventListener('keydown', e => {
      const keys = Object.keys(TABS), k = keys.indexOf(state.tab);
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { state.tab = keys[(k + (e.key === 'ArrowRight' ? 1 : keys.length - 1)) % keys.length]; render(); document.querySelector(`#tabs [data-t="${state.tab}"]`).focus(); }
    });
    document.getElementById('presets').addEventListener('click', e => {
      const b = e.target.closest('button[data-p]'); if (!b) return;
      const p = PRESETS.find(x => x.key === b.dataset.p); state.preset = p.key; state.i0 = p.i0; state.i1 = p.i1; state.grain = 'auto'; render();
    });
    ['dFrom', 'dTo'].forEach(id => {
      const inp = document.getElementById(id);
      inp.min = D[FS]; inp.max = D[FE];
      inp.addEventListener('change', () => { const a = IX[document.getElementById('dFrom').value], b = IX[document.getElementById('dTo').value]; if (a == null || b == null) return; setCustom(a, b); state.grain = 'auto'; render(); });
    });
    document.getElementById('grain').addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (!b) return; state.grain = b.dataset.g; render(); });
    document.getElementById('themeBtn').addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('spa-theme', next); } catch (e) { /* storage unavailable */ }
      render();
    });
    document.getElementById('linkBtn').addEventListener('click', ev => {
      writeHash();
      const btn = ev.currentTarget, done = () => { btn.querySelector('span').textContent = 'Link copied'; setTimeout(() => { btn.querySelector('span').textContent = 'Copy link'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, () => {}); else done();
    });
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('prevSlide').addEventListener('click', () => go.slide(-1));
    document.getElementById('nextSlide').addEventListener('click', () => go.slide(1));
    document.getElementById('slideList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; state.slide = +b.dataset.k; renderSlide(); writeHash(); });
    document.getElementById('fsBtn').addEventListener('click', () => {
      const vp = document.getElementById('deckViewport');
      if (document.fullscreenElement) document.exitFullscreen(); else if (vp.requestFullscreen) vp.requestFullscreen().catch(() => {});
    });
    document.getElementById('deckViewport').addEventListener('click', e => {
      if (e.target.closest('.overlay, .board, .county, .hb-row, th, tr, button, a, .heat-cell')) return;
      const q = e.currentTarget.getBoundingClientRect();
      go.slide((e.clientX - q.left) > q.width / 3 ? 1 : -1);
    });
    document.addEventListener('fullscreenchange', () => setTimeout(fitStage, 50));
    document.addEventListener('keydown', e => {
      if (state.view !== 'slides' || e.target.closest('input, select, textarea, .overlay')) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { go.slide(1); e.preventDefault(); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key)) { go.slide(-1); e.preventDefault(); }
      else if (e.key === 'Home') go.slide('home');
      else if (e.key === 'End') go.slide('end');
      else if (e.key === 'f' || e.key === 'F') document.getElementById('fsBtn').click();
    });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('svg, .hb-row, .heat-cell, #tip')) C.tip.hide(); });
    let rz, lastW = document.getElementById('tabBody').clientWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rz);
      rz = setTimeout(() => {
        if (state.view === 'slides') fitStage();
        else if (state.view === 'report') fitSheets();
        else if (state.view === 'dashboard') { const w = document.getElementById('tabBody').clientWidth; if (w !== lastW) { lastW = w; mount(document.getElementById('tabBody')); } }
      }, 150);
    });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ev => {
      let saved = null; try { saved = localStorage.getItem('spa-theme'); } catch (e) { /* ignore */ }
      if (!saved) { document.documentElement.dataset.theme = ev.matches ? 'dark' : 'light'; render(); }
    });
    // Printing from any view prints the report.
    let prevView = null;
    window.addEventListener('beforeprint', () => {
      printing = true;
      if (state.view !== 'report') { prevView = state.view; document.getElementById('view-report').hidden = false; }
      renderReport();
    });
    window.addEventListener('afterprint', () => {
      printing = false;
      if (prevView) { document.getElementById('view-report').hidden = true; prevView = null; } else fitSheets();
    });
  }

  // ------------------------------------------------------------------ go
  readHash();
  render();
  wire();
  window.__report = { state, ctxFor, render, R, F };
})();
