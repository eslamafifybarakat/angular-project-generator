import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  imports: [TranslatePipe],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toast = inject(ToastService);
}
