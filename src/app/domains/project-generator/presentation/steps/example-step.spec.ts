import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ExampleStep } from './example-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<ExampleStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function optionButtons(fixture: ComponentFixture<ExampleStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.options > .option'));
}

function monoTexts(fixture: ComponentFixture<ExampleStep>): string[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.hint .mono')).map(
    (el) => el.textContent?.trim() ?? '',
  );
}

function codeBlocks(fixture: ComponentFixture<ExampleStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.code pre'));
}

describe('ExampleStep', () => {
  let fixture: ComponentFixture<ExampleStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExampleStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ExampleStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders both options and marks "One worked example" pressed by default (includeExampleDomain starts true)', () => {
    const buttons = optionButtons(fixture);
    expect(buttons).toHaveLength(2);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[0].textContent).toContain('Empty skeleton');
    expect(buttons[1].textContent).toContain('One worked example');
  });

  it('shows the Preview section with modern (suffix-free) file paths and class name for the default Angular 22', () => {
    expect(monoTexts(fixture)).toEqual(['src/app/app.ts', 'src/app/app.html']);
    expect(codeBlocks(fixture)[0].textContent).toContain('export class App');
  });

  it('lists template lines built from the default features: i18n heading, toast, router-outlet, modal', () => {
    const htmlPreview = codeBlocks(fixture)[1].textContent ?? '';
    expect(htmlPreview).toContain(`{{ 'home.title' | translate }}`);
    expect(htmlPreview).toContain('<app-toast />');
    expect(htmlPreview).toContain('<router-outlet />');
    expect(htmlPreview).toContain('<app-modal [open]="open()" />');
  });

  it('clicking "Empty skeleton" sets includeExampleDomain to false and hides the Preview section entirely', async () => {
    optionButtons(fixture)[0].click();
    await fixture.whenStable();

    expect(configuration.config().architecture.includeExampleDomain).toBe(false);
    expect(optionButtons(fixture)[0].getAttribute('aria-pressed')).toBe('true');
    expect(optionButtons(fixture)[1].getAttribute('aria-pressed')).toBe('false');
    expect(root(fixture).querySelector('.code')).toBeNull();
    expect(monoTexts(fixture)).toEqual([]);
  });

  it('drops the toast and modal lines from the preview once those features are no longer Customized', async () => {
    configuration.patch('features', { toast: 'none', modal: 'none' });
    await fixture.whenStable();

    const htmlPreview = codeBlocks(fixture)[1].textContent ?? '';
    expect(htmlPreview).not.toContain('<app-toast />');
    expect(htmlPreview).not.toContain('<app-modal');
    expect(htmlPreview).toContain('<router-outlet />');
  });

  it('drops the i18n heading line from the preview once localization is disabled', async () => {
    configuration.patch('localization', { enabled: false });
    await fixture.whenStable();

    const htmlPreview = codeBlocks(fixture)[1].textContent ?? '';
    expect(htmlPreview).not.toContain('home.title');
    expect(htmlPreview).toContain('<router-outlet />');
  });

  it('follows classic (.component-suffixed) naming for a pre-21 Angular version', async () => {
    configuration.setAngularVersion('14');
    await fixture.whenStable();

    expect(monoTexts(fixture)).toEqual(['src/app/app.component.ts', 'src/app/app.component.html']);
    expect(codeBlocks(fixture)[0].textContent).toContain('export class AppComponent');
  });
});
