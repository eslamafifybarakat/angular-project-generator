import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { provideRouter, withHashLocation, Router } from '@angular/router';
import { Dashboard } from './dashboard';
import { GeneratorService, ProjectConfigService, type GenerationRecord } from '../../application';
import { PresetRepository } from '../../infrastructure';
import { ToastService } from '@shared/ui/toast';

/**
 * Dashboard only reads `generator.recent`, so the fake need only expose that
 * one signal — the real GeneratorService's pipeline runs on real timers and
 * is unrelated to anything this component renders.
 */
class FakeGeneratorService {
  private readonly history = signal<readonly GenerationRecord[]>([]);
  readonly recent = this.history.asReadonly();

  setRecent(records: readonly GenerationRecord[]): void {
    this.history.set(records);
  }
}

function root(fixture: ComponentFixture<Dashboard>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function presetButtons(fixture: ComponentFixture<Dashboard>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.preset'));
}

function importTextarea(fixture: ComponentFixture<Dashboard>): HTMLTextAreaElement {
  return root(fixture).querySelector('#import-config') as HTMLTextAreaElement;
}

function setImportText(fixture: ComponentFixture<Dashboard>, value: string): void {
  const textarea = importTextarea(fixture);
  textarea.value = value;
  textarea.dispatchEvent(new Event('input'));
}

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let configuration: ProjectConfigService;
  let generator: FakeGeneratorService;
  let toast: ToastService;
  let router: Router;

  beforeEach(async () => {
    generator = new FakeGeneratorService();
    // Dashboard renders real <a [routerLink]> anchors, which need a real
    // Router (to compute hrefs via createUrlTree) rather than a hand-rolled
    // fake — the same established pattern as app.spec.ts's provideRouter([]).
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideZonelessChangeDetection(),
        // Hash-based navigation sidesteps needing a <base href> in the test
        // DOM; router.url still reports the plain logical path.
        provideRouter([{ path: 'new', children: [] }], withHashLocation()),
        { provide: GeneratorService, useValue: generator },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
    configuration = TestBed.inject(ProjectConfigService);
    toast = TestBed.inject(ToastService);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('shows the empty recent-configurations state with a create CTA when nothing has been generated yet', () => {
    expect(root(fixture).querySelector('.empty')).toBeTruthy();
    expect(root(fixture).querySelector('.columns section:first-child .stack')).toBeNull();
  });

  it('lists a recent generation once the generator reports one', async () => {
    generator.setRecent([{ name: 'Acme Portal', slug: 'acme-portal', angularVersion: '22', fileCount: 87 }]);
    await fixture.whenStable();

    const item = root(fixture).querySelector('.columns section:first-child .preset');
    expect(item?.textContent).toContain('Acme Portal');
    expect(item?.textContent).toContain('acme-portal.zip');
    expect(item?.textContent).toContain('Angular 22');
    expect(item?.textContent).toContain('87');
  });

  it('renders exactly one button for every repository preset', () => {
    const presets = TestBed.inject(PresetRepository).list();
    expect(presetButtons(fixture)).toHaveLength(presets.length);
  });

  it('applying a preset patches the configuration, confirms with a toast, and navigates to /new', async () => {
    presetButtons(fixture)[0].click();
    await fixture.whenStable();

    // The first preset (ssr-starter) turns off the example domain and pins
    // hydration to 'default' — a distinctive marker that the patch landed.
    expect(configuration.config().architecture.includeExampleDomain).toBe(false);
    expect(configuration.config().rendering.hydrationStrategy).toBe('default');
    expect(toast.message()).toBe('Angular SSR starter');
    expect(router.url).toBe('/new');
  });

  it('opens the import modal pre-filled with the current configuration JSON', async () => {
    (root(fixture).querySelector('.hero__actions button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('app-modal')).toBeTruthy();
    expect(importTextarea(fixture).value).toBe(configuration.toJson());
  });

  it('closing the import modal hides it without touching the configuration', async () => {
    (root(fixture).querySelector('.hero__actions button') as HTMLButtonElement).click();
    await fixture.whenStable();
    const before = configuration.toJson();

    (root(fixture).querySelector('.modal-actions .btn:not(.btn--primary)') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('app-modal')).toBeNull();
    expect(configuration.toJson()).toBe(before);
  });

  it('reports a parse error and keeps the modal open for malformed JSON', async () => {
    (root(fixture).querySelector('.hero__actions button') as HTMLButtonElement).click();
    await fixture.whenStable();
    setImportText(fixture, '{ not json');
    await fixture.whenStable();

    (root(fixture).querySelector('.modal-actions .btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('app-modal')).toBeTruthy();
    expect(root(fixture).querySelector('.note--err')).toBeTruthy();
    expect(router.url).not.toBe('/new');
  });

  it('rejects a well-formed but invalid configuration (customized date picker on an incompatible version) by name', async () => {
    (root(fixture).querySelector('.hero__actions button') as HTMLButtonElement).click();
    await fixture.whenStable();
    setImportText(
      fixture,
      JSON.stringify({
        angular: { version: '14' },
        features: { toast: 'none', modal: 'none', datePicker: 'customized' },
      }),
    );
    await fixture.whenStable();

    (root(fixture).querySelector('.modal-actions .btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();

    const problems = root(fixture).querySelector('.note--err ul')?.textContent ?? '';
    expect(problems).toContain('features.datePicker');
    expect(root(fixture).querySelector('app-modal')).toBeTruthy();
  });

  it('importing an unedited (already valid) configuration closes the modal, confirms with a toast, and navigates to /new', async () => {
    (root(fixture).querySelector('.hero__actions button') as HTMLButtonElement).click();
    await fixture.whenStable();

    (root(fixture).querySelector('.modal-actions .btn--primary') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('app-modal')).toBeNull();
    expect(toast.message()).toBe('Configuration imported');
    expect(router.url).toBe('/new');
  });
});
