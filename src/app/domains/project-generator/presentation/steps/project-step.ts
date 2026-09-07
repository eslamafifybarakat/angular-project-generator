import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { Help } from '@shared/ui/help/help';
import { Dropdown, type DropdownOption } from '@shared/ui/dropdown/dropdown';
import { ProjectConfigService } from '../../application/project-config.service';
import { PROJECT_TYPES } from '../../domain/project-config.model';

@Component({
  selector: 'app-project-step',
  imports: [TranslatePipe, Help, Dropdown],
  templateUrl: './project-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectStep {
  protected readonly configuration = inject(ProjectConfigService);
  protected readonly typeOptions: readonly DropdownOption[] = PROJECT_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  protected readonly project = computed(() => this.configuration.config().project);
  protected readonly nameIssues = computed(() =>
    this.configuration.issuesForPath('project.name'),
  );
  protected readonly slugIssues = computed(() =>
    this.configuration.issuesForPath('project.slug'),
  );

  protected onName(event: Event): void {
    this.configuration.setProjectName((event.target as HTMLInputElement).value);
  }

  protected onSlug(event: Event): void {
    this.configuration.setProjectSlug((event.target as HTMLInputElement).value);
  }

  protected onDescription(event: Event): void {
    this.configuration.patch('project', {
      description: (event.target as HTMLTextAreaElement).value,
    });
  }

  protected onType(value: string): void {
    this.configuration.patch('project', { type: value });
  }
}
