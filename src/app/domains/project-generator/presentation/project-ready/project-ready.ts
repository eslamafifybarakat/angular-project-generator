import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslatePipe, TranslationService, mirrorPath } from '@core/i18n';
import { SeoService } from '@core/seo';
import { ToastService } from '@shared/ui/toast';
import { FileTreeService, GeneratorService, ProjectConfigService } from '../../application';

type Tab = 'files' | 'config' | 'install';

@Component({
  selector: 'app-project-ready',
  imports: [TranslatePipe],
  templateUrl: './project-ready.html',
  styleUrl: './project-ready.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectReady {
  protected readonly generator = inject(GeneratorService);
  protected readonly configuration = inject(ProjectConfigService);
  private readonly fileTree = inject(FileTreeService);
  private readonly translations = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: this.translations.translate('angular_project_generator_app_ready_h'),
      description: this.translations.translate('angular_project_generator_app_ready_sub'),
      path: '/ready',
      noIndex: true,
    });
  }

  protected readonly tab = signal<Tab>('files');
  protected readonly tabs: readonly { id: Tab; labelKey: string }[] = [
    { id: 'files', labelKey: 'angular_project_generator_app_view_files' },
    { id: 'config', labelKey: 'angular_project_generator_app_view_config' },
    { id: 'install', labelKey: 'angular_project_generator_app_view_install' },
  ];

  protected readonly result = this.generator.result;
  protected readonly slug = computed(() => this.configuration.config().project.slug || 'project');

  protected readonly rows = computed(() => {
    const root = this.fileTree.build(this.configuration.generatedFiles(), this.slug());
    return [{ node: root, depth: -1 }, ...this.fileTree.flatten(root)];
  });

  protected readonly configJson = computed(() => this.configuration.toJson());

  protected readonly installSteps = [1, 2, 3, 4] as const;

  protected indent(depth: number): number {
    return Math.max(0, depth) * 14;
  }

  protected setTab(tab: Tab): void {
    this.tab.set(tab);
  }

  /** Triggers a real browser download of the generated archive. */
  protected download(): void {
    const outcome = this.result();
    if (!outcome?.blob) {
      this.toast.show(this.translations.translate('angular_project_generator_app_later_note'));
      return;
    }
    const url = URL.createObjectURL(outcome.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = outcome.zipName;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected async copyConfig(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.configJson());
      this.toast.show(this.translations.translate('angular_project_generator_app_copied'));
    } catch {
      this.toast.show(this.translations.translate('angular_project_generator_app_export_done'));
    }
  }

  protected async another(): Promise<void> {
    this.generator.reset();
    this.configuration.reset();
    await this.router.navigateByUrl(mirrorPath('/new/project', this.language.lang()));
  }
}
