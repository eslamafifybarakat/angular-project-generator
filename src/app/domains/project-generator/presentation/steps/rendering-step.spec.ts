import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { RenderingStep } from './rendering-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<RenderingStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function modeButtons(fixture: ComponentFixture<RenderingStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.options > .option'));
}

function switches(fixture: ComponentFixture<RenderingStep>): HTMLInputElement[] {
  return Array.from(
    root(fixture).querySelectorAll<HTMLInputElement>('.switch input[type="checkbox"]'),
  );
}

function hydrationButtons(fixture: ComponentFixture<RenderingStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.seg button'));
}

function checkboxes(fixture: ComponentFixture<RenderingStep>): HTMLInputElement[] {
  return Array.from(
    root(fixture).querySelectorAll<HTMLInputElement>('.check input[type="checkbox"]'),
  );
}

function unavailableHint(fixture: ComponentFixture<RenderingStep>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>('.field p.option__desc');
}

function ssrFilesPre(fixture: ComponentFixture<RenderingStep>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>('.code pre');
}

function warningNote(fixture: ComponentFixture<RenderingStep>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>('.note--warn');
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('RenderingStep', () => {
  let fixture: ComponentFixture<RenderingStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RenderingStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(RenderingStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders SSR, CSR and Hybrid, defaulting to SSR with the Recommended badge', () => {
    const buttons = modeButtons(fixture);
    expect(buttons).toHaveLength(3);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(buttons[0].querySelector('.badge--accent')).toBeTruthy();
    expect(buttons[1].querySelector('.badge--accent')).toBeNull();
    expect(buttons[2].querySelector('.badge--accent')).toBeNull();
  });

  it('shows the SSR-only controls while server-rendered and hides them once CSR is selected', async () => {
    expect(switches(fixture)).toHaveLength(2); // prerender + seo-enabled
    expect(hydrationButtons(fixture)).toHaveLength(2);
    expect(ssrFilesPre(fixture)?.textContent).toContain('src/main.server.ts');
    expect(switches(fixture)[0].checked).toBe(true); // prerender defaults on

    modeButtons(fixture)[1].click(); // CSR
    await fixture.whenStable();

    expect(configuration.config().rendering.mode).toBe('csr');
    expect(configuration.config().rendering.prerender).toBe(false);
    expect(switches(fixture)).toHaveLength(1); // only seo-enabled remains
    expect(hydrationButtons(fixture)).toHaveLength(0);
    expect(ssrFilesPre(fixture)).toBeNull();
  });

  it('toggles prerender independently of the seo switch', async () => {
    const toggles = switches(fixture);
    expect(toggles[0].checked).toBe(true);

    toggles[0].click();
    await fixture.whenStable();

    expect(configuration.config().rendering.prerender).toBe(false);
    expect(switches(fixture)[0].checked).toBe(false);
    expect(switches(fixture)[1].checked).toBe(true);
  });

  it('defaults hydration to event-replay for Angular 22 and updates ProjectConfigService when Default is picked', async () => {
    const buttons = hydrationButtons(fixture);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1].disabled).toBe(false);

    buttons[0].click();
    await fixture.whenStable();

    expect(configuration.config().rendering.hydrationStrategy).toBe('default');
    expect(hydrationButtons(fixture)[0].getAttribute('aria-pressed')).toBe('true');
    expect(hydrationButtons(fixture)[1].getAttribute('aria-pressed')).toBe('false');
  });

  it('disables event-replay and resets the strategy when the Angular version cannot produce it', async () => {
    expect(unavailableHint(fixture)).toBeNull();

    configuration.setAngularVersion('17');
    await fixture.whenStable();

    expect(hydrationButtons(fixture)[1].disabled).toBe(true);
    expect(configuration.config().rendering.hydrationStrategy).toBe('default');
    expect(unavailableHint(fixture)).toBeTruthy();
  });

  it('shows a version-specific server package and switches to the classic file list for a pre-standalone version', async () => {
    expect(root(fixture).textContent).toContain('@angular/ssr');
    expect(ssrFilesPre(fixture)?.textContent).toContain('src/app/app.config.server.ts');

    configuration.setAngularVersion('14');
    await fixture.whenStable();

    expect(root(fixture).textContent).toContain('@nguniversal/express-engine');
    expect(ssrFilesPre(fixture)?.textContent).toContain('src/app/app.server.module.ts');
    expect(ssrFilesPre(fixture)?.textContent).not.toContain('src/app/app.config.server.ts');
  });

  it('toggles SEO on/off, hiding the JSON-LD, sitemap and metadata fields when disabled', async () => {
    expect(checkboxes(fixture)).toHaveLength(2);
    expect(root(fixture).querySelector('#seo-site-name')).toBeTruthy();

    switches(fixture)[1].click(); // seo enabled toggle
    await fixture.whenStable();

    expect(configuration.config().seo.enabled).toBe(false);
    expect(checkboxes(fixture)).toHaveLength(0);
    expect(root(fixture).querySelector('#seo-site-name')).toBeNull();
  });

  it('edits the SEO site name and default OG image text fields', async () => {
    setValue(root(fixture).querySelector('#seo-site-name') as HTMLInputElement, 'Acme Inc');
    await fixture.whenStable();
    expect(configuration.config().seo.siteName).toBe('Acme Inc');

    setValue(
      root(fixture).querySelector('#seo-og') as HTMLInputElement,
      'https://acme.test/og.png',
    );
    await fixture.whenStable();
    expect(configuration.config().seo.defaultOgImage).toBe('https://acme.test/og.png');
  });

  it('shows the CSR + JSON-LD warning only while browser-only rendering still has structured data on', async () => {
    expect(warningNote(fixture)).toBeNull();

    modeButtons(fixture)[1].click(); // CSR
    await fixture.whenStable();
    expect(configuration.config().seo.jsonLd).toBe(true);
    expect(warningNote(fixture)).toBeTruthy();

    checkboxes(fixture)[0].click(); // jsonLd off
    await fixture.whenStable();

    expect(configuration.config().seo.jsonLd).toBe(false);
    expect(warningNote(fixture)).toBeNull();
  });
});
