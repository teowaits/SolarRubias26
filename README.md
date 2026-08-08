# 🌑 SolarRubias · Eclipse Total · Covarrubias · 12 agosto 2026

A single-page web app tracking the **total solar eclipse of August 12, 2026** from Covarrubias, Burgos (Spain). Built to run as a GitHub Pages site with no backend, no build step, and no dependencies beyond a browser.

**Live site:** https://teowaits.github.io/SolarRubias26/

---

## What it does

- **Countdown clock** — ticks down to totality (C2), counts *up* during the 1m 46.8s of totality, then shows time to sunset. Five states: pre-event → partial phase → totality → partial (post) → after sunset.
- **Interactive map** — Leaflet + OpenTopoMap showing the exact NASA/Espenak eclipse path polygon and centerline over Spain, with a site marker for Covarrubias. Toggle between topographic and street-map tiles.
- **Confirmed contact times** — USNO API v4.0.1, validated August 2026 for 42.06°N 3.52°W at 894 m. Hardcoded fallback in `config.js` if the API is unavailable at runtime.
- **Live weather** — Open-Meteo current conditions (always live) plus an ERA5 historical cloud-cover histogram for August 12 over the last 10 years. No API key required.
- **Observation spots** — dedicated section "Dónde observar en Covarrubias" with shadow-analysis maps (horizon visibility layer), descriptions of 10 recommended locations ordered by accessibility, and key warnings about the low solar elevation (8°) and western horizon requirement.
- **Two lecture cards (slider)** — confirmed talks by Diego López-Cámara (UNAM, August 12) and Emilio J. Alfaro Navarro (CSIC, August 13), both at Sala Arlanza, 12:00–13:00. Swipeable on mobile.
- **Dark / light theme toggle** — dark by default, persisted to `localStorage`. Custom SVG sun/eclipse pill designed by Claude Design. Solar corona parallax effect in the hero section.
- **Science content** — five completed accordion sections in Spanish covering eclipse mechanics, the solar corona, Baily's beads, the 2026 sunset geometry, and the 1905 Spanish eclipse. With sources.
- **Safety content** — three completed accordion sections covering ISO 12312-2 glasses, mobile camera filter protocol (C2/C3 timing), and cloudy-sky contingency.

---

## Eclipse data (confirmed)

| Event | UTC | CEST | Alt | Azm |
|---|---|---|---|---|
| C1 — Eclipse begins | 17:33:50 | 19:33:50 | 18.2° | 273.8° |
| C2 — Totality begins | 18:28:46 | 20:28:46 | 8.1° | 282.7° |
| Maximum eclipse | 18:29:38 | 20:29:38 | 7.9° | 282.8° |
| C3 — Totality ends | 18:30:32 | 20:30:32 | 7.8° | 282.9° |
| Sunset (visibility ends) | 19:19:00 | 21:19:00 | — | 290.9° |

**Duration of totality: 1m 46.8s · Magnitude: 1.016 · Obscuration: 100%**

> ⚠ The partial eclipse ends mathematically around 22:17 CEST, but the Sun sets at 21:19 CEST while the partial phase is ongoing. C4 is not visible from this site. The page treats sunset as the effective end of the observable eclipse.

Source: USNO Astronomical Applications API v4.0.1 · ΔT = 74.0s

---

## Project structure

```
SolarRubias26/
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
│   ├── app.js              # Entry point — theme, accordions, slider, boot sequence
│   ├── eclipse.js          # USNO API call + confirmed hardcoded fallback
│   ├── countdown.js        # 5-state timer state machine
│   ├── weather.js          # Open-Meteo current conditions + ERA5 climatology
│   ├── map.js              # Leaflet map, GeoJSON overlay, tile toggle
│   └── webcam.js           # YouTube Live slot (disconnected; activate on eclipse day)
│
├── img/
│   ├── diego-lopez-camara.png   # Speaker photo — slide 1
│   ├── EJA.jpeg                 # Speaker photo — slide 2
│   ├── programa-arlanza-2026.jpeg  # Asociación Astronómica Arlanza programme
│   ├── sombra-pueblo.jpg        # Shadow map: village detail
│   └── sombras-completa.jpg     # Shadow map: wider area with 10 observation spots
│
└── data/
    └── eclipse-path.geojson  # Eclipse path over Spain — exact NASA/Espenak coordinates
```

**Frontend / logic separation:** `css/` and `index.html` are the presentation layer. JS files only write to `data-*` attributes and CSS classes, never inline styles. Restyling requires no JS changes.

---

## Setup

### Running locally

