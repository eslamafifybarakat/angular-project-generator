import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { StylingStep } from './styling-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<StylingStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function languageButtons(fixture: ComponentFixture<StylingStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.group .options .option'));
}

function includedPanels(fixture: ComponentFixture<StylingStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.panel--inset'));
}

describe('StylingStep', () => {
  let fixture: ComponentFixture<StylingStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StylingStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(StylingStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders the five CSS-language options with only SCSS enabled', () => {
    const buttons = languageButtons(fixture);
    expect(buttons).toHaveLength(5);
    expect(buttons.map((b) => b.textContent?.includes('SCSS'))[0]).toBe(true);
    expect(buttons.map((b) => b.disabled)).toEqual([false, true, true, true, true]);
  });

  it('marks SCSS as the pressed option and leaves aria-pressed unset on the unavailable ones', () => {
    const buttons = languageButtons(fixture);
    expect(configuration.config().styling.preprocessor).toBe('scss');
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    for (const button of buttons.slice(1)) {
      expect(button.getAttribute('aria-pressed')).toBeNull();
    }
  });

  it('shows a "Planned" badge and the disabled reason on every unavailable language, but not on SCSS', () => {
    const buttons = languageButtons(fixture);

    expect(buttons[0].querySelector('.badge--muted')).toBeNull();
    expect(buttons[0].textContent).toContain(
      'Design tokens, custom properties and RTL overrides are written as SCSS partials.',
    );

    for (const button of buttons.slice(1)) {
      expect(button.querySelector('.badge--muted')?.textContent).toContain('Planned');
      expect(button.textContent).toContain('No verified template yet');
    }
  });

  it('lists the four always-included stylesheet capabilities with a check icon', () => {
    const panels = includedPanels(fixture);
    expect(panels).toHaveLength(4);
    const titles = panels.map((panel) => panel.querySelector('.option__title')?.textContent?.trim());
    expect(titles).toEqual([
      'Design tokens',
      'CSS custom properties',
      'Responsive scale',
      'RTL and LTR',
    ]);
    for (const panel of panels) {
      expect(panel.querySelector('svg')).toBeTruthy();
    }
  });
});
