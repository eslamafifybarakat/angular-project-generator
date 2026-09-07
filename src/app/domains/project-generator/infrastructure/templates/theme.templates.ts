import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';

/**
 * Theme/token layer, adapted from `angular22-ddd-starter`'s
 * `_tokens.scss`/`_themes.scss`/`theme.model.ts`/`theme.service.ts`.
 *
 * The 3-way brand-color mapping is a documented, deliberate choice (the
 * source project's `--accent`/`--cta` role pair has no clean 1:1 counterpart
 * for 3 user inputs, per `TEMPLATE_SPECIFICATION.md` §8): `primaryColor` ->
 * `--accent`, `secondaryColor` -> `--cta`, `accentColor` -> `--brass`
 * (a tertiary highlight role). Structural bg/surface/text tokens are fixed,
 * accessible neutrals — not derived from the 3 brand inputs, which don't
 * carry enough information to derive a whole neutral scale safely.
 */

function stylesScss(): string {
  return `@use 'styles/tokens';
@use 'styles/themes';
@use 'styles/typography';

:root {
  color-scheme: light dark;
}

html,
body {
  height: 100%;
  margin: 0;
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
}
`;
}

function tokensScss(): string {
  return `@use 'sass:map';

// Structural scale only — identical in both themes. Color lives in
// _themes.scss exclusively; do not add color values here.
$space: (
  xs: 0.25rem,
  sm: 0.5rem,
  md: 1rem,
  lg: 1.5rem,
  xl: 2.5rem,
);
$radii: (
  sm: 0.25rem,
  md: 0.5rem,
  lg: 1rem,
  pill: 999px,
);

:root {
  --space-xs: #{map.get($space, xs)};
  --space-sm: #{map.get($space, sm)};
  --space-md: #{map.get($space, md)};
  --space-lg: #{map.get($space, lg)};
  --space-xl: #{map.get($space, xl)};
  --radius-sm: #{map.get($radii, sm)};
  --radius-md: #{map.get($radii, md)};
  --radius-lg: #{map.get($radii, lg)};
  --radius-pill: #{map.get($radii, pill)};

  // Flips 1 -> -1 under [dir='rtl'] so a transform mirrors in one place
  // instead of at every call site.
  --dx: 1;
}

html[dir='rtl'] {
  --dx: -1;
}

@mixin below($breakpoint) {
  @media (max-width: $breakpoint) {
    @content;
  }
}
`;
}

function themesScss(ctx: TemplateContext): string {
  const { primaryColor, secondaryColor, accentColor } = ctx.cfg.theme;
  return `// Single source of truth for color. Every color is a CSS custom property,
// scoped per html[data-theme='dark'|'light'] block.
//
// Three-way sync point (documented, not accidental): the background values
// below must stay in sync with src/index.html's no-flash inline script and
// core/theme/theme.model.ts's THEME_COLOR map — change one, change all three,
// or the browser's native chrome color (address bar) drifts from the page.
html[data-theme='dark'] {
  --bg: #0b0f14;
  --surface: #151b22;
  --surface-2: #1c232c;
  --text: #f4f4f4;
  --muted: #9aa4b2;
  --line: #2a323d;
  --accent: ${primaryColor};
  --cta: ${secondaryColor};
  --brass: ${accentColor};
}

html[data-theme='light'] {
  --bg: #fbfaf8;
  --surface: #ffffff;
  --surface-2: #f2f1ee;
  --text: #14181d;
  --muted: #565f6b;
  --line: #e2e0da;
  --accent: ${primaryColor};
  --cta: ${secondaryColor};
  --brass: ${accentColor};
}
`;
}

function typographyScss(ctx: TemplateContext): string {
  const fonts = ctx.cfg.fonts;
  const families = Object.values(fonts);
  const unique = Array.from(new Set(families.length ? families : ['Inter']));
  return `// Font stacks. Self-hosted @font-face blocks are intentionally not
// generated here — the generator does not carry a font-file catalog or
// licensing data (see TEMPLATE_SPECIFICATION.md §7) — wire in real .woff2
// files under public/fonts/ and matching @font-face rules before shipping.
:root {
  --font-body: '${unique[0] ?? 'Inter'}', system-ui, sans-serif;
  --font-display: '${unique[0] ?? 'Inter'}', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;
}

html[dir='rtl'] {
  // Add per-language font-family overrides here if a language needs a
  // distinct Arabic/Hebrew-script stack (see i18n step's font selection).
}
`;
}

