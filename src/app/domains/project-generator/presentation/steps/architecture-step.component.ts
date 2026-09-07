import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HelpComponent } from '@shared/ui/help/help.component';
import { ProjectConfigService } from '../../application/project-config.service';

interface PatternOption {
  readonly value: string;
  readonly title: string;
  readonly descKey: string;
  readonly available: boolean;
}

@Component({
  selector: 'app-architecture-step',
  imports: [TranslatePipe, HelpComponent],
  templateUrl: './architecture-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchitectureStepComponent {
  protected readonly configuration = inject(ProjectConfigService);

  /**
   * Only DDD has a verified template. The rest are shown disabled with the
   * reason rather than hidden: the roadmap is information, and a silently
   * missing option looks like a bug.
   */
  protected readonly patterns: readonly PatternOption[] = [
    { value: 'ddd', title: 'Domain-driven (DDD)', descKey: 'app.dddD', available: true },
    { value: 'feature', title: 'Feature-based', descKey: 'app.featBasedD', available: false },
    { value: 'simple', title: 'Simple', descKey: 'app.simpleD', available: false },
    { value: 'custom', title: 'Custom', descKey: 'app.customD', available: false },
  ];

  protected readonly architecture = computed(() => this.configuration.config().architecture);
  protected readonly exampleDomain = computed(() =>
    (this.configuration.config().project.slug || 'project').split('-')[0],
  );

  protected toggleExample(event: Event): void {
    this.configuration.patch('architecture', {
      includeExampleDomain: (event.target as HTMLInputElement).checked,
    });
  }
}
