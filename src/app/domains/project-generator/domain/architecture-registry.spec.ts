import { describe, expect, it } from 'vitest';
import { defaultCustomArchitecture } from './architecture.model';
import { architectureExampleFiles, resolveArchitecture, validateArchitecture } from './architecture-registry';
import type { ArchitectureSection } from './project-config.model';

function section(overrides: Partial<ArchitectureSection> = {}): ArchitectureSection {
  return {
    pattern: 'ddd',
    includeExampleDomain: true,
    exampleName: '',
    custom: defaultCustomArchitecture(),
    ...overrides,
  };
}

describe('resolveArchitecture', () => {
  it('resolves DDD to core/shared/layout plus a domains/ grouping', () => {
    const resolved = resolveArchitecture(section(), 'reference-portal');
    expect(resolved.directories).toEqual(['core', 'shared', 'layout']);
    expect(resolved.groupingDir).toBe('domains');
    expect(resolved.groupingLabel).toBe('domain');
    expect(resolved.exampleName).toBe('reference');
  });

  it('resolves Feature-based to a features/ grouping with the same core/shared/layout', () => {
    const resolved = resolveArchitecture(section({ pattern: 'feature-based' }), 'reference-portal');
    expect(resolved.directories).toEqual(['core', 'shared', 'layout']);
    expect(resolved.groupingDir).toBe('features');
    expect(resolved.groupingLabel).toBe('feature');
  });

  it('resolves Simple to a flat tree with no grouping directory', () => {
    const resolved = resolveArchitecture(section({ pattern: 'simple' }), 'reference-portal');
    expect(resolved.directories).toEqual([
      'core',
      'shared',
      'pages',
      'components',
      'services',
      'models',
    ]);
    expect(resolved.groupingDir).toBe('');
    expect(resolved.layoutFilesDir).toBe('components');
  });

  it('resolves Custom from the user-defined directory names, dropping blanks', () => {
    const resolved = resolveArchitecture(
      section({
        pattern: 'custom',
        custom: {
          coreDir: 'kernel',
          sharedDir: 'common',
          layoutDir: '',
          groupingDir: 'modules',
          groupingLabel: 'domain',
          additionalDirectories: ['reports', ''],
        },
      }),
      'reference-portal',
    );
    // The grouping directory is tracked separately from the flat base
    // directories, exactly like `domains`/`features` for DDD/Feature-based.
    expect(resolved.directories).toEqual(['kernel', 'common', 'reports']);
    expect(resolved.groupingDir).toBe('modules');
    expect(resolved.coreDir).toBe('kernel');
    // No layout dir was configured, so shell components fall back to shared/.
    expect(resolved.layoutFilesDir).toBe('common');
    expect(resolved.groupingLabel).toBe('domain');
  });

  it('slugifies a custom example name and falls back to the project slug otherwise', () => {
    expect(resolveArchitecture(section({ exampleName: 'Order Book' }), 'reference-portal').exampleName).toBe(
      'order-book',
    );
    expect(resolveArchitecture(section({ exampleName: '' }), 'reference-portal').exampleName).toBe(
      'reference',
    );
    expect(resolveArchitecture(section(), '').exampleName).toBe('example');
  });
});

