import { Injectable, computed, inject, signal } from '@angular/core';
import { slugify } from '@shared/utils/slugify';
import { isAbsoluteUrl, isDisplayName, isHexColor, isKebabSlug } from '@shared/utils/validators';
import { AngularVersionRepository } from '../infrastructure/angular-version.repository';
import type { AngularVersionProfile } from '../domain/angular-version.model';
import type { Preset, PresetPatch } from '../domain/preset.model';
import type { ValidationIssue } from '../domain/validation-issue.model';
import type { GeneratedFile } from '../domain/generated-file.model';
import type { ArchitectureType, CustomArchitectureConfig, ResolvedArchitecture } from '../domain/architecture.model';
import { architectureExampleFiles, resolveArchitecture, validateArchitecture } from '../domain/architecture-registry';
import {
  DEVELOPER_TOOL_KEYS,
  defaultProjectConfig,
  fontsFor,
  languageMeta,
  type EnvironmentEntry,
  type ProjectConfig,
  type WizardStepId,
} from '../domain/project-config.model';

/**
 * Signal facade over the one ProjectConfig.
 *
 * Everything the wizard shows is derived here — validation, the file list, the
 * npm scripts — so no step keeps private state that can drift from another
 * step's view of the same setting.
 */
@Injectable({ providedIn: 'root' })
export class ProjectConfigService {
  private readonly versions = inject(AngularVersionRepository);
  private readonly state = signal<ProjectConfig>(defaultProjectConfig());
  /** Once the slug is edited by hand, the name stops overwriting it. */
  private slugTouched = false;

  readonly config = this.state.asReadonly();

  /**
   * The full capability profile for the selected Angular version — the single
   * source every version-aware derivation (files, scripts, hydration options)
   * reads from, so none of them can drift from what the version step shows.
   */
  readonly angularProfile = computed<AngularVersionProfile | undefined>(() =>
    this.versions.find(this.state().angular.version),
  );

  /**
   * The single resolved view of the architecture section — folder names,
   * grouping bucket, example slug. The architecture step, the review step and
   * `deriveFiles()` all read this instead of branching on `pattern`
   * themselves, so the preview tree and the generated tree can never
   * describe two different structures.
   */
  readonly resolvedArchitecture = computed<ResolvedArchitecture>(() => {
    const cfg = this.state();
    return resolveArchitecture(cfg.architecture, cfg.project.slug);
  });

  readonly issues = computed<readonly ValidationIssue[]>(() => this.validate(this.state()));

  readonly isValid = computed(() => this.issues().length === 0);

  readonly generatedFiles = computed<readonly GeneratedFile[]>(() =>
    this.deriveFiles(this.state()),
  );

  readonly npmScripts = computed<readonly string[]>(() => this.deriveScripts(this.state()));

  readonly hasRtlLanguage = computed(() => {
    const loc = this.state().localization;
    return loc.enabled && loc.selectedLanguages.some((c) => languageMeta(c).dir === 'rtl');
  });

  readonly isServerRendered = computed(() => {
    const mode = this.state().rendering.mode;
    return mode === 'ssr' || mode === 'hybrid';
  });

  issuesFor(step: WizardStepId): readonly ValidationIssue[] {
    return this.issues().filter((issue) => issue.step === step);
  }

  issuesForPath(path: string): readonly ValidationIssue[] {
    return this.issues().filter((issue) => issue.path === path);
  }

  // -- mutations ------------------------------------------------------------

  patch<K extends keyof ProjectConfig>(section: K, value: Partial<ProjectConfig[K]>): void {
    this.state.update((cfg) => ({ ...cfg, [section]: { ...cfg[section], ...value } }));
  }

  /**
   * Switches the generation target and reconciles whatever the previous
   * version's profile allowed but the new one does not, so a choice the new
   * version can't produce never reaches the file deriver silently. Only one
   * wizard field is version-sensitive today (event-replay hydration) — SSR
   * on/off, localization, SEO and PWA are not gated by the real Angular
   * compatibility matrix, so there is nothing else here to reconcile yet.
   */
  setAngularVersion(version: string): void {
    const profile = this.versions.find(version);
    this.state.update((cfg) => {
      const next: ProjectConfig = { ...cfg, angular: { ...cfg.angular, version } };
      if (profile && profile.eventReplay === 'unavailable' && next.rendering.hydrationStrategy === 'event-replay') {
        next.rendering = { ...next.rendering, hydrationStrategy: 'default' };
      }
      return next;
    });
  }

