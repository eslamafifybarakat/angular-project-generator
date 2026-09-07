import {
  Directive,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  type OnDestroy,
} from '@angular/core';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Keeps Tab focus inside the host while it is open, restores focus to whatever
 * was focused before, and reports Escape.
 *
 * Required by the modal — the two ship together, and the modal is not usable
 * with a keyboard without it.
 */
@Directive({
  selector: '[appFocusTrap]',
  host: {
    '(keydown)': 'onKeydown($event)',
  },
})
export class FocusTrapDirective implements OnDestroy {
  readonly appFocusTrap = input<boolean>(true);
  readonly escaped = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous: HTMLElement | null = null;

  constructor() {
    afterNextRender(() => {
      if (!this.appFocusTrap()) {
        return;
      }
      const doc = this.host.nativeElement.ownerDocument;
      this.previous = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
      this.focusables()[0]?.focus();
    });
  }

  ngOnDestroy(): void {
    this.previous?.focus();
    this.previous = null;
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.appFocusTrap()) {
      return;
    }
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.escaped.emit();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = this.focusables();
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.host.nativeElement.ownerDocument.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el.getClientRects().length > 0,
    );
  }
}
