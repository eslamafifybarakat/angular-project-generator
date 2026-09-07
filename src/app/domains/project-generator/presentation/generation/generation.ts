import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService, TranslatePipe, TranslationService, mirrorPath } from '@core/i18n';
import { SeoService } from '@core/seo';
import { GeneratorService, ProjectConfigService } from '../../application';

@Component({
  selector: 'app-generation',
  imports: [TranslatePipe],
  templateUrl: './generation.html',
  styleUrl: './generation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Generation {
  protected readonly generator = inject(GeneratorService);
  protected readonly configuration = inject(ProjectConfigService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly translations = inject(TranslationService);
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.apply({
      title: this.translations.translate('angular_project_generator_app_gen_h'),
      description: this.translations.translate('angular_project_generator_app_gen_sub'),
      path: '/generate',
      noIndex: true,
    });

    // Deep-linking here with a broken configuration must not start a run.
    if (this.configuration.isValid()) {
      this.generator.start();
    }

    effect(() => {
      if (this.generator.runState() === 'ready') {
        untracked(() => {
          void this.router.navigateByUrl(mirrorPath('/ready', this.language.lang()));
        });
      }
    });
  }

  protected retry(): void {
    this.generator.start();
  }

  protected async backToReview(): Promise<void> {
    this.generator.reset();
    await this.router.navigateByUrl(mirrorPath('/new/review', this.language.lang()));
  }

  protected stageClass(position: number): string {
    return `stage stage--${this.generator.stateOf(position)}`;
  }
}
