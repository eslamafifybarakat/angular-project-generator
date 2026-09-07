import { Injectable, inject } from '@angular/core';
import { resolveContent } from './templates/content-registry';
import type { TemplateContext } from './templates/template-context.model';
import './templates/register-templates';
import { AngularVersionRepository } from './angular-version.repository';
import type { GeneratedFile } from '../domain/generated-file.model';
import { resolveArchitecture } from '../domain/architecture-registry';
import type { ProjectConfig } from '../domain/project-config.model';

/**
 * Turns the derived `GeneratedFile[]` path list into real file contents.
 *
 * This is the layer `generator.service.ts`'s doc comment describes as
 * missing: everything upstream (`ProjectConfigService.generatedFiles()`,
 * `resolveArchitecture()`, `angularProfile()`) was already honest about
 * *which* files exist — this fills in *what's in them*, one resolver per
 * concern, registered in `templates/register-templates.ts`.
 */
@Injectable({ providedIn: 'root' })
export class FileContentService {
  private readonly versions = inject(AngularVersionRepository);

  buildContext(cfg: ProjectConfig, npmScripts: readonly string[], files: readonly GeneratedFile[]): TemplateContext {
    const profile = this.versions.find(cfg.angular.version);
    const era = profile?.era ?? 'standalone-modern';
    return {
      cfg,
      resolved: resolveArchitecture(cfg.architecture, cfg.project.slug),
      era,
      profile,
      standalone: era === 'standalone-modern',
      ssr: cfg.rendering.mode === 'ssr' || cfg.rendering.mode === 'hybrid',
      npmScripts,
      files,
    };
  }

  renderAll(
    cfg: ProjectConfig,
    npmScripts: readonly string[],
    files: readonly GeneratedFile[],
  ): readonly { path: string; content: string }[] {
    const ctx = this.buildContext(cfg, npmScripts, files);
    return files.map((file) => ({ path: file.path, content: resolveContent(file.path, ctx) }));
  }
}
