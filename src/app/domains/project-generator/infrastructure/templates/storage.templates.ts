import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * Extracted from eslam-barakat-portfolio's `src/app/core/ssr/cookie.util.ts`
 * (verbatim — generic, no project-specific values) and generalized from its
 * `theme.service.ts`/`language.service.ts` persist()/resolve() pattern
 * (per-feature, hand-duplicated) into one reusable `StorageService`. The
 * source's live-SSR request-cookie read (via Angular's REQUEST token) is
 * intentionally not carried over — the source project itself notes most
 * routes are prerendered and that branch rarely fires; this keeps the
 * generated service correct for the common prerender/CSR-hydration case
 * without depending on an API this pass could not verify against every
 * supported Angular version. `cookie.util.ts` is renamed to `cookie.ts`,
 * matching the file-naming cleanup the source project's own spec already
 * flagged as the one inconsistency (TEMPLATE_SPECIFICATION.md §15).
 */
export const storageManifest: TemplateManifest = {
  id: 'storage',
  displayName: 'Storage',
  origin: 'extracted',
  sourceNote:
    'eslam-barakat-portfolio: src/app/core/ssr/cookie.util.ts (verbatim) + generalized theme/language persist pattern',
  requiresEra: 'any',
  readmeContractRead: false,
  installLater: {
    package: '@ngx-pwa/local-storage',
    note: 'A heavier, RxJS-based storage abstraction with schema validation, if this SSR-safe wrapper is not enough.',
  },
  files: [
    {
      relativePath: '{core}/storage/cookie.ts',
      content: () => `/** Parses a \`Cookie\` header (or \`document.cookie\`) into a plain map. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;

  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;
    const key = pair.slice(0, eq).trim();
    if (!key) continue;
    out[key] = decodeURIComponent(pair.slice(eq + 1).trim());
  }

  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAgeDays?: number; path?: string } = {},
): string {
  const { maxAgeDays = 365, path = '/' } = opts;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  return \`\${name}=\${encodeURIComponent(value)}; path=\${path}; max-age=\${maxAge}; samesite=lax\`;
}
`,
    },
    {
      relativePath: '{core}/storage/storage.service.ts',
      content: (ctx) => `import { DOCUMENT, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { parseCookies, serializeCookie } from './cookie';

/**
 * SSR-safe key/value persistence: localStorage as the browser-only primary
 * store, a cookie as a lighter fallback so values remain readable if
 * localStorage throws (private browsing, quota exceeded). Guarded by
 * \`isPlatformBrowser\` throughout — never touches \`localStorage\`/\`document\`
 * unconditionally, so it is safe to call from any injection context
 * regardless of platform. Every key is prefixed with the project slug so
 * two generated projects served from the same origin in development never
 * collide.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly prefix = '${ctx.projectSlug}-';

  get(key: string): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;
    const fullKey = this.prefix + key;
    try {
      const fromStorage = this.document.defaultView?.localStorage.getItem(fullKey);
      if (fromStorage !== null && fromStorage !== undefined) return fromStorage;
    } catch {
      // Falls through to the cookie below.
    }
    return parseCookies(this.document.cookie)[fullKey] ?? null;
  }

  set(key: string, value: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const fullKey = this.prefix + key;
    try {
      this.document.defaultView?.localStorage.setItem(fullKey, value);
    } catch {
      // Storage can throw in private-browsing/quota-exceeded contexts; the
      // cookie write below still gives the value a chance to persist.
    }
    this.document.cookie = serializeCookie(fullKey, value);
  }

  remove(key: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const fullKey = this.prefix + key;
    try {
      this.document.defaultView?.localStorage.removeItem(fullKey);
    } catch {
      // See set() above.
    }
    this.document.cookie = serializeCookie(fullKey, '', { maxAgeDays: 0 });
  }
}
`,
    },
    {
      relativePath: '{core}/storage/storage.service.spec.ts',
      content: () => `import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  it('round-trips a value through localStorage', () => {
    const service = TestBed.inject(StorageService);
    service.set('token', 'abc123');
    expect(service.get('token')).toBe('abc123');
    service.remove('token');
    expect(service.get('token')).toBeNull();
  });
});
`,
    },
  ],
};
