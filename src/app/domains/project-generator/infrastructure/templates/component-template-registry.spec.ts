import { describe, expect, it } from 'vitest';
import type { CapabilityTemplateContext } from '../../domain/component-template.model';
import {
  componentTemplateRegistry,
  contentForPath,
  dependencyClosure,
  isEraCompatible,
  manifestFilePaths,
} from './component-template-registry';

const ctx: CapabilityTemplateContext = {
  projectName: 'My Project',
  projectSlug: 'my-project',
  sharedDir: 'shared',
  coreDir: 'core',
  stylesheetExtension: 'scss',
  naming: 'modern',
  includeTests: true,
};

describe('componentTemplateRegistry', () => {
  it('has every capability, each with real (non-empty) file content', () => {
    for (const manifest of Object.values(componentTemplateRegistry)) {
      expect(manifest.files.length).toBeGreaterThan(0);
      for (const file of manifest.files) {
        const content = file.content(ctx);
        expect(content.trim().length).toBeGreaterThan(0);
        expect(content).not.toMatch(/\bTODO\b/);
        // No leftover source-path leaks into generated content.
        expect(content).not.toMatch(/eslam-barakat-portfolio/i);
        expect(content).not.toMatch(/F:\\GitHub/i);
      }
    }
  });

  it('labels origin honestly per capability, matching what was actually verified in source', () => {
    // Toast/Modal: extracted verbatim from eslam-barakat-portfolio.
    expect(componentTemplateRegistry.toast.origin).toBe('extracted');
    expect(componentTemplateRegistry.modal.origin).toBe('extracted');
    // Storage: cookie.ts is extracted verbatim; storage.service.ts generalizes a real source pattern.
    expect(componentTemplateRegistry.storage.origin).toBe('extracted');
    // No implementation of these exists in source at all — generator-authored.
    for (const id of ['date-picker', 'routing-helpers', 'http-layer', 'error-handling', 'authentication', 'authorization'] as const) {
      expect(componentTemplateRegistry[id].origin).toBe('authored');
    }
  });

  it('resolves file paths with the architecture\'s actual shared/core folder names', () => {
    const paths = manifestFilePaths('toast', ctx);
    expect(paths).toContain('src/app/shared/ui/toast/toast.ts');

    const customCtx: CapabilityTemplateContext = { ...ctx, sharedDir: 'common', coreDir: 'kernel' };
    expect(manifestFilePaths('storage', customCtx)).toContain('src/app/kernel/storage/storage.service.ts');
  });

  it('dependencyClosure pulls in modal\'s focus-trap, http-layer\'s error-handling, and the auth chain', () => {
    expect(dependencyClosure(['modal'])).toEqual(['modal']); // focus-trap is a file within modal's own manifest, not a separate capability
    expect(dependencyClosure(['http-layer'])).toEqual(['http-layer', 'error-handling']);
    expect(dependencyClosure(['authorization'])).toEqual(['authorization', 'authentication', 'storage']);
  });

  it('contentForPath finds real content for a path it owns, and undefined for one it does not', () => {
    expect(contentForPath('src/app/shared/ui/toast/toast.service.ts', ctx)).toContain('ToastService');
    expect(contentForPath('src/app/not/a/real/path.ts', ctx)).toBeUndefined();
  });

  it('every template requiring the standalone era is unavailable for a legacy era, and available templates stay available', () => {
    expect(isEraCompatible('toast', 'standalone-modern')).toBe(true);
    expect(isEraCompatible('toast', 'ngmodule-legacy')).toBe(false);
    expect(isEraCompatible('storage', 'ngmodule-legacy')).toBe(true); // requiresEra: 'any'
  });

  it('follows classic (.component.ts-suffixed) naming for pre-21 Angular versions', () => {
    const classicCtx: CapabilityTemplateContext = { ...ctx, naming: 'classic' };
    const paths = manifestFilePaths('toast', classicCtx);
    expect(paths).toContain('src/app/shared/ui/toast/toast.component.ts');
    expect(paths).not.toContain('src/app/shared/ui/toast/toast.ts');
    expect(contentForPath('src/app/shared/ui/toast/toast.component.ts', classicCtx)).toContain('class ToastComponent');
  });

  it('omits every .spec.ts file when includeTests is false', () => {
    const noTestsCtx: CapabilityTemplateContext = { ...ctx, includeTests: false };
    for (const id of Object.keys(componentTemplateRegistry) as (keyof typeof componentTemplateRegistry)[]) {
      expect(manifestFilePaths(id, noTestsCtx).some((p) => p.endsWith('.spec.ts'))).toBe(false);
    }
  });
});
