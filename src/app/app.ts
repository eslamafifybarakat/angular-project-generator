import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '@layout/header';
import { Footer } from '@layout/footer';
import { Toast } from '@shared/ui/toast';
import { TranslatePipe, LanguageService } from '@core/i18n';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, Footer, Toast, TranslatePipe],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly language = inject(LanguageService);
}
