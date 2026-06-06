/**
 * webcam.js — Sky view snapshot + YouTube Live slot
 *
 * Strategy:
 *   1. Try candidate static image URLs (Hotel Doña Sancha, arlanza.com)
 *   2. If all fail (CORS / 404), show a link card to the Windy webcam page
 *      — NO iframe embed (Windy embed endpoint is unreliable)
 *   3. YouTube Live slot: hidden by default, activated via CONFIG.youtube.enabled
 *
 * FRONTEND CONTRACT:
 * Writes to data-* attributes and swaps img[src].
 * Never sets inline styles.
 */

import CONFIG from './config.js';

const { candidateUrls, windyEmbedUrl, refreshMs, creditName, creditUrl } = CONFIG.webcam;
const { enabled: youtubeEnabled, videoId } = CONFIG.youtube;

// Windy page URL for the direct link fallback (not the broken embed URL)
const WINDY_PAGE_URL = 'https://www.windy.com/webcams/1224781112';

let refreshTimer     = null;
let activeUrl        = null;
let lastRefreshTime  = null;

/**
 * init — Try webcam sources in priority order, set up refresh.
 */
export async function init() {
  if (youtubeEnabled && videoId) {
    activateYouTubeLive(videoId);
    return;
  }

  await trySnapshotSources();

  if (activeUrl) {
    refreshTimer = setInterval(refreshSnapshot, refreshMs);
  }
}

/* ── Snapshot loading ── */

async function trySnapshotSources() {
  for (const url of candidateUrls) {
    const ok = await testImageUrl(url);
    if (ok) {
      activeUrl = url;
      loadSnapshot(url);
      return;
    }
  }
  // All direct URLs failed — show link fallback
  showLinkFallback();
}

function testImageUrl(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => { img.src = ''; resolve(false); }, 5000);
    img.onload  = () => { clearTimeout(timeout); resolve(img.naturalWidth > 0); };
    img.onerror = () => { clearTimeout(timeout); resolve(false); };
    img.src = url + '?_=' + Date.now();
  });
}

function loadSnapshot(url) {
  const img = document.querySelector('[data-skyview="img"]');
  const placeholder = document.querySelector('[data-skyview="placeholder"]');
  if (!img) return;

  const bustUrl = url + '?_=' + Date.now();
  img.onload = () => {
    img.style.display = 'block';
    if (placeholder) placeholder.hidden = true;
    setWebcamState('snapshot');
    lastRefreshTime = new Date();
    updateRefreshLabel();
  };
  img.onerror = () => {
    // Worked before but failed now — try fallback on next cycle
    console.warn('[webcam] Snapshot reload failed, will retry');
    updateRefreshLabel('Reintentando…');
  };
  img.src = bustUrl;
  img.alt = `Vista del cielo en ${CONFIG.site.name}`;
}

function refreshSnapshot() {
  if (activeUrl) loadSnapshot(activeUrl);
  updateRefreshLabel();
}

/* ── Link fallback (replaces broken Windy iframe) ── */

function showLinkFallback() {
  const container = document.querySelector('[data-skyview="container"]');
  if (!container) return;

  container.innerHTML = `
    <div class="skyview__placeholder" style="flex-direction:column; gap: var(--space-4); padding: var(--space-6);">
      <span aria-hidden="true" style="font-size:2rem; opacity:0.25;">◎</span>
      <p style="font-size:var(--text-sm); color:var(--text-secondary); text-align:center; line-height:1.6;">
        Imagen directa no disponible.<br>
        Ver la cámara en directo en:
      </p>
      <a href="${WINDY_PAGE_URL}"
         target="_blank" rel="noopener noreferrer"
         style="display:inline-flex; align-items:center; gap:var(--space-2);
                font-family:var(--font-ui); font-size:var(--text-sm);
                color:var(--accent); border:1px solid var(--accent-dim);
                border-radius:var(--radius-full); padding:var(--space-2) var(--space-4);
                text-decoration:none;">
        Windy.com — Covarrubias ↗
      </a>
      <a href="${creditUrl}"
         target="_blank" rel="noopener noreferrer"
         style="font-family:var(--font-ui); font-size:var(--text-xs); color:var(--text-tertiary);">
        ${creditName}
      </a>
    </div>
  `;

  setWebcamState('link');
}

/* ── YouTube Live ── */

function activateYouTubeLive(vid) {
  const slot = document.getElementById('live-slot');
  if (!slot) return;

  slot.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${vid}?autoplay=1&mute=0"
      title="Eclipse solar 2026 — Retransmisión en directo desde Covarrubias"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
      allowfullscreen
    ></iframe>
  `;
  slot.hidden = false;

  const snapshotSection = document.querySelector('[data-skyview="section"]');
  if (snapshotSection) snapshotSection.hidden = true;

  setWebcamState('live');
}

/* ── DOM updates ── */

function setWebcamState(state) {
  const wrapper = document.querySelector('[data-skyview="wrapper"]');
  if (wrapper) wrapper.dataset.skyviewState = state;

  const badge = document.querySelector('[data-skyview="badge"]');
  if (badge) {
    const labels = { snapshot: 'imagen estática', link: 'ver en Windy', live: '● EN DIRECTO', error: 'sin señal' };
    badge.textContent = labels[state] ?? state;
    badge.className   = state === 'live' ? 'skyview__badge skyview__badge--live' : 'skyview__badge skyview__badge--snapshot';
  }

  const credit = document.querySelector('[data-skyview="credit"]');
  if (credit) {
    if (state === 'snapshot') credit.innerHTML = `<a href="${creditUrl}" target="_blank" rel="noopener">${creditName}</a>`;
    else credit.textContent = '';
  }
}

function updateRefreshLabel(override = null) {
  const el = document.querySelector('[data-skyview="refresh"]');
  if (!el) return;
  if (override) { el.textContent = override; return; }
  if (lastRefreshTime) {
    const secsAgo = Math.round((Date.now() - lastRefreshTime.getTime()) / 1000);
    el.textContent = secsAgo < 5 ? 'actualizado ahora' : `actualizado hace ${secsAgo}s`;
  }
}

export function stop() {
  if (refreshTimer) clearInterval(refreshTimer);
}
