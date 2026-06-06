# 🌑 Eclipse Total · Covarrubias · 12 agosto 2026

A single-page web app tracking the **total solar eclipse of August 12, 2026** from a fixed observation site in Covarrubias, Burgos (Spain). Built to go live as a GitHub Pages site with no backend, no build step, and no dependencies beyond a browser.

**Live site:** `https://teowaits.github.io/[repo-name]/`

---

## What it does

- **Countdown clock** — ticks down to totality (C2), counts *up* during the 1m 46.8s of totality, then shows time to sunset. Five states: pre-event → partial phase → totality → partial (post) → after sunset.
- **Interactive map** — Leaflet + OpenTopoMap showing the eclipse path polygon and centerline over Spain, with a site marker for Covarrubias. Toggle between topographic and street-map tiles.
- **Confirmed contact times** — USNO API v4.0.1, validated June 2026 for coordinates 42.06°N 3.52°W at 894 m. Hardcoded fallback in `config.js` if the API is unavailable at runtime.
- **Live weather** — Open-Meteo forecast (active within 16 days of eclipse day) plus an ERA5 historical cloud-cover histogram for August 12 over the last 10 years. No API key required.
- **Sky view** — Hotel Doña Sancha webcam snapshot, auto-refreshed every 60 seconds. Falls back to a Windy.com embed if the direct image URL is unreachable. Slot for a YouTube Live embed on eclipse day.
- **Lecture card** — confirmed talk by Prof. Diego López-Cámara (UNAM astrophysicist) the afternoon before the eclipse.
- **Dark / light theme toggle** — dark by default. Persisted to `localStorage`. Suggests dark mode automatically when < 30 min to totality.
- **Science & safety content** — accordion sections in Spanish (placeholders; owner-supplied content).

---

## Eclipse data (confirmed)

| Event | Time (UTC) | CEST | Alt | Azm |
|---|---|---|---|---|
| C1 — Eclipse begins | 17:33:50 | 19:33:50 | 18.2° | 273.8° |
| C2 — Totality begins | 18:28:46 | 20:28:46 | 8.1° | 282.7° |
| Maximum eclipse | 18:29:38 | 20:29:38 | 7.9° | 282.8° |
| C3 — Totality ends | 18:30:32 | 20:30:32 | 7.8° | 282.9° |
| Sunset (visibility ends) | 19:19:00 | 21:19:00 | — | 290.9° |

**Duration of totality: 1m 46.8s · Magnitude: 1.016 · Obscuration: 100%**

> ⚠ The partial eclipse ends mathematically around 22:17 CEST, but the Sun sets at 21:19 CEST while the partial phase is still ongoing. C4 is not visible from this site. The page treats sunset as the effective end of the observable eclipse.

Source: USNO Astronomical Applications API v4.0.1 · ΔT = 74.0s

---

## Project structure

```
eclipse-2026/
│
├── index.html              # Page structure — the only HTML file
│
├── css/
│   ├── theme.css           # ⬅ ALL design tokens: colors, fonts, spacing,
│   │                       #   dark/light palettes, animations. Edit here
│   │                       #   to change the visual identity entirely.
│   ├── layout.css          # Page skeleton, responsive grid, section spacing
│   └── components.css      # Component-level visual styles
│
├── js/
│   ├── config.js           # ⬅ All constants. Edit this file to:
│   │                       #   • update coordinates with exact GPS
│   │                       #   • activate YouTube Live (youtube.enabled = true)
│   │                       #   • confirm lecture time/location
│   ├── app.js              # Entry point — theme toggle, accordions, boot sequence
│   ├── eclipse.js          # USNO API call + confirmed hardcoded fallback
│   ├── countdown.js        # 5-state timer state machine
│   ├── weather.js          # Open-Meteo forecast + ERA5 climatology
│   ├── map.js              # Leaflet map, GeoJSON overlay, tile toggle
│   └── webcam.js           # Snapshot refresh, Windy fallback, YouTube Live slot
│
└── data/
    └── eclipse-path.geojson  # Eclipse path over Spain (NASA/Espenak, approximated)
```

**Frontend / logic separation:** `css/` and `index.html` are the presentation layer — restyling requires no JS changes. The JS files only write to `data-*` attributes and CSS classes, never inline styles.

---

## Setup

### Running locally

ES modules require HTTP — open `index.html` directly from the filesystem won't work.

```bash
# Python (no install needed)
cd eclipse-2026
python3 -m http.server 8080
# → open http://localhost:8080
```

```bash
# Node (if you have it)
npx serve .
```

No npm install, no build step, no bundler.

### Deploying to GitHub Pages

1. Push this folder to a GitHub repository (e.g. `eclipse-2026`).
2. Go to **Settings → Pages → Source** and select **Deploy from branch: `main` / `/ (root)`**.
3. GitHub Pages will serve the site at `https://teowaits.github.io/eclipse-2026/`.
4. DNS/custom domain optional — configure under Settings → Pages → Custom domain.

