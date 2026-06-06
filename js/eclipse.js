/**
 * eclipse.js — Contact times, USNO API, fallback data
 *
 * FRONTEND CONTRACT:
 * This module writes only to data-* attributes and CSS classes.
 * It never sets inline styles.
 *
 * DOM targets:
 *   [data-eclipse="c1-time"]      → formatted time string
 *   [data-eclipse="c2-time"]
 *   [data-eclipse="cmax-time"]
 *   [data-eclipse="c3-time"]
 *   [data-eclipse="c4-time"]
 *   [data-eclipse="duration"]
 *   [data-eclipse="sun-alt"]
 *   [data-eclipse="obscuration"]
 *   [data-eclipse="source"]       → "USNO" | "estimado"
 *   [data-eclipse-state]          → on <html>: pre|partial1|totality|partial2|post
 */

import CONFIG from './config.js';

/* ── HARDCODED FALLBACK — CONFIRMED USNO v4.0.1 DATA ─────────
   Source: USNO API, validated 2026-06-06, coords 42.06,-3.52 h=894m
   Use this if the live API call fails at runtime.
   ─────────────────────────────────────────────────────────── */
const FALLBACK = {
  source:        'USNO (confirmado)',
  C1:            new Date('2026-08-12T17:33:50Z'),  // Eclipse Begins      | alt 18.2° azm 273.8°
  C2:            new Date('2026-08-12T18:28:46Z'),  // Totality Begins     | alt  8.1° azm 282.7°
  Cmax:          new Date('2026-08-12T18:29:38Z'),  // Maximum Eclipse     | alt  7.9° azm 282.8°
  C3:            new Date('2026-08-12T18:30:32Z'),  // Totality Ends       | alt  7.8° azm 282.9°
  C4:            null,                              // After sunset — not visible from Covarrubias
  sunset:        new Date('2026-08-12T19:19:00Z'),  // Sunset 21:19 CEST — eclipse still ongoing
  duration_s:    106.8,                             // 1m 46.8s
  sun_alt_deg:   8.1,                               // at C2 (highest during totality)
  sun_azm_deg:   282.7,                             // at C2 (≈ due west)
  obscuration:   1.000,
  magnitude:     1.016,
};

/* Parsed contact times, filled by init() */
export let contactTimes = { ...FALLBACK };

/**
 * init() — Try USNO API, fall back to hardcoded data.
 * Resolves when DOM has been updated.
 */
export async function init() {
  let data = null;

  try {
    data = await fetchUSNO();
  } catch (err) {
    console.warn('[eclipse] USNO API unavailable, using fallback:', err.message);
  }

  if (data) {
    contactTimes = data;
  } else {
    contactTimes = { ...FALLBACK };
  }

  updateDOM();
  return contactTimes;
}

/**
 * fetchUSNO — Call USNO API and parse response.
 * Returns structured contact times or throws.
 */
async function fetchUSNO() {
  const { lat, lon, elevation_m } = CONFIG.site;
  const url = new URL(CONFIG.usno.baseUrl);
  url.searchParams.set('date',   CONFIG.usno.date);
  url.searchParams.set('coords', `${lat},${lon}`);
  url.searchParams.set('height', elevation_m);

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`USNO returned HTTP ${response.status}`);
  }

  const json = await response.json();
  return parseUSNOResponse(json);
}

/**
 * parseUSNOResponse — Map USNO v4.0.1 JSON to our internal format.
 *
 * Actual USNO v4.0.1 response shape (confirmed 2026-06-06):
 * {
 *   "apiversion": "4.0.1",
 *   "geometry": { "coordinates": [-3.52, 42.06], "height": "894m", "type": "Point" },
 *   "properties": {
 *     "duration_of_totality": "1m 46.8s",
 *     "magnitude": "1.016",
 *     "obscuration": "100.0%",
 *     "local_data": [
 *       { "phenomenon": "Eclipse Begins",  "time": "17:33:50.0", "altitude": "18.2", "azimuth": "273.8", ... },
 *       { "phenomenon": "Totality Begins", "time": "18:28:45.6", "altitude": "8.1",  "azimuth": "282.7", ... },
 *       { "phenomenon": "Maximum Eclipse", "time": "18:29:38.1", "altitude": "7.9",  "azimuth": "282.8"  },
 *       { "phenomenon": "Totality Ends",   "time": "18:30:32.4", "altitude": "7.8",  "azimuth": "282.9", ... },
 *       { "phenomenon": "Sunset",          "time": "19:19",      "altitude": "----", "azimuth": "290.9"  }
 *       // Note: NO "Eclipse Ends" entry — eclipse ends after sunset, not visible.
 *     ]
 *   }
 * }
 */
