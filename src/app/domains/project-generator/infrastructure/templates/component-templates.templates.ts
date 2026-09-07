import type { TemplateContext as CapabilityTemplateContext } from '../../domain/component-template.model';
import { registerContentResolver } from './content-registry';
import { contentForPath } from './component-template-registry';
import type { TemplateContext } from './template-context.model';

/**
 * Bridges the ComponentTemplateRegistry (toast/modal/date-picker plus the
 * six Core Capabilities — see component-template-registry.ts) into the
 * generation engine's own resolver system, by mapping the engine's richer
 * per-run TemplateContext down to the smaller shape the registry's template
 * functions actually need.
 *
 * Registered ahead of features.templates.ts in register-templates.ts.
 * features.templates.ts's toast/modal/focus-trap content was written
 * against the pre-naming-contract paths (`toast.component.ts`); deriveFiles()
 * now emits the naming-contract paths this registry produces
 * (`toast.ts`, no `.component.ts` suffix — see project-config.model.ts's
 * FeatureChoice doc comment), so there is no longer a path overlap for
 * those three files at all. Import order here only matters for whichever
 * future path might genuinely be claimed by both modules.
 */
function toCapabilityContext(ctx: TemplateContext): CapabilityTemplateContext {
  return {
    projectName: ctx.cfg.project.name,
    projectSlug: ctx.cfg.project.slug,
    sharedDir: ctx.resolved.sharedDir,
    coreDir: ctx.resolved.coreDir,
    stylesheetExtension: ctx.cfg.styling.preprocessor,
  };
}

registerContentResolver((path, ctx) => contentForPath(path, toCapabilityContext(ctx)));
