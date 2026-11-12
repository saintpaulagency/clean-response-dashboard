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
    signPct: (v, d) => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d == null ? 1 : d) + '%',
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

  // ------------------------------------------------------------------ sums
  function sum(a, i0, i1) { let s = 0; for (let i = i0; i <= i1; i++) s += a[i]; return s; }
  function sumCol(m, k, i0, i1) { let s = 0; for (let i = i0; i <= i1; i++) s += m[i][k]; return s; }
  function reachOf(imps) { const U = S.lift_model.universe_hh, f = S.lift_model.min_freq; return Math.round(U * (1 - Math.exp(-imps / (U * f)))); }

  function ctvT(i0, i1) {
    const c = S.ctv;
    const t = { spend: sum(c.spend, i0, i1) / 100, imps: sum(c.imps, i0, i1), q25: sum(c.q25, i0, i1), q50: sum(c.q50, i0, i1), q75: sum(c.q75, i0, i1), completes: sum(c.completes, i0, i1), visits: sum(c.visits, i0, i1), leads: sum(c.leads, i0, i1) };
    t.reach = reachOf(t.imps); t.freq = t.imps / t.reach;
    t.vcr = t.completes / t.imps; t.cpm = t.spend / t.imps * 1000; t.cpcv = t.spend / t.completes;
    t.vpk = t.visits / t.imps * 1000; t.cpv = t.spend / t.visits; t.cpl = t.leads ? t.spend / t.leads : 0;
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
      const r = { id: b.id, b, name: b.name, city: b.city, type: b.type, imps: sumCol(bd.imps, k, i0, i1), plays: sumCol(bd.plays, k, i0, i1), spend: sumCol(bd.spend, k, i0, i1) / 100, live };
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
    const dc = S.dooh_creative; t.creative = dc.keys.map((key, k) => ({ key, plays: sumCol(dc.plays, k, i0, i1) }));
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
    const p0 = i0 - len, p1 = i0 - 1;
    r.prev = p0 >= FS ? mk(p0, p1) : null;
    r.base = { label: period(BS, BE) };
    r.isFlight = i0 === FS && i1 === FE;
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
  const state = { view: 'dashboard', tab: 'overview', preset: 'flight', i0: FS, i1: FE, grain: 'auto', slide: 0, board: 'CR-D03' };
  const R = () => ctxFor(state.i0, state.i1);
  const grainOf = r => state.grain === 'auto' ? (r.len > 45 ? 'week' : 'day') : state.grain;

  let scopeEl = null;
  function COL() {
    const host = scopeEl && scopeEl.isConnected ? scopeEl : document.documentElement;
    const cs = getComputedStyle(host), g = k => cs.getPropertyValue(k).trim();
    const inSheet = !!(host.closest && host.closest('.sheet'));
    const dark = !inSheet && document.documentElement.dataset.theme === 'dark';
    return {
      ctv: g('--s-ctv'), ooh: g('--s-ooh'), res: g('--s-res'), ref: g('--s-ref'), dark,
      seq: dark ? ['#16233d', '#183a6e', '#184f95', '#1c5cab', '#2a78d6', '#5598e7', '#86b6ef', '#b7d3f6']
        : ['#e8f1fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#104281'],
      ord: dark ? ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#9ec5f4'] : ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281'],
    };
  }

  // ------------------------------------------------------------------ buckets
  function buckets(r) {
    const out = [];
    if (grainOf(r) === 'day') {
      for (let i = r.i0; i <= r.i1; i++) out.push({ i0: i, i1: i, label: fmtDay(i), long: WDF[wday(i)] + ', ' + fmtDay(i, true), partial: false });
      return out;
    }
    let s = r.i0;
    while (s <= r.i1) {
      let e = s; while (e < r.i1 && wday(e + 1) !== 0) e++;
      out.push({ i0: s, i1: e, label: fmtDay(s), long: 'Week of ' + period(s, e) + ((e - s + 1) < 7 ? ` (${e - s + 1} days)` : ''), partial: (e - s + 1) < 7, days: e - s + 1 });
      s = e + 1;
    }
    return out;
  }
  const bucketOf = (bk, i) => bk.findIndex(b => i >= b.i0 && i <= b.i1);
  function eventsFor(bk, kinds) {
    return S.meta.events.filter(e => !kinds || kinds.includes(e.kind)).map(e => ({ i: bucketOf(bk, IX[e.date]), label: e.label })).filter(e => e.i > 0);
  }
  const perDay = (a, b) => sum(a, b.i0, b.i1) / (b.i1 - b.i0 + 1);
  const grainWord = r => grainOf(r) === 'day' ? 'by day' : 'weekly average per day';

  // ------------------------------------------------------------------ small html helpers
  function card(host, title, sub, inner, o) {
    o = o || {};
    if (sub && host.closest && host.closest('.sheet')) sub = sub.replace(/ · tap [^·]*$/, '');
    host.innerHTML = (o.bare ? '' : `<div class="card-h"><h3>${title}</h3>${sub ? `<p class="card-sub">${sub}</p>` : ''}</div>`) + inner +
      (o.how && !o.bare ? `<details class="how"><summary>How this is worked out</summary><div>${o.how}</div></details>` : '');
  }
  function legend(items) { return `<div class="legend">${items.map(([c, l, dash]) => `<span class="lg"><i class="${dash ? 'dash' : ''}" style="${dash ? 'border-color' : 'background'}:${c}"></i>${esc(l)}</span>`).join('')}</div>`; }
  function delta(cur, prev, tone, vsLabel) {
    if (prev == null || !isFinite(prev) || prev === 0) return '';
    const d = cur / prev - 1;
    if (Math.abs(d) < 0.0005) return `<div class="delta flat">No change vs ${esc(vsLabel)}</div>`;
    const up = d > 0;
    const cls = tone === 'neutral' ? 'flat' : ((up && tone === 'up-good') || (!up && tone === 'up-bad') ? 'good' : 'bad');
    return `<div class="delta ${cls}"><span aria-hidden="true">${up ? '▲' : '▼'}</span> ${Math.abs(d * 100).toFixed(1)}% <span class="vs">vs ${esc(vsLabel)}</span></div>`;
  }
  function kpiRow(host, tiles, o) {
    o = o || {};
    const list = o.n ? tiles.slice(0, o.n) : tiles;
    host.innerHTML = `<div class="kpis${o.cols ? ' cols-' + o.cols : ''}">${list.map((t, k) => `
      <div class="kpi">
        <div class="kpi-label">${esc(t.label)}</div>
        <div class="kpi-value">${t.value}</div>
        <div class="kpi-period">${esc(t.period)}</div>
        ${t.delta || ''}${t.note ? `<div class="kpi-note">${t.note}</div>` : ''}
        ${t.spark && !o.noSpark ? `<div class="kpi-spark" data-k="${k}"></div>` : ''}
      </div>`).join('')}</div>`;
    host.querySelectorAll('.kpi-spark').forEach(s => { const t = list[+s.dataset.k]; C.spark(s, t.spark, t.color); });
  }
  function dailyVals(arr, r, div) { const out = []; for (let i = r.i0; i <= r.i1; i++) out.push(arr[i] / (div || 1)); return out; }
  const noPrev = () => '';

  const MAPLAB = {
    countyLab: { Ramsey: { dx: 15, dy: 2 }, Washington: { dx: 12, dy: -58, rot: true } },
    boardLab: { 'CR-D01': 'b', 'CR-S01': 'l', 'CR-S02': 'l' },
    cityLab: { Minneapolis: 'l', 'St. Paul': 'ur', Lakeville: 'l' },
  };
  const MAP_CITIES = ['Minneapolis', 'St. Paul', 'Blaine', 'Lakeville', 'Stillwater'];
  const mapOpts = o => Object.assign({}, MAPLAB, o);

  // ------------------------------------------------------------------ narrative
  function answerText(r) {
    const live = r.ooh.live;
    return `<strong>${esc(r.label)}:</strong> Floyd CTV and ${live} billboard${live === 1 ? '' : 's'} put Clean Response in front of the Twin Cities <strong>${F.compact(r.imps)} times</strong> at a <strong>${F.usd2(r.cpm)} blended CPM</strong>. ` +
      `${F.compact(r.ctv.reach)} households saw the TV ad and ${F.pct(r.ctv.vcr)} watched it to the end. ` +
      `Website sessions ran <strong>${F.signPct(r.halo.sessionsLift, 0)} above</strong> June’s pre-campaign baseline.`;
  }
  function appLeaders(r) {
    const rows = dimRows('app', r.i0, r.i1).filter(a => !/^Other/.test(a.key) && a.imps / r.ctv.imps >= 0.04);
    return rows.sort((a, b) => b.vpk - a.vpk);
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
    return { trig: a, norm: b, avg, windows: S.meta.storms.filter(s => IX[s] >= r.i0 && IX[s] <= r.i1).length };
  }
  function insights(r) {
    const out = [];
    const lead = appLeaders(r)[0];
    out.push(`<b>${F.pct(r.ctv.vcr)}</b> of Floyd CTV ads played to the very end: TV-quality attention, not scroll-past views.`);
    if (lead) out.push(`<b>${esc(lead.key)}</b> drove the most site visits per impression: ${F.dec(lead.vpk, 2)} per 1,000, against ${F.dec(r.ctv.vpk, 2)} across all CTV.`);
    const st = stormStats(r);
    if (st.trig.n && st.norm.n) out.push(`On <b>${st.trig.n} weather-trigger days</b>, CTV site visits ran <b>${F.x(st.avg(st.trig, 'visits') / st.avg(st.norm, 'visits'))}</b> a normal day and inbound calls ${F.x(st.avg(st.trig, 'calls') / st.avg(st.norm, 'calls'))}.`);
    const live = r.ooh.rows.filter(x => x.live);
    if (live.length) {
      const cheap = live.slice().sort((a, b) => a.cpm - b.cpm)[0];
      out.push(`<b>${esc(cheap.name)}</b> (${esc(cheap.city)}) was the most efficient board at <b>${F.usd2(cheap.cpm)} CPM</b>.`);
    }
    out.push(`Prime time (7–11 PM) carried <b>${F.pct(primeShare(r), 0)}</b> of CTV impressions, when families are home to act.`);
    return out;
  }
  function nextSteps(r) {
    const out = [];
    const leaders = appLeaders(r).slice(0, 3);
    if (leaders.length) out.push({ t: 'Lean into the apps that drive visits', b: `Shift about 10% of CTV budget toward ${leaders.map(a => a.key).join(', ')}. They averaged ${F.dec(leaders.reduce((s, a) => s + a.visits, 0) / leaders.reduce((s, a) => s + a.imps, 0) * 1000, 2)} site visits per 1,000 impressions against ${F.dec(r.ctv.vpk, 2)} overall (${r.label}).` });
    const st = stormStats(r);
    if (st.trig.n && st.norm.n) out.push({ t: 'Keep weather triggers on and widen them', b: `Trigger days brought ${F.x(st.avg(st.trig, 'visits') / st.avg(st.norm, 'visits'))} the site visits of a normal day. We’d extend the storm creative to the static boards with a quick-turn vinyl ready for spring storm season.` });
    const cty = dimRows('county', r.i0, r.i1);
    const withBoard = new Set(r.ooh.rows.filter(x => x.live).map(x => x.b.county));
    const open = cty.filter(c => !withBoard.has(c.key)).sort((a, b) => b.vpk - a.vpk)[0];
    if (open) out.push({ t: `Add a board in ${open.key} County`, b: `TV viewers there visit at ${F.dec(open.vpk, 2)} per 1,000 impressions, but no board runs there yet. A board would add daily reminders where interest is already proven.` });
    const months = PRESETS.filter(p => /^[a-z]{3}$/.test(p.key) && p.i0 >= r.i0 && p.i1 <= r.i1);
    if (months.length >= 2) {
      const a = ctvT(months[months.length - 2].i0, months[months.length - 2].i1), b = ctvT(months[months.length - 1].i0, months[months.length - 1].i1);
      out.push({ t: 'Watch CTV prices into election season', b: `CTV CPM moved from ${F.usd2(a.cpm)} in ${months[months.length - 2].label} to ${F.usd2(b.cpm)} in ${months[months.length - 1].label} as political ads bid up inventory. We hold bids so delivery stays efficient.` });
    } else out.push({ t: 'Build frequency where it counts', b: `Average frequency was ${F.dec(r.ctv.freq, 1)} views per household (${r.label}). We aim for 3–5 over a month so the 1-hour-response message sticks.` });
    return out;
  }

  // ------------------------------------------------------------------ blocks
  const B = {};
  B.answer = (h, r, o) => { h.innerHTML = `<p class="answer${o.slide ? ' big' : ''}">${answerText(r)}</p>`; };

  B.kpisOverview = (h, r, o) => {
    const c = COL(), p = r.prev, vs = p ? p.label : '';
    kpiRow(h, [
      { label: 'Total investment', value: F.usd(r.spend), period: r.label, delta: p ? delta(r.spend, p.spend, 'neutral', vs) : noPrev(r), note: `CTV ${F.usdC(r.ctv.spend)} · Billboards ${F.usdC(r.ooh.spend)}`, spark: dailyVals(S.ctv.spend, r, 100).map((v, k) => v + sumBoards(S.board_daily.spend, r.i0 + k) / 100), color: c.ref },
      { label: 'Total impressions', value: F.compact(r.imps), period: r.label, delta: p ? delta(r.imps, p.imps, 'up-good', vs) : noPrev(r), note: `CTV ${F.compact(r.ctv.imps)} · Billboards ${F.compact(r.ooh.imps)}`, spark: dailyVals(S.ctv.imps, r).map((v, k) => v + sumBoards(S.board_daily.imps, r.i0 + k)), color: c.ref },
      { label: 'Households reached by CTV', value: F.compact(r.ctv.reach), period: r.label, delta: p ? delta(r.ctv.reach, p.ctv.reach, 'up-good', vs) : noPrev(r), note: `${F.dec(r.ctv.freq, 1)} views per household on average` },
      { label: 'Blended CPM', value: F.usd2(r.cpm), period: r.label, delta: p ? delta(r.cpm, p.cpm, 'up-bad', vs) : noPrev(r), note: `CTV ${F.usd2(r.ctv.cpm)} · Billboards ${F.usd2(r.ooh.cpm)}` },
      { label: 'Website sessions per day', value: F.int(r.halo.sessionsDay), period: r.label, delta: delta(r.halo.sessionsDay, r.halo.sessionsBase, 'up-good', 'June baseline'), note: `June baseline: ${F.int(r.halo.sessionsBase)} per day`, spark: dailyVals(S.halo.sessions, r), color: c.res },
      { label: 'Tracked responses', value: F.int(r.ctv.leads + r.ooh.calls), period: r.label, delta: p ? delta(r.ctv.leads + r.ooh.calls, p.ctv.leads + p.ooh.calls, 'up-good', vs) : noPrev(r), note: `${F.int(r.ooh.calls)} billboard-line calls · ${F.int(r.ctv.leads)} CTV leads` },
    ], o);
  };
  function sumBoards(m, i) { return m[i].reduce((a, b) => a + b, 0); }

  B.kpisCtv = (h, r, o) => {
    const c = COL(), t = r.ctv, p = r.prev, vs = p ? p.label : '', pt = p ? p.ctv : null;
    kpiRow(h, [
      { label: 'CTV investment', value: F.usd(t.spend), period: r.label, delta: pt ? delta(t.spend, pt.spend, 'neutral', vs) : noPrev(r), spark: dailyVals(S.ctv.spend, r, 100), color: c.ctv },
      { label: 'Impressions', value: F.compact(t.imps), period: r.label, delta: pt ? delta(t.imps, pt.imps, 'up-good', vs) : noPrev(r), spark: dailyVals(S.ctv.imps, r), color: c.ctv },
      { label: 'Completion rate', value: F.pct(t.vcr), period: r.label, delta: pt ? delta(t.vcr, pt.vcr, 'up-good', vs) : noPrev(r), note: `${F.int(t.completes)} ads watched to the end` },
      { label: 'Households reached', value: F.compact(t.reach), period: r.label, delta: pt ? delta(t.reach, pt.reach, 'up-good', vs) : noPrev(r), note: `${F.dec(t.freq, 1)} views per household` },
      { label: 'CPM', value: F.usd2(t.cpm), period: r.label, delta: pt ? delta(t.cpm, pt.cpm, 'up-bad', vs) : noPrev(r), note: 'Cost per 1,000 impressions' },
      { label: 'Cost per completed view', value: F.usd2(t.cpcv), period: r.label, delta: pt ? delta(t.cpcv, pt.cpcv, 'up-bad', vs) : noPrev(r), note: 'Ad watched to the last second' },
      { label: 'Site visits from viewers', value: F.int(t.visits), period: r.label, delta: pt ? delta(t.visits, pt.visits, 'up-good', vs) : noPrev(r), note: `${F.dec(t.vpk, 2)} per 1,000 impressions · ${F.usd2(t.cpv)} each`, spark: dailyVals(S.ctv.visits, r), color: c.ctv },
      { label: 'Leads (calls + forms)', value: F.int(t.leads), period: r.label, delta: pt ? delta(t.leads, pt.leads, 'up-good', vs) : noPrev(r), note: t.leads ? `${F.usd(t.cpl)} per lead` : 'None in this period' },
    ], o);
  };

  B.kpisOoh = (h, r, o) => {
    const c = COL(), t = r.ooh, p = r.prev, vs = p ? p.label : '', pt = p ? p.ooh : null;
    const dvals = []; for (let i = r.i0; i <= r.i1; i++) dvals.push(sumBoards(S.board_daily.imps, i));
    kpiRow(h, [
      { label: 'Boards live', value: F.int(t.live), period: r.label, note: `${t.digital} digital · ${t.live - t.digital} static` },
      { label: 'Impressions (adults 18+)', value: F.compact(t.imps), period: r.label, delta: pt ? delta(t.imps, pt.imps, 'up-good', vs) : noPrev(r), spark: dvals, color: c.ooh },
      { label: 'Digital plays delivered', value: F.compact(t.plays), period: r.label, note: `${F.pct(t.delivery)} of the ${F.compact(t.contract)} contracted` },
      { label: 'Billboard investment', value: F.usd(t.spend), period: r.label, delta: pt ? delta(t.spend, pt.spend, 'neutral', vs) : noPrev(r) },
      { label: 'CPM', value: F.usd2(t.cpm), period: r.label, delta: pt ? delta(t.cpm, pt.cpm, 'up-bad', vs) : noPrev(r), note: 'Cost per 1,000 impressions' },
      { label: 'Billboard-line calls', value: F.int(t.calls), period: r.label, delta: pt ? delta(t.calls, pt.calls, 'up-good', vs) : noPrev(r), note: 'Calls to the number on the boards' },
    ], o);
  };

  B.kpisResults = (h, r, o) => {
    const c = COL(), t = r.halo;
    kpiRow(h, [
      { label: 'Website sessions per day', value: F.int(t.sessionsDay), period: r.label, delta: delta(t.sessionsDay, t.sessionsBase, 'up-good', 'June baseline'), note: `June: ${F.int(t.sessionsBase)} per day, before ads`, spark: dailyVals(S.halo.sessions, r), color: c.res },
      { label: 'Branded searches per day', value: F.dec(t.brandedDay, 1), period: r.label, delta: delta(t.brandedDay, t.brandedBase, 'up-good', 'June baseline'), note: `People searching “Clean Response” · June: ${F.dec(t.brandedBase, 1)}`, spark: dailyVals(S.halo.branded, r), color: c.res },
      { label: 'Inbound calls per day', value: F.dec(t.callsDay, 1), period: r.label, delta: delta(t.callsDay, t.callsBase, 'up-good', 'June baseline'), note: `All tracked lines · June: ${F.dec(t.callsBase, 1)}`, spark: dailyVals(S.halo.calls, r), color: c.res },
      { label: 'Billboard-line calls', value: F.int(t.boardCalls), period: r.label, note: 'Number shown only on the boards' },
      { label: 'Site visits from CTV viewers', value: F.int(r.ctv.visits), period: r.label, note: `${F.usd2(r.ctv.cpv)} per visit` },
      { label: 'CTV leads', value: F.int(r.ctv.leads), period: r.label, note: r.ctv.leads ? `${F.usd(r.ctv.cpl)} per lead` : 'None in this period' },
    ], o);
  };

  B.spendWeekly = (h, r, o) => {
    const c = COL(), bk = buckets(Object.assign({}, r, { len: 99 }));
    const ctv = bk.map(b => sum(S.ctv.spend, b.i0, b.i1) / 100);
    const ooh = bk.map(b => { let s = 0; for (let i = b.i0; i <= b.i1; i++) s += sumBoards(S.board_daily.spend, i); return s / 100; });
    card(h, 'Investment by week', `${r.label} · lighter bars are part weeks`, legend([[c.ctv, 'CTV · Floyd'], [c.ooh, 'Billboards']]) + '<div class="chart"></div>', o);
    C.bars(h.querySelector('.chart'), {
      label: 'Investment by week', labels: bk.map(b => b.label), height: o.h || 250, yFmt: v => F.usdC(v), partial: bk.map(b => b.partial),
      series: [{ name: 'CTV · Floyd', values: ctv, color: c.ctv }, { name: 'Billboards', values: ooh, color: c.ooh }],
      tip: i => `<div class="tip-title">${esc(bk[i].long)}</div>` + C.tipRow(c.ctv, 'CTV · Floyd', F.usd(ctv[i])) + C.tipRow(c.ooh, 'Billboards', F.usd(ooh[i])) + C.tipRow('', 'Total', F.usd(ctv[i] + ooh[i])),
    });
  };

  B.channelMix = (h, r, o) => {
    const rows = [
      { ch: 'CTV · Floyd', spend: r.ctv.spend, ss: r.ctv.spend / r.spend, imps: r.ctv.imps, is: r.ctv.imps / r.imps, cpm: r.ctv.cpm },
      { ch: 'Billboards', spend: r.ooh.spend, ss: r.ooh.spend / r.spend, imps: r.ooh.imps, is: r.ooh.imps / r.imps, cpm: r.ooh.cpm },
    ];
    card(h, 'Channel mix', r.label, '<div class="t"></div><p class="note">CTV costs more per impression but is a full-screen, sound-on TV ad that viewers can’t skip. Billboards repeat the name cheaply every commute.</p>', o);
    C.table(h.querySelector('.t'), {
      noSort: true, rows, total: { ch: 'Total', spend: r.spend, ss: 1, imps: r.imps, is: 1, cpm: r.cpm }, columns: [
        { key: 'ch', label: 'Channel' }, { key: 'spend', label: 'Investment', num: 1, fmt: F.usd }, { key: 'ss', label: 'Share', num: 1, fmt: v => F.pct(v, 0) },
        { key: 'imps', label: 'Impressions', num: 1, fmt: F.int }, { key: 'is', label: 'Share', num: 1, fmt: v => F.pct(v, 0) }, { key: 'cpm', label: 'CPM', num: 1, fmt: F.usd2 }],
    });
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
      return `<div class="tip-title">${esc(b.id)} · ${esc(b.name)}</div><div class="tip-sub">${esc(b.city)} · ${esc(b.facing)} · ${esc(b.type)} ${esc(b.size)}</div>` +
        (x.live ? C.tipRow('', 'Impressions', F.int(x.imps)) + (x.contract ? C.tipRow('', 'Plays delivered', `${F.int(x.plays)} (${F.pct(x.delivery)})`) : '') + C.tipRow('', 'Investment', F.usd(x.spend)) + C.tipRow('', 'CPM', F.usd2(x.cpm))
          : `<div class="tip-sub">Not live in this period (runs ${esc(period(IX[b.start], IX[b.end]))})</div>`) + `<div class="tip-sub">${esc(r.label)}</div>`;
    };
  }
  function mapLegendHtml(c, lo, hi, loLab, hiLab, title) {
    return `<div class="map-legend"><div class="ml-group"><span class="ml-title">${esc(title)}</span><span class="ramp-legend"><span>${esc(loLab || F.int(lo))}</span><span class="ramp" style="background:linear-gradient(90deg,${C.interp(c.seq, .12)},${c.seq.slice(2).join(',')})"></span><span>${esc(hiLab || F.int(hi))}</span></span></div>
      <div class="ml-group"><span class="lg"><i class="mk-dot"></i>Digital billboard</span><span class="lg"><i class="mk-sq"></i>Static billboard</span></div></div>`;
  }
  B.mapOverview = (h, r, o) => {
    const c = COL(), rows = countyCtv(r), by = {}; rows.forEach(x => { by[x.key] = x; });
    card(h, 'Where people saw Clean Response', `${r.label} · shading: CTV impressions per 1,000 households · markers: billboards`, '<div class="map-host"></div><div class="ml"></div>', o);
    const res = C.map(h.querySelector('.map-host'), mapOpts({
      geo: S.geo, ramp: c.seq, label: 'Twin Cities map of CTV delivery and billboard locations', maxHeight: o.mh,
      countyValue: cc => by[cc.name].perHH, cities: S.geo.cities.filter(x => ['Minneapolis', 'St. Paul'].includes(x.name)),
      countyTip: (cc) => { const x = by[cc.name]; return `<div class="tip-title">${esc(cc.name)} County</div>` + C.tipRow('', 'CTV impressions', F.int(x.imps)) + C.tipRow('', 'Per 1,000 households', F.int(x.perHH)) + C.tipRow('', 'Site visits', F.int(x.visits)) + `<div class="tip-sub">${esc(r.label)}</div>`; },
      boards: S.boards, boardLive: b => r.ooh.rows.find(x => x.id === b.id).live > 0, boardTip: boardTip(r),
    }));
    h.querySelector('.ml').innerHTML = mapLegendHtml(c, res.lo, res.hi, null, null, 'CTV impressions per 1,000 households');
  };

  B.highlights = (h, r, o) => {
    card(h, 'Highlights', r.label, `<ul class="bullets">${insights(r).slice(0, o.n || 5).map(x => `<li>${x}</li>`).join('')}</ul>`, o);
  };

  function linesCard(h, r, o, spec) {
    const c = COL(), bk = buckets(r);
    const day = grainOf(r) === 'day';
    const events = eventsFor(bk, spec.eventKinds);
    const bands = day && spec.bands ? bk.map(b => !!S.trigger[b.i0]) : null;
    const leg = spec.series.length > 1 || spec.ref || bands ? legend(spec.series.map(s => [s.color, s.name]).concat(spec.ref ? [[c.ref, spec.ref.legend, true]] : [])) : '';
    card(h, spec.title, `${r.label} · ${grainWord(r)}${bands && r.trigDays ? ' · shaded days had a weather trigger' : ''}`, leg + '<div class="chart"></div>' + (spec.note ? `<p class="note">${spec.note}</p>` : ''), Object.assign({ how: spec.how }, o));
    C.lines(h.querySelector('.chart'), {
      label: spec.title, labels: bk.map(b => b.label), height: o.h || spec.h || 250, yFmt: spec.yFmt,
      xFmt: (i, long) => long ? bk[i].long : bk[i].label, events, bands,
      series: spec.series.map(s => ({ name: s.name, color: s.color, area: s.area, values: bk.map(b => s.fn(b)) })),
      ref: spec.ref ? { value: spec.ref.value, label: spec.ref.label } : null,
      xTicks: monthTicks(bk),
    });
  }
  function monthTicks(bk) {
    if (bk.length <= 10) return null;
    const out = [0];
    bk.forEach((b, i) => { if (i && dt(b.i0).getUTCMonth() !== dt(bk[i - 1].i0).getUTCMonth()) out.push(i); });
    if (out.length < 3) return null;
    if (out[1] - out[0] < 3) out.splice(0, 1);
    return out;
  }

  B.resultsMini = (h, r, o) => B.resSessions(h, r, Object.assign({ h: 230 }, o));
  B.resSessions = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Website sessions from the Twin Cities', bands: true, eventKinds: ['ours'],
      yFmt: (v, t) => t ? F.int(v) + ' per day' : F.int(v),
      series: [{ name: 'Sessions per day', color: c.res, area: true, fn: b => perDay(S.halo.sessions, b) }],
      ref: { value: r.halo.sessionsBase, label: `June baseline ${F.int(r.halo.sessionsBase)}`, legend: 'June baseline (before ads)' },
      how: 'All website sessions from the 7-county metro, every source. The June baseline is the daily average for June 1–30, 2026, before any CTV or billboards ran.',
    });
  };
  B.resBranded = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'People searching “Clean Response”', bands: true, eventKinds: ['ours'],
      yFmt: (v, t) => t ? F.dec(v, 1) + ' per day' : F.int(v),
      series: [{ name: 'Branded searches per day', color: c.res, area: true, fn: b => perDay(S.halo.branded, b) }],
      ref: { value: r.halo.brandedBase, label: `June baseline ${F.dec(r.halo.brandedBase, 1)}`, legend: 'June baseline (before ads)' },
      how: 'Google searches that include the brand name, from the metro. Brand searches are the clearest sign that ads people can’t click (TV, billboards) are working.',
    });
  };
  B.resCalls = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Inbound calls', bands: true, eventKinds: ['ours'],
      yFmt: (v, t) => t ? F.dec(v, 1) + ' per day' : F.int(v),
      series: [{ name: 'Calls per day, all tracked lines', color: c.res, area: true, fn: b => perDay(S.halo.calls, b) }],
      ref: { value: r.halo.callsBase, label: `June baseline ${F.dec(r.halo.callsBase, 1)}`, legend: 'June baseline (before ads)' },
    });
  };

  B.ctvTrend = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'CTV impressions', bands: true, eventKinds: ['market'], yFmt: (v, t) => t ? F.int(v) + ' per day' : F.compact(v),
      series: [{ name: 'Impressions per day', color: c.ctv, area: true, fn: b => perDay(S.ctv.imps, b) }],
      how: 'Impressions are full-screen ad starts on connected TVs and streaming devices in the 7-county metro. On weather-trigger days budgets rise automatically for 48 hours.',
    });
  };
  B.ctvVisits = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Site visits from households that saw the TV ad', bands: true, eventKinds: [],
      yFmt: (v, t) => t ? F.dec(v, 1) + ' per day' : F.dec(v, v < 10 ? 1 : 0),
      series: [{ name: 'Site visits per day', color: c.ctv, area: true, fn: b => perDay(S.ctv.visits, b) }],
      how: 'A visit counts when a household that saw the ad visits the website within 30 days, matched by household IP. Counts are de-duplicated per visit.',
    });
  };

  B.ctvFunnel = (h, r, o) => {
    const c = COL(), t = r.ctv;
    const steps = [['Started', t.imps], ['Watched 25%', t.q25], ['Watched 50%', t.q50], ['Watched 75%', t.q75], ['Watched to the end', t.completes]];
    card(h, 'How much of the ad people watched', r.label, '<div class="hbars"></div><p class="note">Streaming TV ads can’t be skipped, so almost every viewer hears the full 1-hour-response message.</p>', o);
    C.hbars(h.querySelector('.hbars'), { max: t.imps, rows: steps.map(([l, v], k) => ({ label: l, value: v, display: `${F.pct(v / t.imps)} · ${F.int(v)}`, color: c.ord[k] })) });
  };

  B.ctvApps = (h, r, o) => {
    const c = COL(), rows = dimRows('app', r.i0, r.i1), t = r.ctv;
    card(h, 'Where the TV ad ran: streaming apps', `${r.label} · tap a heading to sort`, '<div class="t"></div>', Object.assign({ how: 'Visits per 1,000 impressions compares apps fairly whatever their size. “Other apps” groups 300+ smaller apps and channels.' }, o));
    C.table(h.querySelector('.t'), {
      rows: o.limit ? rows.sort((a, b) => b.imps - a.imps).slice(0, o.limit) : rows, sort: { key: 'imps', dir: -1 }, compact: o.compact,
      total: o.limit ? null : { key: 'All apps', imps: t.imps, share: 1, vcr: t.vcr, cpm: t.cpm, visits: t.visits, vpk: t.vpk },
      columns: [
        { key: 'key', label: 'App' }, { key: 'imps', label: 'Impressions', num: 1, fmt: F.int, bar: c.ctv },
        { key: 'share', label: 'Share', num: 1, fmt: (v, x) => F.pct(x.imps / t.imps, 0) },
        { key: 'vcr', label: 'Completion', num: 1, fmt: v => F.pct(v) }, { key: 'cpm', label: 'CPM', num: 1, fmt: F.usd2 },
        { key: 'visits', label: 'Site visits', num: 1, fmt: F.int }, { key: 'vpk', label: 'Visits / 1K', num: 1, fmt: v => F.dec(v, 2) }],
    });
  };
  B.ctvAppsBars = (h, r, o) => {
    const c = COL(), rows = dimRows('app', r.i0, r.i1).sort((a, b) => b.imps - a.imps).slice(0, o.limit || 6), t = r.ctv;
    card(h, 'Top streaming apps', r.label, '<div class="hbars"></div>', o);
    C.hbars(h.querySelector('.hbars'), { rows: rows.map(x => ({ label: x.key, value: x.imps, display: `${F.compact(x.imps)} · ${F.pct(x.imps / t.imps, 0)}`, color: c.ctv })) });
  };
  B.ctvDevices = (h, r, o) => {
    const c = COL(), rows = dimRows('device', r.i0, r.i1).sort((a, b) => b.imps - a.imps), t = r.ctv;
    card(h, 'Devices', r.label, '<div class="hbars"></div>', o);
    C.hbars(h.querySelector('.hbars'), { rows: rows.slice(0, o.limit || 99).map(x => ({ label: x.key, value: x.imps, display: `${F.compact(x.imps)} · ${F.pct(x.imps / t.imps, 0)}`, color: c.ctv })) });
  };
  B.ctvCreatives = (h, r, o) => {
    const c = COL(), rows = dimRows('creative', r.i0, r.i1).filter(x => x.imps > 0);
    card(h, 'TV spots', r.label, '<div class="t"></div><p class="note">The storm spot runs only during weather triggers, when people are most likely to need help fast.</p>', o);
    C.table(h.querySelector('.t'), {
      rows, sort: { key: 'imps', dir: -1 }, compact: o.compact, columns: [
        { key: 'key', label: 'Spot' }, { key: 'imps', label: 'Impressions', num: 1, fmt: F.int, bar: c.ctv },
        { key: 'vcr', label: 'Completion', num: 1, fmt: v => F.pct(v) }, { key: 'visits', label: 'Site visits', num: 1, fmt: F.int },
        { key: 'vpk', label: 'Visits / 1K', num: 1, fmt: v => F.dec(v, 2) }],
    });
  };
  B.ctvHeat = (h, r, o) => {
    const c = COL(), sums = WD.map(() => Array(24).fill(0)), cnt = Array(7).fill(0);
    for (let i = r.i0; i <= r.i1; i++) { const w = wday(i); cnt[w]++; S.ctv_hours[i].forEach((v, k) => { sums[w][k] += v; }); }
    const vals = sums.map((row, w) => row.map(v => cnt[w] ? v / cnt[w] : 0));
    card(h, 'When the TV ad ran', `${r.label} · average impressions per hour, Central time`, '<div class="heat-host"></div>' + (o.bare ? '' : `<p class="note">Prime time (7–11 PM) carried ${F.pct(primeShare(r), 0)} of impressions. Weekends start earlier in the day.</p>`), o);
    C.heat(h.querySelector('.heat-host'), {
      rows: WD, cols: Array.from({ length: 24 }, (_, k) => hourShort(k)), values: vals, ramp: c.seq, colEvery: 3, lowLabel: 'Fewer', highLabel: 'More impressions',
      tip: (w, k) => `<div class="tip-title">${WDF[w]}s, ${hourLabel(k)}</div>` + C.tipRow('', 'Average impressions', F.int(vals[w][k])) + `<div class="tip-sub">${esc(r.label)} · ${cnt[w]} ${WDF[w]}${cnt[w] === 1 ? '' : 's'}</div>`,
    });
  };
  B.ctvCounties = (h, r, o) => {
    const c = COL(), rows = countyCtv(r);
    card(h, 'CTV by county', r.label, '<div class="t"></div>', o);
    C.table(h.querySelector('.t'), {
      rows, sort: { key: 'imps', dir: -1 }, compact: o.compact, columns: [
        { key: 'key', label: 'County' }, { key: 'hh', label: 'Households', num: 1, fmt: F.int }, { key: 'imps', label: 'Impressions', num: 1, fmt: F.int, bar: c.ctv },
        { key: 'perHH', label: 'Per 1K homes', num: 1, fmt: F.int }, { key: 'visits', label: 'Site visits', num: 1, fmt: F.int }, { key: 'vpk', label: 'Visits / 1K', num: 1, fmt: v => F.dec(v, 2) }],
    });
  };

  B.lift = (h, r, o) => {
    const c = COL(), t = ctvT(FS, FE), L = S.lift_model;
    const exposed = t.reach, ev = Math.round(t.visits * 0.82), er = ev / exposed;
    const cr = L.control_visit_rate, cv = Math.round(L.control_hh * cr), x = er / cr;
    const per = period(FS, FE);
    card(h, 'Did the TV ad change behavior?', `Lift study · ${per} (whole flight, does not follow the period picker)`,
      `<div class="lift"><div class="lift-big"><span class="lift-x">${F.x(x)}</span><span>Households that saw the TV ad were ${F.x(x)} as likely to visit the website as matched households that didn’t.</span></div>
       <div class="hbars"></div>${o.bare ? `<p class="note">Exposed: ${F.int(exposed)} households that saw at least one CTV ad; ${F.int(ev)} visited the site. Control: ${F.int(L.control_hh)} matched households held out of the campaign; ${F.int(cv)} visited. Same dates, same metro, same measurement.</p>` : ''}</div>`, Object.assign({ how: `Exposed: ${F.int(exposed)} households that saw at least one CTV ad; ${F.int(ev)} of them visited the site. Control: ${F.int(L.control_hh)} matched households held out from the campaign; ${F.int(cv)} visited. Both groups measured ${per}.` }, o));
    C.hbars(h.querySelector('.hbars'), {
      max: er, rows: [
        { label: 'Saw the TV ad', value: er, display: F.pct(er, 2) + ' visited', color: c.ctv },
        { label: 'Did not see it (control)', value: cr, display: F.pct(cr, 2) + ' visited', color: c.ref }],
    });
  };

  B.oohMap = (h, r, o) => {
    const c = COL();
    card(h, 'Billboard locations', `${r.label}${o.noPanel ? '' : ' · tap a board for details'}`, `<div class="ooh-map${o.noPanel ? ' solo' : ''}"><div class="map-host"></div>${o.noPanel ? '' : '<div class="board-panel"></div>'}</div><div class="ml"></div>`, o);
    const tipFn = boardTip(r);
    const draw = () => C.map(h.querySelector('.map-host'), mapOpts({
      geo: S.geo, ramp: c.dark ? ['#1c2741', '#1c2741'] : ['#e9eef6', '#e9eef6'], label: 'Map of billboard locations', maxHeight: o.mh || 600,
      countyValue: () => 1, countyTip: cc => `<div class="tip-title">${esc(cc.name)} County</div><div class="tip-sub">${r.ooh.rows.filter(x => x.b.county === cc.name && x.live).length} boards live · ${esc(r.label)}</div>`,
      cities: S.geo.cities.filter(x => MAP_CITIES.includes(x.name)), boards: S.boards, boardLive: b => r.ooh.rows.find(x => x.id === b.id).live > 0, boardTip: tipFn, selected: o.noPanel ? null : state.board,
      onBoard: b => { if (o.noPanel) return; state.board = b.id; draw(); panel(); },
    }));
    const panel = () => {
      const p = h.querySelector('.board-panel'); if (!p) return;
      const x = r.ooh.rows.find(z => z.id === state.board), b = x.b;
      p.innerHTML = `<div class="bp-id">${esc(b.id)}</div><div class="bp-name">${esc(b.name)}</div><div class="bp-sub">${esc(b.city)} · ${esc(b.county)} County · ${esc(b.facing)}</div>
        <dl class="bp-dl"><dt>Format</dt><dd>${esc(b.type)}</dd><dt>Size</dt><dd>${esc(b.size)}</dd><dt>Runs</dt><dd>${esc(period(IX[b.start], IX[b.end]))}</dd><dt>Weekly impressions</dt><dd>${F.int(b.weekly)}</dd>
        ${x.live ? `<dt>Impressions</dt><dd>${F.int(x.imps)}</dd>${x.contract ? `<dt>Plays delivered</dt><dd>${F.int(x.plays)} · ${F.pct(x.delivery)}</dd>` : '<dt>Plays</dt><dd>Static: always on</dd>'}<dt>Investment</dt><dd>${F.usd(x.spend)}</dd><dt>CPM</dt><dd>${F.usd2(x.cpm)}</dd>` : '<dt>This period</dt><dd>Not live yet</dd>'}</dl>
        <div class="bp-period">${esc(r.label)}</div>`;
    };
    draw(); panel();
    h.querySelector('.ml').innerHTML = `<div class="map-legend"><div class="ml-group"><span class="lg"><i class="mk-dot"></i>Digital billboard</span><span class="lg"><i class="mk-sq"></i>Static billboard</span><span class="lg"><i class="mk-off"></i>Not live in this period</span></div></div>`;
  };

  B.oohTrend = (h, r, o) => {
    const c = COL();
    linesCard(h, r, o, {
      title: 'Billboard impressions', eventKinds: ['ours'], yFmt: (v, t) => t ? F.int(v) + ' per day' : F.compact(v),
      series: [{ name: 'Impressions per day', color: c.ooh, area: true, fn: b => { let s = 0; for (let i = b.i0; i <= b.i1; i++) s += sumBoards(S.board_daily.imps, i); return s / (b.i1 - b.i0 + 1); } }],
      how: 'Billboard impressions are audited audience estimates for adults 18+ (Geopath), for our share of each face. Weekdays carry more traffic than weekends.',
    });
  };

  B.oohBoards = (h, r, o) => {
    const c = COL(), rows = r.ooh.rows.map(x => Object.assign({ label: x.id.replace('CR-', '') + ' · ' + x.name + ', ' + x.city, kind: x.type.replace(' bulletin', '') }, x));
    const live = rows.filter(x => x.live);
    card(h, 'Board by board', `${r.label} · tap a heading to sort`, '<div class="t"></div>', o);
    C.table(h.querySelector('.t'), {
      rows: live, sort: { key: 'imps', dir: -1 }, compact: o.compact,
      rowAttr: x => `data-board="${x.id}"`,
      total: { label: `All ${live.length} boards`, imps: r.ooh.imps, plays: r.ooh.plays, delivery: r.ooh.delivery, spend: r.ooh.spend, cpm: r.ooh.cpm, kind: '' },
      columns: [
        { key: 'label', label: 'Board' }, { key: 'kind', label: 'Type' }, { key: 'imps', label: 'Impressions', num: 1, fmt: F.int, bar: c.ooh },
        { key: 'plays', label: 'Plays', num: 1, fmt: (v, x) => x.contract || x.label.startsWith('All') ? F.int(v) : 'Always on' },
        { key: 'delivery', label: 'Delivered', num: 1, fmt: (v, x) => v == null ? 'n/a' : F.pct(v) },
        { key: 'spend', label: 'Investment', num: 1, fmt: F.usd }, { key: 'cpm', label: 'CPM', num: 1, fmt: F.usd2 }],
    });
  };

  B.oohBoardsBars = (h, r, o) => {
    const c = COL(), rows = r.ooh.rows.filter(x => x.live).sort((a, b) => b.imps - a.imps);
    card(h, 'Impressions by board', r.label, '<div class="hbars"></div>', o);
    C.hbars(h.querySelector('.hbars'), { rows: rows.map(x => ({ label: `${x.id.replace('CR-', '')} · ${x.name}`, value: x.imps, display: `${F.compact(x.imps)} · ${F.usd2(x.cpm)} CPM`, color: c.ooh })) });
  };
  B.oohCreative = (h, r, o) => {
    const c = COL(), t = r.ooh, tot = t.creative.reduce((a, x) => a + x.plays, 0);
    card(h, 'Digital creative rotation', `${r.label} · plays across the digital boards`, '<div class="hbars"></div><p class="note">When severe weather hits, the digital boards switch to the storm message for 48 hours. No new printing, no waiting.</p>', o);
    C.hbars(h.querySelector('.hbars'), { rows: t.creative.map(x => ({ label: x.key, value: x.plays, display: `${F.int(x.plays)} · ${F.pct(tot ? x.plays / tot : 0, 0)}`, color: c.ooh })) });
  };

  B.oohProof = (h, r, o) => {
    const t = r.ooh;
    const out = S.meta.outages.filter(x => IX[x.date] >= r.i0 && IX[x.date] <= r.i1);
    const mg = S.meta.makegoods;
    const items = out.map(x => {
      const b = S.boards.find(z => z.id === x.board), m = mg.find(z => z.board === x.board);
      return `<li><b>${fmtDay(IX[x.date])}:</b> ${esc(b.id)} (${esc(b.name)}) ran ${F.pct(x.delivered, 0)} of its plays during a screen outage. ${m ? `${F.int(m.plays)} make-good plays ran ${fmtDay(IX[m.date])}.` : ''}</li>`;
    });
    card(h, 'Proof of performance', r.label,
      `<div class="proof"><div class="proof-big">${F.pct(t.delivery)}</div><div>of contracted digital plays delivered: ${F.int(t.plays)} of ${F.int(t.contract)}. Every play is logged by the screen and checked against the contract.</div></div>
       ${items.length ? `<ul class="bullets small">${items.join('')}</ul>` : '<p class="note">No outages in this period.</p>'}`, o);
  };

  B.storms = (h, r, o) => {
    const st = stormStats(r);
    if (!st.trig.n) { card(h, 'Weather triggers', r.label, '<p class="note">No severe-weather triggers fired in this period. Pick a longer period to compare trigger days with normal days.</p>', o); return; }
    const rows = [['CTV site visits', 'visits'], ['Inbound calls', 'calls'], ['Billboard-line calls', 'bcalls'], ['Website sessions', 'sess']].map(([l, k]) => ({ m: l, t: st.avg(st.trig, k), n: st.avg(st.norm, k), x: st.avg(st.norm, k) ? st.avg(st.trig, k) / st.avg(st.norm, k) : 0 }));
    card(h, 'When storms hit, we turn up', `${r.label} · ${st.trig.n} trigger days (${st.windows} storm${st.windows === 1 ? '' : 's'}) vs ${st.norm.n} normal days`,
      '<div class="t"></div><p class="note">A severe-weather alert for the metro raises CTV budgets 38% and swaps the digital boards to the storm message for 48 hours, automatically.</p>', o);
    C.table(h.querySelector('.t'), {
      noSort: true, rows, columns: [
        { key: 'm', label: 'Per day' }, { key: 't', label: 'Trigger days', num: 1, fmt: v => F.dec(v, 1) },
        { key: 'n', label: 'Normal days', num: 1, fmt: v => F.dec(v, 1) }, { key: 'x', label: 'Difference', num: 1, fmt: v => F.x(v) }],
    });
  };

  B.resCounties = (h, r, o) => {
    const c = COL(), cs = S.county_sessions, ctv = countyCtv(r), bd = BE - BS + 1;
    const rows = cs.keys.map((key, k) => {
      const base = sumCol(cs.sessions, k, BS, BE) / bd, cur = sumCol(cs.sessions, k, r.i0, r.i1) / r.len;
      const cc = ctv.find(z => z.key === key);
      return { key, base: base / cs.hh[k] * 1e5, cur: cur / cs.hh[k] * 1e5, lift: cur / base - 1, perHH: cc.perHH, boards: r.ooh.rows.filter(z => z.live && z.b.county === key).length };
    });
    card(h, 'Lift by county', `${r.label} vs June baseline · daily website sessions per 100,000 households`, '<div class="map-host"></div><div class="ml"></div><div class="t"></div>', o);
    const by = {}; rows.forEach(x => { by[x.key] = x; });
    const res = C.map(h.querySelector('.map-host'), mapOpts({
      geo: S.geo, ramp: c.seq, label: 'Map of website-session lift by county', maxHeight: o.mh || 380, countyValue: cc => by[cc.name].lift,
      countyTip: cc => { const x = by[cc.name]; return `<div class="tip-title">${esc(cc.name)} County</div>` + C.tipRow('', 'Lift vs June', F.signPct(x.lift)) + C.tipRow('', 'Sessions per 100K homes', F.dec(x.cur, 1)) + C.tipRow('', 'Boards live', x.boards) + `<div class="tip-sub">${esc(r.label)}</div>`; },
      boards: S.boards, boardLive: b => r.ooh.rows.find(x => x.id === b.id).live > 0, boardTip: boardTip(r),
    }));
    h.querySelector('.ml').innerHTML = mapLegendHtml(c, res.lo, res.hi, F.signPct(res.lo, 0), F.signPct(res.hi, 0), 'Lift in sessions vs June');
    C.table(h.querySelector('.t'), {
      rows, sort: { key: 'lift', dir: -1 }, compact: 1, columns: [
        { key: 'key', label: 'County' }, { key: 'base', label: 'June', num: 1, fmt: v => F.dec(v, 1) }, { key: 'cur', label: 'This period', num: 1, fmt: v => F.dec(v, 1) },
        { key: 'lift', label: 'Lift', num: 1, fmt: v => F.signPct(v) }, { key: 'perHH', label: 'CTV per 1K homes', num: 1, fmt: F.int }, { key: 'boards', label: 'Boards', num: 1, fmt: F.int }],
    });
  };

  B.nextSteps = (h, r, o) => {
    card(h, 'What we’d do next', r.label, `<ol class="steps">${nextSteps(r).map(s => `<li><b>${esc(s.t)}</b><span>${esc(s.b)}</span></li>`).join('')}</ol>`, o);
  };

  // ------------------------------------------------------------------ layouts
  const blk = (name, cls, o) => `<section class="card ${cls || ''}" data-b="${name}"${o ? ` data-o='${JSON.stringify(o)}'` : ''}></section>`;
  const div = (name, cls, o) => `<div class="${cls || ''}" data-b="${name}"${o ? ` data-o='${JSON.stringify(o)}'` : ''}></div>`;
  const TABS = {
    overview: () => div('answer', 'answer-host') + div('kpisOverview', 'kpi-host') + `<div class="grid">
      ${blk('mapOverview', 'span-7')}<div class="span-5 stack">${blk('highlights')}${blk('channelMix')}</div>
      ${blk('spendWeekly', 'span-6')}${blk('resultsMini', 'span-6')}</div>`,
    ctv: () => div('kpisCtv', 'kpi-host', { cols: 4 }) + `<div class="grid">
      ${blk('ctvTrend', 'span-6')}${blk('ctvVisits', 'span-6')}
      ${blk('ctvApps', 'span-8')}<div class="span-4 stack">${blk('ctvFunnel')}${blk('ctvDevices')}</div>
      ${blk('ctvHeat', 'span-7')}${blk('lift', 'span-5')}
      ${blk('ctvCreatives', 'span-6')}${blk('ctvCounties', 'span-6')}</div>`,
    ooh: () => div('kpisOoh', 'kpi-host') + `<div class="grid">
      ${blk('oohMap', 'span-12')}
      ${blk('oohBoards', 'span-12')}
      ${blk('oohTrend', 'span-6')}${blk('oohCreative', 'span-6')}
      ${blk('oohProof', 'span-6')}${blk('storms', 'span-6')}</div>`,
    results: () => div('kpisResults', 'kpi-host') + `<div class="grid">
      ${blk('resSessions', 'span-12')}
      ${blk('resBranded', 'span-6')}${blk('resCalls', 'span-6')}
      ${blk('resCounties', 'span-7')}${blk('storms', 'span-5')}
      ${blk('lift', 'span-12')}</div>`,
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
  const slideHead = (k) => `<div class="slide-top"><span class="st-logo"><img src="${LOGO}" alt=""></span><span class="st-brand">Saint Paul Agency</span><span class="st-kicker">${esc(k)}</span><span class="pill sample">Sample data</span></div>`;
  function slideDefs(r) {
    const live = r.ooh.live;
    return [
      { cls: 'title', html: `<div class="title-wrap"><span class="t-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div><div class="t-eyebrow">Media performance review</div><h2>Clean Response</h2><div class="t-sub">Streaming TV (Floyd CTV) + billboards · Twin Cities</div><div class="t-period">${esc(r.label)}</div><div class="t-by">Prepared by Saint Paul Agency</div></div></div><span class="pill sample t-pill">Sample data · for illustration</span>` },
      { k: 'Summary', title: 'The headline', body: div('answer', '', { slide: 1 }) + div('kpisOverview', 'kpi-host', { n: 4, noSpark: 1, cols: 4 }) },
      { k: 'Investment', title: 'Where the budget went', body: `<div class="cols-2">${div('spendWeekly', 'panel', { bare: 1, h: 380 })}${div('channelMix', 'panel', { bare: 1 })}</div>` },
      { k: 'CTV · Floyd', title: 'Streaming TV delivery', body: div('kpisCtv', 'kpi-host', { n: 8, noSpark: 1, cols: 4 }) },
      { k: 'CTV · Floyd', title: 'Almost everyone watched to the end', body: `<div class="cols-2">${div('ctvFunnel', 'panel', { bare: 1 })}${div('ctvDevices', 'panel', { bare: 1, limit: 5 })}</div>` },
      { k: 'CTV · Floyd', title: 'Where the TV ad ran', body: `<div class="cols-2">${div('ctvAppsBars', 'panel', { bare: 1, limit: 7 })}${div('highlights', 'panel', { bare: 1, n: 3 })}</div>` },
      { k: 'CTV · Floyd', title: 'When the TV ad ran', body: div('ctvHeat', 'panel wide', { bare: 1 }) + `<p class="slide-note">Prime time (7–11 PM) carried ${F.pct(primeShare(r), 0)} of impressions (${esc(r.label)}).</p>` },
      { k: 'Billboards', title: `${live} board${live === 1 ? '' : 's'} across the metro`, body: `<div class="cols-map">${div('oohMap', 'panel', { bare: 1, mh: 440, noPanel: 1 })}${div('oohBoardsBars', 'panel', { bare: 1 })}</div>`, cls: 'map-slide' },
      { k: 'Billboards', title: 'Proof of performance', body: div('oohBoards', 'panel', { bare: 1, compact: 1 }) + `<p class="slide-note">${F.pct(r.ooh.delivery)} of contracted digital plays delivered, logged play by play (${esc(r.label)}).</p>` },
      { k: 'Weather triggers', title: 'When storms hit, we turn up', body: `<div class="cols-2">${div('storms', 'panel', { bare: 1 })}${div('oohCreative', 'panel', { bare: 1 })}</div>` },
      { k: 'Results', title: 'What it did for the business', body: div('kpisResults', 'kpi-host', { n: 3, noSpark: 1, cols: 3 }) + div('resSessions', 'panel', { bare: 1, h: 250 }) },
      { k: 'Results', title: 'TV viewers visited more', body: div('lift', 'panel', { bare: 1 }) },
      { k: 'Next', title: 'What we’d do next', body: div('nextSteps', 'panel', { bare: 1 }) },
      { cls: 'end', html: `<div class="title-wrap"><span class="t-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div><h2>Thank you</h2><div class="t-sub">Questions, or want this report shaped differently? Any view, any cadence.</div><div class="t-by">Saint Paul Agency · saintpaulagency.com</div></div></div><span class="pill sample t-pill">Sample data · for illustration</span>` },
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
    const sheet = (n, title, body) => `<article class="sheet">${head}${title ? `<h2 class="sheet-title">${esc(title)}</h2>` : ''}<div class="sheet-body">${body}</div>${foot(n)}</article>`;
    return [
      `<article class="sheet cover"><div class="cover-in"><span class="c-logo"><img src="${LOGO}" alt="Saint Paul Agency"></span><div class="c-eyebrow">Media performance report</div><h1>Clean Response</h1><div class="c-sub">Streaming TV (Floyd CTV) + billboards · Twin Cities metro</div><div class="c-period">${esc(r.label)}</div><div class="c-by">Prepared by Saint Paul Agency · ${esc(fmtDay(FE + 0, true))} data</div><span class="pill sample">Sample data · for illustration</span></div></article>`,
      sheet(2, 'Summary', div('answer', 'answer-host') + div('kpisOverview', 'kpi-host', { cols: 3, noSpark: 1 }) + `<div class="r-cols">${div('highlights', 'rcard', { n: 4 })}${div('channelMix', 'rcard')}</div>`),
      sheet(3, 'Streaming TV · Floyd CTV', div('kpisCtv', 'kpi-host', { cols: 4, noSpark: 1 }) + div('ctvTrend', 'rcard', { h: 150 }) + `<div class="r-cols">${div('ctvFunnel', 'rcard')}${div('ctvDevices', 'rcard', { limit: 5 })}</div>`),
      sheet(4, 'Streaming TV · where and when', div('ctvApps', 'rcard', { compact: 1 }) + div('ctvHeat', 'rcard', { bare: 0 })),
      sheet(5, 'Streaming TV · spots, counties and lift', div('ctvCreatives', 'rcard', { compact: 1 }) + div('ctvCounties', 'rcard', { compact: 1 }) + div('lift', 'rcard')),
      sheet(6, 'Billboards', div('kpisOoh', 'kpi-host', { cols: 3, noSpark: 1 }) + div('oohMap', 'rcard', { noPanel: 1, mh: 470 })),
      sheet(7, 'Billboards · board by board', div('oohBoards', 'rcard', { compact: 1 }) + div('oohProof', 'rcard')),
      sheet(8, 'Billboards · creative and weather triggers', div('oohTrend', 'rcard', { h: 150 }) + div('oohCreative', 'rcard') + div('storms', 'rcard')),
      sheet(9, 'Results', div('kpisResults', 'kpi-host', { cols: 3, noSpark: 1 }) + div('resSessions', 'rcard', { h: 150 }) + `<div class="r-cols">${div('resBranded', 'rcard', { h: 140 })}${div('resCalls', 'rcard', { h: 140 })}</div>`),
      sheet(10, 'Results · lift by county', div('resCounties', 'rcard', { mh: 380 })),
      sheet(11, 'Next steps and definitions', div('nextSteps', 'rcard') + `<section class="rcard"><div class="card-h"><h3>Definitions</h3></div>${glossaryHtml()}</section>`),
    ].join('');
  }
  function glossaryHtml() {
    return `<dl class="gloss">
      <dt>CTV (connected TV)</dt><dd>TV ads shown in streaming apps (Hulu, Roku, Pluto TV and more) on the living-room screen. Bought programmatically through Floyd.</dd>
      <dt>Impressions</dt><dd>CTV: an ad that started playing. Billboards: audited audience estimates for adults 18+ who pass the board (Geopath).</dd>
      <dt>CPM</dt><dd>Cost per 1,000 impressions. Blended CPM combines CTV and billboards.</dd>
      <dt>Completion rate</dt><dd>Share of CTV ads watched to the last second.</dd>
      <dt>Households reached</dt><dd>Different homes that saw the CTV ad at least once in the period. Frequency is impressions per household.</dd>
      <dt>Site visits from viewers</dt><dd>Website visits within 30 days from homes that saw the CTV ad, matched by household IP.</dd>
      <dt>Plays</dt><dd>Times the ad showed on a digital board. Our spot is 8 seconds in a 64-second loop, 1,350 plays a day per board.</dd>
      <dt>Weather trigger</dt><dd>A severe-weather alert for the metro that raises CTV budgets and switches digital boards to the storm message for 48 hours.</dd>
      <dt>June baseline</dt><dd>Daily averages for June 1–30, 2026, before any CTV or billboards ran.</dd></dl>`;
  }
  function renderReport() {
    const host = document.getElementById('sheets');
    host.innerHTML = reportHtml(R());
    mount(host);
    fitSheets();
  }
  let printing = false;
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
  const DATASETS = [
    { file: 'ctv_daily.csv', title: 'Floyd CTV · daily totals', desc: 'Spend, impressions, video quartiles, completed views, site visits, leads, weather-trigger flag.', head: ['date', 'spend_usd', 'impressions', 'video_25pct', 'video_50pct', 'video_75pct', 'completed_views', 'site_visits', 'leads', 'weather_trigger'], rows: (a, b) => rng(a, b).map(i => [D[i], (S.ctv.spend[i] / 100).toFixed(2), S.ctv.imps[i], S.ctv.q25[i], S.ctv.q50[i], S.ctv.q75[i], S.ctv.completes[i], S.ctv.visits[i], S.ctv.leads[i], S.trigger[i]]) },
    ...[['app', 'ctv_by_app.csv', 'Floyd CTV · by app'], ['device', 'ctv_by_device.csv', 'Floyd CTV · by device'], ['creative', 'ctv_by_creative.csv', 'Floyd CTV · by TV spot'], ['county', 'ctv_by_county.csv', 'Floyd CTV · by county']].map(([k, f, t]) => ({
      file: f, title: t, desc: 'Daily spend, impressions, completed views and site visits.', head: ['date', k, 'spend_usd', 'impressions', 'completed_views', 'site_visits'],
      rows: (a, b) => { const bl = S.ctv_dims[k], out = []; rng(a, b).forEach(i => bl.keys.forEach((key, j) => { if (bl.imps[i][j]) out.push([D[i], key, (bl.spend[i][j] / 100).toFixed(2), bl.imps[i][j], bl.completes[i][j], bl.visits[i][j]]); })); return out; },
    })),
    { file: 'ctv_by_hour.csv', title: 'Floyd CTV · by hour', desc: 'Impressions by day and hour, Central time.', head: ['date', 'hour_central', 'impressions'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.ctv_hours[i].forEach((v, k) => out.push([D[i], k, v]))); return out; } },
    { file: 'billboards.csv', title: 'Billboards · inventory', desc: 'Every board: location, facing, format, flight, weekly impressions, cost and contracted plays.', fixed: 1, head: ['board_id', 'location', 'city', 'county', 'facing', 'type', 'size', 'flight_start', 'flight_end', 'weekly_impressions_18plus', 'cost_per_4_weeks_usd', 'contracted_plays_per_day'], rows: () => S.boards.map(b => [b.id, b.name, b.city, b.county, b.facing, b.type, b.size, b.start, b.end, b.weekly, b.cost4w, b.contract_plays_day]) },
    { file: 'billboard_daily.csv', title: 'Billboards · daily by board', desc: 'Impressions, digital plays and cost per board per day.', head: ['date', 'board_id', 'impressions', 'plays', 'cost_usd'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.boards.forEach((bd, k) => { if (S.board_daily.imps[i][k]) out.push([D[i], bd.id, S.board_daily.imps[i][k], S.board_daily.plays[i][k], (S.board_daily.spend[i][k] / 100).toFixed(2)]); })); return out; } },
    { file: 'billboard_creative_daily.csv', title: 'Billboards · digital creative plays', desc: 'Plays by creative per day across the digital boards.', head: ['date', 'creative', 'plays'], rows: (a, b) => { const out = []; rng(a, b).forEach(i => S.dooh_creative.keys.forEach((k, j) => { if (S.dooh_creative.plays[i][j]) out.push([D[i], k, S.dooh_creative.plays[i][j]]); })); return out; } },
    { file: 'results_daily.csv', title: 'Results · daily', desc: 'Metro website sessions, branded searches, inbound calls, billboard-line calls. Includes the June baseline.', base: 1, head: ['date', 'metro_site_sessions', 'branded_searches', 'inbound_calls', 'billboard_line_calls', 'paid_media_live'], rows: (a, b) => rng(a, b).map(i => [D[i], S.halo.sessions[i], S.halo.branded[i], S.halo.calls[i], S.halo.board_calls[i], i >= FS ? 1 : 0]) },
  ];
  function rng(a, b) { const o = []; for (let i = a; i <= b; i++) o.push(i); return o; }
  function summaryText(r) {
    return `Clean Response: CTV + billboard summary (${r.label})\n` +
      `• Investment: ${F.usd(r.spend)} (CTV ${F.usd(r.ctv.spend)} · Billboards ${F.usd(r.ooh.spend)})\n` +
      `• Impressions: ${F.compact(r.imps)} (CTV ${F.compact(r.ctv.imps)} · Billboards ${F.compact(r.ooh.imps)}), blended CPM ${F.usd2(r.cpm)}\n` +
      `• CTV: ${F.pct(r.ctv.vcr)} watched to the end, ${F.compact(r.ctv.reach)} households reached, ${F.dec(r.ctv.freq, 1)} views per household\n` +
      `• Billboards: ${r.ooh.live} boards, ${F.pct(r.ooh.delivery)} of contracted digital plays delivered\n` +
      `• Results: website sessions ${F.signPct(r.halo.sessionsLift, 0)} vs June baseline; ${F.int(r.ooh.calls)} billboard-line calls; ${F.int(r.ctv.leads)} CTV leads\n` +
      `(Sample data for illustration.)`;
  }
  function renderData() {
    const r = R(), host = document.getElementById('dataBody');
    host.innerHTML = `
      <section class="card span-12"><div class="card-h"><h3>Copy a summary</h3><p class="card-sub">${esc(r.label)} · ready to paste into an email</p></div>
        <pre class="summary" id="summaryText">${esc(summaryText(r))}</pre><button class="btn" id="copySummary">Copy summary</button></section>
      <section class="card span-12"><div class="card-h"><h3>Download the data</h3><p class="card-sub">Every chart on this page comes from these files. Full files cover ${esc(period(FS, FE))} (results also include June 1–30 for the baseline).</p></div>
        <div class="ds-list">${DATASETS.map((d, k) => {
          const a = d.base ? Math.min(r.i0, r.i0) : r.i0;
          const n = d.rows(a, r.i1).length;
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
      pv.innerHTML = `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${d.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(x => `<tr>${x.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="note">First ${rows.length} rows · ${esc(r.label)}</p>`;
      pv.hidden = false; b.setAttribute('aria-expanded', 'true');
    }));
    document.getElementById('copySummary').addEventListener('click', ev => {
      const txt = summaryText(r);
      const done = () => { ev.target.textContent = 'Copied'; setTimeout(() => { ev.target.textContent = 'Copy summary'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, () => selectPre());
      else selectPre();
      function selectPre() { const sel = window.getSelection(), rgn = document.createRange(); rgn.selectNodeContents(document.getElementById('summaryText')); sel.removeAllRanges(); sel.addRange(rgn); }
    });
  }

  // ------------------------------------------------------------------ render + controls
  function renderFilters() {
    const r = R();
    document.getElementById('presets').innerHTML = PRESETS.map(p => `<button class="chip${state.preset === p.key ? ' on' : ''}" data-p="${p.key}" aria-pressed="${state.preset === p.key}">${esc(p.label)}</button>`).join('') +
'';
    document.getElementById('dFrom').value = D[state.i0]; document.getElementById('dTo').value = D[state.i1];
    document.getElementById('periodText').innerHTML = `<b>${esc(r.label)}</b> · ${r.len} day${r.len === 1 ? '' : 's'}${r.prev ? ` · compared with ${esc(r.prev.label)}` : ''}`;
    const g = grainOf(r);
    document.querySelectorAll('#grain button').forEach(b => { const on = b.dataset.g === g; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.getElementById('grainWrap').hidden = !(state.view === 'dashboard' && state.tab !== 'ooh-x');
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
  function setCustom(a, b) {
    a = Math.max(FS, Math.min(FE, a)); b = Math.max(FS, Math.min(FE, b));
    if (a > b) [a, b] = [b, a];
    state.preset = 'custom'; state.i0 = a; state.i1 = b;
  }

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
    document.getElementById('prevSlide').addEventListener('click', () => { state.slide--; renderSlide(); writeHash(); });
    document.getElementById('nextSlide').addEventListener('click', () => { state.slide++; renderSlide(); writeHash(); });
    document.getElementById('slideList').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (!b) return; state.slide = +b.dataset.k; renderSlide(); writeHash(); });
    document.getElementById('fsBtn').addEventListener('click', () => {
      const vp = document.getElementById('deckViewport');
      if (document.fullscreenElement) document.exitFullscreen(); else if (vp.requestFullscreen) vp.requestFullscreen().catch(() => {});
    });
    document.getElementById('deckViewport').addEventListener('click', e => {
      if (e.target.closest('.overlay, .board, .county, .hb-row, th, button, a, .heat-cell')) return;
      const r = e.currentTarget.getBoundingClientRect();
      state.slide += (e.clientX - r.left) > r.width / 3 ? 1 : -1; renderSlide(); writeHash();
    });
    document.addEventListener('fullscreenchange', () => setTimeout(fitStage, 50));
    document.addEventListener('keydown', e => {
      if (state.view !== 'slides' || e.target.closest('input, select, textarea')) return;
      if (['ArrowRight', 'PageDown', ' '].includes(e.key) && !e.target.closest('.overlay')) { state.slide++; renderSlide(); writeHash(); e.preventDefault(); }
      else if (['ArrowLeft', 'PageUp'].includes(e.key) && !e.target.closest('.overlay')) { state.slide--; renderSlide(); writeHash(); e.preventDefault(); }
      else if (e.key === 'Home') { state.slide = 0; renderSlide(); writeHash(); }
      else if (e.key === 'End') { state.slide = 99; renderSlide(); writeHash(); }
      else if (e.key === 'f' || e.key === 'F') document.getElementById('fsBtn').click();
    });
    document.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-board]');
      if (tr && state.view === 'dashboard' && state.tab === 'ooh') { state.board = tr.dataset.board; const m = document.querySelector('[data-b="oohMap"]'); if (m) { scopeEl = m; B.oohMap(m, R(), {}); m.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    });
    document.addEventListener('pointerdown', e => { if (!e.target.closest('svg, .hb-row, .heat-cell, #tip')) C.tip.hide(); });
    let rz;
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
      document.getElementById('sheets').style.zoom = '';
      if (state.view !== 'report') { prevView = state.view; document.getElementById('view-report').hidden = false; }
      renderReport();
    });
    window.addEventListener('afterprint', () => {
      printing = false;
      if (prevView) { document.getElementById('view-report').hidden = true; prevView = null; } else fitSheets();
    });
  }
  let lastW = 0;

  // ------------------------------------------------------------------ go
  readHash();
  wire();
  render();
  lastW = document.getElementById('tabBody').clientWidth;
  window.__report = { state, ctxFor, render, R, F };
})();
