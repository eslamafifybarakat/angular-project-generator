/**
 * The registry that backs every "Copy template" option — Toast/Modal/Date
 * picker plus the six Core Capabilities. One shape for all nine so a new
 * capability is a new registry entry, not a new code path.
 */

export type TemplateCapabilityId =
  | 'toast'
  | 'modal'
  | 'date-picker'
  | 'routing-helpers'
  | 'http-layer'
  | 'error-handling'
  | 'storage'
  | 'authentication'
  | 'authorization';

/**
 * 'extracted' — real content pulled from eslam-barakat-portfolio and
 * transformed (naming contract, project identity, styling extension).
 * 'authored' — the source project has no implementation of this capability
 * at all (verified during template-specification analysis, see
 * eslam-barakat-portfolio/docs/generator/TEMPLATE_SPECIFICATION.md §12-§14),
 * so this is a net-new, hand-written implementation following the same
 * conventions. Surfaced in the UI/README rather than passed off as
 * extraction — the golden rule is "real content", not "content that pretends
 * to come from somewhere it didn't."
 */
export type TemplateOrigin = 'extracted' | 'authored';

/** Resolved once per generation from ProjectConfig + ResolvedArchitecture. */
export interface TemplateContext {
  readonly projectName: string;
  readonly projectSlug: string;
  /** Resolved architecture's shared-code folder, e.g. 'shared'. */
  readonly sharedDir: string;
  /** Resolved architecture's core-code folder, e.g. 'core'. */
  readonly coreDir: string;
  readonly stylesheetExtension: 'scss' | 'sass' | 'css' | 'less';
}

export interface TemplateFile {
  /**
   * Path relative to `src/app/`, with `{shared}`/`{core}` standing in for
   * the resolved architecture's actual folder names, and `{style}` standing
   * in for the resolved stylesheet extension — resolved via `resolvedPath()`.
   */
  readonly relativePath: string;
  readonly content: (ctx: TemplateContext) => string;
}

export interface TemplateManifest {
  readonly id: TemplateCapabilityId;
  readonly displayName: string;
  readonly origin: TemplateOrigin;
  /** One line, shown in the generated README's "Source" line. */
  readonly sourceNote: string;
  readonly files: readonly TemplateFile[];
  /**
   * Other capability ids force-included whenever this one is selected,
   * regardless of that capability's own selection — e.g. Modal always brings
   * focus-trap, Authorization always brings Authentication. Resolved
   * transitively by `dependencyClosure()`.
   */
  readonly requiredCapabilities?: readonly TemplateCapabilityId[];
  /**
   * 'standalone-modern' templates use signals, standalone components and the
   * new control-flow syntax, so they require the standalone-era bootstrap;
   * 'any' templates are plain TS/data with no era-sensitive Angular API.
   */
  readonly requiresEra: 'standalone-modern' | 'any';
  /**
   * True only for the three capabilities eslam-barakat-portfolio's own
   * docs/generator/TEMPLATE_SPECIFICATION.md actually documents (§12 Toast,
   * §13 Date picker, §14 Modal) — the six Core Capabilities have no such
   * contract to have read, so this stays false for them rather than being
   * defaulted to true. Drives the "README contract read" status line —
   * never shown unless this is actually true.
   */
  readonly readmeContractRead: boolean;
  /** Recommended third-party package documented in the README for "Install later". */
  readonly installLater: { readonly package: string; readonly note: string };
}

export function resolvedPath(file: TemplateFile, ctx: TemplateContext): string {
  return `src/app/${file.relativePath
    .replace('{shared}', ctx.sharedDir)
    .replace('{core}', ctx.coreDir)
    .replace(/\{style\}/g, ctx.stylesheetExtension)}`;
}
