import {
  resolvedPath,
  type TemplateCapabilityId,
  type TemplateContext,
  type TemplateManifest,
} from '../../domain/component-template.model';
import { authenticationManifest } from './authentication.templates';
import { authorizationManifest } from './authorization.templates';
import { datePickerManifest } from './date-picker.templates';
import { errorHandlingManifest } from './error-handling.templates';
import { httpLayerManifest } from './http-layer.templates';
import { modalManifest } from './modal.templates';
import { routingHelpersManifest } from './routing-helpers.templates';
import { storageManifest } from './storage.templates';
import { toastManifest } from './toast.templates';

/**
 * The one place every "Copy template" option resolves through — Toast,
 * Modal and Date picker (the UI-component templates) plus the six Core
 * Capabilities. Adding a tenth template means adding a tenth entry here,
 * nothing else in this file changes.
 */
export const componentTemplateRegistry: Readonly<Record<TemplateCapabilityId, TemplateManifest>> = {
  toast: toastManifest,
  modal: modalManifest,
  'date-picker': datePickerManifest,
  'routing-helpers': routingHelpersManifest,
  'http-layer': httpLayerManifest,
  'error-handling': errorHandlingManifest,
  storage: storageManifest,
  authentication: authenticationManifest,
  authorization: authorizationManifest,
};

/**
 * Expands a set of selected template ids to include every capability they
 * transitively require (Modal → focus-trap is inside modal's own file list;
 * HTTP layer → Error handling, Authentication → Storage, Authorization →
 * Authentication are cross-capability and resolved here) — so a selection
 * can never produce a file that imports something that was not generated.
 */
export function dependencyClosure(ids: readonly TemplateCapabilityId[]): TemplateCapabilityId[] {
  const closure = new Set<TemplateCapabilityId>();
  const visit = (id: TemplateCapabilityId): void => {
    if (closure.has(id)) return;
    closure.add(id);
    for (const dep of componentTemplateRegistry[id].requiredCapabilities ?? []) {
      visit(dep);
    }
  };
  ids.forEach(visit);
  return [...closure];
}

/** Every generated file path a template (and its own file list only, not its capability dependencies) produces. */
export function manifestFilePaths(id: TemplateCapabilityId, ctx: TemplateContext): string[] {
  return componentTemplateRegistry[id].files.map((file) => resolvedPath(file, ctx));
}

/** Looks up real file content for a path this registry is responsible for, or undefined if no template owns it. */
export function contentForPath(path: string, ctx: TemplateContext): string | undefined {
  for (const manifest of Object.values(componentTemplateRegistry)) {
    for (const file of manifest.files) {
      if (resolvedPath(file, ctx) === path) {
        return file.content(ctx);
      }
    }
  }
  return undefined;
}

/**
 * A template is compatible with the selected Angular version's generation
 * era when it requires no era at all, or when the era is the standalone/
 * signals-based one every template in this registry is actually written
 * against (verified per-template, not assumed) — legacy (NgModule-bootstrap)
 * eras have no adapter yet, so "Copy template" is honestly unavailable
 * there rather than silently offered and broken.
 */
export function isEraCompatible(id: TemplateCapabilityId, era: string): boolean {
  const manifest = componentTemplateRegistry[id];
  return manifest.requiresEra === 'any' || era === 'standalone-modern';
}
