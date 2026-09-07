import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ToolsStep } from './tools-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<ToolsStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function groupHeadings(fixture: ComponentFixture<ToolsStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.group__head'));
}

function checkRow(fixture: ComponentFixture<ToolsStep>, labelText: string): HTMLElement {
  const row = Array.from(root(fixture).querySelectorAll<HTMLElement>('.check')).find(
    (label) => label.querySelector('.check__text')?.textContent?.trim() === labelText,
  );
  if (!row) {
    throw new Error(`No check row found for "${labelText}"`);
  }
  return row;
}

function checkboxFor(fixture: ComponentFixture<ToolsStep>, labelText: string): HTMLInputElement {
  return checkRow(fixture, labelText).querySelector('input[type="checkbox"]') as HTMLInputElement;
}

function noteFor(fixture: ComponentFixture<ToolsStep>, labelText: string): string | undefined {
  return checkRow(fixture, labelText).querySelector('.check__sub')?.textContent?.trim();
}

function scriptLines(fixture: ComponentFixture<ToolsStep>): string[] {
  const pres = Array.from(root(fixture).querySelectorAll<HTMLElement>('.code pre'));
  const text = pres[pres.length - 1]?.textContent ?? '';
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

describe('ToolsStep', () => {
  let fixture: ComponentFixture<ToolsStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolsStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ToolsStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders the four settings groups plus a scripts section, with the help affordance only on Testing', () => {
    const headings = groupHeadings(fixture);
    expect(headings).toHaveLength(5);
    expect(headings[0].textContent?.trim()).toBe('Code quality');
    expect(headings[1].textContent?.trim()).toContain('Testing');
    expect(headings[2].textContent?.trim()).toBe('Performance');
    expect(headings[3].textContent?.trim()).toBe('Accessibility');
    expect(headings[4].textContent?.trim()).toBe('Scripts in package.json');

    const testingGroup = headings[1].closest('.group') as HTMLElement;
    expect(testingGroup.querySelector('app-help')).toBeTruthy();

    const qualityGroup = groupHeadings(fixture)[0].closest('.group') as HTMLElement;
    expect(qualityGroup.querySelector('app-help')).toBeNull();
  });

  it('checkbox states match the default developerTools config', () => {
    expect(checkboxFor(fixture, 'ESLint').checked).toBe(true);
    expect(checkboxFor(fixture, 'Unit tests').checked).toBe(true);
    expect(checkboxFor(fixture, 'End-to-end tests').checked).toBe(false);
    expect(checkboxFor(fixture, 'Image optimisation').checked).toBe(false);
    expect(checkboxFor(fixture, 'Bundle budgets').checked).toBe(true);
  });

  it('toggling ESLint off updates ProjectConfigService and removes "lint" from the generated scripts preview', async () => {
    checkboxFor(fixture, 'ESLint').click();
    await fixture.whenStable();

    expect(configuration.config().developerTools.eslint).toBe(false);
    expect(scriptLines(fixture)).not.toContain('npm run lint');
  });

  it('shows the Unit tests note combining the Angular 22 test runner with the spec-file convention', () => {
    const note = noteFor(fixture, 'Unit tests');
    expect(note).toContain('Vitest (@angular/build:unit-test)');
    expect(note).toContain('Generates a matching .spec.ts next to every component');
  });

  it('translates the "not templated yet" note for both End-to-end tests and Image optimisation', () => {
    expect(noteFor(fixture, 'End-to-end tests')).toBe('Not templated yet');
    expect(noteFor(fixture, 'Image optimisation')).toBe('Not templated yet');
  });

  it('lists the derived npm scripts for the default config in order (SSR, ESLint, Prettier, staging/production environments)', () => {
    expect(scriptLines(fixture)).toEqual([
      'npm start',
      'npm run build',
      'npm run test',
      'npm run lint',
      'npm run format',
      'npm run build:staging',
      'npm run build:production',
      'npm run serve:ssr',
    ]);
  });

  it('drops "serve:ssr" from the generated scripts once rendering mode is switched to CSR', async () => {
    configuration.patch('rendering', { mode: 'csr' });
    await fixture.whenStable();

    expect(scriptLines(fixture)).not.toContain('npm run serve:ssr');
  });
});
