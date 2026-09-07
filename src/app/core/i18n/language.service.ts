import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { currentPathname } from '@core/ssr/request-context';
import {
  DEFAULT_LANG,
  LANG_COOKIE_KEY,
  LANG_STORAGE_KEY,
  definitionFor,
  dirFor,
  isLang,
  langFromPath,
  type Lang,
} from './i18n.model';

/**
 * Owns the active language and keeps <html lang|dir> in step with it.
 *
 * The initial value comes from the URL, resolved through currentPathname() so
 * that build-time prerendering of /ar/... produces Arabic rather than the
 * default language. Storage is only consulted at the root, where the URL
 * carries no language of its own.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly active = signal<Lang>(this.initial());

  readonly lang = this.active.asReadonly();
  readonly dir = computed(() => dirFor(this.active()));
  readonly definition = computed(() => definitionFor(this.active()));
  readonly isRtl = computed(() => this.dir() === 'rtl');

  constructor() {
    this.applyToDocument(this.active());
  }

  use(lang: Lang): void {
    if (lang === this.active()) {
      return;
    }
    this.active.set(lang);
    this.persist(lang);
    this.applyToDocument(lang);
  }

  private initial(): Lang {
    const fromUrl = langFromPath(currentPathname());
    if (fromUrl !== DEFAULT_LANG) {
      return fromUrl;
    }
    // At the root the URL says nothing, so a returning visitor's choice wins.
    const stored = this.readStored();
    return stored ?? DEFAULT_LANG;
  }

  private readStored(): Lang | null {
    const win = this.document.defaultView;
    if (!win) {
      return null;
    }
    try {
      const value = win.localStorage.getItem(LANG_STORAGE_KEY);
      return isLang(value) ? value : null;
    } catch {
      return null;
    }
  }

  private persist(lang: Lang): void {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    try {
      win.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Private browsing — the cookie below is enough.
    }
    // Cookie as well, so an edge/SSR layer can read the preference later.
    this.document.cookie = `${LANG_COOKIE_KEY}=${lang};path=/;max-age=31536000;samesite=lax`;
  }

  private applyToDocument(lang: Lang): void {
    const root = this.document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dirFor(lang));
  }
}
