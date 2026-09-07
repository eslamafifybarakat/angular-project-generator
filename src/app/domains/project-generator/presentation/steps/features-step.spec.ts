import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FeaturesStep } from './features-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<FeaturesStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rowCards(fixture: ComponentFixture<FeaturesStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.rowcard'));
}

function rowByLabel(fixture: ComponentFixture<FeaturesStep>, label: string): HTMLElement {
  const row = rowCards(fixture).find((card) => card.querySelector('h3')?.textContent?.trim() === label);
  if (!row) {
    throw new Error(`No row found for label "${label}"`);
  }
  return row;
}

function segButtons(row: HTMLElement): HTMLButtonElement[] {
  return Array.from(row.querySelectorAll<HTMLButtonElement>('.seg button'));
}

function pressedLabels(row: HTMLElement): string[] {
  return segButtons(row)
    .filter((button) => button.getAttribute('aria-pressed') === 'true')
    .map((button) => button.textContent?.trim() ?? '');
}

describe('FeaturesStep', () => {
  let fixture: ComponentFixture<FeaturesStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturesStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(FeaturesStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders three feature rows and six core-capability rows, each offering all three choices at Angular 22', () => {
    const rows = rowCards(fixture);
    expect(rows).toHaveLength(9);

    const labels = rows.map((row) => row.querySelector('h3')?.textContent?.trim());
    expect(labels).toEqual([
      'Toast',
      'Modal',
      'Date picker',
      'Routing helpers',
      'HTTP layer',
      'Error handling',
      'Storage',
      'Authentication',
      'Authorization',
    ]);

    for (const row of rows) {
      const buttons = segButtons(row);
      expect(buttons).toHaveLength(3);
      for (const button of buttons) {
        expect(button.disabled).toBe(false);
      }
    }
  });

  it('reflects the default config: Toast and Modal are Customized, Date picker is Install later, every Core Capability is Not included', () => {
    expect(pressedLabels(rowByLabel(fixture, 'Toast'))).toEqual(['Copy template']);
    expect(pressedLabels(rowByLabel(fixture, 'Modal'))).toEqual(['Copy template']);
    expect(pressedLabels(rowByLabel(fixture, 'Date picker'))).toEqual(['Install later']);

    for (const label of ['Routing helpers', 'HTTP layer', 'Error handling', 'Storage', 'Authentication', 'Authorization']) {
      expect(pressedLabels(rowByLabel(fixture, label))).toEqual(['Not included']);
    }
  });

  it('selecting "Not included" for Modal updates ProjectConfigService and removes the Customized detail panel', async () => {
    const modalRow = rowByLabel(fixture, 'Modal');
    expect(modalRow.querySelector('.panel--inset')).toBeTruthy();

    const noneButton = segButtons(modalRow).find((b) => b.textContent?.trim() === 'Not included')!;
    noneButton.click();
    await fixture.whenStable();

    expect(configuration.config().features.modal).toBe('none');
    expect(pressedLabels(rowByLabel(fixture, 'Modal'))).toEqual(['Not included']);
    expect(rowByLabel(fixture, 'Modal').querySelector('.panel--inset')).toBeNull();
    expect(rowByLabel(fixture, 'Modal').querySelector('.hint')).toBeNull();
  });

  it('selecting Customized for Storage shows the detected-template panel (found, compatible, extracted) with no README-contract line or dependency hint', async () => {
    const storageRow = rowByLabel(fixture, 'Storage');
    const customButton = segButtons(storageRow).find((b) => b.textContent?.trim() === 'Copy template')!;
    customButton.click();
    await fixture.whenStable();

    expect(configuration.config().coreCapabilities.storage).toBe('customized');
    const panel = rowByLabel(fixture, 'Storage').querySelector('.panel--inset') as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.textContent).toContain('Template found');
    expect(panel.textContent).toContain('Angular 22 compatible');
    expect(panel.textContent).toContain('Extracted from the source project');
    expect(panel.textContent).not.toContain('README contract read');
    expect(panel.querySelector('.hint')).toBeNull();
  });

  it('selecting Customized for HTTP layer shows the required-capability hint naming Error handling', async () => {
    const httpRow = rowByLabel(fixture, 'HTTP layer');
    const customButton = segButtons(httpRow).find((b) => b.textContent?.trim() === 'Copy template')!;
    customButton.click();
    await fixture.whenStable();

    expect(configuration.config().coreCapabilities.httpLayer).toBe('customized');
    const hint = rowByLabel(fixture, 'HTTP layer').querySelector('.panel--inset .hint');
    expect(hint?.textContent).toContain('Error handling');
  });

  it('switching to Angular 14 removes the Customized option and shows the unavailable hint for Toast, but leaves Routing helpers with all three choices', async () => {
    configuration.setAngularVersion('14');
    await fixture.whenStable();

    const toastRow = rowByLabel(fixture, 'Toast');
    expect(segButtons(toastRow).map((b) => b.textContent?.trim())).toEqual(['Not included', 'Install later']);
    expect(toastRow.querySelector('.hint')?.textContent).toContain(
      'Copying a template requires a modern (standalone-components) Angular version.',
    );

    const routingRow = rowByLabel(fixture, 'Routing helpers');
    expect(segButtons(routingRow)).toHaveLength(3);
  });

  it('flags a validation error under the Toast row when switching to an incompatible version while Toast is still Customized', async () => {
    expect(configuration.config().features.toast).toBe('customized');
    expect(configuration.issuesForPath('features.toast')).toHaveLength(0);

    configuration.setAngularVersion('14');
    await fixture.whenStable();

    expect(configuration.issuesForPath('features.toast')).toHaveLength(1);
    const error = rowByLabel(fixture, 'Toast').querySelector('.error');
    expect(error?.textContent).toContain(
      'This selection requires a modern (standalone-components) Angular version.',
    );
  });
});
