/**
 * countdown.js — Eclipse countdown state machine
 *
 * States: pre → partial1 → totality → partial2 → post
 *
 * FRONTEND CONTRACT:
 * Only writes to:
 *   - data-countdown-state on <html> element
 *   - data-eclipse-state on <html> element
 *   - textContent of [data-countdown="*"] elements
 *   - CSS class .ticking on digit elements (animation trigger)
 * Never sets inline styles.
 */

import { getEclipseState, getContactTimes } from './eclipse.js';
import CONFIG from './config.js';

const TICK_MS = 1000;
const SUGGEST_DARK_THRESHOLD = CONFIG.countdown.darkModeSuggestMs;

let intervalId = null;
let lastState   = null;
let lastDigits  = { d: -1, h: -1, m: -1, s: -1 };
let darkSuggested = false;

/**
 * init — Start the countdown.
 * Called after eclipse.js has loaded contact times.
 */
export function init() {
  tick(); // immediate first render
  intervalId = setInterval(tick, TICK_MS);
}

function tick() {
  const now   = new Date();
  const state = getEclipseState(now);
  const ct    = getContactTimes();

  updateState(state);
  renderCountdown(now, state, ct);
  updatePhaseBar(now, state, ct);

  // Suggest dark mode once when < threshold to C2
  if (!darkSuggested && state === 'pre' || state === 'partial1') {
    const msToC2 = ct.C2 - now;
    if (msToC2 > 0 && msToC2 < SUGGEST_DARK_THRESHOLD) {
      suggestDarkMode();
      darkSuggested = true;
    }
  }
}

/**
 * updateState — write eclipse/countdown state to <html>
 */
function updateState(state) {
  if (state === lastState) return;
  lastState = state;

  const html = document.documentElement;
  html.dataset.eclipseState   = state;
  html.dataset.countdownState = state;

  // Update context label
  setContext(state);
}

/**
 * renderCountdown — compute digits and push to DOM
 */
function renderCountdown(now, state, ct) {
  let label, target, countUp, elapsed;

  switch (state) {
    case 'pre':
      target  = ct.C2;
      label   = 'Inicio de la totalidad';
      countUp = false;
      break;
    case 'partial1':
      target  = ct.C2;
      label   = '¡Faltan…  para la totalidad!';
      countUp = false;
      break;
    case 'totality':
      target  = ct.C2;
      elapsed = Math.floor((now - ct.C2) / 1000);
      label   = 'T O T A L I D A D';
      countUp = true;
      break;
    case 'partial2':
      // C4 is after sunset — count down to sunset (last visible moment)
      target  = ct.sunset ?? ct.C4;
      label   = 'El Sol se pone durante la fase parcial';
      countUp = false;
      break;
    case 'post':
    default:
      renderPost();
      return;
  }

  let totalSeconds;
  if (countUp) {
    totalSeconds = Math.floor((now - ct.C2) / 1000);
  } else {
    totalSeconds = Math.max(0, Math.floor((target - now) / 1000));
  }

  // For pre/partial1 we show days, otherwise just hh:mm:ss
  let d = 0, h = 0, m = 0, s = 0;
  const showDays = (state === 'pre');

  if (showDays) {
    d = Math.floor(totalSeconds / 86400);
    h = Math.floor((totalSeconds % 86400) / 3600);
    m = Math.floor((totalSeconds % 3600) / 60);
    s = totalSeconds % 60;
  } else if (state === 'totality') {
    // During totality count up in mm:ss.d format
    const dur = Math.max(0, totalSeconds);
    m = Math.floor(dur / 60);
    s = dur % 60;
  } else {
    h = Math.floor(totalSeconds / 3600);
    m = Math.floor((totalSeconds % 3600) / 60);
    s = totalSeconds % 60;
  }

  setDigit('days',    d, showDays);
  setDigit('hours',   h, !showDays && state !== 'totality' ? true : showDays);
  setDigit('minutes', m, true);
  setDigit('seconds', s, true);

  // Separators visibility
  setVisible('[data-countdown="sep-days"]',  showDays);
  setVisible('[data-countdown="sep-hours"]', state !== 'totality');
}

/**
 * setDigit — update a digit element with tick animation
 */
function setDigit(unit, value, visible) {
  const el = document.querySelector(`[data-countdown="${unit}"]`);
  if (!el) return;

  const padded = value < 10 ? `0${value}` : String(value);
  const container = el.closest('[data-countdown-unit]');

  if (container) container.hidden = !visible;
  if (!visible) return;

  // Animate if digit changed
  if (lastDigits[unit] !== value) {
    lastDigits[unit] = value;
    el.textContent = padded;
    el.classList.remove('ticking');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('ticking');
  }
}

/**
 * renderPost — show next eclipse info
 */
function renderPost() {
  const next = CONFIG.nextEclipse;
  document.querySelectorAll('[data-countdown="context"]').forEach(el => {
    el.textContent = `${next.label}: ${next.date}`;
  });
  document.querySelectorAll('[data-countdown="unit-wrapper"]').forEach(el => {
    el.hidden = true;
  });
  document.querySelectorAll('[data-countdown="post-message"]').forEach(el => {
    el.hidden = false;
  });
}

/**
 * setContext — update the "context" label above the countdown
 */
function setContext(state) {
  const labels = {
    pre:      'El eclipse total comienza en',
    partial1: 'La totalidad comienza en',
    totality: 'T O T A L I D A D',
    partial2: 'El eclipse termina en',
    post:     '',
  };
  document.querySelectorAll('[data-countdown="context"]').forEach(el => {
    el.textContent = labels[state] ?? '';
  });
}

/**
 * updatePhaseBar — animate the eclipse progress bar
 */
function updatePhaseBar(now, state, ct) {
  const end           = ct.C4 ?? ct.sunset;
  const totalDuration = end - ct.C1;
  if (!totalDuration) return;

  const elapsed   = Math.max(0, Math.min(now - ct.C1, totalDuration));
  const pct       = (elapsed / totalDuration) * 100;
  const totalityStart = ((ct.C2 - ct.C1) / totalDuration) * 100;
  const totalityEnd   = ((ct.C3 - ct.C1) / totalDuration) * 100;

  const bar = document.querySelector('[data-phase-bar]');
  if (!bar) return;

  bar.style.setProperty('--progress-pct', pct.toFixed(2) + '%');
  bar.style.setProperty('--totality-start', totalityStart.toFixed(2) + '%');
  bar.style.setProperty('--totality-end',   totalityEnd.toFixed(2)   + '%');

  // Update accessible label
  bar.setAttribute('aria-valuenow', Math.round(pct));
}

/**
 * setVisible — show/hide an element by CSS hidden attribute
 */
function setVisible(selector, visible) {
  document.querySelectorAll(selector).forEach(el => {
    el.hidden = !visible;
  });
}

/**
 * suggestDarkMode — show toast prompting user to switch to dark theme
 */
function suggestDarkMode() {
  const isAlreadyDark = document.documentElement.dataset.theme === 'dark';
  if (isAlreadyDark) return;

  const toast = document.querySelector('.toast--theme-suggest');
  if (!toast) return;

  toast.classList.add('toast--visible');
  setTimeout(() => toast.classList.remove('toast--visible'), 8000);
}

/**
 * stop — clean up interval (for SPA navigation etc.)
 */
export function stop() {
  if (intervalId) clearInterval(intervalId);
}
