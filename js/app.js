/**
 * app.js — Entry point
 *
 * Responsibilities:
 *   - Theme toggle (dark/light, persisted to localStorage)
 *   - Accordion interactions
 *   - Module initialization sequence
 *   - Toast management
 */

import * as Eclipse   from './eclipse.js';
import * as Countdown from './countdown.js';
import * as Weather   from './weather.js';
import * as Map       from './map.js';

/* ══════════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

  initTheme();
  initAccordions();

  // Eclipse data first — countdown depends on it
  await Eclipse.init();

  // Parallel: map + weather
  await Promise.allSettled([
    Map.init(),
    Weather.init(),
  ]);

  // Countdown last (depends on eclipse contact times)
  Countdown.init();
});

/* ══════════════════════════════════════════════════════════════
   THEME
   ══════════════════════════════════════════════════════════════ */

function initTheme() {
  const saved = localStorage.getItem('eclipse-theme');
  const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  const theme  = saved ?? 'dark'; // default dark regardless of system

  applyTheme(theme);

  const btn = document.querySelector('.theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);

  // System preference change (only if user hasn't explicitly chosen)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('eclipse-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  updateToggleIcon(theme);

  // Dispatch event so map.js can update layer colors
  document.documentElement.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme ?? 'dark';
  const next    = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('eclipse-theme', next);
}

function updateToggleIcon(theme) {
  const btn = document.querySelector('.theme-toggle');
  if (!btn) return;
  btn.textContent   = theme === 'dark' ? '☀' : '☽';
  btn.setAttribute('aria-label', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  btn.setAttribute('title',      theme === 'dark' ? 'Modo claro'           : 'Modo oscuro');
}

/* ══════════════════════════════════════════════════════════════
   ACCORDION
   ══════════════════════════════════════════════════════════════ */

function initAccordions() {
  document.querySelectorAll('.accordion__item').forEach(item => {
    // Use <details>/<summary> native behavior — no JS open/close needed.
    // JS only handles the icon rotation and ARIA.
    const summary = item.querySelector('summary.accordion__trigger');
    if (!summary) return;

    item.addEventListener('toggle', () => {
      const icon = summary.querySelector('.accordion__icon');
      if (icon) icon.textContent = item.open ? '▲' : '▼';
      summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════════════════════════ */

document.addEventListener('click', e => {
  if (e.target.closest('.toast__close')) {
    const toast = e.target.closest('.toast');
    if (toast) toast.classList.remove('toast--visible');
  }
});

// Toast close on dark mode suggestion accepted
const themeToast = document.querySelector('.toast--theme-suggest');
if (themeToast) {
  themeToast.addEventListener('click', e => {
    if (e.target.closest('[data-action="accept-dark"]')) {
      applyTheme('dark');
      localStorage.setItem('eclipse-theme', 'dark');
      themeToast.classList.remove('toast--visible');
    }
  });
}
