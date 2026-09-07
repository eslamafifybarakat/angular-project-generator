import { DOCUMENT, inject } from '@angular/core';

/**
 * The path the current render is for — correct in all three contexts.
 *
 * This is the most load-bearing function in the SSR setup. It must read
 * `DOCUMENT.location.pathname`, because:
 *
 *   - the browser-only `location` global does not exist on the server;
 *   - `@angular/ssr`'s REQUEST token is populated only for a *live* SSR
 *     request, and is absent during build-time prerendering.
 *
 * Reading either of those instead makes every non-default-language route
 * prerender as the default language. That produces no build error, no lint
 * error and no failing test — it surfaces only as layout shift in a Lighthouse
 * run against the real prerendered output. See README §"The prerender trap".
 */
export function currentPathname(): string {
  const doc = inject(DOCUMENT);
  const path = doc.location?.pathname;
  return typeof path === 'string' && path.length > 0 ? path : '/';
}

/** First path segment, or '' at the root. */
export function firstSegment(pathname: string): string {
  return pathname.split('/').filter(Boolean)[0] ?? '';
}
