import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Modal } from './modal';

function root(fixture: ComponentFixture<Modal>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function scrim(fixture: ComponentFixture<Modal>): HTMLElement {
  return root(fixture).querySelector('.scrim') as HTMLElement;
}

function dialog(fixture: ComponentFixture<Modal>): HTMLElement {
  return root(fixture).querySelector('.modal') as HTMLElement;
}

function closeButton(fixture: ComponentFixture<Modal>): HTMLButtonElement {
  return root(fixture).querySelector('.modal__close') as HTMLButtonElement;
}

describe('Modal', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Modal],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  function setup(): ComponentFixture<Modal> {
    const fixture = TestBed.createComponent(Modal);
    fixture.componentRef.setInput('heading', 'Delete project');
    return fixture;
  }

  it('renders the heading and wires up the dialog aria attributes', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(root(fixture).querySelector('.modal__title')?.textContent).toBe('Delete project');
    expect(dialog(fixture).getAttribute('role')).toBe('dialog');
    expect(dialog(fixture).getAttribute('aria-modal')).toBe('true');
    expect(dialog(fixture).getAttribute('aria-labelledby')).toBe('app-modal-title');
    expect(root(fixture).querySelector('#app-modal-title')?.textContent).toBe('Delete project');
  });

  it('uses a custom labelledBy id when provided', async () => {
    const fixture = setup();
    fixture.componentRef.setInput('labelledBy', 'my-custom-title');
    await fixture.whenStable();

    expect(dialog(fixture).getAttribute('aria-labelledby')).toBe('my-custom-title');
    expect(root(fixture).querySelector('#my-custom-title')?.textContent).toBe('Delete project');
  });

  it('gives the close button a translated aria-label', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(closeButton(fixture).getAttribute('aria-label')).toBe('Close dialog');
  });

  it('emits closed when the close button is clicked', async () => {
    const fixture = setup();
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);
    await fixture.whenStable();

    closeButton(fixture).click();
    await fixture.whenStable();

    expect(closedCount).toBe(1);
  });

  it('emits closed when the scrim itself is clicked', async () => {
    const fixture = setup();
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);
    await fixture.whenStable();

    scrim(fixture).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(closedCount).toBe(1);
  });

  it('does not emit closed when a click inside the dialog bubbles to the scrim', async () => {
    const fixture = setup();
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);
    await fixture.whenStable();

    dialog(fixture).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();

    expect(closedCount).toBe(0);
  });

  it('emits closed on Escape at the scrim', async () => {
    const fixture = setup();
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);
    await fixture.whenStable();

    scrim(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(closedCount).toBe(1);
  });

  it('emits closed exactly once when the focus trap reports Escape from inside the dialog', async () => {
    const fixture = setup();
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);
    await fixture.whenStable();

    dialog(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    // FocusTrapDirective stops the keydown from bubbling to the scrim, so
    // only its own `escaped` output should have fired the handler.
    expect(closedCount).toBe(1);
  });

  it('moves focus into the dialog once rendered, via the focus trap', async () => {
    // FocusTrapDirective filters candidates by visibility (offsetParent /
    // getClientRects), which jsdom never computes since it has no layout
    // engine — every element reports as invisible there by default. Stub
    // getClientRects so the directive's real visibility check sees the
    // close button as present, matching real-browser behavior.
    const rectsSpy = vi
      .spyOn(Element.prototype, 'getClientRects')
      .mockReturnValue([{}] as unknown as DOMRectList);
    try {
      const fixture = setup();
      await fixture.whenStable();

      expect(dialog(fixture).contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(closeButton(fixture));
    } finally {
      rectsSpy.mockRestore();
    }
  });
});
