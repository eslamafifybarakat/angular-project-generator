import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ConfigService } from '@core/config/config.service';
import { LanguageService } from '@core/i18n/language.service';
import { LANGUAGES, LANG_URL_PREFIX, DEFAULT_LANG } from '@core/i18n/i18n.model';
import { DEFAULT_OG_IMAGE, SITE_NAME, type HrefLangEntry, type SeoData } from './seo.model';

/**
 * Writes the per-route head: title, description, canonical, hreflang set,
 * Open Graph and Twitter tags.
 *
 * Everything is derived from the active language plus the caller's path, so a
 * prerendered /ar/new page gets an Arabic canonical and a complete hreflang
 * set pointing at its own siblings — not the default language's.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly config = inject(ConfigService);
  private readonly language = inject(LanguageService);

  apply(data: SeoData): void {
    const lang = this.language.lang();
    const full = `${data.title} · ${SITE_NAME}`;
    const canonical = this.absolute(this.localized(data.path, lang));
    const image = this.absolute(data.image ?? DEFAULT_OG_IMAGE);

    this.title.setTitle(full);
    this.setName('description', data.description);
    this.setName('robots', data.noIndex ? 'noindex,nofollow' : 'index,follow');

    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:title', full);
    this.setProperty('og:description', data.description);
    this.setProperty('og:url', canonical);
    this.setProperty('og:image', image);
    this.setProperty('og:locale', lang);

    this.setName('twitter:card', 'summary_large_image');
    this.setName('twitter:title', full);
    this.setName('twitter:description', data.description);
    this.setName('twitter:image', image);

    this.setCanonical(canonical);
    this.setHrefLangs(this.hrefLangs(data.path));
  }

  hrefLangs(path: string): readonly HrefLangEntry[] {
    const entries: HrefLangEntry[] = LANGUAGES.map((l) => ({
      lang: l.code,
      href: this.absolute(this.localized(path, l.code)),
    }));
    entries.push({ 'lang': 'x-default', href: this.absolute(this.localized(path, DEFAULT_LANG)) });
    return entries;
  }

  private localized(path: string, lang: string): string {
    const prefix = LANG_URL_PREFIX[lang as keyof typeof LANG_URL_PREFIX] ?? '';
    const clean = path === '/' ? '' : path.replace(/^\/+/, '');
    if (!prefix) {
      return clean ? `/${clean}` : '/';
    }
    return clean ? `/${prefix}/${clean}` : `/${prefix}`;
  }

  private absolute(pathOrUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }
    return `${this.config.siteUrl.replace(/\/+$/, '')}${pathOrUrl}`;
  }

  private setName(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content });
  }

  private setCanonical(href: string): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setHrefLangs(entries: readonly HrefLangEntry[]): void {
    const head = this.document.head;
    head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => {
      el.remove();
    });
    for (const entry of entries) {
      const link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', entry.lang);
      link.setAttribute('href', entry.href);
      head.appendChild(link);
    }
  }
}
