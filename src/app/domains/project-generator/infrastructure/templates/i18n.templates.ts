import { languageMeta } from '../../domain';
import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';

/**
 * Route-prefix i18n, adapted from `angular22-ddd-starter`'s `core/i18n/*`.
 * Generalized from the source's fixed en/ar pair to N selected languages:
 * the default language is served unprefixed, every other selected language
 * mirrored under `/<code>`. The `DOCUMENT.location.pathname` read in
 * `language.service.ts` is the hard-won fix from
 * `angular22-ddd-starter/README.md` §14 — not the browser-only `location`
 * global (absent server-side) and not the `REQUEST` token alone (unset
 * during build-time prerendering).
 */

function langsOf(ctx: TemplateContext): string[] {
  const codes = ctx.cfg.localization.selectedLanguages;
  return codes.length > 0 ? codes : [ctx.cfg.localization.defaultLanguage || 'en'];
}

function i18nModelTs(ctx: TemplateContext): string {
  const codes = langsOf(ctx);
  const defaultLang = ctx.cfg.localization.defaultLanguage || codes[0];
  const slug = ctx.cfg.project.slug || 'app';
  const langUnion = codes.map((c) => `'${c}'`).join(' | ');
  const languagesArray = codes
    .map((c) => {
      const meta = languageMeta(c);
      return `  { code: '${c}', dir: '${meta.dir}', label: '${meta.name}', nativeLabel: '${meta.native}' },`;
    })
    .join('\n');
  const prefixEntries = codes.map((c) => `  ${c}: ${c === defaultLang ? "''" : `'/${c}'`},`).join('\n');

  return `export type Lang = ${langUnion};

export interface LanguageMeta {
  readonly code: Lang;
  readonly dir: 'ltr' | 'rtl';
  readonly label: string;
  readonly nativeLabel: string;
}

export const LANGUAGES: readonly LanguageMeta[] = [
${languagesArray}
];

export const DEFAULT_LANG: Lang = '${defaultLang}';

export function dirFor(lang: Lang): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
}

export function isLang(value: string | null | undefined): value is Lang {
  return LANGUAGES.some((l) => l.code === value);
}

export const LANG_STORAGE_KEY = '${slug}-lang';
export const LANG_COOKIE_KEY = '${slug.replace(/-/g, '_')}_lang';

/** URL prefix for each language — the default language is served
 * unprefixed, every other language mirrored under /<code>, so
 * hreflang/canonicals/the sitemap stay honest. */
export const LANG_URL_PREFIX: Record<Lang, string> = {
${prefixEntries}
};

/** Rewrites a path (no query/fragment) from whichever language it's
 * currently under to targetLang's URL space. Pure and framework-free so
 * it's usable from the language toggle, LanguageService and a sitemap
 * generator alike. */
export function mirrorPath(path: string, targetLang: Lang): string {
  let withoutPrefix = path;
  for (const { code } of LANGUAGES) {
    const prefix = LANG_URL_PREFIX[code];
    if (!prefix) continue;
    if (path === prefix) {
      withoutPrefix = '/';
      break;
    }
    if (path.startsWith(\`\${prefix}/\`)) {
      withoutPrefix = path.slice(prefix.length);
      break;
    }
  }
  const targetPrefix = LANG_URL_PREFIX[targetLang];
  if (!targetPrefix) return withoutPrefix;
  return withoutPrefix === '/' ? targetPrefix : \`\${targetPrefix}\${withoutPrefix}\`;
}
`;
}

function languageServiceTs(ctx: TemplateContext): string {
  const codes = langsOf(ctx);
  const nonDefault = codes.filter((c) => c !== (ctx.cfg.localization.defaultLanguage || codes[0]));
  const prefixChecks = nonDefault
    .map((c) => `    if (path === '/${c}' || path.startsWith('/${c}/')) return '${c}';`)
    .join('\n');

  return `import { DOCUMENT, Injectable, PLATFORM_ID, REQUEST, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DEFAULT_LANG, LANG_COOKIE_KEY, LANG_STORAGE_KEY, Lang, dirFor, isLang } from './i18n.model';

/**
 * SSR-aware language state. The URL is the single source of truth for the
 * initial language, both on the server and on first paint. This reads
 * DOCUMENT.location.pathname — not the browser-only \`location\` global, and
 * not the REQUEST token alone — because @angular/platform-server seeds the
 * document's location from the actual render URL before any injectable is
 * constructed, so it is correct during prerendering too, where REQUEST is
 * never populated. Getting this wrong silently prerenders every
 * non-default-language route as the default language (see
 * angular22-ddd-starter/README.md §14 for the measured CLS impact).
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });

  private readonly _lang = signal<Lang>(this.resolveInitialLang());

  readonly lang = this._lang.asReadonly();

  constructor() {
    effect(() => {
      const lang = this._lang();
      this.document.documentElement.setAttribute('lang', lang);
      this.document.documentElement.setAttribute('dir', dirFor(lang));
    });
  }

  set(lang: Lang): void {
    this._lang.set(lang);
    if (isPlatformBrowser(this.platformId)) {
      this.document.cookie = \`\${LANG_COOKIE_KEY}=\${encodeURIComponent(lang)}; path=/; max-age=\${60 * 60 * 24 * 365}; SameSite=Lax\`;
      try {
        localStorage.setItem(LANG_STORAGE_KEY, lang);
      } catch {
        // storage unavailable — cookie already covers persistence across SSR requests
      }
    }
  }

  private resolveInitialLang(): Lang {
    const path = this.currentPath();
${prefixChecks}

    const fromCookie = this.readCookie();
    return isLang(fromCookie) ? fromCookie : DEFAULT_LANG;
  }

  private currentPath(): string {
    try {
      const pathname = this.document.location?.pathname;
      if (pathname) return pathname;
    } catch {
      // fall through
    }
    if (this.request) {
      try {
        return new URL(this.request.url).pathname;
      } catch {
        // fall through
      }
    }
    return '/';
  }

  private readCookie(): string | null {
    const source = this.request?.headers.get('cookie') ?? (isPlatformBrowser(this.platformId) ? this.document.cookie : undefined);
    if (!source) return null;
    const match = source.match(new RegExp(\`(?:^|;\\\\s*)\${LANG_COOKIE_KEY}=([^;]*)\`));
    return match ? decodeURIComponent(match[1]) : null;
  }
}
`;
}

