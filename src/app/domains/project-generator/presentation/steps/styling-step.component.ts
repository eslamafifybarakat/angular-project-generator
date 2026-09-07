import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ProjectConfigService } from '../../application/project-config.service';

@Component({
  selector: 'app-styling-step',
  imports: [TranslatePipe],
  templateUrl: './styling-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StylingStepComponent {
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
    { titleKey: 'app.caTokens', bodyKey: 'app.caTokensD' },
    { titleKey: 'app.caVars', bodyKey: 'app.caVarsD' },
    { titleKey: 'app.caResp', bodyKey: 'app.caRespD' },
    { titleKey: 'app.caRtl', bodyKey: 'app.caRtlD' },
  ] as const;

  protected readonly preprocessor = computed(
    () => this.configuration.config().styling.preprocessor,
  );
}