  setArchitecturePattern(pattern: ArchitectureType): void {
    this.patch('architecture', { pattern });
  }

  setArchitectureExampleName(exampleName: string): void {
    this.patch('architecture', { exampleName });
  }

  updateCustomArchitecture(value: Partial<CustomArchitectureConfig>): void {
    this.state.update((cfg) => ({
      ...cfg,
      architecture: {
        ...cfg.architecture,
        custom: { ...cfg.architecture.custom, ...value },
      },
    }));
  }

  addCustomDirectory(): void {
    this.updateCustomArchitecture({
      additionalDirectories: [...this.state().architecture.custom.additionalDirectories, ''],
    });
  }

  updateCustomDirectory(index: number, value: string): void {
    this.updateCustomArchitecture({
      additionalDirectories: this.state().architecture.custom.additionalDirectories.map((dir, i) =>
        i === index ? value : dir,
      ),
    });
  }

  removeCustomDirectory(index: number): void {
    this.updateCustomArchitecture({
      additionalDirectories: this.state().architecture.custom.additionalDirectories.filter(
        (_, i) => i !== index,
      ),
    });
  }

  setProjectName(name: string): void {
    this.state.update((cfg) => ({
      ...cfg,
      project: {
        ...cfg.project,
        name,
        slug: this.slugTouched ? cfg.project.slug : slugify(name),
      },
    }));
  }

  setProjectSlug(slug: string): void {
    this.slugTouched = true;
    this.patch('project', { slug });
  }

  setFont(languageCode: string, font: string): void {
    this.state.update((cfg) => ({ ...cfg, fonts: { ...cfg.fonts, [languageCode]: font } }));
  }

  toggleLanguage(code: string, selected: boolean): void {
    this.state.update((cfg) => {
      const current = cfg.localization.selectedLanguages;
      const next = selected
        ? current.includes(code)
          ? current
          : [...current, code]
        : current.filter((c) => c !== code);
      const fonts = { ...cfg.fonts };
      if (selected && !fonts[code]) {
        fonts[code] = fontsFor(code)[0];
      }
      return { ...cfg, localization: { ...cfg.localization, selectedLanguages: next }, fonts };
    });
  }

