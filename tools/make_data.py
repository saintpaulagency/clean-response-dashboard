"""Generate the Clean Response SAMPLE dataset (all numbers are made up).

Writes:
  site/assets/js/data.js   window.SAMPLE = {...}  (what the dashboard reads)
  site/data/*.csv          the same data as plain CSV files for download

Deterministic: same seed -> same numbers on every run.
"""
import csv, json, math, os, random, subprocess, sys
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))   # repo root
rng = random.Random(20261112)

BASE_START = date(2026, 6, 1)     # results baseline (no paid media running)
FLIGHT_START = date(2026, 7, 1)
FLIGHT_END = date(2026, 10, 31)
DAYS = [BASE_START + timedelta(d) for d in range((FLIGHT_END - BASE_START).days + 1)]
N = len(DAYS)
IDX = {d: i for i, d in enumerate(DAYS)}
LIVE = [d >= FLIGHT_START for d in DAYS]

# Severe-weather triggers (sample). Trigger window = storm day + the next day.
STORMS = [date(2026, 6, 17), date(2026, 7, 14), date(2026, 7, 28), date(2026, 8, 11),
          date(2026, 8, 26), date(2026, 9, 9), date(2026, 9, 24), date(2026, 10, 14)]
TRIG = [False] * N
for s in STORMS:
    for k in (0, 1):
        if s + timedelta(k) in IDX:
            TRIG[IDX[s + timedelta(k)]] = True


def alloc(total, weights):
    """Split an integer total by weights; parts always add back to total."""
    s = sum(weights)
    if total <= 0 or s <= 0:
        return [0] * len(weights)
    raw = [total * w / s for w in weights]
    out = [int(math.floor(x)) for x in raw]
    rest = total - sum(out)
    order = sorted(range(len(raw)), key=lambda i: raw[i] - out[i], reverse=True)
    for i in order[:rest]:
        out[i] += 1
    return out


def poisson(lam):
    if lam <= 0:
        return 0
    if lam > 30:
        return max(0, int(round(rng.gauss(lam, math.sqrt(lam)))))
    L, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= L:
            return k
        k += 1


def jitter(sd):
    return 1 + rng.gauss(0, sd)

# ---------------------------------------------------------------- CTV (Floyd)
MONTH_BUDGET = {7: 355, 8: 368, 9: 380, 10: 392}        # $ per day
MONTH_CPM = {7: 30.9, 8: 31.4, 9: 32.2, 10: 35.1}       # Oct: election-season demand
ctv = {k: [0] * N for k in ('spend', 'imps', 'q25', 'q50', 'q75', 'completes', 'visits', 'leads')}
for i, d in enumerate(DAYS):
    if not LIVE[i]:
        continue
    spend = MONTH_BUDGET[d.month] * jitter(0.05) * (1.38 if TRIG[i] else 1.0)
    cents = int(round(spend * 100))
    cpm = MONTH_CPM[d.month] * jitter(0.025) * (1.04 if TRIG[i] else 1.0)
    imps = int(round(cents / 100 / cpm * 1000))
    vcr = min(0.985, 0.962 + rng.gauss(0, 0.005))
    ctv['spend'][i] = cents
    ctv['imps'][i] = imps
    ctv['q25'][i] = int(round(imps * (0.989 + rng.gauss(0, 0.002))))
    ctv['q50'][i] = int(round(imps * (0.980 + rng.gauss(0, 0.002))))
    ctv['q75'][i] = int(round(imps * (0.972 + rng.gauss(0, 0.002))))
    ctv['completes'][i] = min(ctv['q75'][i], int(round(imps * vcr)))
    ramp = min(1.0, 0.55 + 0.45 * (i - IDX[FLIGHT_START]) / 21)   # visits build as frequency builds
    vrate = 0.00235 * ramp * (1.85 if TRIG[i] else 1.0)
    ctv['visits'][i] = poisson(imps * vrate)
    ctv['leads'][i] = poisson(ctv['visits'][i] * 0.034)

# Dimensions: (key, imps weight, cpm factor, vcr factor, visit factor)
APPS = [('Hulu', .165, 1.18, 1.020, 1.10), ('Pluto TV', .118, 0.86, 0.975, 0.92),
        ('The Roku Channel', .112, 0.90, 0.990, 1.00), ('Samsung TV Plus', .094, 0.85, 0.980, 0.95),
        ('Tubi', .090, 0.84, 0.970, 0.90), ('Sling TV', .078, 1.02, 1.005, 1.04),
        ('Peacock', .071, 1.15, 1.015, 1.12), ('Fox Sports', .058, 1.10, 1.010, 1.18),
        ('ESPN', .052, 1.20, 1.012, 1.15), ('Discovery+', .046, 1.05, 1.008, 1.06),
        ('Paramount+', .041, 1.08, 1.010, 1.02), ('Other apps (300+)', .075, 0.80, 0.960, 0.85)]
