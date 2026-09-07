import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProjectConfigService } from '../../application/project-config.service';

type FeatureKey = 'toast' | 'modal' | 'datePicker';

@Component({
  selector: 'app-features-step',
  imports: [TranslatePipe],
  templateUrl: './features-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesStepComponent {
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
      descKey: 'app.toastD',
      choices: ['none', 'install-later', 'customized'],
    },
    {
      key: 'modal',
      label: 'Modal',
      descKey: 'app.modalD',
      choices: ['none', 'install-later', 'customized'],
    },
    {
      key: 'datePicker',
      label: 'Date picker',
      descKey: 'app.datePickerD',
      choices: ['none', 'install-later'],
    },
  ];

  protected readonly plannedKeys = [
    'app.plRouting',
    'app.plHttp',
    'app.plErr',
    'app.plStore',
    'app.plAuth',
    'app.plAuthz',
  ];

  protected readonly detectionKeys = ['app.detectTmpl', 'app.detectReadme', 'app.detectCompat'];

  protected readonly featureState = computed(() => this.configuration.config().features);

  protected choiceLabelKey(choice: string): string {
    switch (choice) {
      case 'none':
        return 'app.optNone';
      case 'install-later':
        return 'app.optLater';
      default:
        return 'app.optCustom';
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
