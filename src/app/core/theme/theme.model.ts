export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'apg.theme';

/**
 * Browser-chrome colour per theme, for <meta name="theme-color">.
 *
 * Third leg of the three-way sync described at the top of
 * src/styles/_themes.scss. These must equal --bg in each theme block, and the
 * inline script in src/index.html must fall back to the same two values.
 */
export const THEME_COLOR: Readonly<Record<Theme, string>> = {
  light: '#f4f6fa',
  dark: '#0b0f16',
};

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}
