/**
 * config.js — Eclipse 2026 Covarrubias
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all constants.
 * CONFIRMED: USNO API validated 2026-06-06. All eclipse times
 *            are exact USNO v4.0.1 data — do NOT estimate.
 * ─────────────────────────────────────────────────────────────
 */

const CONFIG = {

  /* ─── SITE ─────────────────────────────────────────────── */
  site: {
    name:        'Covarrubias',
    region:      'Burgos, Castilla y León',
    lat:          42.06,          // coords used for USNO validation — update with
    lon:         -3.52,           // exact house GPS when available
    elevation_m:  894,
    timezone:    'Europe/Madrid',
    utcOffsetH:   2,              // CEST = UTC+2
  },

  /* ─── ECLIPSE DATA — CONFIRMED USNO v4.0.1 ─────────────── */
  // Source: USNO API response, 2026-06-06
  // Endpoint: aa.usno.navy.mil/api/eclipses/solar/date
  //   ?date=2026-8-12&coords=42.06,-3.52&height=894
  // delta_T: 74.0s  |  VSOP87/ELP2000
  eclipse: {
    confirmed:    true,
    label:        'Eclipse Total de Sol · 12 agosto 2026',

    // UTC contact times (ISO 8601) — USNO exact values
    C1:           '2026-08-12T17:33:50Z',   // Eclipse Begins       19:33:50 CEST | alt 18.2°
    C2:           '2026-08-12T18:28:45Z',   // Totality Begins      20:28:45 CEST | alt 8.1°
    Cmax:         '2026-08-12T18:29:38Z',   // Maximum Eclipse      20:29:38 CEST | alt 7.9°
    C3:           '2026-08-12T18:30:32Z',   // Totality Ends        20:30:32 CEST | alt 7.8°
    // C4 occurs AFTER SUNSET — not visible from Covarrubias
    C4:           null,                     // Eclipse technically ends ~22:17 CEST (below horizon)
    sunset:       '2026-08-12T19:19:00Z',   // Sunset               21:19 CEST | end of visibility

    // Eclipse characteristics — USNO confirmed
    duration_s:    106.8,                   // Totality: 1m 46.8s (USNO: "1m 46.8s")
    total_duration:'1h 45m 06.8s',          // Full eclipse duration (partial + totality)
    sun_alt_c2:    8.1,                     // Sun altitude at C2 (degrees)
    sun_alt_cmax:  7.9,                     // Sun altitude at maximum
    sun_alt_c3:    7.8,                     // Sun altitude at C3
    sun_azm_c2:    282.7,                   // Sun azimuth at C2 (≈ due west, slightly N)
    sun_azm_cmax:  282.8,                   // Sun azimuth at maximum
    sun_azm_c3:    282.9,                   // Sun azimuth at C3
    obscuration:   1.000,                   // 100.0% (USNO: "100.0%")
    magnitude:     1.016,                   // Eclipse magnitude (USNO: "1.016")
    delta_t:       '74.0s',
    description:   'Sun in Total Eclipse at this Location',

    // Position angles at C2 (for camera orientation)
    pos_angle_c2:  114.3,                   // degrees
    vertex_angle_c2: 65.7,
    pos_angle_c3:  301.6,
    vertex_angle_c3: 253.2,
  },

  /* ─── NEXT ECLIPSE ──────────────────────────────────────── */
  nextEclipse: {
    label: 'Próximo eclipse total en España',
    date:  '2 de agosto de 2027',
    url:   'https://en.wikipedia.org/wiki/Solar_eclipse_of_August_2,_2027',
  },

  /* ─── LECTURE / EVENT ───────────────────────────────────── */
  lecture: {
    enabled:       true,
    speaker: {
      name:        'Diego López-Cámara',
      title:       'Astrofísico',
      institution: 'Universidad Nacional Autónoma de México (UNAM)',
      bio:         'Investigador del Instituto de Astronomía de la UNAM. Especialista en astrofísica teórica, fenómenos de alta energía y divulgación científica.',
      url:         'https://akanaba.org/diego-lopez-camara',
      urlLabel:    'akanaba.org',
    },
    event: {
      title:       'Conferencia: Eclipse Solar Total 2026',
      subtitle:    'Ciencia, historia y observación del eclipse del 12 de agosto',
      date:        '11 de agosto de 2026',          // tarde previa al eclipse
      dateISO:     '2026-08-11',
      time:        'Por confirmar',                 // TBD — actualizar cuando se confirme
      location:    'Por confirmar',                 // TBD — actualizar cuando se confirme
      language:    'Español',
      registration: null,                           // URL inscripción — añadir cuando esté disponible
    },
  },

  /* ─── MAP ────────────────────────────────────────────────── */
  map: {
    defaultZoom:   8,
    minZoom:       5,
    maxZoom:      14,
    centerLat:    42.3,
    centerLon:    -3.5,
    geojsonPath:  'data/eclipse-path.geojson',

    tiles: {
      topo: {
        url:         'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
        maxZoom:      17,
      },
      osm: {
        url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom:      19,
      },
    },
  },

  /* ─── WEATHER (Open-Meteo — no key) ─────────────────────── */
  weather: {
    forecastUrl:    'https://api.open-meteo.com/v1/forecast',
    archiveUrl:     'https://archive-api.open-meteo.com/v1/archive',
    hourlyVars:     'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,temperature_2m,wind_speed_10m,wind_direction_10m',
    historyYears:   10,
    eclipseMonth:   8,
    eclipseDay:     12,
    eclipseHourUTC: 18,
    refreshMs:      10 * 60 * 1000,
  },

  /* ─── USNO API ───────────────────────────────────────────── */
  usno: {
    baseUrl:   'https://aa.usno.navy.mil/api/eclipses/solar/date',
    date:      '2026-8-12',
    height_m:   894,
  },

  /* ─── WEBCAM ─────────────────────────────────────────────── */
  webcam: {
    // Tried in order — first successful image URL wins
    candidateUrls: [
      'https://www.hoteldonasancha.com/images/webcam.jpg',
      'https://www.hoteldonasancha.com/imagenes/webcam.jpg',   // Spanish spelling
      'https://www.hoteldonasancha.com/webcam/webcam.jpg',
      'https://www.hoteldonasancha.com/webcam.jpg',
      'https://www.hoteldonasancha.com/cam/cam.jpg',
      'https://www.arlanza.com/webcam/image.jpg',              // arlanza.com backup
      'https://www.arlanza.com/webcam/webcam.jpg',
    ],
    windyEmbedUrl: 'https://webcams.windy.com/webcams/public/embed/player/1224781112',
    windyPageUrl:  'https://www.windy.com/webcams/1224781112',
    refreshMs:     60 * 1000,
    creditName:    'Hotel Doña Sancha',
    creditUrl:     'https://www.hoteldonasancha.com',
  },

  /* ─── YOUTUBE LIVE (hidden until eclipse day) ────────────── */
  youtube: {
    enabled:   false,
    videoId:   '',
  },

  /* ─── COUNTDOWN ─────────────────────────────────────────── */
  countdown: {
    darkModeSuggestMs: 30 * 60 * 1000,
  },

};

Object.freeze(CONFIG);
Object.freeze(CONFIG.site);
Object.freeze(CONFIG.eclipse);
Object.freeze(CONFIG.lecture);
Object.freeze(CONFIG.lecture.speaker);
Object.freeze(CONFIG.lecture.event);
Object.freeze(CONFIG.map);
Object.freeze(CONFIG.weather);
Object.freeze(CONFIG.webcam);

export default CONFIG;
