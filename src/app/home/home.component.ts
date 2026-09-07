import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '@domains/project-generator/presentation/dashboard/dashboard.component';
import { JsonLdService } from '@core/seo/json-ld.service';
import { SeoService } from '@core/seo/seo.service';
import { TranslationService } from '@core/i18n/translation.service';

@Component({
  selector: 'app-home',
  imports: [DashboardComponent],
  template: '<app-dashboard />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly translations = inject(TranslationService);

  constructor() {
    const description = this.translations.translate('app.heroBody');
    this.seo.apply({
      title: this.translations.translate('app.heroTitle'),
      description,
      path: '/',
    });
    this.jsonLd.setSoftwareApplication(description);
  }
}
