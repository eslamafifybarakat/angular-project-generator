import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FocusTrapDirective } from '@shared/directives';
import { TranslatePipe } from '@core/i18n';

/**
 * Accessible dialog. Ships with FocusTrapDirective, which it depends on for
 * keyboard containment and focus restoration.
 */
@Component({
  selector: 'app-modal',
  imports: [FocusTrapDirective, TranslatePipe],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly heading = input.required<string>();
  readonly labelledBy = input<string>('app-modal-title');
  readonly closed = output<void>();

  protected onScrim(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
