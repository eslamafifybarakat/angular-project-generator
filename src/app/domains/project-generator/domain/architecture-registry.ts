import { slugify, isSafeDirectorySegment, isSafeRelativeDirPath } from '@shared/utils';
import type { GenerationEra } from './angular-version.model';
import {
  ARCHITECTURE_PROFILES,
  type ArchitectureType,
  type ResolvedArchitecture,
} from './architecture.model';
import type { GeneratedFile } from './generated-file.model';
import { componentFileStem, type ComponentNaming } from './naming';
import type { ArchitectureSection } from './project-config.model';
import type { ValidationIssue } from './validation-issue.model';

function resolveExampleName(exampleName: string, projectSlug: string): string {
  const custom = slugify(exampleName.trim());
  if (custom) {
    return custom;
  }
  const fromSlug = slugify(projectSlug).split('-')[0];
  return fromSlug || 'example';
}

/**
 * The one place that turns a `ProjectConfig.architecture` section into the
 * concrete folder names everything else reads.
 *
 * The UI, `deriveFiles()` and `validateArchitecture()` all call this rather
 * than branching on `pattern` themselves, so the preview tree and the
 * generated tree can never describe two different structures.
 */
export function resolveArchitecture(
  section: ArchitectureSection,
  projectSlug: string,
): ResolvedArchitecture {
  const exampleName = resolveExampleName(section.exampleName, projectSlug);
  const profile = ARCHITECTURE_PROFILES[section.pattern];

  switch (section.pattern) {
    case 'ddd':
      return {
        pattern: 'ddd',
        profile,
        directories: ['core', 'shared', 'layout'],
        coreDir: 'core',
        sharedDir: 'shared',
        layoutFilesDir: 'layout',
        groupingDir: 'domains',
        groupingLabel: 'domain',
        exampleName,
      };
    case 'feature-based':
      return {
        pattern: 'feature-based',
        profile,
        directories: ['core', 'shared', 'layout'],
        coreDir: 'core',
        sharedDir: 'shared',
        layoutFilesDir: 'layout',
        groupingDir: 'features',
        groupingLabel: 'feature',
        exampleName,
      };
    case 'simple':
      return {
        pattern: 'simple',
        profile,
        directories: ['core', 'shared', 'pages', 'components', 'services', 'models'],
        coreDir: 'core',
        sharedDir: 'shared',
        // Simple has no dedicated layout bucket — the shell components live
        // beside every other reusable component instead of inventing one.
        layoutFilesDir: 'components',
        groupingDir: '',
        groupingLabel: 'feature',
        exampleName,
      };
    case 'custom': {
      const custom = section.custom;
      const coreDir = custom.coreDir.trim();
      const sharedDir = custom.sharedDir.trim();
      const layoutDir = custom.layoutDir.trim();
      const groupingDir = custom.groupingDir.trim();
      const additional = custom.additionalDirectories.map((d) => d.trim()).filter(Boolean);
      const directories = [coreDir, sharedDir, layoutDir, ...additional].filter(Boolean);
      return {
        pattern: 'custom',
        profile,
        directories,
        coreDir: coreDir || 'core',
        sharedDir: sharedDir || 'shared',
        layoutFilesDir: layoutDir || sharedDir || 'shared',
        groupingDir,
        groupingLabel: custom.groupingLabel,
        exampleName,
      };
    }
  }
}

/** The layer folders inside the example slice, for the patterns that have them. */
function exampleLayerDirs(pattern: ArchitectureType): readonly string[] {
  switch (pattern) {
    case 'ddd':
      return ['domain', 'application', 'infrastructure', 'presentation'];
    case 'feature-based':
      return ['pages', 'components', 'services', 'models'];
    default:
      return [];
  }
}

/**
 * The generated-file list contributed by the architecture's example slice.
 *
 * `era` decides the bootstrap shape exactly the way it already does for the
 * root files in `deriveFiles()`: a standalone-modern target gets a functional
 * routes file, an NgModule-era target gets a routing module instead — the
 * architecture decides *where* the slice lives, the Angular version profile
 * decides *how* it wires up. `naming` picks the file-name/class-name
 * convention (see `naming.ts`) and, when `includeTests` is on, every
 * component listed here also gets a `.spec.ts` sibling.
 */
