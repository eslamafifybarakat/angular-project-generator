import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Dashboard } from '@domains/project-generator/presentation/dashboard';
import { JsonLdService, SeoService } from '@core/seo';
import { TranslationService } from '@core/i18n';

@Component({
  selector: 'app-home',
  imports: [Dashboard],
  template: '<app-dashboard />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly translations = inject(TranslationService);

  constructor() {
    const description = this.translations.translate('angular_project_generator_app_hero_body');
    this.seo.apply({
      title: this.translations.translate('angular_project_generator_app_hero_title'),
      description,
      path: '/',
    });
    this.jsonLd.setSoftwareApplication(description);
  }
}