function translationServiceTs(ctx: TemplateContext): string {
  const codes = langsOf(ctx);
  const defaultLang = ctx.cfg.localization.defaultLanguage || codes[0];
  const lazy = codes.filter((c) => c !== defaultLang);
  const lazyCases = lazy
    .map(
      (c) => `      case '${c}':
        this.catalogs.${c} = ((await import('../../../locales/${c}.json')).default ?? {}) as Catalog;
        break;`,
    )
    .join('\n');

  return `import { Injectable, PendingTasks, Signal, computed, inject, signal } from '@angular/core';
import defaultCatalog from '../../../locales/${defaultLang}.json';
import { LanguageService } from './language.service';
import { DEFAULT_LANG, Lang } from './i18n.model';

type Catalog = Record<string, string>;
type Params = Record<string, string | number>;

/**
 * Flat, namespaced translation catalogs. The default language is statically
 * imported so SSR and first paint are always correct with zero flash; every
 * other language is lazy-loaded via a dynamic import() the first time the
 * active-language signal switches to it, wrapped in PendingTasks.run() so
 * SSR/prerendering waits for it to resolve before serializing the page.
 */
@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly languageService = inject(LanguageService);
  private readonly pendingTasks = inject(PendingTasks);

  private readonly catalogs: Partial<Record<Lang, Catalog>> = {
    ${defaultLang}: defaultCatalog as Catalog,
  };

  private readonly catalogVersion = signal(0);
  private readonly pending = new Map<Lang, Promise<void>>();

  translate(key: string, params?: Params, langOverride?: Lang): string {
    const lang = langOverride ?? this.languageService.lang();
    this.catalogVersion();
    if (!this.catalogs[lang]) {
      void this.pendingTasks.run(() => this.loadCatalog(lang));
    }
    const catalog = this.catalogs[lang] ?? this.catalogs[DEFAULT_LANG]!;
    const raw = catalog[key] ?? this.catalogs[DEFAULT_LANG]?.[key] ?? key;
    return params ? interpolate(raw, params) : raw;
  }

  /** A reactive signal form of translate(), for use outside templates. */
  select(key: string, params?: Params): Signal<string> {
    return computed(() => this.translate(key, params));
  }

  private loadCatalog(lang: Lang): Promise<void> {
    let promise = this.pending.get(lang);
    if (!promise) {
      promise = this.loadCatalogOnce(lang);
      this.pending.set(lang, promise);
    }
    return promise;
  }

  private async loadCatalogOnce(lang: Lang): Promise<void> {
    switch (lang) {
${lazyCases || '      default:\n        break;'}
    }
    this.catalogVersion.update((v) => v + 1);
  }
}

function interpolate(raw: string, params: Params): string {
  return raw.replace(/\\{\\{(\\w+)\\}\\}/g, (_, token: string) => (token in params ? String(params[token]) : ''));
}
`;
}

function translatePipeTs(): string {
  return `import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/** Impure so it re-evaluates whenever the active-language signal (or a
 * lazily-loaded catalog) changes, without requiring | async. */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translation.translate(key, params);
  }
}
`;
}

function localeJson(code: string, ctx: TemplateContext): string {
  const name = ctx.cfg.project.name || 'App';
  return (
    JSON.stringify(
      {
        'app.name': name,
        'app.description': ctx.cfg.project.description || '',
        'nav.home': code === ctx.cfg.localization.defaultLanguage ? 'Home' : `[${code}] Home`,
      },
      null,
      2,
    ) + '\n'
  );
}

registerContentResolver((path, ctx) => {
  if (path.endsWith('/i18n/i18n.model.ts')) return i18nModelTs(ctx);
  if (path.endsWith('/i18n/language.service.ts')) return languageServiceTs(ctx);
  if (path.endsWith('/i18n/translation.service.ts')) return translationServiceTs(ctx);
  if (path.endsWith('/i18n/translate.pipe.ts')) return translatePipeTs();
  const localeMatch = /^src\/locales\/([a-zA-Z-]+)\.json$/.exec(path);
  if (localeMatch) return localeJson(localeMatch[1], ctx);
  return undefined;
});
