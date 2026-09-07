import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationService } from '@core/i18n/translation.service';
import { mirrorPath } from '@core/i18n/i18n.model';
import { ModalComponent } from '@shared/ui/modal/modal.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { ProjectConfigService } from '../../application/project-config.service';
import { GeneratorService } from '../../application/generator.service';
import { PresetRepository } from '../../infrastructure/preset.repository';
import type { Preset } from '../../domain/preset.model';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, TranslatePipe, ModalComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly presets = inject(PresetRepository);
  private readonly configuration = inject(ProjectConfigService);
  private readonly generator = inject(GeneratorService);
  private readonly translations = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  protected readonly language = inject(LanguageService);

  protected readonly presetList = this.presets.list();
  protected readonly recent = this.generator.recent;
  protected readonly importOpen = signal(false);
  protected readonly importText = signal('');
  protected readonly importProblems = signal<readonly string[]>([]);

  protected readonly newLink = computed(() => mirrorPath('/new', this.language.lang()));

  protected openImport(): void {
    this.importText.set(this.configuration.toJson());
    this.importProblems.set([]);
    this.importOpen.set(true);
  }

  protected closeImport(): void {
    this.importOpen.set(false);
  }

  protected onImportInput(event: Event): void {
    this.importText.set((event.target as HTMLTextAreaElement).value);
  }

  /**
   * A rejected import reports every reason at once and changes nothing. The
   * date-picker rule is the interesting one: a configuration asking for a
   * customized date picker is refused by name rather than downgraded, so the
   * person is never silently given something other than what they pasted.
   */
  protected async runImport(): Promise<void> {
    const result = this.configuration.importJson(this.importText());
    if (result.parseError) {
      this.importProblems.set([result.parseError]);
      return;
    }
    if (result.issues.length > 0) {
      this.importProblems.set(
        result.issues.map(
          (issue) => `${issue.path} — ${this.translations.translate(issue.messageKey)}`,
        ),
      );
      return;
    }
    this.importOpen.set(false);
    this.toast.show(this.translations.translate('app.importDone'));
    await this.router.navigateByUrl(this.newLink());
  }

  protected async applyPreset(preset: Preset): Promise<void> {
    this.configuration.applyPreset(preset);
    this.toast.show(this.translations.translate(preset.nameKey));
    await this.router.navigateByUrl(this.newLink());
  }

  protected async reopen(): Promise<void> {
    await this.router.navigateByUrl(this.newLink());
  }
}
