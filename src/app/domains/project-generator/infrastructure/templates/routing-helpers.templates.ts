import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio's only routing logic beyond `@angular/router`
 * itself is `mirrorPath()` (core/i18n/i18n.model.ts) — tightly coupled to
 * its 2-language route-duplication scheme, and already generated as part of
 * the Localization feature rather than being a standalone capability. This
 * "Routing helpers" template is therefore an `authored` generalization: a
 * small, dependency-free path-building and query-param toolkit that any
 * generated project's route construction can use, independent of whether
 * localization is enabled.
 */
export const routingHelpersManifest: TemplateManifest = {
  id: 'routing-helpers',
  displayName: 'Routing helpers',
  origin: 'authored',
  sourceNote:
    'No standalone routing-helper module exists in eslam-barakat-portfolio (its only routing logic is localization-specific mirrorPath, generated separately) — generalized, generator-authored.',
  requiresEra: 'any',
  readmeContractRead: false,
  installLater: {
    package: '@ngneat/route',
    note: 'A typed-route-builder library, if this dependency-free toolkit does not cover a project\'s routing needs.',
  },
  files: [
    {
      relativePath: '{core}/routing/route-builder.ts',
      content: () => `/**
 * Small, framework-light routing helpers: build a path from typed segments,
 * and serialize/parse query parameters consistently, so route-construction
 * logic does not get repeated ad hoc across components.
 */
export type RouteParams = Readonly<Record<string, string | number | boolean>>;

/** Joins path segments, URL-encoding each one and dropping empty segments. */
export function buildPath(...segments: ReadonlyArray<string | number>): string {
  const parts = segments
    .map((segment) => String(segment).trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.split('/').map(encodeURIComponent).join('/'));
  return '/' + parts.join('/');
}

/** Serializes a flat params object into a \`?a=1&b=2\` query string ('' when there are no params). */
export function serializeQueryParams(params: RouteParams | undefined | null): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return '';
  const search = new URLSearchParams();
  for (const [key, value] of entries) {
    search.set(key, String(value));
  }
  return \`?\${search.toString()}\`;
}

/** Parses a query string (with or without a leading \`?\`) into a plain string map. */
export function parseQueryParams(search: string): Record<string, string> {
  const out: Record<string, string> = {};
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

/** Appends (or replaces) query params on an existing path. */
export function withQueryParams(path: string, params: RouteParams): string {
  const [base] = path.split('?');
  return base + serializeQueryParams(params);
}
`,
    },
    {
      relativePath: '{core}/routing/route-builder.spec.ts',
      content: () => `import { buildPath, parseQueryParams, serializeQueryParams, withQueryParams } from './route-builder';

describe('route-builder', () => {
  it('builds a path from segments, encoding and dropping empties', () => {
    expect(buildPath('work', '', 'my slug')).toBe('/work/my%20slug');
  });

  it('serializes and parses query params round-trip', () => {
    const query = serializeQueryParams({ page: 2, q: 'a b' });
    expect(query).toBe('?page=2&q=a+b');
    expect(parseQueryParams(query)).toEqual({ page: '2', q: 'a b' });
  });

  it('withQueryParams replaces any existing query string', () => {
    expect(withQueryParams('/work?old=1', { page: 3 })).toBe('/work?page=3');
  });
});
`,
    },
  ],
};
