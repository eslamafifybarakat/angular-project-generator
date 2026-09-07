import type { TemplateContext } from './template-context.model';

/**
 * Renders one file's content, or returns `undefined` to let a later resolver
 * (or the fallback stub) handle it. A resolver typically checks `path` with
 * `===`/`endsWith`/a regex and renders unconditionally when it matches.
 */
export type ContentResolver = (path: string, ctx: TemplateContext) => string | undefined;

const resolvers: ContentResolver[] = [];

/**
 * Registers a content resolver. Called at module scope by each
 * `*.templates.ts` file (a side-effecting import via `register-templates.ts`),
 * so new template modules — including ones owned by a different concurrent
 * contributor — plug in without editing this file or any other resolver.
 */
export function registerContentResolver(resolver: ContentResolver): void {
  resolvers.push(resolver);
}

/**
 * Resolves `path` to real file text by walking registered resolvers in
 * registration order; the first one that returns a string wins. A path with
 * no matching resolver gets a clearly-labelled stub instead of silently
 * empty output — that gap should never be mistaken for a real template.
 */
export function resolveContent(path: string, ctx: TemplateContext): string {
  for (const resolver of resolvers) {
    const content = resolver(path, ctx);
    if (content !== undefined) {
      return content;
    }
  }
  return fallbackContent(path);
}

function fallbackContent(path: string): string {
  return `// GENERATOR: no template registered yet for "${path}".\n// This file was listed by the configuration but has no content resolver —\n// treat this as a gap to fix in the generator, not a file to ship as-is.\n`;
}