export function architectureExampleFiles(
  resolved: ResolvedArchitecture,
  era: GenerationEra,
  naming: ComponentNaming,
  includeTests: boolean,
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const add = (path: string, reason: string): void => {
    files.push({ path, reason });
  };
  const addComponent = (dir: string, baseName: string, reason: string, withHtml: boolean): void => {
    const stem = componentFileStem(baseName, naming);
    add(`${dir}/${stem}.ts`, reason);
    if (withHtml) {
      add(`${dir}/${stem}.html`, reason);
    }
    if (includeTests) {
      add(`${dir}/${stem}.spec.ts`, reason);
    }
  };
  const name = resolved.exampleName;
  const standalone = era === 'standalone-modern';
  const reasonTag = `architecture/${resolved.pattern} (example ${resolved.groupingLabel})`;

  const sliceRoot =
    resolved.pattern === 'simple'
      ? null
      : resolved.groupingDir
        ? `src/app/${resolved.groupingDir}/${name}`
        : `src/app/${name}`;

  switch (resolved.pattern) {
    case 'ddd':
    case 'feature-based': {
      const root = sliceRoot as string;
      for (const layer of exampleLayerDirs(resolved.pattern)) {
        if (resolved.pattern === 'ddd') {
          if (layer === 'domain') {
            add(`${root}/domain/${name}.model.ts`, reasonTag);
          } else if (layer === 'application') {
            add(`${root}/application/${name}.service.ts`, reasonTag);
          } else if (layer === 'infrastructure') {
            add(`${root}/infrastructure/${name}.repository.ts`, reasonTag);
            add(`${root}/infrastructure/data/${name}.data.ts`, reasonTag);
            add(`${root}/infrastructure/data/${name}.json`, reasonTag);
          } else {
            addComponent(`${root}/presentation/overview`, 'overview', reasonTag, true);
            if (!standalone) {
              add(`${root}/presentation/${name}.module.ts`, reasonTag);
            }
          }
        } else {
          if (layer === 'pages') {
            addComponent(`${root}/pages/${name}`, name, reasonTag, true);
          } else if (layer === 'components') {
            addComponent(`${root}/components/${name}-summary`, `${name}-summary`, reasonTag, false);
          } else if (layer === 'services') {
            add(`${root}/services/${name}.service.ts`, reasonTag);
          } else {
            add(`${root}/models/${name}.model.ts`, reasonTag);
          }
        }
      }
      if (resolved.pattern === 'feature-based') {
        add(standalone ? `${root}/${name}.routes.ts` : `${root}/${name}.module.ts`, reasonTag);
      }
      break;
    }
    case 'simple': {
      addComponent(`src/app/pages/${name}`, name, reasonTag, true);
      addComponent(`src/app/components/${name}-summary`, `${name}-summary`, reasonTag, false);
      add(`src/app/services/${name}.service.ts`, reasonTag);
      add(`src/app/models/${name}.model.ts`, reasonTag);
      break;
    }
    case 'custom': {
      const root = sliceRoot as string;
      addComponent(root, name, reasonTag, true);
      add(`${root}/${name}.service.ts`, reasonTag);
      add(standalone ? `${root}/${name}.routes.ts` : `${root}/${name}.module.ts`, reasonTag);
      break;
    }
  }

  return files;
}

const RESERVED_DIR_NAMES = new Set(['node_modules', '.git', '.angular', 'dist', 'assets']);

function pushDirIssue(
  issues: ValidationIssue[],
  path: string,
  value: string,
  required: boolean,
): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (required) {
      issues.push({ path, step: 'architecture', messageKey: 'angular_project_generator_validation_arch_dir_empty' });
    }
    return;
  }
  if (!isSafeRelativeDirPath(trimmed)) {
    issues.push({ path, step: 'architecture', messageKey: 'angular_project_generator_validation_arch_dir_chars' });
    return;
  }
  if (RESERVED_DIR_NAMES.has(trimmed.toLowerCase())) {
    issues.push({ path, step: 'architecture', messageKey: 'angular_project_generator_validation_arch_dir_reserved' });
  }
}

/**
 * Validates the architecture section on its own terms, independent of the
 * rest of the configuration. Every issue carries `step: 'architecture'`, so
 * it feeds the same `issues`/`isValid` gate as every other section.
 */
export function validateArchitecture(section: ArchitectureSection): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const add = (path: string, messageKey: string): void => {
    issues.push({ path, step: 'architecture', messageKey });
  };

  if (section.includeExampleDomain && section.exampleName.trim().length > 0) {
    if (!isSafeDirectorySegment(section.exampleName.trim())) {
      add('architecture.exampleName', 'angular_project_generator_validation_arch_example_name');
    }
  }

  if (section.pattern !== 'custom') {
    return issues;
  }

  const custom = section.custom;
  pushDirIssue(issues, 'architecture.custom.coreDir', custom.coreDir, true);
  pushDirIssue(issues, 'architecture.custom.sharedDir', custom.sharedDir, true);
  pushDirIssue(issues, 'architecture.custom.layoutDir', custom.layoutDir, false);
  pushDirIssue(issues, 'architecture.custom.groupingDir', custom.groupingDir, false);
  custom.additionalDirectories.forEach((dir, index) => {
    pushDirIssue(issues, `architecture.custom.additionalDirectories.${index}`, dir, true);
  });

  const named: { path: string; value: string }[] = [
    { path: 'architecture.custom.coreDir', value: custom.coreDir },
    { path: 'architecture.custom.sharedDir', value: custom.sharedDir },
    { path: 'architecture.custom.layoutDir', value: custom.layoutDir },
    { path: 'architecture.custom.groupingDir', value: custom.groupingDir },
    ...custom.additionalDirectories.map((value, index) => ({
      path: `architecture.custom.additionalDirectories.${index}`,
      value,
    })),
  ].filter((entry) => entry.value.trim().length > 0);

  const seen = new Map<string, string>();
  for (const entry of named) {
    const key = entry.value.trim().toLowerCase().replace(/\\/g, '/');
    const existing = seen.get(key);
    if (existing) {
      add(entry.path, 'angular_project_generator_validation_arch_dir_dup');
    } else {
      seen.set(key, entry.path);
    }
  }

  return issues;
}