function parseUSNOResponse(json) {
  const props = json?.properties;
  if (!props) throw new Error('Unexpected USNO response shape');

  const events = props.local_data ?? props.events ?? [];
  if (!events.length) throw new Error('No local_data in USNO response');

  const datePrefix = '2026-08-12T';

  // Find an event by phenomenon keyword (case-insensitive substring match)
  const find = (keyword) => {
    const ev = events.find(e =>
      (e.phenomenon ?? e.event ?? '').toLowerCase().includes(keyword.toLowerCase())
    );
    if (!ev) return null;
    const rawTime = ev.time ?? '';
    // Normalise: "17:33:50.0" → "17:33:50" (drop fractional seconds for Date parsing)
    const cleanTime = rawTime.replace(/\.\d+$/, '').padEnd(8, ':00');
    const d = new Date(datePrefix + cleanTime + 'Z');
    return isNaN(d.getTime()) ? null : d;
  };

  // Extract sun altitude/azimuth at C2 (Totality Begins)
  const c2Event   = events.find(e => (e.phenomenon ?? '').toLowerCase().includes('totality begins'));
  const cmaxEvent = events.find(e => (e.phenomenon ?? '').toLowerCase().includes('maximum'));
  const sunsetEv  = events.find(e => (e.phenomenon ?? '').toLowerCase().includes('sunset'));

  const parseAlt = (ev) => {
    const v = parseFloat(ev?.altitude);
    return isNaN(v) ? null : v;
  };
  const parseAzm = (ev) => {
    const v = parseFloat(ev?.azimuth);
    return isNaN(v) ? null : v;
  };

  // Magnitude and obscuration come as strings: "1.016", "100.0%"
  const magnitude   = parseFloat(props.magnitude)   || FALLBACK.magnitude;
  const obscuration = parseFloat(props.obscuration) / 100 || FALLBACK.obscuration;

  return {
    source:       'USNO',
    C1:           find('eclipse begins'),
    C2:           find('totality begins'),
    Cmax:         find('maximum eclipse'),
    C3:           find('totality ends'),
    C4:           null,                                   // absent — eclipse ends after sunset
    sunset:       find('sunset'),
    duration_s:   parseDurationString(props.duration_of_totality ?? ''),
    sun_alt_deg:  parseAlt(c2Event)   ?? FALLBACK.sun_alt_deg,
    sun_azm_deg:  parseAzm(c2Event)   ?? FALLBACK.sun_azm_deg,
    sun_alt_cmax: parseAlt(cmaxEvent) ?? FALLBACK.sun_alt_deg,
    obscuration,
    magnitude,
  };
}

/**
 * parseDurationString — "1m 59.8s" → 119.8 (seconds)
 */
function parseDurationString(str) {
  if (!str) return FALLBACK.duration_s;
  const m = str.match(/(\d+)m\s*([\d.]+)s/);
  if (!m) return FALLBACK.duration_s;
  return parseInt(m[1], 10) * 60 + parseFloat(m[2]);
}

/**
 * updateDOM — Push contact time data to DOM elements.
 * Reads data-eclipse="*" attributes to find target elements.
 */
function updateDOM() {
  const ct = contactTimes;
  const tz = CONFIG.site.timezone;

  const fmt = (d) => {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-ES', {
      hour:     '2-digit',
      minute:   '2-digit',
      second:   '2-digit',
      timeZone: tz,
    });
  };

  const fmtUTC = (d) => {
    if (!d || isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('es-ES', {
      hour:     '2-digit',
      minute:   '2-digit',
      second:   '2-digit',
      timeZone: 'UTC',
    }) + ' UTC';
  };

  const set = (attr, value) => {
    document.querySelectorAll(`[data-eclipse="${attr}"]`).forEach(el => {
      el.textContent = value;
    });
  };

  set('c1-time',    fmt(ct.C1));
  set('c1-utc',     fmtUTC(ct.C1));
  set('c2-time',    fmt(ct.C2));
  set('c2-utc',     fmtUTC(ct.C2));
  set('cmax-time',  fmt(ct.Cmax));
  set('cmax-utc',   fmtUTC(ct.Cmax));
  set('c3-time',    fmt(ct.C3));
  set('c3-utc',     fmtUTC(ct.C3));
  set('c4-time',    ct.C4 ? fmt(ct.C4) : 'Tras el ocaso');
  set('c4-utc',     ct.C4 ? fmtUTC(ct.C4) : ct.sunset ? `Ocaso: ${fmt(ct.sunset)} CEST` : '');
  set('sunset-time', fmt(ct.sunset));
  set('sunset-utc',  fmtUTC(ct.sunset));
  set('duration',   formatDuration(ct.duration_s));
  set('sun-alt',    ct.sun_alt_deg?.toFixed(1) + '°');
  set('sun-azm',    ct.sun_azm_deg?.toFixed(0) + '°');
  set('obscuration', (ct.obscuration * 100).toFixed(1) + '%');
  set('magnitude',  ct.magnitude?.toFixed(3));
  set('source',     ct.source);

  // Mark confidence badge
  document.querySelectorAll('.confidence-badge').forEach(el => {
    if (ct.source === 'USNO' || ct.source === 'USNO (confirmado)') {
      el.className = 'confidence-badge confidence-badge--confirmed';
      el.textContent = '✓ USNO confirmado';
    } else {
      el.className = 'confidence-badge confidence-badge--estimated';
      el.textContent = '~ estimado';
    }
  });

  // Mark data as loaded
  document.querySelectorAll('[data-eclipse-section]').forEach(el => {
    el.dataset.loaded = 'true';
  });
}

/**
 * formatDuration — 65 → "1m 05s"
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/**
 * getEclipseState — returns the current eclipse phase.
 * Uses sunset as the "visible end" when C4 is null (eclipse ends after sunset).
 */
export function getEclipseState(now = new Date()) {
  const ct  = contactTimes;
  const end = ct.C4 ?? ct.sunset; // C4 is null for Covarrubias — use sunset
  if (now < ct.C1)  return 'pre';
  if (now < ct.C2)  return 'partial1';
  if (now < ct.C3)  return 'totality';
  if (end && now < end) return 'partial2';
  return 'post';
}

/**
 * getContactTimes — accessor for other modules
 */
export function getContactTimes() { return contactTimes; }
