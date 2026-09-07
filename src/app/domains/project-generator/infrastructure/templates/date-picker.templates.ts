import { componentClassName, componentFileStem } from '../../domain/naming';
import type { TemplateManifest } from '../../domain/component-template.model';

/**
 * eslam-barakat-portfolio has no date picker at all — confirmed by search
 * and by the project's own extraction analysis
 * (docs/generator/TEMPLATE_SPECIFICATION.md §13), which formally resolved
 * (2026-09-06) to drop "Copy template" for date picker from v1 and offer
 * "Install later" only, permanently rejecting 'customized'.
 *
 * That resolution is superseded here by an explicit, later instruction from
 * the generator project's own user (2026-09-07): hand-author a real
 * implementation rather than continuing to omit the option. This is a
 * net-new, `origin: 'authored'` template — not extracted from source, and
 * labelled as such everywhere it's surfaced (UI badge, README, this
 * comment) rather than presented as extraction. It follows the same
 * conventions as the extracted toast/modal templates (signals, OnPush,
 * logical CSS properties, theme-token colors, no third-party dependency) so
 * it reads as part of the same system.
 */
export const datePickerManifest: TemplateManifest = {
  id: 'date-picker',
  displayName: 'Date picker',
  origin: 'authored',
  sourceNote:
    'No implementation exists in eslam-barakat-portfolio (verified, TEMPLATE_SPECIFICATION.md §13) — generator-authored, not extracted.',
  requiresEra: 'standalone-modern',
  readmeContractRead: true,
  installLater: {
    package: 'flatpickr',
    note: 'Framework-agnostic, no Angular-specific wrapper required; pair with a thin ControlValueAccessor if form integration is needed.',
  },
  files: [
    {
      relativePath: (ctx) => `{shared}/ui/date-picker/${componentFileStem('date-picker', ctx.naming)}.ts`,
      content: (ctx) => {
        const stem = componentFileStem('date-picker', ctx.naming);
        const className = componentClassName('date-picker', ctx.naming);
        return `import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  HostListener,
  Input,
  computed,
  forwardRef,
  inject,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

/**
 * \`<app-date-picker [(ngModel)]="value" label="Start date" />\` — a
 * self-contained popover calendar. Implements ControlValueAccessor so it
 * plugs into template-driven or reactive forms like a native input.
 * SSR-safe: only reads \`document\` through the injected DOCUMENT token, and
 * the popover never opens until a user click, so nothing browser-only runs
 * during server rendering.
 */
@Component({
  selector: 'app-date-picker',
  templateUrl: './${stem}.html',
  styleUrl: './${stem}.${ctx.stylesheetExtension}',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'date-picker' },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ${className}),
      multi: true,
    },
  ],
})
export class ${className} implements ControlValueAccessor {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly document = inject(DOCUMENT);

  /** aria-label for the trigger button, and its placeholder text. */
  @Input() label = 'Choose date';
  /** BCP 47 locale for month/weekday names and the formatted display value. */
  @Input() locale = 'en-US';
  @Input() min: Date | null = null;
  @Input() max: Date | null = null;

  protected readonly open = signal(false);
  protected readonly value = signal<Date | null>(null);
  protected readonly viewMonth = signal<Date>(startOfMonth(new Date()));
  protected readonly disabled = signal(false);

  private onChange: (value: Date | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' }).format(this.viewMonth()),
  );

  protected readonly weekdayLabels = computed(() => {
    const formatter = new Intl.DateTimeFormat(this.locale, { weekday: 'short' });
    // 1970-01-04 is a Sunday; walking 7 days from there covers a full week
    // in locale order without hardcoding English day names.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(1970, 0, 4 + i)));
  });

  protected readonly days = computed<CalendarDay[]>(() => {
    const month = this.viewMonth();
    const selected = this.value();
    const first = startOfMonth(month);
    const gridStart = addDays(first, -first.getDay());
    const today = new Date();
    return Array.from({ length: 42 }, (_, i) => {
      const date = addDays(gridStart, i);
      return {
        date,
        inMonth: date.getMonth() === month.getMonth(),
        isToday: isSameDay(date, today),
        isSelected: selected !== null && isSameDay(date, selected),
      };
    });
  });

  protected readonly displayValue = computed(() => {
    const current = this.value();
    return current ? new Intl.DateTimeFormat(this.locale, { dateStyle: 'medium' }).format(current) : '';
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.el.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close();
  }

  toggle(): void {
    if (this.disabled()) return;
    this.open.update((v) => !v);
    if (this.open()) {
      const current = this.value();
      if (current) this.viewMonth.set(startOfMonth(current));
    } else {
      this.onTouched();
    }
  }

  close(): void {
    this.open.set(false);
    this.onTouched();
  }

  previousMonth(): void {
    this.viewMonth.update((m) => addMonths(m, -1));
  }

  nextMonth(): void {
    this.viewMonth.update((m) => addMonths(m, 1));
  }

  selectDay(day: CalendarDay): void {
    if (this.isDisabledDate(day.date)) return;
    this.value.set(day.date);
    this.onChange(day.date);
    this.close();
  }

  protected isDisabledDate(date: Date): boolean {
    if (this.min && date < this.min) return true;
    if (this.max && date > this.max) return true;
    return false;
  }

  writeValue(value: Date | null): void {
    this.value.set(value);
    this.viewMonth.set(startOfMonth(value ?? new Date()));
  }

  registerOnChange(fn: (value: Date | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function addDays(date: Date, count: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
`;
      },
    },
    {
      relativePath: (ctx) => `{shared}/ui/date-picker/${componentFileStem('date-picker', ctx.naming)}.html`,
      content: () => `<div class="date-picker__control">
  <button
    type="button"
    class="date-picker__trigger"
    [attr.aria-expanded]="open()"
    [attr.aria-label]="label"
    [disabled]="disabled()"
    (click)="toggle()"
  >
    <span class="date-picker__value">{{ displayValue() || label }}</span>
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke-linecap="round" />
    </svg>
  </button>

  @if (open()) {
    <div class="date-picker__panel" role="dialog" aria-modal="false" [attr.aria-label]="label">
      <div class="date-picker__nav">
        <button type="button" class="date-picker__navbtn" aria-label="Previous month" (click)="previousMonth()">‹</button>
        <span class="date-picker__month">{{ monthLabel() }}</span>
        <button type="button" class="date-picker__navbtn" aria-label="Next month" (click)="nextMonth()">›</button>
      </div>
      <div class="date-picker__weekdays">
        @for (day of weekdayLabels(); track day) {
          <span>{{ day }}</span>
        }
      </div>
      <div class="date-picker__grid" role="grid">
        @for (day of days(); track day.date.getTime()) {
          <button
            type="button"
            role="gridcell"
            class="date-picker__day"
            [class.is-outside]="!day.inMonth"
            [class.is-today]="day.isToday"
            [class.is-selected]="day.isSelected"
            [disabled]="isDisabledDate(day.date)"
            [attr.aria-pressed]="day.isSelected"
            (click)="selectDay(day)"
          >
            {{ day.date.getDate() }}
          </button>
        }
      </div>
    </div>
  }
</div>
`,
    },
    {
      relativePath: (ctx) => `{shared}/ui/date-picker/${componentFileStem('date-picker', ctx.naming)}.{style}`,
      content: () => `:host {
  display: inline-block;
  position: relative;
}

.date-picker__trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 11rem;
  padding: 0.5rem 0.75rem;
  border: 0.0625rem solid var(--line);
  border-radius: 0.6875rem;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.date-picker__trigger:hover {
  border-color: var(--line-2);
}

.date-picker__value {
  flex: 1;
  text-align: start;
  color: var(--muted);
}

.date-picker__panel {
  position: absolute;
  inset-block-start: calc(100% + 0.375rem);
  inset-inline-start: 0;
  z-index: 20;
  width: 17.5rem;
  padding: 0.75rem;
  background: var(--bg-2);
  border: 0.0625rem solid var(--line-2);
  border-radius: 0.75rem;
  box-shadow: 0 0.75rem 2rem rgba(0, 0, 0, 0.2);
}

.date-picker__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-block-end: 0.5rem;
  font-weight: 600;
}

.date-picker__navbtn {
  width: 1.75rem;
  height: 1.75rem;
  border: 0.0625rem solid var(--line);
  border-radius: 0.5rem;
  background: var(--surface);
  color: var(--text);
}

.date-picker__weekdays,
.date-picker__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.125rem;
}

.date-picker__weekdays span {
  text-align: center;
  font-size: 0.75rem;
  color: var(--muted);
  padding-block-end: 0.25rem;
}

.date-picker__day {
  aspect-ratio: 1;
  border: none;
  border-radius: 0.5rem;
  background: transparent;
  color: var(--text);
  font-size: 0.86rem;
}

.date-picker__day:hover:not(:disabled) {
  background: var(--surface);
}

.date-picker__day.is-outside {
  color: var(--dim, var(--muted));
}

.date-picker__day.is-today {
  box-shadow: inset 0 0 0 0.0625rem var(--line-2);
}

.date-picker__day.is-selected {
  background: var(--accent);
  color: var(--bg);
}

.date-picker__day:disabled {
  opacity: 0.35;
  pointer-events: none;
}
`,
    },
    {
      relativePath: (ctx) => `{shared}/ui/date-picker/${componentFileStem('date-picker', ctx.naming)}.spec.ts`,
      content: (ctx) => {
        const stem = componentFileStem('date-picker', ctx.naming);
        const className = componentClassName('date-picker', ctx.naming);
        return `import { TestBed } from '@angular/core/testing';
import { ${className} } from './${stem}';

describe('${className}', () => {
  it('opens on trigger click and reports the selected day via registerOnChange', () => {
    const fixture = TestBed.createComponent(${className});
    const cmp = fixture.componentInstance;
    fixture.detectChanges();

    let emitted: Date | null | undefined;
    cmp.registerOnChange((v) => (emitted = v));

    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.date-picker__trigger');
    trigger.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date-picker__panel')).toBeTruthy();

    const today: HTMLButtonElement | null = fixture.nativeElement.querySelector('.date-picker__day.is-today');
    today?.click();
    fixture.detectChanges();

    expect(emitted).toBeInstanceOf(Date);
    expect(fixture.nativeElement.querySelector('.date-picker__panel')).toBeNull();
  });

  it('writeValue sets the displayed value', () => {
    const fixture = TestBed.createComponent(${className});
    const cmp = fixture.componentInstance;
    cmp.writeValue(new Date(2026, 0, 15));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.date-picker__value').textContent).toContain('2026');
  });

  it('setDisabledState prevents opening', () => {
    const fixture = TestBed.createComponent(${className});
    const cmp = fixture.componentInstance;
    cmp.setDisabledState(true);
    fixture.detectChanges();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('.date-picker__trigger');
    expect(trigger.disabled).toBe(true);
  });
});
`;
      },
    },
  ],
};
