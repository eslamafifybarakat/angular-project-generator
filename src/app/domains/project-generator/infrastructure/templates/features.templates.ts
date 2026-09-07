import { registerContentResolver } from './content-registry';
import { basicComponentSpec, componentClassName, componentFileStem } from './template-context.model';
import type { TemplateContext } from './template-context.model';

/**
 * Toast and modal, adapted from `angular22-ddd-starter`'s `shared/ui/*`.
 * Rendered with inline `template`/`styles` rather than separate
 * `.html`/`.scss` files — the current `GeneratedFile` list
 * (`project-config.service.ts`'s `deriveFiles()`) only lists the `.ts`
 * files for these two features, so inlining keeps every emitted component
 * self-contained instead of shipping a `templateUrl` that points at a file
 * the archive never writes.
 */

function toastComponentTs(ctx: TemplateContext): string {
  const className = componentClassName('toast', ctx.naming);
  return `import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  template: \`
    @if (toast.message(); as message) {
      <div class="toast" role="status" aria-live="polite">{{ message }}</div>
    }
  \`,
  styles: \`
    .toast {
      position: fixed;
      bottom: 1.5rem;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      padding: 0.75rem 1.25rem;
      border-radius: 999px;
      background: var(--surface, #1a1f26);
      color: var(--text, #f4f4f4);
      box-shadow: 0 8px 24px rgb(0 0 0 / 0.25);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
})
export class ${className} {
  protected readonly toast = inject(ToastService);
}
`;
}

function toastComponentSpec(ctx: TemplateContext): string {
  return basicComponentSpec('toast', ctx.naming);
}

function toastServiceTs(): string {
  return `import { Injectable, signal } from '@angular/core';

const AUTO_DISMISS_MS = 2200;

/** App-wide transient message notification. A single plain string, no
 * severity model — a second show() call while a toast is visible replaces
 * the message and resets the auto-dismiss timer rather than queueing. */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _message = signal<string | null>(null);
  readonly message = this._message.asReadonly();

  private timer: ReturnType<typeof setTimeout> | null = null;

  show(message: string): void {
    this._message.set(message);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this._message.set(null), AUTO_DISMISS_MS);
  }
}
`;
}

function modalComponentTs(ctx: TemplateContext): string {
  const className = componentClassName('modal', ctx.naming);
  return `import { DOCUMENT, ChangeDetectionStrategy, Component, HostListener, effect, inject, input, output } from '@angular/core';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

let nextId = 0;

/** Generic, accessible, focus-trapped dialog shell driven by content
 * projection. Veil click and Escape both close; background scroll is
 * locked while open. */
@Component({
  selector: 'app-modal',
  imports: [FocusTrapDirective],
  template: \`
    @if (open()) {
      <div class="overlay">
        <button type="button" class="veil" [attr.aria-label]="closeLabel()" (click)="close()"></button>
        <div class="box" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [appFocusTrap]="open()">
          <button type="button" class="close" [attr.aria-label]="closeLabel()" (click)="close()">&times;</button>
          <div [id]="titleId" role="heading" [attr.aria-level]="titleLevel()">
            <ng-content select="[modal-title]" />
          </div>
          <ng-content select="[modal-gallery]" />
          <ng-content />
        </div>
      </div>
    }
  \`,
  styles: \`
    .overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .veil { position: absolute; inset: 0; border: none; padding: 0; background: rgb(0 0 0 / 0.5); backdrop-filter: blur(4px); cursor: default; }
    .box { position: relative; width: min(50rem, 100%); max-height: 88vh; overflow: auto; border-radius: 1rem; background: var(--surface, #1a1f26); color: var(--text, #f4f4f4); padding: 1.5rem; }
    .close { position: absolute; top: 0.75rem; inset-inline-end: 0.75rem; border: none; background: transparent; color: inherit; font-size: 1.5rem; cursor: pointer; }
    @media (max-width: 640px) {
      .overlay { align-items: flex-end; }
      .box { width: 100%; max-height: 88vh; border-radius: 1rem 1rem 0 0; }
    }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${className} {
  readonly open = input(false);
  readonly openChange = output<boolean>();
  readonly closeLabel = input.required<string>();
  readonly titleLevel = input<2 | 3>(3);

  protected readonly titleId = \`app-modal-title-\${nextId++}\`;

  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      this.document.body.style.overflow = this.open() ? 'hidden' : '';
    });
  }

  close(): void {
    this.openChange.emit(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.open()) this.close();
  }
}
`;
}

function modalComponentSpec(ctx: TemplateContext): string {
  // closeLabel is a required input — TestBed must set it before the first
  // change detection or Angular throws NG0950.
  return basicComponentSpec('modal', ctx.naming, { requiredInputs: { closeLabel: 'Close' } });
}

function focusTrapDirectiveTs(): string {
  return `import { DOCUMENT, Directive, ElementRef, effect, inject, input } from '@angular/core';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Traps Tab/Shift+Tab within the host element while appFocusTrap is
 * truthy, autofocuses the first focusable descendant, and restores focus to
 * whichever element triggered it once released. */
@Directive({ selector: '[appFocusTrap]' })
export class FocusTrapDirective {
  readonly appFocusTrap = input(false);

  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private previouslyFocused: HTMLElement | null = null;

  constructor() {
    this.host.nativeElement.addEventListener('keydown', (event: KeyboardEvent) => {
      if (!this.appFocusTrap() || event.key !== 'Tab') return;
      this.handleTab(event);
    });

    effect(() => {
      if (this.appFocusTrap()) {
        this.previouslyFocused = this.document.activeElement as HTMLElement | null;
        this.focusables()[0]?.focus();
      } else {
        this.previouslyFocused?.focus();
        this.previouslyFocused = null;
      }
    });
  }

  private handleTab(event: KeyboardEvent): void {
    const focusables = this.focusables();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusables(): HTMLElement[] {
    const nodeList: NodeListOf<HTMLElement> = this.host.nativeElement.querySelectorAll(FOCUSABLE_SELECTOR);
    return Array.from(nodeList);
  }
}
`;
}

registerContentResolver((path, ctx) => {
  const toastStem = componentFileStem('toast', ctx.naming);
  const modalStem = componentFileStem('modal', ctx.naming);
  if (path.endsWith(`/ui/toast/${toastStem}.ts`)) return toastComponentTs(ctx);
  if (path.endsWith(`/ui/toast/${toastStem}.spec.ts`)) return toastComponentSpec(ctx);
  if (path.endsWith('/ui/toast/toast.service.ts')) return toastServiceTs();
  if (path.endsWith(`/ui/modal/${modalStem}.ts`)) return modalComponentTs(ctx);
  if (path.endsWith(`/ui/modal/${modalStem}.spec.ts`)) return modalComponentSpec(ctx);
  if (path.endsWith('/directives/focus-trap.directive.ts')) return focusTrapDirectiveTs();
  return undefined;
});
