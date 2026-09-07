import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Help } from './help';

function root(fixture: ComponentFixture<Help>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function toggleButton(fixture: ComponentFixture<Help>): HTMLButtonElement {
  return root(fixture).querySelector('.help') as HTMLButtonElement;
}

function popover(fixture: ComponentFixture<Help>): HTMLElement | null {
  return root(fixture).querySelector('.popover');
}

function closeButton(fixture: ComponentFixture<Help>): HTMLButtonElement {
  return root(fixture).querySelector('.popover__close') as HTMLButtonElement;
}

describe('Help', () => {
  function setup(): ComponentFixture<Help> {
    const fixture = TestBed.createComponent(Help);
    fixture.componentRef.setInput('headingKey', 'angular_project_generator_step_title_architecture');
    fixture.componentRef.setInput('bodyKey', 'angular_project_generator_app_arch_ddd_help');
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Help],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders a closed toggle with a translated aria-label by default', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(toggleButton(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(toggleButton(fixture).getAttribute('aria-label')).toBe('Why this matters');
    expect(popover(fixture)).toBeNull();
  });

  it('opens the popover on click, showing the translated heading and body', async () => {
    const fixture = setup();
    await fixture.whenStable();

    toggleButton(fixture).click();
    await fixture.whenStable();

    expect(toggleButton(fixture).getAttribute('aria-expanded')).toBe('true');
    const pop = popover(fixture);
    expect(pop).toBeTruthy();
    expect(pop?.getAttribute('role')).toBe('dialog');
    expect(pop?.getAttribute('aria-label')).toBe('Architecture');
    expect(pop?.querySelector('h4')?.textContent).toBe('Architecture');
    expect(pop?.querySelector('p')?.textContent).toBe(
      'Domain-driven groups code by what it means to the business, not by its technical type. Each domain owns its full stack — model, use case, repository, component — so a change to one domain rarely touches another. Best for a project with several distinct areas that will each keep growing.',
    );
  });

  it('clicking the toggle again while open closes the popover', async () => {
    const fixture = setup();
    await fixture.whenStable();

    toggleButton(fixture).click();
    await fixture.whenStable();
    toggleButton(fixture).click();
    await fixture.whenStable();

    expect(toggleButton(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(popover(fixture)).toBeNull();
  });

  it('closes via the translated close button inside the popover', async () => {
    const fixture = setup();
    await fixture.whenStable();

    toggleButton(fixture).click();
    await fixture.whenStable();
    expect(closeButton(fixture).getAttribute('aria-label')).toBe('Close');

    closeButton(fixture).click();
    await fixture.whenStable();

    expect(popover(fixture)).toBeNull();
    expect(toggleButton(fixture).getAttribute('aria-expanded')).toBe('false');
  });

  it('closes on Escape from the toggle button', async () => {
    const fixture = setup();
    await fixture.whenStable();

    toggleButton(fixture).click();
    await fixture.whenStable();
    expect(popover(fixture)).toBeTruthy();

    toggleButton(fixture).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await fixture.whenStable();

    expect(popover(fixture)).toBeNull();
  });
});
