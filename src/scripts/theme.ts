import { THEME_COLORS, type ColorTheme } from '../theme';

function currentTheme(): ColorTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function updateToggleLabel(button: HTMLButtonElement, theme: ColorTheme) {
  const label = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
  button.setAttribute('aria-label', label);
  button.title = label;
}

function syncToggleLabels() {
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
    if (button instanceof HTMLButtonElement) updateToggleLabel(button, currentTheme());
  });
}

function setThemeOnRoot(theme: ColorTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.pfTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function applyTheme(theme: ColorTheme, persist = true) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Crossfade a full-page snapshot so every color blends uniformly — per-
  // property CSS transitions leave some elements snapping while others fade.
  // #main-content carries a permanent view-transition-name for navigation
  // animations; inside its own group the browser interpolates the group's
  // position between snapshots, which reads as a vertical jump during theme
  // changes. Exclude it from this one transition.
  if (!reduceMotion && typeof document.startViewTransition === 'function') {
    const main = document.getElementById('main-content');
    main?.style.setProperty('view-transition-name', 'none', 'important');
    const transition = document.startViewTransition(() => setThemeOnRoot(theme));
    void transition.finished.finally(() => {
      main?.style.removeProperty('view-transition-name');
    });
  } else {
    setThemeOnRoot(theme);
  }
  if (persist) {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // The theme still works for this page when storage is unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
}

/**
 * ClientRouter swaps <html> attributes with the incoming (theme-less) document
 * on every navigation, so re-apply the saved/system theme after each swap.
 */
function restoreTheme() {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem('theme');
  } catch {
    // Fall back to the system preference when storage is unavailable.
  }
  const theme: ColorTheme = saved === 'dark'
    || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ? 'dark'
    : 'light';
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.pfTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

document.addEventListener('astro:after-swap', restoreTheme);

let listening = false;

/**
 * Binds theme toggles via event delegation, so toggles keep working when the
 * header is re-rendered by client-side navigations. Safe to call on every
 * astro:page-load — the listener is registered once, labels re-sync each time.
 */
export function initThemeToggle() {
  syncToggleLabels();
  if (listening) return;
  listening = true;

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('[data-theme-toggle]')
      : null;
    if (!(button instanceof HTMLButtonElement)) return;

    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    updateToggleLabel(button, nextTheme);
  });
}
