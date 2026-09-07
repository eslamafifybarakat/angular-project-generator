import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationService } from '@core/i18n/translation.service';
import { SeoService } from '@core/seo/seo.service';
import { mirrorPath } from '@core/i18n/i18n.model';

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
