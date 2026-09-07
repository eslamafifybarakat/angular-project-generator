import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectConfigService } from './project-config.service';

describe('ProjectConfigService', () => {
  let service: ProjectConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    service = TestBed.inject(ProjectConfigService);
  });

  it('starts from a configuration that passes its own validation', () => {
    expect(service.issues()).toEqual([]);
    expect(service.isValid()).toBe(true);
  });

  it('derives the slug from the name until the slug is edited by hand', () => {
    service.setProjectName('Reference Portal');
    expect(service.config().project.slug).toBe('reference-portal');

    service.setProjectSlug('ref-portal');
    service.setProjectName('Something Else');
    expect(service.config().project.slug).toBe('ref-portal');
  });

  it('rejects a default language that is not among the selected languages', () => {
    service.toggleLanguage('ar', false);
    service.patch('localization', { defaultLanguage: 'ar' });
    expect(service.issuesFor('languages').map((issue) => issue.messageKey)).toContain(
      'angular_project_generator_validation_default_lang',
    );
  });

  it('flags duplicate environment names', () => {
    service.addEnvironment();
    service.updateEnvironment(3, {
      name: 'production',
      apiUrl: 'https://api.example.com',
      siteUrl: 'https://example.com',
    });
    expect(service.issuesFor('environments').map((issue) => issue.messageKey)).toContain(
      'angular_project_generator_validation_env_dup',
    );
  });

  it('leaves the current configuration untouched when an import is rejected', () => {
    const before = service.toJson();
    const result = service.importJson(
      JSON.stringify({
        angular: { version: '14' },
        features: { toast: 'none', modal: 'none', datePicker: 'customized' },
      }),
    );
    expect(result.issues.map((issue) => issue.messageKey)).toContain(
      'angular_project_generator_validation_template_era_incompatible',
    );
    expect(service.toJson()).toBe(before);
  });

  it('reports a parse error rather than throwing on malformed JSON', () => {
    const result = service.importJson('{ not json');
    expect(result.parseError).toBeTruthy();
    expect(result.issues).toEqual([]);
  });

  it('only lists server files when the configuration is server-rendered', () => {
    const withSsr = service.generatedFiles().map((file) => file.path);
    expect(withSsr).toContain('src/server.ts');

    service.patch('rendering', { mode: 'csr', prerender: false });
    const withoutSsr = service.generatedFiles().map((file) => file.path);
    expect(withoutSsr).not.toContain('src/server.ts');
  });

  it('drops locale files when localization is switched off', () => {
    expect(service.generatedFiles().map((f) => f.path)).toContain('src/locales/ar.json');
    service.patch('localization', { enabled: false });
    expect(service.generatedFiles().map((f) => f.path)).not.toContain('src/locales/ar.json');
  });

  it('resets event-replay hydration when switching to a version that cannot produce it', () => {
    service.patch('rendering', { hydrationStrategy: 'event-replay' });
    expect(service.config().rendering.hydrationStrategy).toBe('event-replay');

    service.setAngularVersion('16');
    expect(service.config().rendering.hydrationStrategy).toBe('default');
    expect(service.angularProfile()?.eventReplay).toBe('unavailable');
  });

  it('keeps event-replay hydration when the new version still supports it', () => {
    service.patch('rendering', { hydrationStrategy: 'event-replay' });
    service.setAngularVersion('19');
    expect(service.config().rendering.hydrationStrategy).toBe('event-replay');
  });

  it('writes NgModule bootstrap files instead of standalone ones for a pre-17 version', () => {
    service.setAngularVersion('14');
    const paths = service.generatedFiles().map((f) => f.path);
    expect(paths).toContain('src/app/app.module.ts');
    expect(paths).toContain('src/app/app.server.module.ts');
    expect(paths).not.toContain('src/app/app.config.ts');
    expect(paths).not.toContain('src/app/app.config.server.ts');
  });

  it('rejects an unknown Angular version', () => {
    service.patch('angular', { version: '99' });
    expect(service.issuesFor('angular').map((issue) => issue.messageKey)).toContain(
      'angular_project_generator_validation_angular',
    );
  });

  describe('architecture', () => {
    it('writes the DDD domain slice by default', () => {
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/domains/my/domain/my.model.ts');
      expect(paths).toContain('src/app/domains/my/presentation/overview/overview.component.ts');
      expect(service.resolvedArchitecture().groupingLabel).toBe('domain');
    });

    it('writes a features/ slice instead of domains/ for Feature-based', () => {
      service.setArchitecturePattern('feature-based');
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/features/my/my.routes.ts');
      expect(paths).toContain('src/app/features/my/services/my.service.ts');
      expect(paths.some((p) => p.startsWith('src/app/domains/'))).toBe(false);
      expect(service.resolvedArchitecture().groupingLabel).toBe('feature');
    });

    it('writes a flat pages/components/services/models tree for Simple, never DDD layers', () => {
      service.setArchitecturePattern('simple');
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/pages/my/my.component.ts');
      expect(paths).toContain('src/app/services/my.service.ts');
      expect(paths).toContain(`src/app/${service.resolvedArchitecture().layoutFilesDir}/header/header.component.ts`);
      expect(service.resolvedArchitecture().layoutFilesDir).toBe('components');
      expect(paths.some((p) => p.includes('/domain/') || p.includes('/infrastructure/'))).toBe(
        false,
      );
    });

    it('routes core/shared/example generation through the user-defined Custom directories', () => {
      service.setArchitecturePattern('custom');
      service.updateCustomArchitecture({ coreDir: 'kernel', sharedDir: 'common', groupingDir: 'modules' });
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/kernel/theme/theme.model.ts');
      expect(paths).toContain('src/app/common/utils/slugify.ts');
      expect(paths).toContain('src/app/modules/my/my.component.ts');
    });

    it('drops the example slice entirely when the toggle is off, regardless of pattern', () => {
      service.patch('architecture', { includeExampleDomain: false });
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths.some((p) => p.includes('/my/') || p.includes('/my.'))).toBe(false);
    });

    it('flags a duplicate Custom directory and keeps Next blocked', () => {
      service.setArchitecturePattern('custom');
      service.updateCustomArchitecture({ sharedDir: 'core' });
      expect(service.issuesFor('architecture').map((i) => i.messageKey)).toContain(
        'angular_project_generator_validation_arch_dir_dup',
      );
      expect(service.isValid()).toBe(false);
    });

    it('rejects a Custom directory with illegal characters', () => {
      service.setArchitecturePattern('custom');
      service.updateCustomArchitecture({ groupingDir: '../escape' });
      expect(service.issuesFor('architecture').map((i) => i.messageKey)).toContain(
        'angular_project_generator_validation_arch_dir_chars',
      );
    });

    it('rejects an empty additional Custom directory', () => {
      service.setArchitecturePattern('custom');
      service.addCustomDirectory();
      expect(service.issuesFor('architecture').map((i) => i.messageKey)).toContain(
        'angular_project_generator_validation_arch_dir_empty',
      );
      service.updateCustomDirectory(0, 'reports');
      expect(service.isValid()).toBe(true);
      service.removeCustomDirectory(0);
      expect(service.config().architecture.custom.additionalDirectories).toHaveLength(0);
    });

    it('never leaks Custom directories into another pattern', () => {
      service.setArchitecturePattern('custom');
      service.updateCustomArchitecture({ coreDir: 'kernel' });
      service.setArchitecturePattern('ddd');
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/core/theme/theme.model.ts');
      expect(paths.some((p) => p.startsWith('src/app/kernel/'))).toBe(false);
    });

    it('writes an NgModule-based example slice for a pre-17 Angular version', () => {
      service.setAngularVersion('14');
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/domains/my/presentation/my.module.ts');
    });
  });

  describe('component templates', () => {
    it('writes toast under the naming contract (no .component.ts suffix)', () => {
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/shared/ui/toast/toast.ts');
      expect(paths).toContain('src/app/shared/ui/toast/toast.service.ts');
      expect(paths).not.toContain('src/app/shared/ui/toast/toast.component.ts');
    });

    it('date picker can now be copied as a template, and writes its files', () => {
      service.patch('features', { datePicker: 'customized' });
      expect(service.isValid()).toBe(true);
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/shared/ui/date-picker/date-picker.ts');
      expect(paths).toContain('src/app/shared/ui/date-picker/date-picker.spec.ts');
    });

    it('rejects date picker "customized" for a pre-standalone Angular version', () => {
      service.setAngularVersion('14');
      service.patch('features', { datePicker: 'customized' });
      expect(service.issuesFor('features').map((i) => i.messageKey)).toContain(
        'angular_project_generator_validation_template_era_incompatible',
      );
    });

    it('HTTP layer force-includes Error handling even when Error handling itself is "none"', () => {
      service.patch('coreCapabilities', { httpLayer: 'customized', errorHandling: 'none' });
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/core/http/api.service.ts');
      expect(paths).toContain('src/app/core/error/app-error.model.ts');
    });

    it('Authorization transitively force-includes Authentication and Storage', () => {
      service.patch('coreCapabilities', { authorization: 'customized' });
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths).toContain('src/app/core/auth/authorization.service.ts');
      expect(paths).toContain('src/app/core/auth/auth.service.ts');
      expect(paths).toContain('src/app/core/storage/storage.service.ts');
    });

    it('"none" core capabilities generate nothing', () => {
      const paths = service.generatedFiles().map((f) => f.path);
      expect(paths.some((p) => p.includes('/core/auth/') || p.includes('/core/http/'))).toBe(false);
    });
  });
});
