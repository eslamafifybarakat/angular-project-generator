import { Injectable, computed, inject, signal } from '@angular/core';
import { LanguageService } from './language.service';
import { DEFAULT_LANG, type Lang } from './i18n.model';
import en from '../../../locales/en.json';

type Catalog = Record<string, string>;

/**
 * Flat, namespaced key lookup with `{{param}}` interpolation.
 *
 * The default language is imported statically so the first server-rendered
 * paint never shows keys. Every other language is fetched on demand, and until
 * it lands, lookups fall back to the default catalog rather than to the raw
 * key.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly language = inject(LanguageService);
  private readonly catalogs = signal<Partial<Record<Lang, Catalog>>>({
    [DEFAULT_LANG]: en as Catalog,
  });

  private readonly active = computed<Catalog>(
    () => this.catalogs()[this.language.lang()] ?? (en),
  );

  /** Bumped whenever a catalog arrives, so the impure pipe re-evaluates. */
  readonly version = computed(() => `${this.language.lang()}:${Object.keys(this.catalogs()).length}`);

  translate(key: string, params?: Readonly<Record<string, string | number>>): string {
    const catalog = this.active();
    const template = catalog[key] ?? (en as Catalog)[key];
    if (template === undefined) {
      return key;
    }
    if (!params) {
      return template;
    }
    return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      Object.hasOwn(params, name) ? String(params[name]) : match,
    );
  }

  async load(lang: Lang): Promise<void> {
    if (this.catalogs()[lang]) {
      return;
    }
    const catalog = await this.fetch(lang);
    if (catalog) {
      this.catalogs.update((all) => ({ ...all, [lang]: catalog }));
    }
  }

  private async fetch(lang: Lang): Promise<Catalog | null> {
    switch (lang) {
      case 'ar':
        return (await import('../../../locales/ar.json')).default;
      case 'zh':
        return (await import('../../../locales/zh.json')).default;
      case 'ru':
        return (await import('../../../locales/ru.json')).default;
      default:
        return null;
    }
  }
}
