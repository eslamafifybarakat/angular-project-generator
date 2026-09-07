import { RenderMode, type ServerRoute } from '@angular/ssr';

/**
 * Every route is prerendered at build time.
 *
 * The wizard's state lives in memory, not in the URL beyond the step segment,
 * so each step is a static shell — nothing here needs a live server render.
 * The catch-all is prerendered too, which is what makes an unmatched path
 * return a real 404 page instead of a 400 from the host check.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
