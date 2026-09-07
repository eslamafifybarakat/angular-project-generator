import { componentClassName, componentFileStem } from '../../domain/naming';
import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * Extracted from eslam-barakat-portfolio's `src/app/shared/ui/modal/*`
 * (docs/generator/TEMPLATE_SPECIFICATION.md §14) and transformed to the
 * naming contract (`modal.component.ts` → `modal.ts`, class `Modal`). The
 * source close button used a project-specific icon-sprite system
 * (`IconButtonComponent` → `IconComponent` → SVG `<symbol>` sprite); rather
 * than dragging that whole dependency chain in as a "modal" requirement, the
 * close button here is a small self-contained inline-SVG button — same
 * accessible behavior (aria-label, focus-visible ring), no sprite
 * dependency. Focus-trap is a verified hard dependency (§14 "Dependencies")
 * and is always generated alongside modal.
 */
export const modalManifest: TemplateManifest = {
  id: 'modal',
  displayName: 'Modal',
  origin: 'extracted',
  sourceNote: 'eslam-barakat-portfolio: src/app/shared/ui/modal/* (close-button icon simplified, see source comment)',
  requiresEra: 'standalone-modern',
  readmeContractRead: true,
  requiredCapabilities: [],
  installLater: {
    package: '@angular/cdk (Dialog)',
    note: 'CDK Dialog is a heavier, more configurable alternative to this focus-trapped shell.',
  },
  files: [
    {
      relativePath: (ctx) => `{shared}/ui/modal/${componentFileStem('modal', ctx.naming)}.ts`,
      content: (ctx) => {
        const stem = componentFileStem('modal', ctx.naming);
        const className = componentClassName('modal', ctx.naming);
        return `import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  EventEmitter,
  HostListener,
  Input,
  Output,
  effect,
  inject,
} from '@angular/core';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

let instanceCounter = 0;

/**
 * A generic focus-trapped dialog shell. Closes on Escape or a veil click,
 * locks background scroll while open, restores focus to the trigger on
 * close (via FocusTrapDirective). Content is supplied by projection, not a
 * data-payload API — see the [modal-title] / default-slot usage below.
 */
@Component({
  selector: 'app-modal',
  imports: [FocusTrapDirective],
  templateUrl: './${stem}.html',
  styleUrl: './${stem}.${ctx.stylesheetExtension}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ${className} {
  private readonly document = inject(DOCUMENT);
  protected readonly titleId = \`modal-title-\${instanceCounter++}\`;

  @Input() open = false;
  @Output() readonly openChange = new EventEmitter<boolean>();
  @Input({ required: true }) closeLabel!: string;
  /** \`3\` (default) — override when the modal is used with no page \`h1\`/\`h2\` ancestor. */
  @Input() titleLevel: 2 | 3 = 3;

  constructor() {
    effect(() => {
      this.document.body.style.overflow = this.open ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  close(): void {
    this.openChange.emit(false);
  }
}
`;
      },
    },
    {
      relativePath: (ctx) => `{shared}/ui/modal/${componentFileStem('modal', ctx.naming)}.html`,
      content: () => `@if (open) {
  <div class="modal is-open">
    <!-- Mouse-only backdrop dismiss; keyboard users close via Escape,
         handled by this component's own (document:keydown.escape) listener. -->
    <!-- eslint-disable-next-line @angular-eslint/template/click-events-have-key-events, @angular-eslint/template/interactive-supports-focus -->
    <div class="modal__veil" (click)="close()"></div>
    <div class="modal__box" role="dialog" aria-modal="true" [attr.aria-labelledby]="titleId" [appFocusTrap]="open">
      <button type="button" class="modal__x" [attr.aria-label]="closeLabel" (click)="close()">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
        </svg>
      </button>
      <!-- role="heading" + aria-level, not a literal h2/h3: an <ng-content
           select> slot can only appear once per selector in a template. -->
      <div class="modal__title" role="heading" [attr.aria-level]="titleLevel" [id]="titleId">
        <ng-content select="[modal-title]" />
      </div>
      <ng-content />
    </div>
  </div>
}
`,
    },
    {
      relativePath: (ctx) => `{shared}/ui/modal/${componentFileStem('modal', ctx.naming)}.{style}`,
      content: () => `:host {
  display: contents;
}

.modal {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.125rem;
}

.modal__veil {
  position: absolute;
  inset: 0;
  background: rgba(3, 6, 12, 0.78);
  backdrop-filter: blur(0.5rem);
}

.modal__box {
  position: relative;
  width: min(50rem, 100%);
  max-width: 100%;
  max-height: 88vh;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  overflow-wrap: break-word;
  background: var(--bg-2);
  border: 0.0625rem solid var(--line-2);
  border-radius: var(--r-xl, 1rem);
  padding: clamp(1rem, 3vw, 1.75rem);
}

.modal__box .modal__title {
  font-size: clamp(1.3rem, 3vw, 1.85rem);
  font-weight: 600;
  margin-inline-end: 2.5rem;
  margin-block-end: 0.75rem;
  letter-spacing: -0.02em;
}

.modal__x {
  position: absolute;
  inset-block-start: 0.875rem;
  inset-inline-end: 0.875rem;
  z-index: 2;
  width: 2.375rem;
  height: 2.375rem;
  display: grid;
  place-items: center;
  border: 0.0625rem solid var(--line);
  border-radius: 0.6875rem;
  color: var(--muted);
  background: var(--surface);
}

.modal__x:hover {
  color: var(--text);
  border-color: var(--line-2);
}

@media (max-width: 42.5rem) {
  .modal {
    padding: 0;
    align-items: flex-end;
  }

  .modal__box {
    width: 100%;
    max-height: 93vh;
    border-radius: var(--r-xl, 1rem) var(--r-xl, 1rem) 0 0;
  }
}
`,
    },
    {
      relativePath: (ctx) => `{shared}/ui/modal/${componentFileStem('modal', ctx.naming)}.spec.ts`,
      content: (ctx) => {
        const stem = componentFileStem('modal', ctx.naming);
        const className = componentClassName('modal', ctx.naming);
        return `import { TestBed } from '@angular/core/testing';
import { ${className} } from './${stem}';

describe('${className}', () => {
  it('renders nothing when closed, and closes on Escape when open', async () => {
    await TestBed.configureTestingModule({ imports: [${className}] }).compileComponents();
    const fixture = TestBed.createComponent(${className});
    fixture.componentRef.setInput('closeLabel', 'Close');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal')).toBeNull();

    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal.is-open')).toBeTruthy();

    let closed = false;
    fixture.componentInstance.openChange.subscribe((v: boolean) => (closed = v === false));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(closed).toBe(true);
  });
});
`;
      },
    },
    {
      relativePath: '{shared}/directives/focus-trap.directive.ts',
      content: () => `import {
  DOCUMENT,
  Directive,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
} from '@angular/core';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * \`[appFocusTrap]="isOpen"\` — while active, confines Tab/Shift+Tab to the
 * host's focusable descendants, focuses the first one on activation, and
 * restores focus to whatever was focused before on deactivation.
 */
@Directive({ selector: '[appFocusTrap]' })
export class FocusTrapDirective implements OnChanges, OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);
  private lastFocused: HTMLElement | null = null;

  @Input('appFocusTrap') active = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['active']) return;
    if (this.active) {
      this.activate();
    } else {
      this.deactivate();
    }
  }

  ngOnDestroy(): void {
    if (this.active) this.deactivate();
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.active || event.key !== 'Tab') return;
    const focusable = this.getFocusable();
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private activate(): void {
    this.lastFocused = this.document.activeElement as HTMLElement | null;
    queueMicrotask(() => this.getFocusable()[0]?.focus());
  }

  private deactivate(): void {
    this.lastFocused?.focus?.();
    this.lastFocused = null;
  }

  private getFocusable(): HTMLElement[] {
    const nodeList = this.el.nativeElement.querySelectorAll(FOCUSABLE_SELECTOR);
    return Array.from(nodeList) as HTMLElement[];
  }
}
`,
    },
  ],
};