DEVICES = [('Smart TV (Samsung, LG, Vizio)', .355, 1.0, 1.0, 1.0), ('Roku', .268, 1.0, 1.0, 1.02),
           ('Amazon Fire TV', .188, 1.0, 1.0, 0.98), ('Apple TV', .072, 1.05, 1.01, 1.10),
           ('Google TV / Chromecast', .064, 1.0, 1.0, 1.0), ('Game console', .053, 0.95, 0.98, 0.80)]
CREATIVES = ['Water Damage — 1-Hour Response (:30)', 'Fire & Smoke Restoration (:30)',
             'Commercial & Multi-Family (:30)', 'Storm Damage — weather-triggered (:15)']
CRE_NORMAL = [.42, .30, .28, 0]
CRE_TRIG = [.25, .13, .12, .50]
CRE_F = [(1.0, 1.0, 1.0), (1.0, 1.0, 0.92), (1.02, 1.0, 0.78), (0.97, 1.012, 1.55)]
COUNTIES = [('Hennepin', 532000, .405, 0.98), ('Ramsey', 216000, .168, 1.02), ('Dakota', 171000, .142, 1.10),
            ('Anoka', 136000, .108, 0.97), ('Washington', 104000, .090, 1.06), ('Scott', 55000, .050, 1.00),
            ('Carver', 41000, .037, 0.95)]


def split_dim(rows_w, i, cpmf, vcrf, visf):
    imps = alloc(ctv['imps'][i], rows_w)
    spend = alloc(ctv['spend'][i], [imps[k] * cpmf[k] for k in range(len(imps))])
    comp = alloc(ctv['completes'][i], [imps[k] * vcrf[k] for k in range(len(imps))])
    vis = alloc(ctv['visits'][i], [imps[k] * visf[k] for k in range(len(imps))])
    return imps, spend, comp, vis


def dim_block(keys):
    return {'keys': keys, 'imps': [], 'spend': [], 'completes': [], 'visits': []}

app_d = dim_block([a[0] for a in APPS])
dev_d = dim_block([a[0] for a in DEVICES])
cre_d = dim_block(CREATIVES)
cty_d = dim_block([c[0] for c in COUNTIES])
for i in range(N):
    for blk, w, f in ((app_d, [a[1] * jitter(.04) for a in APPS], APPS),
                      (dev_d, [a[1] * jitter(.03) for a in DEVICES], DEVICES)):
        r = split_dim(w, i, [x[2] for x in f], [x[3] for x in f], [x[4] for x in f])
        for k, v in zip(('imps', 'spend', 'completes', 'visits'), r):
            blk[k].append(v)
    cw = [w * jitter(.03) for w in (CRE_TRIG if TRIG[i] else CRE_NORMAL)]
    r = split_dim(cw, i, [x[0] for x in CRE_F], [x[1] for x in CRE_F], [x[2] for x in CRE_F])
    for k, v in zip(('imps', 'spend', 'completes', 'visits'), r):
        cre_d[k].append(v)
    r = split_dim([c[2] * jitter(.03) for c in COUNTIES], i, [1] * 7, [1] * 7, [c[3] for c in COUNTIES])
    for k, v in zip(('imps', 'spend', 'completes', 'visits'), r):
        cty_d[k].append(v)

# Hour of day (Central). CTV viewing peaks in prime time.
HOUR_W = [1.6, 1.0, .6, .4, .35, .45, .9, 1.6, 2.0, 2.2, 2.4, 2.6, 2.9, 3.0, 3.0, 3.2, 3.6, 4.4,
          5.6, 7.0, 7.6, 7.0, 5.2, 3.0]
WEEKEND_W = [2.0, 1.3, .8, .5, .4, .4, .7, 1.2, 2.0, 2.9, 3.4, 3.6, 3.8, 3.9, 3.9, 4.0, 4.2, 4.8,
             5.6, 6.6, 7.0, 6.6, 5.0, 3.2]
hours = []
for i, d in enumerate(DAYS):
    w = WEEKEND_W if d.weekday() >= 5 else HOUR_W
    hours.append(alloc(ctv['imps'][i], [x * jitter(.05) for x in w]))

