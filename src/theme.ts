export const THEME_COLORS = {
  light: '#f5f5f6',
  dark: '#18181c',
} as const;

export type ColorTheme = keyof typeof THEME_COLORS;
