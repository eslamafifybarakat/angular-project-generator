import { describe, expect, it } from 'vitest';
import { DEFAULT_LANG, langFromPath, mirrorPath } from './i18n.model';

describe('i18n path helpers', () => {
  it('keeps you on the same page when switching language', () => {
    expect(mirrorPath('/new/theme', 'ar')).toBe('/ar/new/theme');
    expect(mirrorPath('/ar/new/theme', 'en')).toBe('/new/theme');
    expect(mirrorPath('/ar/new/theme', 'ru')).toBe('/ru/new/theme');
  });

  it('maps the default language to the root, not to a prefix', () => {
    expect(mirrorPath('/ar', 'en')).toBe('/');
    expect(mirrorPath('/', 'en')).toBe('/');
    expect(mirrorPath('/', 'zh')).toBe('/zh');
  });

  it('reads the language back out of a path', () => {
    expect(langFromPath('/ar/new')).toBe('ar');
    expect(langFromPath('/new/theme')).toBe(DEFAULT_LANG);
    expect(langFromPath('/')).toBe(DEFAULT_LANG);
    // An unknown first segment is a route, not a language.
    expect(langFromPath('/de/new')).toBe(DEFAULT_LANG);
  });
});