# ---------------------------------------------------------------- Billboards
# weekly = Geopath-style 18+ impressions per week for our share of the face.
BOARDS = [
    dict(id='CR-D01', name='I-94 at Snelling Ave', city='St. Paul', county='Ramsey', facing='Eastbound', type='Digital bulletin', size="14' x 48'", lat=44.9560, lon=-93.1670, weekly=52000, cost4w=2600, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-D02', name='I-35E at Diffley Rd', city='Eagan', county='Dakota', facing='Northbound', type='Digital bulletin', size="10' x 30'", lat=44.8100, lon=-93.1530, weekly=38000, cost4w=2100, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-D03', name='I-494 at France Ave', city='Bloomington', county='Hennepin', facing='Westbound', type='Digital bulletin', size="14' x 48'", lat=44.8605, lon=-93.3290, weekly=61000, cost4w=2900, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-D04', name='I-694 at Hwy 10', city='Arden Hills', county='Ramsey', facing='Eastbound', type='Digital bulletin', size="14' x 48'", lat=45.0730, lon=-93.1640, weekly=44000, cost4w=2300, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-D05', name='I-94 at Hwy 101', city='Rogers', county='Hennepin', facing='Westbound', type='Digital bulletin', size="10' x 30'", lat=45.1880, lon=-93.5560, weekly=33000, cost4w=1900, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-S01', name='I-35W at Hwy 13', city='Burnsville', county='Dakota', facing='Northbound', type='Static bulletin', size="14' x 48'", lat=44.7900, lon=-93.2770, weekly=128000, cost4w=3400, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-S02', name='Hwy 169 at I-494', city='Eden Prairie', county='Hennepin', facing='Southbound', type='Static bulletin', size="14' x 48'", lat=44.8590, lon=-93.4040, weekly=112000, cost4w=3100, start='2026-07-01', end='2026-10-31'),
    dict(id='CR-S03', name='I-94 at Radio Dr', city='Woodbury', county='Washington', facing='Eastbound', type='Static bulletin', size="14' x 48'", lat=44.9450, lon=-92.9320, weekly=96000, cost4w=2900, start='2026-09-01', end='2026-10-31'),
]
PLAYS_DAY = 1350  # 8-second spot in a 64-second loop, 24 hours (1 of 8)
OUTAGES = {('CR-D04', date(2026, 8, 19)): 0.75, ('CR-D02', date(2026, 10, 3)): 0.88}
MAKEGOOD = {('CR-D04', date(2026, 8, 20)): 340, ('CR-D02', date(2026, 10, 4)): 165}
DOW = [1.06, 1.05, 1.05, 1.06, 1.08, 0.90, 0.80]
SEASON = {6: 1.0, 7: 1.03, 8: 1.02, 9: 0.99, 10: 0.97}
b_imps = [[0] * len(BOARDS) for _ in range(N)]
b_plays = [[0] * len(BOARDS) for _ in range(N)]
b_spend = [[0] * len(BOARDS) for _ in range(N)]
for bi, b in enumerate(BOARDS):
    s, e = date.fromisoformat(b['start']), date.fromisoformat(b['end'])
    b['contract_plays_day'] = PLAYS_DAY if b['type'].startswith('Digital') else 0
    for i, d in enumerate(DAYS):
        if not (s <= d <= e):
            continue
        b_spend[i][bi] = int(round(b['cost4w'] * 100 / 28))
        imp = b['weekly'] / 7 * DOW[d.weekday()] * SEASON[d.month] * jitter(0.03)
        if b['contract_plays_day']:
            f = OUTAGES.get((b['id'], d), 1.0)
            plays = int(round(PLAYS_DAY * f * (1 + rng.uniform(-0.004, 0.009))))
            plays += MAKEGOOD.get((b['id'], d), 0)
            b_plays[i][bi] = plays
            imp *= plays / PLAYS_DAY
        b_imps[i][bi] = int(round(imp))

DOOH_CRE = ['Water Damage? There in 1 Hour', 'Fire & Smoke Restoration', 'Commercial & Multi-Family',
            'Storm Damage? Call Now (weather-triggered)']
dooh_plays = []
for i in range(N):
    tot = sum(b_plays[i])
    w = [.20, .10, .0, .70] if TRIG[i] else [.50, .30, .20, 0]
    dooh_plays.append(alloc(tot, w))

