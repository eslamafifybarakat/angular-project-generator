import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe, TranslationService } from '@core/i18n';
import { Help } from '@shared/ui/help';
import { ProjectConfigService } from '../../application';
import type { DeveloperToolsSection } from '../../domain';

type ToolKey = keyof DeveloperToolsSection;

interface ToolGroup {
  readonly titleKey: string;
  readonly helpKey?: string;
  readonly items: readonly { key: ToolKey; labelKey: string; note?: string }[];
}

@Component({
  selector: 'app-tools-step',
  imports: [TranslatePipe, Help],
  templateUrl: './tools-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsStep {
  protected readonly configuration = inject(ProjectConfigService);
  private readonly translations = inject(TranslationService);

  protected readonly groups = computed<readonly ToolGroup[]>(() => {
    const testing = this.configuration.angularProfile()?.testing ?? this.translations.translate('angular_project_generator_app_not_verified');
    const unitNote = this.configuration.config().developerTools.unit
      ? `${testing} — ${this.translations.translate('angular_project_generator_app_t_unit_specs')}`
      : testing;
    return [
      {
        titleKey: 'angular_project_generator_app_quality_h',
        items: [
          { key: 'eslint', labelKey: 'angular_project_generator_app_t_eslint' },
          { key: 'prettier', labelKey: 'angular_project_generator_app_t_prettier' },
          { key: 'editorconfig', labelKey: 'angular_project_generator_app_t_editor' },
          { key: 'husky', labelKey: 'angular_project_generator_app_t_husky' },
          { key: 'lintStaged', labelKey: 'angular_project_generator_app_t_staged' },
        ],
      },
      {
        titleKey: 'angular_project_generator_app_test_h',
        helpKey: 'angular_project_generator_app_vitest_note',
        items: [
          { key: 'unit', labelKey: 'angular_project_generator_app_t_unit', note: unitNote },
          { key: 'e2e', labelKey: 'angular_project_generator_app_t_e2e', note: 'angular_project_generator_app_not_templated' },
        ],
      },
      {
        titleKey: 'angular_project_generator_app_perf_h',
        items: [
          { key: 'lazy', labelKey: 'angular_project_generator_app_t_lazy' },
          { key: 'imageOpt', labelKey: 'angular_project_generator_app_t_img', note: 'angular_project_generator_app_not_templated' },
          { key: 'budgets', labelKey: 'angular_project_generator_app_t_budget' },
        ],
      },
      {
        titleKey: 'angular_project_generator_app_a11y_h',
        items: [
          { key: 'a11y', labelKey: 'angular_project_generator_app_t_a11y' },
          { key: 'aria', labelKey: 'angular_project_generator_app_t_aria' },
          { key: 'keyboard', labelKey: 'angular_project_generator_app_t_keys' },
        ],
      },
    ];
  });

  protected readonly tools = computed(() => this.configuration.config().developerTools);
  protected readonly scripts = this.configuration.npmScripts;

  protected isOn(key: ToolKey): boolean {
    return this.tools()[key];
  }

  protected toggle(key: ToolKey, event: Event): void {
    this.configuration.patch('developerTools', {
      [key]: (event.target as HTMLInputElement).checked,
    });
  }

  /** Notes are either a literal ("Vitest") or a translation key. */
  protected isNoteKey(note: string): boolean {
    return note.startsWith('angular_project_generator_');
  }

  protected scriptLine(name: string): string {
    return name === 'start' ? 'npm start' : `npm run ${name}`;
  }
}
