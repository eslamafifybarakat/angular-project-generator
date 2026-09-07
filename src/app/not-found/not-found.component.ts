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
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  private readonly seo = inject(SeoService);
  private readonly translations = inject(TranslationService);
  protected readonly language = inject(LanguageService);

  protected readonly homeLink = computed(() => mirrorPath('/', this.language.lang()));

  constructor() {
    this.seo.apply({
      title: this.translations.translate('notFound.title'),
      description: this.translations.translate('notFound.body'),
      path: '/404',
      noIndex: true,
    });
  }
}
