import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfigService } from '@core/config/config.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';

@Component({
  selector: 'app-footer',
  imports: [TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {
  private readonly config = inject(ConfigService);

  protected readonly angularVersion = '22';
  protected readonly year = new Date().getFullYear();
  protected readonly environmentName = this.config.config().name;
}