# ---------------------------------------------------------------- Results (halo)
# Sessions from the Twin Cities metro (all sources), branded searches, inbound calls.
halo = {k: [0] * N for k in ('sessions', 'branded', 'calls', 'board_calls')}
cty_sessions = []
for i, d in enumerate(DAYS):
    t = (i - IDX[FLIGHT_START]) if LIVE[i] else -1
    ramp = 0 if t < 0 else min(1.0, (t + 1) / 18)
    boards_live = sum(1 for bi in range(len(BOARDS)) if b_imps[i][bi] > 0)
    wk = 0.93 if d.weekday() >= 5 else 1.02
    storm = TRIG[i]
    lift_s = 1 + ramp * (0.135 + 0.010 * boards_live)
    sess = 312 * wk * lift_s * (1.55 if storm else 1) * jitter(0.06)
    halo['sessions'][i] = int(round(sess))
    br = 37 * wk * (1 + ramp * (0.21 + 0.017 * boards_live)) * (1.7 if storm else 1) * jitter(0.09)
    halo['branded'][i] = int(round(br))
    halo['calls'][i] = poisson(21.5 * wk * (1 + ramp * 0.16) * (2.1 if storm else 1))
    halo['board_calls'][i] = poisson((0.13 * boards_live) * (2.6 if storm else 1)) if LIVE[i] else 0
    # sessions by county: lift is stronger where more CTV + boards run
    cw = []
    for name, hh, share, vis in COUNTIES:
        nb = sum(1 for bi, b in enumerate(BOARDS) if b['county'] == name and b_imps[i][bi] > 0)
        cw.append(hh * (1 + ramp * (0.10 + 0.05 * nb + 0.35 * (vis - 1))))
    cty_sessions.append(alloc(halo['sessions'][i], cw))

# Lift study (sample): exposed households vs a matched holdout that saw no CTV ad.
lift = dict(period=[FLIGHT_START.isoformat(), FLIGHT_END.isoformat()], exposed_hh=0, exposed_visit_hh=0,
            control_hh=48000, control_visit_hh=0)

# ---------------------------------------------------------------- Geometry
pts = {b['id']: [b['lat'], b['lon']] for b in BOARDS}
CITIES = {'Minneapolis': (44.9778, -93.2650), 'St. Paul': (44.9537, -93.0900), 'Eagan': (44.8041, -93.1669),
          'Bloomington': (44.8408, -93.2983), 'Maple Grove': (45.0725, -93.4558), 'Woodbury': (44.9239, -92.9594),
          'Blaine': (45.1608, -93.2349), 'Lakeville': (44.6497, -93.2427), 'Shakopee': (44.7974, -93.5273),
          'Stillwater': (45.0564, -92.8060), 'Chaska': (44.7894, -93.6022), 'Coon Rapids': (45.1200, -93.3030)}
for k, v in CITIES.items():
    pts['city:' + k] = list(v)
tmp_in, tmp_out = '/tmp/cr_pts.json', '/tmp/cr_geo.json'
json.dump(pts, open(tmp_in, 'w'))
subprocess.run(['node', os.path.join(HERE, 'geo.mjs'), tmp_in, tmp_out], check=True)
geo = json.load(open(tmp_out))
for b in BOARDS:
    b['x'], b['y'] = geo['points'][b['id']]
geo['cities'] = [{'name': k, 'x': geo['points']['city:' + k][0], 'y': geo['points']['city:' + k][1]} for k in CITIES]
del geo['points']
hh_by = {c[0]: c[1] for c in COUNTIES}
for c in geo['counties']:
    c['hh'] = hh_by[c['name']]

# ---------------------------------------------------------------- Write
SAMPLE = {
    'meta': {
        'client': 'Clean Response', 'agency': 'Saint Paul Agency', 'sample': True,
        'baseline_start': BASE_START.isoformat(), 'flight_start': FLIGHT_START.isoformat(),
        'flight_end': FLIGHT_END.isoformat(), 'market': 'Twin Cities metro (7 counties)',
        'storms': [s.isoformat() for s in STORMS],
        'events': [
            {'date': '2026-07-01', 'label': 'Campaign launch', 'kind': 'ours'},
            {'date': '2026-09-01', 'label': 'Woodbury board added', 'kind': 'ours'},
            {'date': '2026-10-01', 'label': 'Election-season CTV demand', 'kind': 'market'},
        ],
        'outages': [{'board': k[0], 'date': k[1].isoformat(), 'delivered': v} for k, v in OUTAGES.items()],
        'makegoods': [{'board': k[0], 'date': k[1].isoformat(), 'plays': v} for k, v in MAKEGOOD.items()],
    },
    'dates': [d.isoformat() for d in DAYS],
    'trigger': [1 if t else 0 for t in TRIG],
    'ctv': ctv,
    'ctv_dims': {'app': app_d, 'device': dev_d, 'creative': cre_d, 'county': cty_d},
    'ctv_hours': hours,
    'boards': BOARDS,
    'board_daily': {'imps': b_imps, 'plays': b_plays, 'spend': b_spend},
    'dooh_creative': {'keys': DOOH_CRE, 'plays': dooh_plays},
    'halo': halo,
    'county_sessions': {'keys': [c[0] for c in COUNTIES], 'hh': [c[1] for c in COUNTIES], 'sessions': cty_sessions},
    'lift_model': {'universe_hh': 520000, 'min_freq': 1.3, 'control_hh': 48000, 'control_visit_rate': 0.0034},
    'geo': geo,
}
with open(os.path.join(SITE, 'assets', 'js', 'data.js'), 'w') as f:
    f.write('/* Clean Response — SAMPLE DATA. Every number in this file is made up for illustration. */\n')
    f.write('window.SAMPLE = ' + json.dumps(SAMPLE, separators=(',', ':')) + ';\n')