function themeModelTs(): string {
  return `export type Theme = 'dark' | 'light';

export const DEFAULT_THEME: Theme = 'dark';

export const THEME_STORAGE_KEY = 'app-theme';
export const THEME_COOKIE_KEY = 'app_theme';

// Kept in sync with src/styles/_themes.scss and the no-flash inline script
// in src/index.html — three places, one value each, all three must change
// together or the browser chrome color drifts from the page.
export const THEME_COLOR: Record<Theme, string> = {
  dark: '#0b0f14',
  light: '#fbfaf8',
};

export function isTheme(value: string | null | undefined): value is Theme {
  return value === 'dark' || value === 'light';
}
`;
}

function themeServiceTs(ctx: TemplateContext): string {
  const dualMode = ctx.cfg.theme.supportDualMode;
  if (!dualMode) {
    return `import { DOCUMENT, Injectable, inject } from '@angular/core';
import { THEME_COLOR } from './theme.model';

/** Single-theme project (dual-mode toggle disabled) — applies the light
 * theme's attributes once and exposes nothing to switch it at runtime. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  constructor() {
    this.document.documentElement.setAttribute('data-theme', 'light');
    const meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = THEME_COLOR.light;
  }
}
`;
  }
  return `import { DOCUMENT, Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_THEME, THEME_COLOR, THEME_STORAGE_KEY, Theme, isTheme } from './theme.model';

/**
 * Signal-based theme state. A no-flash inline script at the top of
 * index.html already resolves and applies the correct data-theme before
 * Angular boots — on the browser this service reads that back so it never
 * causes a second, conflicting write.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly _theme = signal<Theme>(this.resolveInitialTheme());

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const theme = this._theme();
      this.document.documentElement.setAttribute('data-theme', theme);
      const meta = this.document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (meta) meta.content = THEME_COLOR[theme];
    });
  }

  set(theme: Theme): void {
    this._theme.set(theme);
    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch {
        // storage unavailable — the current in-memory value still applies
      }
    }
  }

  toggle(): void {
    this.set(this._theme() === 'dark' ? 'light' : 'dark');
  }

  private resolveInitialTheme(): Theme {
    if (isPlatformBrowser(this.platformId)) {
      const fromDom = this.document.documentElement.getAttribute('data-theme');
      if (isTheme(fromDom)) return fromDom;
    }
    return DEFAULT_THEME;
  }
}
`;
}

function apiResponseModelTs(): string {
  return `/** Envelope every domain's seed JSON is shaped as, so a future real
 * backend can slot in behind *.repository.ts without changing *.service.ts
 * or any component. */
export interface ApiResponse<T> {
  readonly status: 'ok' | 'error';
  readonly message: string;
  readonly data: T;
}
`;
}

function readApiResponseTs(): string {
  return `import type { ApiResponse } from './api-response.model';

/** Unwraps an ApiResponse<T> envelope, throwing on a non-'ok' status rather
 * than letting malformed seed/API data silently propagate as T. */
export function readApiResponse<T>(response: ApiResponse<T>): T {
  if (response.status !== 'ok') {
    throw new Error(\`API response error: \${response.message}\`);
  }
  return response.data;
}
`;
}

registerContentResolver((path, ctx) => {
  if (path === 'src/styles.scss') return stylesScss();
  if (path === 'src/styles/_tokens.scss') return tokensScss();
  if (path === 'src/styles/_themes.scss') return themesScss(ctx);
  if (path === 'src/styles/_typography.scss') return typographyScss(ctx);
  if (path.endsWith('/theme/theme.model.ts')) return themeModelTs();
  if (path.endsWith('/theme/theme.service.ts')) return themeServiceTs(ctx);
  if (path.endsWith('/data/api-response.model.ts')) return apiResponseModelTs();
  if (path.endsWith('/data/read-api-response.ts')) return readApiResponseTs();
  return undefined;
});
