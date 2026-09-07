import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FocusTrapDirective } from '@shared/directives/focus-trap.directive';
import { TranslatePipe } from '@core/i18n/translate.pipe';

/**
 * Accessible dialog. Ships with FocusTrapDirective, which it depends on for
 * keyboard containment and focus restoration.
 */
@Component({
  selector: 'app-modal',
  imports: [FocusTrapDirective, TranslatePipe],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  readonly heading = input.required<string>();
  readonly labelledBy = input<string>('app-modal-title');
  readonly closed = output<void>();

  protected onScrim(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
