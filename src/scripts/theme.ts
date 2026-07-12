import { THEME_COLORS, type ColorTheme } from '../theme';

function currentTheme(): ColorTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function updateToggleLabel(button: HTMLButtonElement, theme: ColorTheme) {
  const label = theme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
  button.setAttribute('aria-label', label);
  button.title = label;
}

export function applyTheme(theme: ColorTheme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.pfTheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  if (persist) {
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // The theme still works for this page when storage is unavailable.
    }
  }
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme } }));
}

export function initThemeToggle(button: HTMLButtonElement) {
  updateToggleLabel(button, currentTheme());
  button.addEventListener('click', () => {
    const nextTheme = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    updateToggleLabel(button, nextTheme);
  });
}
