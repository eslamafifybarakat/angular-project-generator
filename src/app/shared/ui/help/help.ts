import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TranslatePipe } from '@core/i18n';

/**
 * The ⓘ affordance: a real popover, not a native `title` attribute.
 *
 * Keyboard reachable, dismissible by button, Escape or blur, and translated
 * like everything else. Not part of the extracted shared/ui contract — added
 * here because several wizard settings genuinely need an explanation and a
 * tooltip that only appears on hover would strand touch and keyboard users.
 */
@Component({
  selector: 'app-help',
  imports: [TranslatePipe],
  templateUrl: './help.html',
  styleUrl: './help.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Help {
  readonly headingKey = input.required<string>();
  readonly bodyKey = input.required<string>();

  protected readonly open = signal(false);

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.open()) {
      event.stopPropagation();
      this.close();
    }
  }
}