describe('architectureExampleFiles', () => {
  it('adds a routes file for Feature-based in the standalone era and a module in NgModule eras', () => {
    const resolved = resolveArchitecture(section({ pattern: 'feature-based' }), 'reference-portal');
    const modern = architectureExampleFiles(resolved, 'standalone-modern', 'classic', false).map((f) => f.path);
    expect(modern).toContain('src/app/features/reference/reference.routes.ts');

    const legacy = architectureExampleFiles(resolved, 'ngmodule-legacy', 'classic', false).map((f) => f.path);
    expect(legacy).toContain('src/app/features/reference/reference.module.ts');
    expect(legacy).not.toContain('src/app/features/reference/reference.routes.ts');
  });

  it('never mixes DDD layer folders into the Simple example', () => {
    const resolved = resolveArchitecture(section({ pattern: 'simple' }), 'reference-portal');
    const files = architectureExampleFiles(resolved, 'standalone-modern', 'classic', false).map((f) => f.path);
    expect(files.every((p) => !p.includes('/domain/') && !p.includes('/infrastructure/'))).toBe(
      true,
    );
    expect(files).toContain('src/app/pages/reference/reference.component.ts');
  });

  it('nests the Custom example under the user grouping directory, or flat when there is none', () => {
    const grouped = resolveArchitecture(
      section({
        pattern: 'custom',
        custom: { ...defaultCustomArchitecture(), groupingDir: 'modules' },
      }),
      'reference-portal',
    );
    expect(
      architectureExampleFiles(grouped, 'standalone-modern', 'classic', false).map((f) => f.path),
    ).toContain('src/app/modules/reference/reference.routes.ts');

    const flat = resolveArchitecture(
      section({
        pattern: 'custom',
        custom: { ...defaultCustomArchitecture(), groupingDir: '' },
      }),
      'reference-portal',
    );
    expect(
      architectureExampleFiles(flat, 'standalone-modern', 'classic', false).map((f) => f.path),
    ).toContain('src/app/reference/reference.routes.ts');
  });
});

describe('validateArchitecture', () => {
  it('passes for every non-custom pattern with defaults', () => {
    for (const pattern of ['ddd', 'feature-based', 'simple'] as const) {
      expect(validateArchitecture(section({ pattern }))).toEqual([]);
    }
  });

  it('passes for Custom with its own defaults', () => {
    expect(validateArchitecture(section({ pattern: 'custom' }))).toEqual([]);
  });

  it('requires core and shared but allows layout and grouping to be blank', () => {
    const issues = validateArchitecture(
      section({
        pattern: 'custom',
        custom: { ...defaultCustomArchitecture(), coreDir: '', sharedDir: '', layoutDir: '', groupingDir: '' },
      }),
    );
    const keys = issues.map((i) => i.messageKey);
    expect(keys.filter((k) => k === 'angular_project_generator_validation_arch_dir_empty')).toHaveLength(2);
    expect(issues.map((i) => i.path)).toContain('architecture.custom.coreDir');
    expect(issues.map((i) => i.path)).toContain('architecture.custom.sharedDir');
  });

  it('rejects traversal and absolute paths', () => {
    const traversal = validateArchitecture(
      section({ pattern: 'custom', custom: { ...defaultCustomArchitecture(), groupingDir: '../outside' } }),
    );
    expect(traversal.map((i) => i.messageKey)).toContain('angular_project_generator_validation_arch_dir_chars');

    const absolute = validateArchitecture(
      section({ pattern: 'custom', custom: { ...defaultCustomArchitecture(), layoutDir: '/etc' } }),
    );
    expect(absolute.map((i) => i.messageKey)).toContain('angular_project_generator_validation_arch_dir_chars');
  });

  it('rejects a reserved directory name', () => {
    // 'assets' is both a valid kebab-case segment and a reserved name, so this
    // exercises the reserved-name check specifically (as opposed to a name
    // like 'node_modules', which the character rule already rejects first).
    const issues = validateArchitecture(
      section({ pattern: 'custom', custom: { ...defaultCustomArchitecture(), groupingDir: 'assets' } }),
    );
    expect(issues.map((i) => i.messageKey)).toContain('angular_project_generator_validation_arch_dir_reserved');
  });

  it('flags conflicting/duplicate directories case-insensitively', () => {
    const issues = validateArchitecture(
      section({ pattern: 'custom', custom: { ...defaultCustomArchitecture(), sharedDir: 'Core' } }),
    );
    expect(issues.map((i) => i.messageKey)).toContain('angular_project_generator_validation_arch_dir_dup');
  });

  it('validates a custom example name as a single safe segment', () => {
    const issues = validateArchitecture(section({ exampleName: 'not/a/segment' }));
    expect(issues.map((i) => i.messageKey)).toContain('angular_project_generator_validation_arch_example_name');
  });

  it('ignores the example name when the example toggle is off', () => {
    const issues = validateArchitecture(section({ includeExampleDomain: false, exampleName: '!!' }));
    expect(issues).toEqual([]);
  });
});
