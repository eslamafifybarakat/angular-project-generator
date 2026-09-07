import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * Extracted from eslam-barakat-portfolio's `src/app/shared/ui/toast/*`
 * (verified in docs/generator/TEMPLATE_SPECIFICATION.md §12) and transformed
 * to the generator's naming contract: `toast.component.ts` → `toast.ts`,
 * class `ToastComponent` → `Toast`. Content is otherwise unchanged — the
 * source implementation has no project-specific values to substitute (no
 * branding, no hardcoded strings).
 */
export const toastManifest: TemplateManifest = {
  id: 'toast',
  displayName: 'Toast',
  origin: 'extracted',
  sourceNote: 'eslam-barakat-portfolio: src/app/shared/ui/toast/*',
  requiresEra: 'standalone-modern',
  readmeContractRead: true,
  installLater: {
    package: 'ngx-toastr',
    note: 'A message-severity toast library, unlike this template\'s single-message design.',
  },
  files: [
    {
      relativePath: '{shared}/ui/toast/toast.ts',
      content: (ctx) => `import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.html',
  styleUrl: './toast.${ctx.stylesheetExtension}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toast {
  private readonly toast = inject(ToastService);

  protected readonly message = this.toast.message;
  protected readonly isUp = computed(() => this.message() !== null);
}
`,
    },
    {
      relativePath: '{shared}/ui/toast/toast.html',
      content: () =>
        `<div class="toast" [class.is-up]="isUp()" role="status" aria-live="polite">{{ message() }}</div>\n`,
    },
    {
      relativePath: '{shared}/ui/toast/toast.{style}',
      content: () => `:host {
  display: contents;
}

.toast {
  position: fixed;
  inset-block-end: 1.375rem;
  inset-inline-start: 50%;
  transform: translate(-50%, 5.625rem);
  background: var(--text);
  color: var(--bg);
  padding: 0.75rem 1.25rem;
  border-radius: 0.75rem;
  font-size: 0.86rem;
  font-weight: 600;
  z-index: 130;
  opacity: 0;
  transition:
    transform 0.4s var(--ease),
    opacity 0.4s;
  pointer-events: none;
}

.toast.is-up {
  transform: translate(-50%, 0);
  opacity: 1;
}
`,
    },
    {
      relativePath: '{shared}/ui/toast/toast.service.ts',
      content: () => `import { Injectable, signal } from '@angular/core';

const AUTO_DISMISS_MS = 2200;

/**
 * A single, app-wide toast — \`role="status"\` / \`aria-live="polite"\`,
 * auto-dismissing after ~2.2s. A second call while a toast is visible
 * replaces the message and resets the timer rather than queueing.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _message = signal<string | null>(null);
  readonly message = this._message.asReadonly();

  private timeoutId?: ReturnType<typeof setTimeout>;

  show(message: string): void {
    this._message.set(message);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this._message.set(null), AUTO_DISMISS_MS);
  }
}
`,
    },
    {
      relativePath: '{shared}/ui/toast/toast.service.spec.ts',
      content: () => `import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('shows a message, then auto-dismisses after ~2.2s', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);

    service.show('Saved');
    expect(service.message()).toBe('Saved');

    vi.advanceTimersByTime(2199);
    expect(service.message()).toBe('Saved');

    vi.advanceTimersByTime(2);
    expect(service.message()).toBeNull();

    vi.useRealTimers();
  });

  it('replaces the message and resets the timer instead of queueing', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);

    service.show('First');
    vi.advanceTimersByTime(1000);
    service.show('Second');
    vi.advanceTimersByTime(2199);
    expect(service.message()).toBe('Second');

    vi.useRealTimers();
  });
});
`,
    },
  ],
};
