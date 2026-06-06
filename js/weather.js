/**
 * weather.js — Open-Meteo integration
 *
 * Three data sources:
 *   1. current API   — live right-now conditions (always, uses ?current= param)
 *   2. forecast API  — eclipse-day conditions when within 16 days
 *   3. archive API   — ERA5 historical Aug 12 climatology (always available)
 *
 * FRONTEND CONTRACT:
 * Writes only to data-* attributes and textContent.
 * Never sets inline styles.
 * CSS reads [data-cloud-level="clear|partial|overcast"] for coloring.
 */

import CONFIG from './config.js';

const { lat, lon, timezone } = CONFIG.site;
const { forecastUrl, archiveUrl, historyYears, refreshMs } = CONFIG.weather;

let refreshTimer = null;

/**
 * init — Load current conditions + climatology; set up auto-refresh.
 */
export async function init() {
  await Promise.allSettled([
    loadCurrentWeather(),
    loadClimatology(),
    checkEclipseForecast(),
  ]);

  // Refresh current conditions every 10 min
  refreshTimer = setInterval(loadCurrentWeather, refreshMs);
}

/* ── CURRENT CONDITIONS (always live) ───────────────────────── */

async function loadCurrentWeather() {
  try {
    const params = new URLSearchParams({
      latitude:  lat,
      longitude: lon,
      current:   'cloud_cover,temperature_2m,wind_speed_10m,wind_direction_10m,weather_code',
      timezone,
    });

    const res  = await fetch(`${forecastUrl}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderCurrentWeather(data.current, data.current_units);

  } catch (err) {
    console.warn('[weather] Current weather error:', err.message);
    setMetricsError();
  }
}

function renderCurrentWeather(current, units) {
  if (!current) { setMetricsError(); return; }

  const cloud = current.cloud_cover    ?? null;
  const temp  = current.temperature_2m ?? null;
  const wind  = current.wind_speed_10m ?? null;

  const set = (sel, val) => {
    const el = document.querySelector(`[data-weather="${sel}"]`);
    if (el) el.textContent = val;
  };

  set('cloud-value', cloud !== null ? `${Math.round(cloud)}%`        : '—');
  set('temp-value',  temp  !== null ? `${temp.toFixed(1)}°C`          : '—');
  set('wind-value',  wind  !== null ? `${Math.round(wind)} km/h`      : '—');

  // CSS cloud level class for color coding
  const widget = document.querySelector('[data-weather="cloud-widget"]');
  if (widget && cloud !== null) {
    widget.dataset.cloudLevel = cloud < 25 ? 'clear' : cloud < 65 ? 'partial' : 'overcast';
  }

  // Timestamp
  const timeEl = document.querySelector('[data-weather="current-time"]');
  if (timeEl && current.time) {
    const d = new Date(current.time + ':00Z');  // Open-Meteo omits seconds
    timeEl.textContent = d.toLocaleTimeString('es-ES', {
      hour: '2-digit', minute: '2-digit', timeZone: timezone,
    });
  }

  setForecastStatus('live');

  document.querySelectorAll('[data-weather-section]').forEach(el => {
    el.dataset.loaded = 'true';
  });
}

function setMetricsError() {
  ['cloud-value', 'temp-value', 'wind-value'].forEach(k => {
    const el = document.querySelector(`[data-weather="${k}"]`);
    if (el) el.textContent = '—';
  });
  setForecastStatus('error');
}

/* ── ECLIPSE-DAY FORECAST (within 16 days only) ─────────────── */

async function checkEclipseForecast() {
  const eclipseDate = '2026-08-12';
  const daysAway = (new Date(eclipseDate + 'T00:00:00Z') - Date.now()) / 86400000;

  const bannerEl = document.querySelector('[data-weather="eclipse-forecast-banner"]');

  if (daysAway > 16) {
    // Show days-until note in the banner slot
    if (bannerEl) {
      bannerEl.textContent = `Previsión del día del eclipse disponible en ${Math.ceil(daysAway - 16)} días`;
      bannerEl.hidden = false;
    }
    return;
  }

  try {
    const params = new URLSearchParams({
      latitude:   lat,
      longitude:  lon,
      hourly:     'cloud_cover,temperature_2m',
      timezone,
      start_date: eclipseDate,
      end_date:   eclipseDate,
    });
    const res  = await fetch(`${forecastUrl}?${params}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const times  = data.hourly?.time ?? [];
    const idx    = times.findIndex(t => t.endsWith('T20:00'));  // 20:00 CEST
    if (idx === -1 || !bannerEl) return;

    const eclipseCloud = data.hourly?.cloud_cover?.[idx];
    const eclipseTemp  = data.hourly?.temperature_2m?.[idx];

    if (bannerEl && eclipseCloud !== undefined) {
      bannerEl.textContent =
        `Previsión 12 ago 20:00 CEST: ${Math.round(eclipseCloud)}% nubes · ${eclipseTemp?.toFixed(1) ?? '—'}°C`;
      bannerEl.hidden = false;
    }
  } catch (err) {
    console.warn('[weather] Eclipse forecast error:', err.message);
  }
}

function setForecastStatus(status) {
  const el = document.querySelector('[data-weather="forecast-status"]');
  if (!el) return;
  const labels = {
    live:  'Condiciones actuales · Open-Meteo · actualización automática',
    error: 'Sin datos meteorológicos',
  };
  el.textContent = labels[status] ?? status;
  el.dataset.status = status;
}

/* ── CLIMATOLOGY (ERA5) ──────────────────────────────────────── */

async function loadClimatology() {
  const currentYear = new Date().getFullYear();
  const startYear   = currentYear - historyYears;
  const years       = Array.from({ length: historyYears }, (_, i) => startYear + i);

  try {
    // One request per year for Aug 12 — batch into one large request
    const allData = await fetchERA5Range(
      `${startYear}-08-12`,
      `${currentYear - 1}-08-12`,
      years
    );

    const barsData = computeClimatologyBars(allData, years);
    renderClimatologyBars(barsData);

  } catch (err) {
    console.warn('[weather] ERA5 climatology error:', err.message);
    renderClimatologyError();
  }
}

/**
 * fetchERA5Range — one batch request for all historical years
 */
async function fetchERA5Range(startDate, endDate, years) {
  const params = new URLSearchParams({
    latitude:   lat,
    longitude:  lon,
    hourly:     'cloud_cover,temperature_2m',
    timezone,
    start_date: startDate,
    end_date:   endDate,
  });

  const res  = await fetch(`${archiveUrl}?${params}`, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ERA5 HTTP ${res.status}`);
  return res.json();
}

/**
 * computeClimatologyBars — extract cloud cover at eclipse hour for each year
 */
function computeClimatologyBars(data, years) {
  const times  = data.hourly?.time ?? [];
  const clouds = data.hourly?.cloud_cover ?? [];

  return years.map(year => {
    // Find index for Aug 12 of this year at 20:00 local time
    const targetStr = `${year}-08-12T20:00`;
    const idx = times.findIndex(t => t.startsWith(targetStr));
    return {
      year,
      cloud_cover: idx !== -1 ? (clouds[idx] ?? null) : null,
    };
  }).filter(d => d.cloud_cover !== null);
}

/**
 * renderClimatologyBars — draw historical bar chart
 */
function renderClimatologyBars(bars) {
  if (!bars.length) { renderClimatologyError(); return; }

  const container = document.querySelector('[data-weather="history-bars"]');
  if (!container) return;

  const maxCloud = 100;
  const avg      = bars.reduce((sum, b) => sum + b.cloud_cover, 0) / bars.length;

  // Clear skeleton
  container.innerHTML = '';

  bars.forEach((bar, i) => {
    const el = document.createElement('div');
    el.className = 'history-bar';
    el.dataset.year = bar.year;
    el.style.height = `${Math.max(4, (bar.cloud_cover / maxCloud) * 100)}%`;
    el.setAttribute('title', `${bar.year}: ${Math.round(bar.cloud_cover)}%`);
    el.setAttribute('aria-label', `${bar.year}: ${Math.round(bar.cloud_cover)}% nubosidad`);
    if (i === bars.length - 1) el.classList.add('history-bar--current');
    container.appendChild(el);
  });

  // Year labels
  const axisEl = document.querySelector('[data-weather="history-axis"]');
  if (axisEl && bars.length >= 2) {
    axisEl.textContent = `${bars[0].year} – ${bars[bars.length - 1].year}`;
  }

  // Average label
  const avgEl = document.querySelector('[data-weather="history-avg"]');
  if (avgEl) {
    avgEl.textContent = `Media histórica 12 ago · 20h CEST: ${Math.round(avg)}% nubosidad`;
  }

  // Mark loaded
  const section = document.querySelector('[data-weather="history-section"]');
  if (section) section.dataset.loaded = 'true';
}

function renderClimatologyError() {
  const el = document.querySelector('[data-weather="history-avg"]');
  if (el) el.textContent = 'Datos históricos no disponibles';
}

/**
 * stop — clean up (e.g. SPA navigation)
 */
export function stop() {
  if (refreshTimer) clearInterval(refreshTimer);
}
