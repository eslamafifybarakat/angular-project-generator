import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService, TranslatePipe, TranslationService, mirrorPath } from '@core/i18n';
import { SeoService } from '@core/seo';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {
  private readonly seo = inject(SeoService);
  private readonly translations = inject(TranslationService);
  protected readonly language = inject(LanguageService);

  protected readonly homeLink = computed(() => mirrorPath('/', this.language.lang()));

  constructor() {
    this.seo.apply({
      title: this.translations.translate('angular_project_generator_not_found_title'),
      description: this.translations.translate('angular_project_generator_not_found_body'),
      path: '/404',
      noIndex: true,
    });
  }
}
