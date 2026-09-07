/**
 * File/class naming convention a generated project's own components follow.
 *
 * `modern` is the Angular CLI's flat, suffix-free schematics default shipped
 * with Angular 21 (`header.ts` / `class Header`); every earlier selectable
 * version keeps this generator's original convention (`header.component.ts`
 * / `class HeaderComponent`, `addTypeToClassName: true` in `angular.json`).
 * Both `deriveFiles()` (the path list) and every content resolver read this
 * same value, so the archive's file names and its file contents can never
 * disagree about which convention a given Angular version gets.
 */
export type ComponentNaming = 'modern' | 'classic';

export function componentNamingFor(angularVersion: string): ComponentNaming {
  return Number.parseInt(angularVersion, 10) >= 21 ? 'modern' : 'classic';
}

/** PascalCases a kebab/space/underscore-separated slug: `my-app` -> `MyApp`. */
export function toClassName(slug: string): string {
  const cleaned = slug.replace(/[^a-zA-Z0-9]+/g, ' ').trim();
  if (!cleaned) {
    return 'App';
  }
  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** camelCases the same slug: `my-app` -> `myApp`. */
export function toCamelCase(slug: string): string {
  const pascal = toClassName(slug);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/** `header` -> `header` (modern) or `header.component` (classic) — the
 * shared stem for a component's `.ts`/`.html`/`.scss`/`.spec.ts` files. */
export function componentFileStem(baseName: string, naming: ComponentNaming): string {
  return naming === 'modern' ? baseName : `${baseName}.component`;
}

/** `header` -> `Header` (modern) or `HeaderComponent` (classic). */
export function componentClassName(baseName: string, naming: ComponentNaming): string {
  const pascal = toClassName(baseName);
  return naming === 'modern' ? pascal : `${pascal}Component`;
}

/** '' (modern) or 'Component' (classic) — for class names built from a
 * domain-specific prefix rather than a plain base name, e.g. `${className}Overview${componentSuffix(naming)}`. */
export function componentSuffix(naming: ComponentNaming): string {
  return naming === 'modern' ? '' : 'Component';
}
