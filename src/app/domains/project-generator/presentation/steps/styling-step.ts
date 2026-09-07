import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProjectConfigService } from '../../application/project-config.service';

@Component({
  selector: 'app-styling-step',
  imports: [TranslatePipe],
  templateUrl: './styling-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StylingStep {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly languages = [
    { value: 'scss', label: 'SCSS', available: true },
    { value: 'sass', label: 'Sass', available: false },
    { value: 'css', label: 'CSS', available: false },
    { value: 'less', label: 'Less', available: false },
    { value: 'tailwind', label: 'Tailwind CSS', available: false },
  ] as const;

  /**
   * Informational rather than switchable: these come with the architecture
   * template, and there is no generation branch that turns any of them off.
   */
  protected readonly included = [
    { titleKey: 'angular_project_generator_app_ca_tokens', bodyKey: 'angular_project_generator_app_ca_tokens_d' },
    { titleKey: 'angular_project_generator_app_ca_vars', bodyKey: 'angular_project_generator_app_ca_vars_d' },
    { titleKey: 'angular_project_generator_app_ca_resp', bodyKey: 'angular_project_generator_app_ca_resp_d' },
    { titleKey: 'angular_project_generator_app_ca_rtl', bodyKey: 'angular_project_generator_app_ca_rtl_d' },
  ] as const;

  protected readonly preprocessor = computed(
    () => this.configuration.config().styling.preprocessor,
  );
}