> The site uses ES modules (`<script type="module">`), which require HTTPS. GitHub Pages serves over HTTPS by default. A plain HTTP local server (python3) also works for development.

---

## Configuration

Everything user-editable lives in `js/config.js`. Common tasks:

### Update coordinates with exact house GPS
```js
site: {
  lat:  42.XXXX,   // replace with exact latitude
  lon: -3.XXXX,    // replace with exact longitude
  elevation_m: 894,
}
```
The map will re-centre and the contact times shown will be for that exact point.

### Confirm lecture time and location
```js
lecture: {
  event: {
    time:     '18:00',              // once confirmed
    location: 'Casa de Cultura, Covarrubias',  // once confirmed
    registration: 'https://...',    // if applicable
  }
}
```

### Activate YouTube Live on eclipse day
```js
youtube: {
  enabled: true,
  videoId: 'XXXXXXXXXXX',   // your YouTube Live video ID
}
```
The webcam snapshot section hides automatically and the live player takes its place.

### Activate YouTube Live without redeploying
If you need to go live without a GitHub push, you can append a query parameter — add a small `URLSearchParams` check to `app.js`, or simply open the browser console and set `localStorage.setItem('yt-override', 'VIDEO_ID')` then reload.

---

## Data sources

| Data | Provider | Cost | Key required |
|---|---|---|---|
| Eclipse contact times | [USNO Astronomical Applications API v4.0.1](https://aa.usno.navy.mil/data/api) | Free | No |
| Eclipse path (GeoJSON) | [NASA/Espenak GSC](https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2026Aug12Tpath.html) | Free | No |
| Live weather forecast | [Open-Meteo](https://open-meteo.com) | Free | No |
| Historical weather (ERA5) | [Open-Meteo Archive API](https://open-meteo.com/en/docs/historical-weather-api) | Free | No |
| Map tiles | [OpenTopoMap](https://opentopomap.org) / [OpenStreetMap](https://www.openstreetmap.org) | Free | No |
| Sky view (snapshot) | [Hotel Doña Sancha](https://www.hoteldonasancha.com) | Free | No |
| Sky view (fallback) | [Windy.com](https://www.windy.com) (webcam ID 1224781112) | Free | No |

> **Eclipse path accuracy note:** `data/eclipse-path.geojson` contains the totality polygon and centerline over Spain, approximated from the NASA/Espenak path tables. It is suitable for map visualization. For precision work (e.g. determining whether a specific point is in totality), use the [NASA interactive eclipse map](https://eclipse.gsfc.nasa.gov/SEsearch/SEsearchmap.php?Ecl=20260812) or the [USNO Solar Eclipse Computer](https://aa.usno.navy.mil/data/SolarEclipses) directly.

---

## Known limitations

- **Webcam:** Hotel Doña Sancha serves a static JPEG refreshed every ~10 minutes, not a live video stream. On eclipse day, replace with a YouTube Live embed (see configuration above).
- **CORS on webcam image:** If the hotel server adds CORS restrictions, the snapshot will silently fall back to the Windy embed. No user-visible error.
- **ERA5 climatology:** Open-Meteo archive data has a processing lag of ~5 days; the current year is excluded from the histogram. This is intentional.
- **Eclipse path GeoJSON:** The polygon is hand-approximated from the NASA path table. Northern and southern limits may differ by a few kilometres from the authoritative values. For exact limits, consult the USNO API directly with your coordinates.
- **USNO API coverage:** The API currently documents coverage through 2024, but responded correctly to the 2026 query during development. If it stops working, the page falls back gracefully to the hardcoded confirmed values in `config.js`.

---

## Contributing

This is a personal observation site, not a general-purpose project. Issues and PRs are welcome for bug fixes. For feature additions, open an issue first.

Content for the science and safety accordion sections (§6 and §7) is placeholder — owner-supplied Spanish text will be added closer to the event.

---

## Credits

**Design & ideation:** [@teowaits](https://github.com/teowaits)

**Coding execution:** [Claude Sonnet](https://www.anthropic.com/claude) (Anthropic) — architecture, HTML/CSS/JS implementation, API integrations, and documentation, built iteratively through a structured design and research conversation.

**Eclipse science lecture:** [Prof. Diego López-Cámara](https://akanaba.org/diego-lopez-camara) — Instituto de Astronomía, UNAM.

**Data & infrastructure:** NASA, USNO, Open-Meteo, OpenTopoMap, OpenStreetMap contributors, Hotel Doña Sancha, Windy.com.

---

## License

MIT License — see [LICENSE](LICENSE).

You are free to fork and adapt this for your own eclipse observation site. If you do, a credit link back to [@teowaits](https://github.com/teowaits) is appreciated but not required.
