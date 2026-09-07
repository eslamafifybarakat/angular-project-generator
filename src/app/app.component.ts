import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '@layout/header/header.component';
import { FooterComponent } from '@layout/footer/footer.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { LanguageService } from '@core/i18n/language.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, ToastComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  protected readonly language = inject(LanguageService);
}