  addEnvironment(): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: [...cfg.environments, { name: '', apiUrl: '', siteUrl: '', extra: [] }],
    }));
  }

  removeEnvironment(index: number): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: cfg.environments.filter((_, i) => i !== index),
    }));
  }

  updateEnvironment(index: number, value: Partial<EnvironmentEntry>): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: cfg.environments.map((env, i) => (i === index ? { ...env, ...value } : env)),
    }));
  }

  addEnvironmentVariable(index: number): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: cfg.environments.map((env, i) =>
        i === index ? { ...env, extra: [...env.extra, { key: '', value: '' }] } : env,
      ),
    }));
  }

  updateEnvironmentVariable(
    index: number,
    varIndex: number,
    value: Partial<{ key: string; value: string }>,
  ): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: cfg.environments.map((env, i) =>
        i === index
          ? {
              ...env,
              extra: env.extra.map((v, j) => (j === varIndex ? { ...v, ...value } : v)),
            }
          : env,
      ),
    }));
  }

  removeEnvironmentVariable(index: number, varIndex: number): void {
    this.state.update((cfg) => ({
      ...cfg,
      environments: cfg.environments.map((env, i) =>
        i === index ? { ...env, extra: env.extra.filter((_, j) => j !== varIndex) } : env,
      ),
    }));
  }

  applyPreset(preset: Preset): void {
    this.slugTouched = false;
    this.state.set(this.merge(defaultProjectConfig(), preset.patch));
  }

  reset(): void {
    this.slugTouched = false;
    this.state.set(defaultProjectConfig());
  }

  // -- import / export ------------------------------------------------------

  toJson(): string {
    return JSON.stringify(this.state(), null, 2);
  }

  /**
   * Validates before applying. A rejected import leaves the current
   * configuration untouched and returns the reasons, so a bad paste cannot
   * half-overwrite a session's work.
   */
  importJson(text: string): { readonly issues: readonly ValidationIssue[]; readonly parseError?: string } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      return { issues: [], parseError: error instanceof Error ? error.message : 'Invalid JSON' };
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return { issues: [], parseError: 'Expected a JSON object' };
    }
    const candidate = this.merge(defaultProjectConfig(), parsed);
    const issues = this.validate(candidate);
    if (issues.length > 0) {
      return { issues };
    }
    this.slugTouched = true;
    this.state.set(candidate);
    return { issues: [] };
  }

  private merge(base: ProjectConfig, patch: PresetPatch): ProjectConfig {
    const next = { ...base } as unknown as Record<string, unknown>;
    for (const key of Object.keys(patch) as (keyof ProjectConfig)[]) {
      const value = patch[key];
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        next[key] = [...value];
      } else if (typeof value === 'object' && value !== null) {
        next[key] = { ...(base[key] as object), ...value };
      }
    }
    return next as unknown as ProjectConfig;
  }

  // -- validation -----------------------------------------------------------

  private validate(cfg: ProjectConfig): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const add = (path: string, step: WizardStepId, messageKey: string): void => {
      issues.push({ path, step, messageKey });
    };

    if (cfg.project.name.trim().length === 0) {
      add('project.name', 'project', 'validation.name');
    } else if (!isDisplayName(cfg.project.name)) {
      add('project.name', 'project', 'validation.nameChars');
    }
    if (!isKebabSlug(cfg.project.slug)) {
      add('project.slug', 'project', 'validation.slug');
    }

    if (!this.versions.find(cfg.angular.version)?.selectable) {
      add('angular.version', 'angular', 'validation.angular');
    }

    issues.push(...validateArchitecture(cfg.architecture));

    for (const key of ['primaryColor', 'secondaryColor', 'accentColor'] as const) {
      if (!isHexColor(cfg.theme[key])) {
        add(`theme.${key}`, 'theme', 'validation.color');
      }
    }

    if (cfg.localization.enabled) {
      if (cfg.localization.selectedLanguages.length === 0) {
        add('localization.selectedLanguages', 'languages', 'validation.langs');
      } else if (!cfg.localization.selectedLanguages.includes(cfg.localization.defaultLanguage)) {
        add('localization.defaultLanguage', 'languages', 'validation.defaultLang');
      }
    }

    const seen = new Set<string>();
    cfg.environments.forEach((env, index) => {
      const name = env.name.trim().toLowerCase();
      if (name.length === 0) {
        add(`environments.${index}.name`, 'environments', 'validation.envName');
      } else if (seen.has(name)) {
        add(`environments.${index}.name`, 'environments', 'validation.envDup');
      } else {
        seen.add(name);
      }
      if (!isAbsoluteUrl(env.apiUrl)) {
        add(`environments.${index}.apiUrl`, 'environments', 'validation.url');
      }
      if (!isAbsoluteUrl(env.siteUrl)) {
        add(`environments.${index}.siteUrl`, 'environments', 'validation.url');
      }
    });

    // The date picker has no verified template, so 'customized' is rejected
    // outright rather than quietly downgraded to 'none'.
    if ((cfg.features.datePicker as string) === 'customized') {
      add('features.datePicker', 'features', 'validation.datePicker');
    }

    return issues;
  }

  // -- derived output -------------------------------------------------------

  private deriveFiles(cfg: ProjectConfig): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const add = (path: string, reason: string): void => {
      files.push({ path, reason });
    };
    const ssr = cfg.rendering.mode === 'ssr' || cfg.rendering.mode === 'hybrid';
    const era = this.versions.find(cfg.angular.version)?.era ?? 'standalone-modern';
    const standaloneEra = era === 'standalone-modern';
    const resolved = resolveArchitecture(cfg.architecture, cfg.project.slug);
    const { coreDir, sharedDir, layoutFilesDir } = resolved;

    for (const path of [
      'package.json',
      'angular.json',
      'tsconfig.json',
      'README.md',
      'src/index.html',
      'src/main.ts',
      'src/app/app.component.ts',
      'src/app/app.component.html',
    ]) {
      add(path, 'scaffold');
    }

    if (standaloneEra) {
      add('src/app/app.config.ts', 'scaffold (standalone bootstrap)');
      add('src/app/app.routes.ts', 'scaffold (standalone bootstrap)');
    } else {
      add('src/app/app.module.ts', 'scaffold (NgModule bootstrap)');
      add('src/app/app-routing.module.ts', 'scaffold (NgModule bootstrap)');
    }

    if (ssr) {
      if (standaloneEra) {
        for (const path of [
          'src/main.server.ts',
          'src/server.ts',
          'src/app/app.config.server.ts',
          'src/app/app.routes.server.ts',
        ]) {
          add(path, 'ssr (@angular/ssr)');
        }
      } else {
        for (const path of ['src/main.server.ts', 'src/server.ts', 'src/app/app.server.module.ts']) {
          add(path, 'ssr (@nguniversal/express-engine)');
        }
      }
    }

    for (const path of [
      'src/styles.scss',
      'src/styles/_tokens.scss',
      'src/styles/_themes.scss',
      'src/styles/_typography.scss',
      `src/app/${coreDir}/theme/theme.model.ts`,
      `src/app/${coreDir}/theme/theme.service.ts`,
    ]) {
      add(path, 'theme');
    }

    add(`src/app/${coreDir}/data/api-response.model.ts`, `architecture/${resolved.pattern}`);
    add(`src/app/${coreDir}/data/read-api-response.ts`, `architecture/${resolved.pattern}`);

    if (cfg.localization.enabled) {
      for (const path of [
        `src/app/${coreDir}/i18n/i18n.model.ts`,
        `src/app/${coreDir}/i18n/language.service.ts`,
        `src/app/${coreDir}/i18n/translation.service.ts`,
        `src/app/${coreDir}/i18n/translate.pipe.ts`,
      ]) {
        add(path, 'localization');
      }
      for (const code of cfg.localization.selectedLanguages) {
        add(`src/locales/${code}.json`, 'localization');
      }
    }

    if (cfg.seo.enabled) {
      add(`src/app/${coreDir}/seo/seo.model.ts`, 'seo');
      add(`src/app/${coreDir}/seo/seo.service.ts`, 'seo');
      if (cfg.seo.jsonLd) {
        add(`src/app/${coreDir}/seo/json-ld.service.ts`, 'seo');
      }
      if (cfg.seo.sitemap) {
        add('scripts/generate-sitemap.mjs', 'seo');
      }
    }

    cfg.environments.forEach((env, index) => {
      add(`src/environments/environment.${slugify(env.name) || 'unnamed'}.ts`, 'environments');
      if (index === 0) {
        add('src/environments/environment.ts', 'environments');
      }
    });

    if (cfg.features.toast === 'customized') {
      add(`src/app/${sharedDir}/ui/toast/toast.component.ts`, 'features/toast');
      add(`src/app/${sharedDir}/ui/toast/toast.service.ts`, 'features/toast');
    }
    if (cfg.features.modal === 'customized') {
      add(`src/app/${sharedDir}/ui/modal/modal.component.ts`, 'features/modal');
      add(`src/app/${sharedDir}/directives/focus-trap.directive.ts`, 'features/modal');
    }

    add(`src/app/${sharedDir}/utils/slugify.ts`, `architecture/${resolved.pattern}`);
    add(`src/app/${layoutFilesDir}/header/header.component.ts`, `architecture/${resolved.pattern}`);
    add(`src/app/${layoutFilesDir}/footer/footer.component.ts`, `architecture/${resolved.pattern}`);

    if (cfg.architecture.includeExampleDomain) {
      for (const file of architectureExampleFiles(resolved, era)) {
        add(file.path, file.reason);
      }
    }

    if (cfg.developerTools.eslint) {
      add('eslint.config.js', 'developer-tools');
    }
    if (cfg.developerTools.prettier) {
      add('.prettierrc', 'developer-tools');
    }
    if (cfg.developerTools.editorconfig) {
      add('.editorconfig', 'developer-tools');
    }

    return files.sort((a, b) => a.path.localeCompare(b.path));
  }

  private deriveScripts(cfg: ProjectConfig): string[] {
    const scripts = ['start', 'build', 'test'];
    if (cfg.developerTools.eslint) {
      scripts.push('lint');
    }
    if (cfg.developerTools.prettier) {
      scripts.push('format');
    }
    for (const env of cfg.environments) {
      const name = slugify(env.name);
      if (name && name !== 'development') {
        scripts.push(`build:${name}`);
      }
    }
    if (cfg.rendering.mode === 'ssr' || cfg.rendering.mode === 'hybrid') {
      scripts.push('serve:ssr');
    }
    return scripts;
  }

  /** Count of enabled developer tools, for the review summary. */
  enabledToolCount(): number {
    const tools = this.state().developerTools;
    return DEVELOPER_TOOL_KEYS.filter((key) => tools[key]).length;
  }

  totalToolCount(): number {
    return DEVELOPER_TOOL_KEYS.length;
  }
}
