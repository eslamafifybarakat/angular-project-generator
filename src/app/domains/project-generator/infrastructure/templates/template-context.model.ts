import type {
  AngularVersionProfile,
  GenerationEra,
  ResolvedArchitecture,
  GeneratedFile,
  ProjectConfig,
} from '../../domain';

/**
 * Everything a content resolver needs to render one file's text.
 *
 * Built once per generation run by `FileContentService.buildContext()` and
 * passed to every resolver, so no resolver re-derives `era`/`standalone`/`ssr`
 * from `cfg` itself and risks disagreeing with `deriveFiles()`'s own reading
 * of the same values.
 */
export interface TemplateContext {
  readonly cfg: ProjectConfig;
  readonly resolved: ResolvedArchitecture;
  readonly era: GenerationEra;
  readonly profile: AngularVersionProfile | undefined;
  readonly standalone: boolean;
  readonly ssr: boolean;
  readonly npmScripts: readonly string[];
  /** Every file this run will write — for templates (README, sitemap script) that need the whole set, not just their own path. */
  readonly files: readonly GeneratedFile[];
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
