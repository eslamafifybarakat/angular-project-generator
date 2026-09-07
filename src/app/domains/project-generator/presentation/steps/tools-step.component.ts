import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HelpComponent } from '@shared/ui/help/help.component';
import { ProjectConfigService } from '../../application/project-config.service';
import type { DeveloperToolsSection } from '../../domain/project-config.model';

type ToolKey = keyof DeveloperToolsSection;

interface ToolGroup {
  readonly titleKey: string;
  readonly helpKey?: string;
  readonly items: readonly { key: ToolKey; labelKey: string; note?: string }[];
}

@Component({
  selector: 'app-tools-step',
  imports: [TranslatePipe, HelpComponent],
  templateUrl: './tools-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsStepComponent {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly groups = computed<readonly ToolGroup[]>(() => {
    const testing = this.configuration.angularProfile()?.testing ?? 'app.notVerified';
    return [
      {
        titleKey: 'app.qualityH',
        items: [
          { key: 'eslint', labelKey: 'app.tEslint' },
          { key: 'prettier', labelKey: 'app.tPrettier' },
          { key: 'editorconfig', labelKey: 'app.tEditor' },
          { key: 'husky', labelKey: 'app.tHusky' },
          { key: 'lintStaged', labelKey: 'app.tStaged' },
        ],
      },
      {
        titleKey: 'app.testH',
        helpKey: 'app.vitestNote',
        items: [
          { key: 'unit', labelKey: 'app.tUnit', note: testing },
          { key: 'e2e', labelKey: 'app.tE2e', note: 'app.notTemplated' },
        ],
      },
      {
        titleKey: 'app.perfH',
        items: [
          { key: 'lazy', labelKey: 'app.tLazy' },
          { key: 'imageOpt', labelKey: 'app.tImg', note: 'app.notTemplated' },
          { key: 'budgets', labelKey: 'app.tBudget' },
        ],
      },
      {
        titleKey: 'app.a11yH',
        items: [
          { key: 'a11y', labelKey: 'app.tA11y' },
          { key: 'aria', labelKey: 'app.tAria' },
          { key: 'keyboard', labelKey: 'app.tKeys' },
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
    return note.startsWith('app.');
  }

  protected scriptLine(name: string): string {
    return name === 'start' ? 'npm start' : `npm run ${name}`;
  }
}