# CSVs (flight + baseline days)
D = os.path.join(SITE, 'data')


def wcsv(name, header, rows):
    with open(os.path.join(D, name), 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

live_idx = [i for i in range(N) if LIVE[i]]
wcsv('ctv_daily.csv', ['date', 'spend_usd', 'impressions', 'video_25pct', 'video_50pct', 'video_75pct',
                       'completed_views', 'site_visits', 'leads', 'weather_trigger'],
     [[DAYS[i].isoformat(), f"{ctv['spend'][i]/100:.2f}", ctv['imps'][i], ctv['q25'][i], ctv['q50'][i],
       ctv['q75'][i], ctv['completes'][i], ctv['visits'][i], ctv['leads'][i], int(TRIG[i])] for i in live_idx])
for name, blk, label in (('ctv_by_app.csv', app_d, 'app'), ('ctv_by_device.csv', dev_d, 'device'),
                         ('ctv_by_creative.csv', cre_d, 'creative'), ('ctv_by_county.csv', cty_d, 'county')):
    rows = []
    for i in live_idx:
        for k, key in enumerate(blk['keys']):
            if blk['imps'][i][k]:
                rows.append([DAYS[i].isoformat(), key, f"{blk['spend'][i][k]/100:.2f}", blk['imps'][i][k],
                             blk['completes'][i][k], blk['visits'][i][k]])
    wcsv(name, ['date', label, 'spend_usd', 'impressions', 'completed_views', 'site_visits'], rows)
wcsv('ctv_by_hour.csv', ['date', 'hour_central', 'impressions'],
     [[DAYS[i].isoformat(), h, hours[i][h]] for i in live_idx for h in range(24)])
wcsv('billboards.csv', ['board_id', 'location', 'city', 'county', 'facing', 'type', 'size', 'flight_start',
                        'flight_end', 'weekly_impressions_18plus', 'cost_per_4_weeks_usd', 'contracted_plays_per_day'],
     [[b['id'], b['name'], b['city'], b['county'], b['facing'], b['type'], b['size'], b['start'], b['end'],
       b['weekly'], b['cost4w'], b['contract_plays_day']] for b in BOARDS])
wcsv('billboard_daily.csv', ['date', 'board_id', 'impressions', 'plays', 'cost_usd'],
     [[DAYS[i].isoformat(), b['id'], b_imps[i][bi], b_plays[i][bi], f"{b_spend[i][bi]/100:.2f}"]
      for i in live_idx for bi, b in enumerate(BOARDS) if b_imps[i][bi]])
wcsv('billboard_creative_daily.csv', ['date', 'creative', 'plays'],
     [[DAYS[i].isoformat(), DOOH_CRE[k], dooh_plays[i][k]] for i in live_idx for k in range(4) if dooh_plays[i][k]])
wcsv('results_daily.csv', ['date', 'metro_site_sessions', 'branded_searches', 'inbound_calls',
                           'billboard_line_calls', 'paid_media_live'],
     [[DAYS[i].isoformat(), halo['sessions'][i], halo['branded'][i], halo['calls'][i], halo['board_calls'][i],
       int(LIVE[i])] for i in range(N)])

tot = lambda a: sum(a[i] for i in live_idx)
print('days', N, 'live', len(live_idx))
print('CTV spend', tot(ctv['spend']) / 100, 'imps', tot(ctv['imps']), 'visits', tot(ctv['visits']), 'leads', tot(ctv['leads']))
print('OOH spend', sum(sum(r) for r in b_spend) / 100, 'imps', sum(sum(r) for r in b_imps))
print('board calls', sum(halo['board_calls']))
print('data.js KB', os.path.getsize(os.path.join(SITE, 'assets', 'js', 'data.js')) // 1024)