ES modules require HTTP — opening `index.html` directly from the filesystem won't work.

```bash
# Python (no install needed)
cd SolarRubias26
python3 -m http.server 8080
# → open http://localhost:8080
```

No npm install, no build step, no bundler.

### Deploying to GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages → Source** and select **Deploy from branch: `main` / `/ (root)`**.
3. GitHub Pages will serve the site at `https://<username>.github.io/<repo-name>/`.

> The site uses ES modules (`<script type="module">`), which require HTTPS. GitHub Pages serves over HTTPS by default. A plain HTTP local server also works for development.

---

## Configuration

Everything user-editable lives in `js/config.js`.

### Update coordinates with exact house GPS
```js
site: {
  lat:  42.XXXX,   // replace with exact latitude
  lon: -3.XXXX,    // replace with exact longitude
  elevation_m: 894,
}
```

### Activate YouTube Live on eclipse day
```js
youtube: {
  enabled: true,
  videoId: 'XXXXXXXXXXX',   // your YouTube Live video ID
}
```
The webcam snapshot section hides automatically and the live player takes its place. `webcam.js` contains the embed logic and is ready — it was disconnected from `app.js` because the static webcam snapshot had no reliable source, but the YouTube Live path remains fully functional.

---

## Data sources

| Data | Provider | Cost | Key required |
|---|---|---|---|
| Eclipse contact times | [USNO Astronomical Applications API v4.0.1](https://aa.usno.navy.mil/data/api) | Free | No |
| Eclipse path (GeoJSON) | [NASA/Espenak GSC](https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/SE2026Aug12Tpath.html) | Free | No |
| Live weather (current) | [Open-Meteo](https://open-meteo.com) | Free | No |
| Historical weather (ERA5) | [Open-Meteo Archive API](https://open-meteo.com/en/docs/historical-weather-api) | Free | No |
| Map tiles | [OpenTopoMap](https://opentopomap.org) / [OpenStreetMap](https://www.openstreetmap.org) | Free | No |
| Observation shadow maps | [Google Drive](https://drive.google.com) — horizon visibility analysis | Free | No |

> **Eclipse path note:** `data/eclipse-path.geojson` uses coordinates transcribed directly from the NASA/Espenak WGS-84 path table at 120-second intervals. Validated against six cities (Covarrubias, Madrid, Bilbao, A Coruña, Barcelona, Valencia). For precision work, consult the [USNO Solar Eclipse Computer](https://aa.usno.navy.mil/data/SolarEclipses) with exact coordinates.

---

## Known limitations

- **YouTube Live:** `webcam.js` is included but disconnected from `app.js`. To activate on eclipse day, set `youtube.enabled = true` and `youtube.videoId = 'YOUR_ID'` in `config.js`. One redeploy or one console command is all it takes.
- **ERA5 climatology:** Open-Meteo archive data has a ~5-day processing lag; the current year is excluded from the histogram. This is intentional.
- **USNO API coverage:** The API officially documents coverage through 2024, but responded correctly to the 2026 query during development. The page falls back gracefully to the hardcoded confirmed values in `config.js` if the API is unavailable.
- **Solar elevation at totality:** At 8° above the horizon, terrain and trees to the west can obstruct the view. The "Dónde observar" section on the page documents this in detail with shadow analysis maps.

---

## Credits

**Design & ideation:** [@teowaits](https://github.com/teowaits)

**Frontend redesign:** [Claude Design](https://www.anthropic.com/claude) — SolarRubias visual identity, hero corona effect, theme pill, typography.

**Coding execution:** [Claude Sonnet](https://www.anthropic.com/claude) (Anthropic) — architecture, HTML/CSS/JS implementation, API integrations, and documentation, built iteratively through a structured design and research conversation.

**Lectures:**
- [Prof. Diego López-Cámara](https://akanaba.org/diego-lopez-camara) — Instituto de Ciencias Nucleares, UNAM (México) · 12 agosto
- Prof. Emilio J. Alfaro Navarro — Instituto de Astrofísica de Andalucía, CSIC (Ad honorem) · 13 agosto


**Programme:** [Asociación Astronómica Arlanza](https://www.instagram.com/asociacion_astro_arlanza) — Charlas y Actividades Julio y Agosto 2026.

**Data & infrastructure:** NASA/Espenak, USNO, Open-Meteo (ERA5/ECMWF), OpenTopoMap, OpenStreetMap contributors.

---

## License

MIT License — see [LICENSE](LICENSE).

Free to fork and adapt for your own eclipse observation site. A credit link back to [@teowaits](https://github.com/teowaits) is appreciated but not required.
