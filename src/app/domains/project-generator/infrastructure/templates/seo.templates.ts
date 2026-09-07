import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';

/** SEO layer, adapted from `angular22-ddd-starter`'s `core/seo/*`. Reads
 * `siteUrl` from the generated `environment` directly rather than a
 * `ConfigService` (this generator does not emit one), and skips hreflang
 * entirely when localization is disabled. */

function seoModelTs(): string {
  return `export type OgType = 'website' | 'article';

export interface SeoMetaInput {
  readonly title: string;
  readonly description: string;
  /** Path only (no origin) — the canonical/OG URL is built from the
   * environment's siteUrl + this path. */
  readonly path: string;
  readonly image?: string;
  readonly keywords?: string;
  readonly type?: OgType;
  readonly noindex?: boolean;
}
`;
}

function seoServiceTs(ctx: TemplateContext): string {
  const i18n = ctx.cfg.localization.enabled;
  return `import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
${i18n ? "import { LANGUAGES, mirrorPath } from '../i18n/i18n.model';\n" : ''}import type { SeoMetaInput } from './seo.model';

const DYNAMIC_LINK_MARKER = 'data-seo-dynamic';

/**
 * Sets title, meta description, canonical, Open Graph, Twitter Card${i18n ? ' and hreflang alternates' : ''}
 * for the current route. Under full prerendering these calls execute at
 * build time and are baked into static HTML — crawlable without JS
 * execution. Under live SSR or CSR-only, they still run, but only take
 * effect at request/hydration time respectively.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);

  set(input: SeoMetaInput): void {
    const siteUrl = environment.siteUrl;
    const canonicalUrl = \`\${siteUrl}\${input.path}\`;
    const ogType = input.type ?? 'website';

    this.titleService.setTitle(input.title);
    this.meta.updateTag({ name: 'description', content: input.description });
    this.meta.updateTag({ name: 'robots', content: input.noindex ? 'noindex, nofollow' : 'index, follow' });
    if (input.keywords) {
      this.meta.updateTag({ name: 'keywords', content: input.keywords });
    }

    this.meta.updateTag({ property: 'og:type', content: ogType });
    this.meta.updateTag({ property: 'og:title', content: input.title });
    this.meta.updateTag({ property: 'og:description', content: input.description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    if (input.image) {
      this.meta.updateTag({ property: 'og:image', content: input.image });
    }

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: input.title });
    this.meta.updateTag({ name: 'twitter:description', content: input.description });

    this.setLinks(input.path, siteUrl, canonicalUrl);
  }

  private setLinks(canonicalPath: string, siteUrl: string, canonicalUrl: string): void {
    this.clearDynamicLinks();
    const head = this.document.head;
    head.appendChild(this.link('canonical', canonicalUrl));
${
  i18n
    ? `    for (const { code } of LANGUAGES) {
      head.appendChild(this.link('alternate', \`\${siteUrl}\${mirrorPath(canonicalPath, code)}\`, code));
    }
    head.appendChild(this.link('alternate', \`\${siteUrl}\${canonicalPath}\`, 'x-default'));
`
    : ''
}  }

  private link(rel: string, href: string, hreflang?: string): HTMLLinkElement {
    const el = this.document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('href', href);
    if (hreflang) el.setAttribute('hreflang', hreflang);
    el.setAttribute(DYNAMIC_LINK_MARKER, '');
    return el;
  }

  private clearDynamicLinks(): void {
    this.document.head.querySelectorAll(\`link[\${DYNAMIC_LINK_MARKER}]\`).forEach((el) => el.remove());
  }
}
`;
}

function jsonLdServiceTs(): string {
  return `import { DOCUMENT, Injectable, inject } from '@angular/core';

const SCRIPT_MARKER = 'data-json-ld';

/** Injects a <script type="application/ld+json"> block into <head>,
 * replacing any previous one this service wrote. */
@Injectable({ providedIn: 'root' })
export class JsonLdService {
  private readonly document = inject(DOCUMENT);

  set(data: Record<string, unknown>): void {
    this.clear();
    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute(SCRIPT_MARKER, '');
    script.textContent = JSON.stringify(data);
    this.document.head.appendChild(script);
  }

  clear(): void {
    this.document.head.querySelectorAll(\`script[\${SCRIPT_MARKER}]\`).forEach((el) => el.remove());
  }
}
`;
}

function generateSitemapMjs(ctx: TemplateContext): string {
  const slug = ctx.cfg.project.slug || 'app';
  const langs = ctx.cfg.localization.enabled ? ctx.cfg.localization.selectedLanguages : [];
  const defaultLang = ctx.cfg.localization.defaultLanguage;
  return `#!/usr/bin/env node
// Walks the built browser output for prerendered index.html files and
// writes sitemap.xml + robots.txt next to them. Falls back to the known
// language-prefix routes if no prerendered output is found (CSR-only build).
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distBrowser = join(process.cwd(), 'dist', '${slug}', ${ctx.ssr ? "'browser'" : "''"});
const siteUrl = process.env.SITE_URL || 'https://example.com';
const languages = ${JSON.stringify(langs)};
const defaultLanguage = ${JSON.stringify(defaultLang)};

function walk(dir, base = '') {
  if (!existsSync(dir)) return [];
  const routes = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      routes.push(...walk(full, \`\${base}/\${entry}\`));
    } else if (entry === 'index.html') {
      routes.push(base || '/');
    }
  }
  return routes;
}

const routes = walk(distBrowser).length > 0
  ? walk(distBrowser)
  : languages.length > 0
    ? languages.map((code) => (code === defaultLanguage ? '/' : \`/\${code}\`))
    : ['/'];

const urls = routes
  .filter((r) => !r.includes('404'))
  .map((r) => \`  <url><loc>\${siteUrl}\${r === '/' ? '' : r}</loc></url>\`)
  .join('\\n');

writeFileSync(
  join(process.cwd(), 'dist', '${slug}', ${ctx.ssr ? "'browser'" : "''"}, 'sitemap.xml'),
  \`<?xml version="1.0" encoding="UTF-8"?>\\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n\${urls}\\n</urlset>\\n\`,
);
console.log(\`Wrote sitemap.xml with \${routes.length} route(s).\`);
`;
}

registerContentResolver((path, ctx) => {
  if (path.endsWith('/seo/seo.model.ts')) return seoModelTs();
  if (path.endsWith('/seo/seo.service.ts')) return seoServiceTs(ctx);
  if (path.endsWith('/seo/json-ld.service.ts')) return jsonLdServiceTs();
  if (path === 'scripts/generate-sitemap.mjs') return generateSitemapMjs(ctx);
  return undefined;
});
