import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { ProjectConfigService } from '../../application/project-config.service';
import { FileContentService } from '../file-content.service';

/**
 * End-to-end check of the full pipeline this worktree's slice plugs into:
 * ProjectConfigService.generatedFiles() (paths) → FileContentService.renderAll()
 * (real text, via component-templates.templates.ts's bridge into the shared
 * content-registry). Every capability this registry owns is turned on at
 * once, across all four architecture patterns, so a naming-contract or
 * dependency-closure regression here would show up as a fallback-stub or
 * empty file rather than passing silently.
 */
describe('component templates — full generation pipeline', () => {
  it('renders real, non-stub, source-path-free content for every selected capability, in every architecture', () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const configuration = TestBed.inject(ProjectConfigService);
    const fileContent = TestBed.inject(FileContentService);

    for (const pattern of ['ddd', 'feature-based', 'simple', 'custom'] as const) {
      configuration.setArchitecturePattern(pattern);
      configuration.patch('features', { toast: 'customized', modal: 'customized', datePicker: 'customized' });
      configuration.patch('coreCapabilities', {
        routingHelpers: 'customized',
        httpLayer: 'customized',
        errorHandling: 'customized',
        storage: 'customized',
        authentication: 'customized',
        authorization: 'customized',
      });

      expect(configuration.isValid()).toBe(true);

      const files = configuration.generatedFiles();
      const rendered = fileContent.renderAll(configuration.config(), configuration.npmScripts(), files);

      const capabilityFiles = rendered.filter((f) => f.path.includes('/ui/toast/') ||
        f.path.includes('/ui/modal/') ||
        f.path.includes('/ui/date-picker/') ||
        f.path.includes('/directives/focus-trap.') ||
        f.path.includes('/routing/') ||
        f.path.includes('/http/') ||
        f.path.includes('/error/') ||
        f.path.includes('/storage/') ||
        f.path.includes('/auth/'));

      expect(capabilityFiles.length).toBeGreaterThan(20);

      for (const file of capabilityFiles) {
        expect(file.content).not.toMatch(/GENERATOR: no template registered/);
        expect(file.content.trim().length).toBeGreaterThan(0);
        expect(file.content).not.toMatch(/eslam-barakat-portfolio/i);
        expect(file.content).not.toMatch(/F:\\GitHub/i);
        expect(file.content).not.toMatch(/\.component\.ts/); // naming contract: no suffix in generated imports/paths for these
      }

      // Naming contract: components have no .component.ts suffix.
      expect(files.some((f) => f.path.endsWith('/ui/toast/toast.ts'))).toBe(true);
      expect(files.some((f) => f.path.endsWith('/ui/toast/toast.component.ts'))).toBe(false);
    }
  });
});
