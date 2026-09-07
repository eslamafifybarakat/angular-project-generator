import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProjectConfigService } from '../../application/project-config.service';

@Component({
  selector: 'app-example-step',
  imports: [TranslatePipe],
  templateUrl: './example-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleStep {
  protected readonly configuration = inject(ProjectConfigService);

  /**
   * This step reads and writes ArchitectureConfig.includeExampleDomain — the
   * same flag the architecture step shows. There is deliberately no second
   * "example" flag for the two screens to disagree about.
   */
  protected readonly includeExample = computed(
    () => this.configuration.config().architecture.includeExampleDomain,
  );

  /** Template lines, built from the features actually selected. */
  protected readonly templateLines = computed(() => {
    const cfg = this.configuration.config();
    const lines: string[] = [];
    if (!cfg.architecture.includeExampleDomain) {
      return lines;
    }
    if (cfg.localization.enabled) {
      lines.push(`<h1>{{ 'home.title' | translate }}</h1>`);
    }
    if (cfg.features.toast === 'customized') {
      lines.push('<app-toast />');
    }
    lines.push('<router-outlet />');
    if (cfg.features.modal === 'customized') {
      lines.push('<app-modal [open]="open()" />');
    }
    return lines;
  });

  protected set(include: boolean): void {
    this.configuration.patch('architecture', { includeExampleDomain: include });
  }
}
