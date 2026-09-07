/**
 * Imports every template module for its side effect (each one calls
 * `registerContentResolver` at module scope). This is the one file a new
 * template module — including one owned by a different contributor — needs
 * to be added to; every other file in `templates/` is additive and never
 * needs editing to plug in a new resolver.
 *
 * Order matters only where two patterns could both match the same path
 * (e.g. a generic `<name>.component.ts` vs. a more specific
 * `/ui/toast/toast.component.ts`) — first-registered wins, so the more
 * specific feature/shared-scaffold resolvers are imported before the
 * general-purpose example-domain resolver.
 */
import './scaffold.templates';
import './ssr.templates';
import './theme.templates';
import './i18n.templates';
import './seo.templates';
import './environments.templates';
import './features.templates';
import './shared-scaffold.templates';
import './example-domain.templates';
import './devtools.templates';

export {};
