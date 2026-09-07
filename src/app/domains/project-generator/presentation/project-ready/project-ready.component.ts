import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationService } from '@core/i18n/translation.service';
import { mirrorPath } from '@core/i18n/i18n.model';
import { ToastService } from '@shared/ui/toast/toast.service';
import { FileTreeService } from '../../application/file-tree.service';
import { GeneratorService } from '../../application/generator.service';
import { ProjectConfigService } from '../../application/project-config.service';

type Tab = 'files' | 'config' | 'install';

@Component({
  selector: 'app-project-ready',
  imports: [TranslatePipe],
  templateUrl: './project-ready.component.html',
  styleUrl: './project-ready.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectReadyComponent {
  protected readonly generator = inject(GeneratorService);
  protected readonly configuration = inject(ProjectConfigService);
  private readonly fileTree = inject(FileTreeService);
  private readonly translations = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly tab = signal<Tab>('files');
  protected readonly tabs: readonly { id: Tab; labelKey: string }[] = [
    { id: 'files', labelKey: 'app.viewFiles' },
    { id: 'config', labelKey: 'app.viewConfig' },
    { id: 'install', labelKey: 'app.viewInstall' },
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
      this.toast.show(this.translations.translate('app.laterNote'));
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
      this.toast.show(this.translations.translate('app.copied'));
    } catch {
      this.toast.show(this.translations.translate('app.exportDone'));
    }
  }

  protected async another(): Promise<void> {
    this.generator.reset();
    this.configuration.reset();
    await this.router.navigateByUrl(mirrorPath('/new/project', this.language.lang()));
  }
}
