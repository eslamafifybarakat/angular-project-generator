import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { AngularStep } from './angular-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<AngularStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function versionButtons(fixture: ComponentFixture<AngularStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.options > .option'));
}

function capChips(button: HTMLButtonElement): HTMLElement[] {
  return Array.from(button.querySelectorAll<HTMLElement>('.caps .cap'));
}

describe('AngularStep', () => {
  let fixture: ComponentFixture<AngularStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AngularStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(AngularStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders all nine Angular versions newest first, all enabled', () => {
    const buttons = versionButtons(fixture);
    expect(buttons).toHaveLength(9);
    expect(buttons[0].textContent).toContain('Angular 22');
    expect(buttons[buttons.length - 1].textContent).toContain('Angular 14');
    for (const button of buttons) {
      expect(button.disabled).toBe(false);
    }
  });

  it('marks version 22 as selected by default and shows its build-verified badge only', () => {
    const buttons = versionButtons(fixture);

    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
    for (const button of buttons.slice(1)) {
      expect(button.getAttribute('aria-pressed')).toBe('false');
    }

    expect(buttons[0].querySelector('.badge--ok')).toBeTruthy();
    expect(buttons[1].querySelector('.badge--ok')).toBeNull();
    expect(buttons[1].querySelector('.badge--muted')).toBeTruthy();
  });

  it('selecting a different version updates ProjectConfigService and moves aria-pressed', async () => {
    const buttons = versionButtons(fixture);
    const version14Button = buttons[buttons.length - 1];

    version14Button.click();
    await fixture.whenStable();

    expect(configuration.config().angular.version).toBe('14');
    expect(version14Button.getAttribute('aria-pressed')).toBe('true');
    expect(versionButtons(fixture)[0].getAttribute('aria-pressed')).toBe('false');
  });

  it('renders the tier badge matching each version profile (recommended / supported / legacy)', () => {
    const buttons = versionButtons(fixture);

    // version 22 -> recommended
    expect(buttons[0].querySelector('.badge--accent')).toBeTruthy();
    // version 21 -> supported
    expect(buttons[1].querySelector('.badge--accent')).toBeNull();
    expect(buttons[1].querySelector('.badge')).toBeTruthy();
    // version 14 (last, legacy) -> warn badge
    expect(buttons[buttons.length - 1].querySelector('.badge--warn')).toBeTruthy();
  });

  it('shows unavailable capability chips for a legacy version and stable chips for the newest', () => {
    const buttons = versionButtons(fixture);

    // Version 22: signals is the second capability chip and is "stable".
    const v22Chips = capChips(buttons[0]);
    expect(v22Chips[1].className).toContain('cap--stable');
    expect(v22Chips[1].textContent).toContain('✓');

    // Version 14: signals is unavailable there.
    const v14Chips = capChips(buttons[buttons.length - 1]);
    expect(v14Chips[1].className).toContain('cap--unavailable');
    expect(v14Chips[1].textContent).toContain('✕');
  });

  it('shows no validation errors while the default (selectable) version is chosen', () => {
    expect(configuration.issuesForPath('angular.version')).toHaveLength(0);
    expect(root(fixture).querySelector('.error')).toBeNull();
  });
});
