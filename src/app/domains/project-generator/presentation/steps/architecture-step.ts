import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { Help } from '@shared/ui/help';
import { ProjectConfigService, FileTreeService } from '../../application';
import {
  architectureExampleFiles,
  componentNamingFor,
  ARCHITECTURE_PROFILES,
  ARCHITECTURE_TYPES,
  type ArchitectureGroupingLabel,
  type ArchitectureProfile,
  type ArchitectureType,
} from '../../domain';

@Component({
  selector: 'app-architecture-step',
  imports: [TranslatePipe, Help],
  templateUrl: './architecture-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchitectureStep {
  protected readonly configuration = inject(ProjectConfigService);
  private readonly fileTree = inject(FileTreeService);

  /** All four are equally real — the registry is the only source of truth here. */
  protected readonly profiles: readonly ArchitectureProfile[] = ARCHITECTURE_TYPES.map(
    (id) => ARCHITECTURE_PROFILES[id],
  );

  protected readonly architecture = computed(() => this.configuration.config().architecture);
  protected readonly resolved = computed(() => this.configuration.resolvedArchitecture());
  protected readonly isCustom = computed(() => this.architecture().pattern === 'custom');

  protected readonly groupLabelKey = computed(() =>
    this.resolved().groupingLabel === 'domain' ? 'angular_project_generator_app_arch_group_domain' : 'angular_project_generator_app_arch_group_feature',
  );

  protected readonly helpBodyKey = computed(() => this.resolved().profile.helpBodyKey);
  protected readonly helpHeadingKey = computed(() => this.resolved().profile.nameKey);

  /**
   * The "folders written" preview: the fixed base directories every pattern
   * declares, plus — when the example is on — the exact same file list
   * `deriveFiles()` writes for the example slice. Same registry, same file
   * list, so this can never drift from what is actually generated.
   */
  protected readonly previewRows = computed<
    { readonly name: string; readonly depth: number; readonly isDirectory: boolean }[]
  >(() => {
    const resolved = this.resolved();
    const rows: { name: string; depth: number; isDirectory: boolean }[] = resolved.directories.map(
      (dir) => ({ name: `${dir}/`, depth: 0, isDirectory: true }),
    );

    if (!this.configuration.config().architecture.includeExampleDomain) {
      return rows;
    }

    const era = this.configuration.angularProfile()?.era ?? 'standalone-modern';
    const naming = componentNamingFor(this.configuration.config().angular.version);
    const includeTests = this.configuration.config().developerTools.unit;
    const files = architectureExampleFiles(resolved, era, naming, includeTests).map((file) => ({
      path: file.path.replace(/^src\/app\//, ''),
      reason: file.reason,
    }));
    const root = this.fileTree.build(files, 'src/app');
    for (const { node, depth } of this.fileTree.flatten(root)) {
      rows.push({
        name: node.isDirectory ? `${node.name}/` : node.name,
        depth,
        isDirectory: node.isDirectory,
      });
    }
    return rows;
  });

  protected issuesFor(path: string) {
    return this.configuration.issuesForPath(path);
  }

  protected indent(depth: number): number {
    return Math.max(0, depth) * 14;
  }

  protected select(pattern: ArchitectureType): void {
    this.configuration.setArchitecturePattern(pattern);
  }

  protected toggleExample(event: Event): void {
    this.configuration.patch('architecture', {
      includeExampleDomain: (event.target as HTMLInputElement).checked,
    });
  }

  protected onExampleName(event: Event): void {
    this.configuration.setArchitectureExampleName((event.target as HTMLInputElement).value);
  }

  protected onCustomField(
    field: 'coreDir' | 'sharedDir' | 'layoutDir' | 'groupingDir',
    event: Event,
  ): void {
    this.configuration.updateCustomArchitecture({
      [field]: (event.target as HTMLInputElement).value,
    });
  }

  protected setGroupingLabel(label: ArchitectureGroupingLabel): void {
    this.configuration.updateCustomArchitecture({ groupingLabel: label });
  }

  protected addDirectory(): void {
    this.configuration.addCustomDirectory();
  }

  protected updateDirectory(index: number, event: Event): void {
    this.configuration.updateCustomDirectory(index, (event.target as HTMLInputElement).value);
  }

  protected removeDirectory(index: number): void {
    this.configuration.removeCustomDirectory(index);
  }
}
