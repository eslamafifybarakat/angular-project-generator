import type { Lang } from '@core/i18n/i18n.model';

export interface SeoData {
  /** Already-translated page title, without the site-name suffix. */
  readonly title: string;
  readonly description: string;
  /** Path only, no origin and no language prefix — e.g. '/new/theme'. */
  readonly path: string;
  /** Absolute or public-root-relative image path. Falls back to the default. */
  readonly image?: string;
  readonly noIndex?: boolean;
}

export interface HrefLangEntry {
  readonly lang: Lang | 'x-default';
  readonly href: string;
}

export const SITE_NAME = 'Angular Project Generator';
export const DEFAULT_OG_IMAGE = '/og/default.png';
