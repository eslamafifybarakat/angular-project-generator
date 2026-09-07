import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Dropdown } from './dropdown';

function root(fixture: ComponentFixture<Dropdown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function trigger(fixture: ComponentFixture<Dropdown>): HTMLButtonElement {
  return root(fixture).querySelector('.dropdown__trigger') as HTMLButtonElement;
}

function options(fixture: ComponentFixture<Dropdown>): HTMLLIElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLLIElement>('.dropdown__option'));
}

describe('Dropdown', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dropdown],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  function setup(): ComponentFixture<Dropdown> {
    const fixture = TestBed.createComponent(Dropdown);
    fixture.componentRef.setInput('options', [
      { value: 'en', label: 'English' },
      { value: 'ar', label: 'Arabic', hint: 'RTL' },
      { value: 'zh', label: 'Chinese' },
    ]);
    fixture.componentRef.setInput('value', 'en');
    fixture.componentRef.setInput('ariaLabel', 'Language');
    return fixture;
  }

  it('renders the selected option label on the trigger, closed by default', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(trigger(fixture).textContent).toContain('English');
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(root(fixture).querySelector('.dropdown__list')).toBeNull();
  });

  it('opens the listbox on click and lists every option', async () => {
    const fixture = setup();
    await fixture.whenStable();

    trigger(fixture).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('.dropdown__list')).toBeTruthy();
    expect(options(fixture).length).toBe(3);
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');
  });

  it('emits valueChange and closes when an option is clicked', async () => {
    const fixture = setup();
    let emitted: string | undefined;
    fixture.componentInstance.valueChange.subscribe((value) => (emitted = value));
    await fixture.whenStable();

    trigger(fixture).click();
    await fixture.whenStable();
    options(fixture)[1].click();
    await fixture.whenStable();

    expect(emitted).toBe('ar');
    expect(root(fixture).querySelector('.dropdown__list')).toBeNull();
  });

  it('does not emit when re-selecting the already-active option', async () => {
    const fixture = setup();
    let emitted = 0;
    fixture.componentInstance.valueChange.subscribe(() => emitted++);
    await fixture.whenStable();

    trigger(fixture).click();
    await fixture.whenStable();
    options(fixture)[0].click();
    await fixture.whenStable();

    expect(emitted).toBe(0);
  });

  it('opens on ArrowDown, moves the active option, and selects with Enter', async () => {
    const fixture = setup();
    let emitted: string | undefined;
    fixture.componentInstance.valueChange.subscribe((value) => (emitted = value));
    await fixture.whenStable();

    trigger(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('true');

    trigger(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    await fixture.whenStable();
    trigger(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();

    expect(emitted).toBe('ar');
    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape without changing the value', async () => {
    const fixture = setup();
    let emitted = 0;
    fixture.componentInstance.valueChange.subscribe(() => emitted++);
    await fixture.whenStable();

    trigger(fixture).click();
    await fixture.whenStable();
    trigger(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(trigger(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(emitted).toBe(0);
  });

  it('closes when a click lands outside the component', async () => {
    const fixture = setup();
    await fixture.whenStable();

    trigger(fixture).click();
    await fixture.whenStable();
    expect(root(fixture).querySelector('.dropdown__list')).toBeTruthy();

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(root(fixture).querySelector('.dropdown__list')).toBeNull();
  });

  it('ignores all interaction while disabled', async () => {
    const fixture = setup();
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();

    expect(trigger(fixture).disabled).toBe(true);
    trigger(fixture).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('.dropdown__list')).toBeNull();
  });
});
