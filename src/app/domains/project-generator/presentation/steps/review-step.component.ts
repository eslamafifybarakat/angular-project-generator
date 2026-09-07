import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { mirrorPath } from '@core/i18n/i18n.model';
import { ProjectConfigService } from '../../application/project-config.service';
import { languageMeta, type WizardStepId } from '../../domain/project-config.model';

interface ReviewRow {
  readonly step: WizardStepId;
  readonly titleKey: string;
  readonly value: string;
}

@Component({
  selector: 'app-review-step',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './review-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewStepComponent {
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
        titleKey: 'step.title.project',
        value: `${cfg.project.name} · ${cfg.project.slug}`,
      },
      { step: 'angular', titleKey: 'step.title.angular', value: `Angular ${cfg.angular.version}` },
      {
        step: 'architecture',
        titleKey: 'step.title.architecture',
        value: cfg.architecture.includeExampleDomain ? 'DDD · example domain' : 'DDD',
      },
      { step: 'styling', titleKey: 'step.title.styling', value: 'SCSS' },
      {
        step: 'theme',
        titleKey: 'step.title.theme',
        value: [cfg.theme.primaryColor, cfg.theme.secondaryColor, cfg.theme.accentColor].join(
          ' · ',
        ),
      },
      {
        step: 'languages',
        titleKey: 'step.title.languages',
        value: cfg.localization.enabled
          ? cfg.localization.selectedLanguages.map((c) => languageMeta(c).name).join(', ')
          : '—',
      },
      {
        step: 'rendering',
        titleKey: 'step.title.rendering',
        value: `${cfg.rendering.mode.toUpperCase()}${cfg.seo.enabled ? ' · SEO' : ''}`,
      },
      {
        step: 'environments',
        titleKey: 'step.title.environments',
        value: cfg.environments.map((env) => env.name).join(', '),
      },
      {
        step: 'features',
        titleKey: 'step.title.features',
        value: selectedFeatures.length > 0 ? selectedFeatures.map(([key]) => key).join(', ') : '—',
      },
      {
        step: 'tools',
        titleKey: 'step.title.tools',
        value: `${this.configuration.enabledToolCount()} / ${this.configuration.totalToolCount()}`,
      },
      {
        step: 'example',
        titleKey: 'step.title.example',
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
