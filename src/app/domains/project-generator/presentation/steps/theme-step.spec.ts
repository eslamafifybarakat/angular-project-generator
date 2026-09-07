import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ThemeStep } from './theme-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<ThemeStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function sourceButtons(fixture: ComponentFixture<ThemeStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.options > .option'));
}

function colorRows(fixture: ComponentFixture<ThemeStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.stack > div'));
}

function hexInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector('.colorrow__hex') as HTMLInputElement;
}

function pickerInput(row: HTMLElement): HTMLInputElement {
  return row.querySelector('.colorrow__picker') as HTMLInputElement;
}

function scaleStops(row: HTMLElement): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>('.scale__stop'));
}

function errorTexts(row: HTMLElement): HTMLElement[] {
  return Array.from(row.querySelectorAll<HTMLElement>('.error'));
}

function switches(fixture: ComponentFixture<ThemeStep>): HTMLInputElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLInputElement>('.switch input[type="checkbox"]'));
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ThemeStep', () => {
  let fixture: ComponentFixture<ThemeStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ThemeStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ThemeStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('marks Template as the selected source by default and lists its loaded checks', () => {
    const buttons = sourceButtons(fixture);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');

    const checks = root(fixture).querySelectorAll('.panel--inset .option__desc');
    expect(checks).toHaveLength(3);
  });

  it('switching to Default hides the template panel and updates ProjectConfigService', async () => {
    sourceButtons(fixture)[0].click();
    await fixture.whenStable();

    expect(configuration.config().theme.source).toBe('default');
    expect(sourceButtons(fixture)[0].getAttribute('aria-pressed')).toBe('true');
    expect(root(fixture).querySelector('.panel--inset')).toBeNull();
  });

  it('renders three color rows with matching values, ten-stop scales and no errors for the valid defaults', () => {
    const rows = colorRows(fixture);
    expect(rows).toHaveLength(3);

    const theme = configuration.config().theme;
    const expected = [theme.primaryColor, theme.secondaryColor, theme.accentColor];
    rows.forEach((row, index) => {
      expect(hexInput(row).value).toBe(expected[index]);
      expect(pickerInput(row).value).toBe(expected[index]);
      expect(scaleStops(row)).toHaveLength(10);
      expect(errorTexts(row)).toHaveLength(0);
      expect(hexInput(row).getAttribute('aria-invalid')).toBe('false');
    });
  });

  it('typing an invalid hex value into the accent field shows a validation error and hides its scale', async () => {
    const accentRow = colorRows(fixture)[2];
    setValue(hexInput(accentRow), 'not-a-color');
    await fixture.whenStable();

    expect(configuration.issuesForPath('theme.accentColor').length).toBeGreaterThan(0);
    expect(hexInput(accentRow).getAttribute('aria-invalid')).toBe('true');
    expect(scaleStops(accentRow)).toHaveLength(0);
    expect(errorTexts(accentRow)).toHaveLength(1);
  });

  it('typing a valid hex updates ProjectConfigService, the picker swatch and the recomputed scale', async () => {
    const primaryRow = colorRows(fixture)[0];
    setValue(hexInput(primaryRow), '#123456');
    await fixture.whenStable();

    expect(configuration.config().theme.primaryColor).toBe('#123456');
    expect(pickerInput(primaryRow).value).toBe('#123456');
    expect(scaleStops(primaryRow)).toHaveLength(10);
    expect(errorTexts(primaryRow)).toHaveLength(0);
  });

  it('toggles dual-mode support independently of the default-scales switch', async () => {
    const toggles = switches(fixture);
    expect(toggles).toHaveLength(2);
    expect(toggles[0].checked).toBe(true);

    toggles[0].click();
    await fixture.whenStable();

    expect(configuration.config().theme.supportDualMode).toBe(false);
    expect(switches(fixture)[0].checked).toBe(false);
    expect(switches(fixture)[1].checked).toBe(true);
  });

  it('toggles use-default-scales independently of the dual-mode switch', async () => {
    const toggles = switches(fixture);
    expect(toggles[1].checked).toBe(true);

    toggles[1].click();
    await fixture.whenStable();

    expect(configuration.config().theme.useDefaultScales).toBe(false);
    expect(switches(fixture)[0].checked).toBe(true);
    expect(switches(fixture)[1].checked).toBe(false);
  });
});
