/**
 * map.js — Leaflet map with eclipse path overlay
 *
 * Loads:
 *   - OpenTopoMap tiles (default) or OSM (toggle)
 *   - GeoJSON eclipse path (totality polygon + centerline + site point)
 *   - Site marker for Covarrubias
 *
 * FRONTEND CONTRACT:
 * Map tile toggle uses aria-pressed on button elements.
 * Map colors are driven by CSS variables injected at runtime (see below).
 * No inline styles set outside of Leaflet's own layer API.
 */

import CONFIG from './config.js';

const { geojsonPath, defaultZoom, centerLat, centerLon, tiles } = CONFIG.map;
const { site } = CONFIG;
// lat/lon live in CONFIG.site — destructuring from CONFIG.map left them undefined
const { lat, lon } = CONFIG.site;

let map           = null;
let topoLayer     = null;
let osmLayer      = null;
let pathLayer     = null;
let centerLayer   = null;
let markerLayer   = null;

/**
 * init — Initialize Leaflet map.
 * Requires Leaflet CSS + JS to be loaded in <head>.
 */
export async function init() {
  const container = document.getElementById('eclipse-map');
  if (!container || typeof L === 'undefined') {
    console.warn('[map] Leaflet not loaded or container missing');
    return;
  }

  // Read theme colors from CSS variables
  const colors = getThemeColors();

  map = L.map('eclipse-map', {
    center:          [centerLat, centerLon],
    zoom:            defaultZoom,
    minZoom:         CONFIG.map.minZoom,
    maxZoom:         CONFIG.map.maxZoom,
    zoomControl:     true,
    attributionControl: true,
  });

  // ── Tile layers ──
  topoLayer = L.tileLayer(tiles.topo.url, {
    attribution: tiles.topo.attribution,
    maxZoom:     tiles.topo.maxZoom,
  });

  osmLayer = L.tileLayer(tiles.osm.url, {
    attribution: tiles.osm.attribution,
    maxZoom:     tiles.osm.maxZoom,
  });

  topoLayer.addTo(map); // default: topographic

  // ── Eclipse path GeoJSON ──
  try {
    const res  = await fetch(geojsonPath);
    const data = await res.json();
    addEclipseLayers(data, colors);
  } catch (err) {
    console.warn('[map] Could not load eclipse GeoJSON:', err.message);
  }

  // ── Site marker ──
  try {
    addSiteMarker();
  } catch (err) {
    console.warn('[map] Site marker error:', err.message);
  }

  // ── Wire up tile toggle buttons ──
  wireTileToggle();

  // Re-apply colors when theme changes
  document.documentElement.addEventListener('themechange', () => {
    const c = getThemeColors();
    if (pathLayer)   pathLayer.setStyle(pathStyle(c));
    if (centerLayer) centerLayer.setStyle(centerStyle(c));
  });
}

/* ── Eclipse path layers ── */

function addEclipseLayers(geojson, colors) {
  // Totality polygon
  const polygon = geojson.features.find(f => f.id === 'totality-zone');
  if (polygon) {
    pathLayer = L.geoJSON(polygon, {
      style: pathStyle(colors),
    }).addTo(map);
  }

  // Centerline
  const centerline = geojson.features.find(f => f.id === 'centerline');
  if (centerline) {
    centerLayer = L.geoJSON(centerline, {
      style: centerStyle(colors),
    }).addTo(map);
  }

  // Site point (handled separately as marker)
}

function pathStyle(colors) {
  return {
    fillColor:   colors.pathFill,
    fillOpacity: 0.40,       // Was 0.20. NOTE: fillColor was rgba(…,0.15) so effective was 3% — now solid color × 0.40 = 40%
    color:       colors.pathStroke,
    weight:      2.5,
    opacity:     0.90,
  };
}

function centerStyle(colors) {
  return {
    color:     colors.centerStroke,
    weight:    2,
    opacity:   0.85,
    dashArray: '6 4',
  };
}

/* ── Site marker ── */

function addSiteMarker() {
  const icon = L.divIcon({
    html: `
      <div class="map-site-marker" aria-label="Covarrubias — sitio de observación">
        <div class="map-site-marker__ring"></div>
        <div class="map-site-marker__dot"></div>
      </div>
    `,
    className: '',
    iconSize:     [24, 24],
    iconAnchor:   [12, 12],
    popupAnchor:  [0, -14],
  });

  const popupHtml = `
    <div class="map-popup">
      <p class="map-popup__title">${site.name}</p>
      <p class="map-popup__sub">${site.region} · ${site.elevation_m} m</p>
      <p class="map-popup__coords">${lat.toFixed(4)}°N, ${Math.abs(lon).toFixed(4)}°O</p>
      <p class="map-popup__note">⚠ Horizonte oeste: verificar orografía</p>
    </div>
  `;

  markerLayer = L.marker([lat, lon], { icon })
    .bindPopup(popupHtml, { maxWidth: 220 })
    .addTo(map);
}

/* ── Tile layer toggle ── */

function wireTileToggle() {
  const topoBtn = document.querySelector('[data-map-toggle="topo"]');
  const osmBtn  = document.querySelector('[data-map-toggle="osm"]');

  if (!topoBtn || !osmBtn) return;

  topoBtn.addEventListener('click', () => {
    if (!map.hasLayer(topoLayer)) {
      map.removeLayer(osmLayer);
      map.addLayer(topoLayer);
      topoBtn.setAttribute('aria-pressed', 'true');
      osmBtn.setAttribute( 'aria-pressed', 'false');
    }
  });

  osmBtn.addEventListener('click', () => {
    if (!map.hasLayer(osmLayer)) {
      map.removeLayer(topoLayer);
      map.addLayer(osmLayer);
      osmBtn.setAttribute( 'aria-pressed', 'true');
      topoBtn.setAttribute('aria-pressed', 'false');
    }
  });
}

/* ── Theme color helpers ── */

function getThemeColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    pathFill:     style.getPropertyValue('--map-path-fill').trim()   || 'rgba(200,160,0,0.15)',
    pathStroke:   style.getPropertyValue('--map-path-stroke').trim() || 'rgba(200,160,0,0.70)',
    centerStroke: style.getPropertyValue('--map-center-stroke').trim() || 'rgba(220,180,0,0.90)',
  };
}

/**
 * flyToSite — programmatically pan to the observation site
 */
export function flyToSite(zoom = 11) {
  if (map) map.flyTo([lat, lon], zoom, { duration: 1.2 });
}

export { map };
