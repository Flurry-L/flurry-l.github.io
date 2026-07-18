export const THEME_COLORS = {
  light: '#f4f7fa',
  dark: '#161b21',
} as const;

export type ColorTheme = keyof typeof THEME_COLORS;
