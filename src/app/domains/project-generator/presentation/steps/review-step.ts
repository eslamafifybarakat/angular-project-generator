import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService, TranslatePipe, mirrorPath } from '@core/i18n';
import { ProjectConfigService } from '../../application';
import { languageMeta, type WizardStepId } from '../../domain';

interface ReviewRow {
  readonly step: WizardStepId;
  readonly titleKey: string;
  readonly value: string;
}

@Component({
  selector: 'app-review-step',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './review-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStep {
  protected readonly configuration = inject(ProjectConfigService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly fileCount = computed(() => this.configuration.generatedFiles().length);

  protected readonly rows = computed<readonly ReviewRow[]>(() => {
    const cfg = this.configuration.config();
    const selectedFeatures = (
      Object.entries(cfg.features) as [string, string][]
    ).filter(([, value]) => value !== 'none');

    return [
      {
        step: 'project',
        titleKey: 'angular_project_generator_step_title_project',
        value: `${cfg.project.name} · ${cfg.project.slug}`,
      },
      { step: 'angular', titleKey: 'angular_project_generator_step_title_angular', value: `Angular ${cfg.angular.version}` },
      {
        step: 'architecture',
        titleKey: 'angular_project_generator_step_title_architecture',
        value: `${cfg.architecture.pattern}${cfg.architecture.includeExampleDomain ? ' · example' : ''}`,
      },
      { step: 'styling', titleKey: 'angular_project_generator_step_title_styling', value: 'SCSS' },
      {
        step: 'theme',
        titleKey: 'angular_project_generator_step_title_theme',
        value: [cfg.theme.primaryColor, cfg.theme.secondaryColor, cfg.theme.accentColor].join(
          ' · ',
        ),
      },
      {
        step: 'languages',
        titleKey: 'angular_project_generator_step_title_languages',
        value: cfg.localization.enabled
          ? cfg.localization.selectedLanguages.map((c) => languageMeta(c).name).join(', ')
          : '—',
      },
      {
        step: 'rendering',
        titleKey: 'angular_project_generator_step_title_rendering',
        value: `${cfg.rendering.mode.toUpperCase()}${cfg.seo.enabled ? ' · SEO' : ''}`,
      },
      {
        step: 'environments',
        titleKey: 'angular_project_generator_step_title_environments',
        value: cfg.environments.map((env) => env.name).join(', '),
      },
      {
        step: 'features',
        titleKey: 'angular_project_generator_step_title_features',
        value: selectedFeatures.length > 0 ? selectedFeatures.map(([key]) => key).join(', ') : '—',
      },
      {
        step: 'tools',
        titleKey: 'angular_project_generator_step_title_tools',
        value: `${this.configuration.enabledToolCount()} / ${this.configuration.totalToolCount()}`,
      },
      {
        step: 'example',
        titleKey: 'angular_project_generator_step_title_example',
        value: cfg.architecture.includeExampleDomain ? 'included' : 'none',
      },
    ];
  });

  protected stepLink(step: WizardStepId): string {
    return mirrorPath(`/new/${step}`, this.language.lang());
  }

  protected issuesFor(step: WizardStepId) {
    return this.configuration.issuesFor(step);
  }

  protected async generate(): Promise<void> {
    if (!this.configuration.isValid()) {
      return;
    }
    await this.router.navigateByUrl(mirrorPath('/generate', this.language.lang()));
  }
}
