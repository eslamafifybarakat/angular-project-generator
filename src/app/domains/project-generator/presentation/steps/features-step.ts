import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProjectConfigService } from '../../application/project-config.service';

type FeatureKey = 'toast' | 'modal' | 'datePicker';

@Component({
  selector: 'app-features-step',
  imports: [TranslatePipe],
  templateUrl: './features-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesStep {
  protected readonly configuration = inject(ProjectConfigService);

  /**
   * Three real components. The date picker has no 'customized' option at all,
   * because no verified template exists for it — the choice is absent from the
   * control rather than present and disabled, so nobody has to wonder.
   */
  protected readonly features: readonly {
    key: FeatureKey;
    label: string;
    descKey: string;
    choices: readonly string[];
  }[] = [
    {
      key: 'toast',
      label: 'Toast',
      descKey: 'angular_project_generator_app_toast_d',
      choices: ['none', 'install-later', 'customized'],
    },
    {
      key: 'modal',
      label: 'Modal',
      descKey: 'angular_project_generator_app_modal_d',
      choices: ['none', 'install-later', 'customized'],
    },
    {
      key: 'datePicker',
      label: 'Date picker',
      descKey: 'angular_project_generator_app_date_picker_d',
      choices: ['none', 'install-later'],
    },
  ];

  protected readonly plannedKeys = [
    'angular_project_generator_app_pl_routing',
    'angular_project_generator_app_pl_http',
    'angular_project_generator_app_pl_err',
    'angular_project_generator_app_pl_store',
    'angular_project_generator_app_pl_auth',
    'angular_project_generator_app_pl_authz',
  ];

  protected readonly detectionKeys = ['angular_project_generator_app_detect_tmpl', 'angular_project_generator_app_detect_readme', 'angular_project_generator_app_detect_compat'];

  protected readonly featureState = computed(() => this.configuration.config().features);

  protected choiceLabelKey(choice: string): string {
    switch (choice) {
      case 'none':
        return 'angular_project_generator_app_opt_none';
      case 'install-later':
        return 'angular_project_generator_app_opt_later';
      default:
        return 'angular_project_generator_app_opt_custom';
    }
  }

  protected current(key: FeatureKey): string {
    return this.featureState()[key];
  }

  protected select(key: FeatureKey, choice: string): void {
    this.configuration.patch('features', { [key]: choice });
  }

  protected issues(key: FeatureKey) {
    return this.configuration.issuesForPath(`features.${key}`);
  }
}
