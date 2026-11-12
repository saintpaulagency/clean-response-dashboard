# Clean Response: CTV + billboard report (sample)

A Saint Paul Agency reporting page for **Clean Response**, showing streaming TV delivered through our **Floyd CTV** campaigns alongside the **billboard** program, and what both did for the business.

> **Sample data.** Every number in this repo is made up to show the reporting format. Nothing comes from a live account.

**Live page:** https://aidanbarnard2.github.io/clean-response-dashboard/

## One link, four ways to view it

| View | What it's for |
|---|---|
| **Dashboard** | Interactive: Overview, CTV · Floyd, Billboards, Results. Hover or tap any chart, sort any table, click a board on the map. |
| **Presentation** | A 14-slide deck built from the same numbers. Arrow keys to move, **F** for full screen. |
| **Report / PDF** | An 11-page, letter-size report. **Download PDF / Print** saves it as a PDF. Printing from any view prints this report. |
| **Data** | Every dataset as CSV (the full file or just the selected period), previews, a copy-ready email summary and definitions. |

All four follow the period picker (full flight, a month, last 30 or 7 days, or any custom dates), and every number shows its period. Light and dark themes, works on phones. **Copy link** shares exactly the view on screen, including the period.

## What's in it

- **CTV · Floyd:** investment, impressions, completion rate and quartiles, households reached and frequency, CPM and cost per completed view, site visits from viewers, leads. Broken down by app, device, TV spot, county and hour of day, plus a holdout lift study.
- **Billboards:** 8 boards (5 digital, 3 static) on a metro map, with impressions, digital plays delivered against contract, cost and CPM board by board, creative rotation and an outage/make-good log.
- **Results:** website sessions, branded searches and inbound calls against the June pre-campaign baseline, calls to the billboard-only number, lift by county, and weather-trigger days against normal days.
- **What we'd do next:** recommendations written from the data.

## Files

```
index.html             the page
assets/css/app.css     SPA brand styles (Poppins, navy/royal/sky)
assets/js/charts.js    small chart kit (lines, bars, heatmap, map, tables), no dependencies
assets/js/app.js       rollups, the four views, the slides and the report
assets/js/data.js      the dataset the page reads (window.SAMPLE)
data/*.csv             the same data as CSV files
tools/                 rebuilds data.js and the CSVs
```

## Swapping in real data

The page only reads `assets/js/data.js`. To go live, replace the sample generator in `tools/make_data.py` with real exports and keep the same shape:

- **Floyd CTV** daily totals, and daily rows by app, device, creative, county and hour.
- **Billboards:** the board list (location, format, flight, weekly impressions, cost, contracted plays), plus daily impressions, plays and cost per board from the vendor's proof-of-play.
- **Results:** daily metro site sessions (GA4), branded searches (Google Ads / Search Console), and inbound calls by tracking line.

```bash
cd tools && npm install && cd ..
python3 tools/make_data.py      # writes assets/js/data.js and data/*.csv
```

Prepared by [Saint Paul Agency](https://saintpaulagency.com).
