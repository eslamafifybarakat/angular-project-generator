/** The four interface languages this app ships. */
export type Lang = 'en' | 'ar' | 'zh' | 'ru';

export type Direction = 'ltr' | 'rtl';

export interface LanguageDefinition {
  readonly code: Lang;
  /** English name, for the language switcher's accessible label. */
  readonly name: string;
  /** Endonym, shown in the switcher. */
  readonly native: string;
  readonly dir: Direction;
  /** Path prefix. Empty for the default language, which sits at the root. */
  readonly prefix: string;
}

export const LANGUAGES: readonly LanguageDefinition[] = [
  { code: 'en', name: 'English', native: 'English', dir: 'ltr', prefix: '' },
  { code: 'ar', name: 'Arabic', native: 'العربية', dir: 'rtl', prefix: 'ar' },
  { code: 'zh', name: 'Chinese', native: '中文', dir: 'ltr', prefix: 'zh' },
  { code: 'ru', name: 'Russian', native: 'Русский', dir: 'ltr', prefix: 'ru' },
];

export const DEFAULT_LANG: Lang = 'en';

export const LANG_STORAGE_KEY = 'apg.lang';
export const LANG_COOKIE_KEY = 'apg_lang';

/** Path prefix per language. The default language deliberately maps to ''. */
export const LANG_URL_PREFIX: Readonly<Record<Lang, string>> = {
  en: '',
  ar: 'ar',
  zh: 'zh',
  ru: 'ru',
};

export function isLang(value: unknown): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

export function definitionFor(code: Lang): LanguageDefinition {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

export function dirFor(code: Lang): Direction {
  return definitionFor(code).dir;
}

/**
 * Same page, different language. `/ar/new/theme` <-> `/new/theme`.
 * Used by the language switcher so switching never drops you at the root.
 */
export function mirrorPath(pathname: string, target: Lang): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && isLang(segments[0])) {
    segments.shift();
  }
  const prefix = LANG_URL_PREFIX[target];
  const rest = segments.join('/');
  if (!prefix) {
    return rest ? `/${rest}` : '/';
  }
  return rest ? `/${prefix}/${rest}` : `/${prefix}`;
}

/** Reads the language out of a pathname, defaulting to DEFAULT_LANG. */
export function langFromPath(pathname: string): Lang {
  const first = pathname.split('/').filter(Boolean)[0];
  return isLang(first) ? first : DEFAULT_LANG;
}
