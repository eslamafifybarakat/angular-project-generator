import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export interface DropdownOption {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

let nextId = 0;

/**
 * Custom-styled, fully keyboard-driven dropdown — a native `<select>`'s popup
 * cannot be themed or carry a per-option hint badge (RTL, direction), so this
 * owns its own popup instead of only decorating the trigger.
 *
 * Follows the WAI-ARIA "select-only combobox" pattern: focus never leaves the
 * trigger button. The listbox is referenced through `aria-activedescendant`,
 * which is what keeps this usable for screen-reader users without a second
 * focus stop.
 */
@Component({
  selector: 'app-dropdown',
  templateUrl: './dropdown.html',
  styleUrl: './dropdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dropdown',
    '(document:click)': 'onDocumentClick($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class Dropdown {
  readonly options = input.required<readonly DropdownOption[]>();
  readonly value = input.required<string>();
  readonly dropdownId = input<string | null>(null);
  readonly labelledBy = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly compact = input(false);
  readonly valueChange = output<string>();

  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);
  protected readonly listboxId = `app-dropdown-listbox-${nextId++}`;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | undefined;

  protected readonly selected = computed<DropdownOption | undefined>(() =>
    this.options().find((option) => option.value === this.value()),
  );

  protected optionId(index: number): string {
    return `${this.listboxId}-opt-${index}`;
  }

  protected setActive(index: number): void {
    this.activeIndex.set(index);
  }

  protected toggle(): void {
    if (this.disabled()) {
      return;
    }
    if (this.open()) {
      this.close();
    } else {
      this.openList();
    }
  }

  protected openList(): void {
    if (this.disabled() || this.options().length === 0) {
      return;
    }
    const index = this.options().findIndex((option) => option.value === this.value());
    this.activeIndex.set(index >= 0 ? index : 0);
    this.open.set(true);
    this.scrollActiveIntoView();
  }

  protected close(): void {
    this.open.set(false);
  }

  protected selectOption(option: DropdownOption): void {
    this.close();
    if (option.value !== this.value()) {
      this.valueChange.emit(option.value);
    }
    this.trigger()?.nativeElement.focus();
  }

  protected onDocumentClick(event: Event): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (this.open() && (!next || !this.host.nativeElement.contains(next))) {
      this.close();
    }
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }
    const options = this.options();
    if (options.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (this.open()) {
          this.moveActive(1);
        } else {
          this.openList();
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.open()) {
          this.moveActive(-1);
        } else {
          this.openList();
        }
        break;
      case 'Home':
        if (this.open()) {
          event.preventDefault();
          this.activeIndex.set(0);
          this.scrollActiveIntoView();
        }
        break;
      case 'End':
        if (this.open()) {
          event.preventDefault();
          this.activeIndex.set(options.length - 1);
          this.scrollActiveIntoView();
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.open()) {
          const option = options[this.activeIndex()];
          if (option) {
            this.selectOption(option);
          }
        } else {
          this.openList();
        }
        break;
      case 'Escape':
        if (this.open()) {
          event.preventDefault();
          event.stopPropagation();
          this.close();
        }
        break;
      case 'Tab':
        this.close();
        break;
      default:
        if (event.key.length === 1) {
          this.typeaheadSearch(event.key);
        }
    }
  }

  private moveActive(delta: number): void {
    const count = this.options().length;
    if (count === 0) {
      return;
    }
    this.activeIndex.update((index) => (index + delta + count) % count);
    this.scrollActiveIntoView();
  }

  /** Mirrors native `<select>` typeahead: closed jumps and commits, open only highlights. */
  private typeaheadSearch(char: string): void {
    clearTimeout(this.typeaheadTimer);
    this.typeahead += char.toLowerCase();
    const match = this.options().findIndex((option) =>
      option.label.toLowerCase().startsWith(this.typeahead),
    );
    this.typeaheadTimer = setTimeout(() => {
      this.typeahead = '';
    }, 500);

    if (match < 0) {
      return;
    }
    if (this.open()) {
      this.activeIndex.set(match);
      this.scrollActiveIntoView();
    } else {
      const option = this.options()[match];
      if (option) {
        this.selectOption(option);
      }
    }
  }

  private scrollActiveIntoView(): void {
    queueMicrotask(() => {
      const el = this.host.nativeElement.querySelector<HTMLElement>(
        `[data-index="${this.activeIndex()}"]`,
      );
      el?.scrollIntoView?.({ block: 'nearest' });
    });
  }
}
