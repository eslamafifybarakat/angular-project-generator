import { Injectable, signal } from '@angular/core';

const VISIBLE_MS = 2600;

/**
 * One message at a time, no severity levels.
 *
 * The extracted component this is modelled on has a single plain-string
 * message and no success/error/warning variants, so this service does not
 * invent them. Anything that needs to convey severity does it inline, next to
 * the control that failed, where a screen reader will actually encounter it.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly current = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly message = this.current.asReadonly();

  show(message: string): void {
    this.clearTimer();
    this.current.set(message);
    this.timer = setTimeout(() => this.dismiss(), VISIBLE_MS);
  }

  dismiss(): void {
    this.clearTimer();
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
