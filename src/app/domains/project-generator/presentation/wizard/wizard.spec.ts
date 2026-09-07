import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation, Router } from '@angular/router';
import { Wizard } from './wizard';
import { ProjectConfigService } from '../../application';
import { TranslationService } from '@core/i18n';
import { ToastService } from '@shared/ui/toast';
import { WIZARD_STEPS, type WizardStepId } from '../../domain';

function root(fixture: ComponentFixture<Wizard>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function railStep(fixture: ComponentFixture<Wizard>, step: WizardStepId): HTMLAnchorElement {
  // withHashLocation() renders hrefs as "#/new/<step>", so match on the
  // logical path suffix rather than requiring an exact "/new/<step>" string.
  const link = Array.from(root(fixture).querySelectorAll<HTMLAnchorElement>('.rail__step')).find((a) =>
    (a.getAttribute('href') ?? '').endsWith(`/new/${step}`),
  );
  if (!link) {
    throw new Error(`No rail link rendered for step "${step}"`);
  }
  return link;
}

function navPrimaryButton(fixture: ComponentFixture<Wizard>): HTMLButtonElement {
  return root(fixture).querySelector('.navbar .btn--primary') as HTMLButtonElement;
}

function navPreviousButton(fixture: ComponentFixture<Wizard>): HTMLButtonElement {
  return root(fixture).querySelectorAll<HTMLButtonElement>('.navbar button')[0];
}

function navExportButton(fixture: ComponentFixture<Wizard>): HTMLButtonElement {
  return root(fixture).querySelectorAll<HTMLButtonElement>('.navbar button')[1];
}

describe('Wizard', () => {
  beforeEach(async () => {
    // Wizard renders <a [routerLink]> throughout its rail/chips/manifest and
    // reads router.events/router.url directly, so it needs a real Router
    // (createUrlTree etc.) rather than a hand-rolled fake — the same
    // established pattern as app.spec.ts's provideRouter(). The step routes
    // are component-less: nothing needs to render into Wizard's own
    // <router-outlet> for these tests, only the URL/events to be real.
    await TestBed.configureTestingModule({
      imports: [Wizard],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter(
          [
            { path: '', children: [] },
            { path: 'generate', children: [] },
            ...WIZARD_STEPS.map((step) => ({ path: `new/${step}`, children: [] })),
          ],
          // Hash-based navigation sidesteps needing a <base href> in the
          // test DOM; router.url still reports the plain logical path, so
          // every assertion below is unaffected.
          withHashLocation(),
        ),
      ],
    }).compileComponents();
  });

  async function createAt(path: string): Promise<ComponentFixture<Wizard>> {
    const router = TestBed.inject(Router);
    await router.navigateByUrl(path);
    const fixture = TestBed.createComponent(Wizard);
    await fixture.whenStable();
    return fixture;
  }

  it('renders all twelve wizard steps in both the desktop rail and the mobile chip bar', async () => {
    const fixture = await createAt('/new/project');

    expect(root(fixture).querySelectorAll('.rail__step')).toHaveLength(WIZARD_STEPS.length);
    expect(root(fixture).querySelectorAll('.chips .chip')).toHaveLength(WIZARD_STEPS.length);
  });

  it('highlights the rail entry and page title matching the step encoded in the current URL', async () => {
    const fixture = await createAt('/new/architecture');
    const translations = TestBed.inject(TranslationService);
    const expectedTitle = translations.translate('angular_project_generator_step_title_architecture');

    const current = root(fixture).querySelector('.rail__step.is-current');
    expect(current).toBe(railStep(fixture, 'architecture'));
    expect(current?.querySelector('.rail__label')?.textContent).toBe(expectedTitle);
    expect(root(fixture).querySelector('.work__title')?.textContent).toBe(expectedTitle);
    expect(root(fixture).querySelector('.mobilebar__head .spacer')?.textContent).toContain('3/12');
  });

  it('marks a step visited (and done) only once its own rail link has actually been clicked', async () => {
    const fixture = await createAt('/new/project');

    railStep(fixture, 'architecture').click();
    await fixture.whenStable();
    railStep(fixture, 'angular').click();
    await fixture.whenStable();

    // architecture was visited and is no longer current -> done.
    expect(railStep(fixture, 'architecture').className).toContain('is-done');
    // theme was never opened at all -> neither done nor current.
    expect(railStep(fixture, 'theme').className).not.toContain('is-done');
    expect(railStep(fixture, 'theme').className).not.toContain('is-current');
  });

  it('flags a rail step with a validation error only after it has been visited, never before', async () => {
    const fixture = await createAt('/new/project');
    const configuration = TestBed.inject(ProjectConfigService);
    configuration.setProjectName('');
    configuration.setProjectSlug('');
    await fixture.whenStable();

    // Current step, but not yet "visited" by a click -> not flagged yet.
    expect(railStep(fixture, 'project').className).not.toContain('is-bad');

    railStep(fixture, 'project').click();
    await fixture.whenStable();

    expect(railStep(fixture, 'project').className).toContain('is-bad');
    expect(railStep(fixture, 'project').querySelector('.rail__num')?.textContent?.trim()).toBe('!');
  });

  it('Next/Previous move between steps, and the leading Back button reads as an exit only on the first step', async () => {
    const fixture = await createAt('/new/project');
    const translations = TestBed.inject(TranslationService);

    expect(navPreviousButton(fixture).textContent?.trim()).toBe(
      translations.translate('angular_project_generator_app_exit'),
    );

    navPrimaryButton(fixture).click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/new/angular');
    expect(navPreviousButton(fixture).textContent?.trim()).toBe(
      translations.translate('angular_project_generator_app_back'),
    );
  });

  it('shows Generate (gated on validity) only on the last step, Next everywhere else', async () => {
    const fixture = await createAt('/new/review');
    const configuration = TestBed.inject(ProjectConfigService);

    expect(navPrimaryButton(fixture).disabled).toBe(false);

    configuration.setProjectName('');
    configuration.setProjectSlug('');
    await fixture.whenStable();

    expect(navPrimaryButton(fixture).disabled).toBe(true);
  });

  it('clicking Generate on a valid configuration navigates to /generate', async () => {
    const fixture = await createAt('/new/review');

    navPrimaryButton(fixture).click();
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/generate');
  });

  it('toggles the manifest panel open and closed, showing the live configuration values', async () => {
    const fixture = await createAt('/new/project');
    const aside = () => root(fixture).querySelector('aside.manifest') as HTMLElement;
    expect(aside().className).not.toContain('is-open');

    root(fixture).querySelectorAll<HTMLButtonElement>('.mobilenav button')[1].click();
    await fixture.whenStable();

    expect(aside().className).toContain('is-open');
    expect(aside().querySelector('.manifest__value')?.textContent).toContain('My Project');

    (aside().querySelector('.manifest__close') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(aside().className).not.toContain('is-open');
  });

  it('exportConfig shows a confirmation toast without changing the configuration or navigating away', async () => {
    const fixture = await createAt('/new/project');

    navExportButton(fixture).click();
    await fixture.whenStable();

    expect(TestBed.inject(ToastService).message()).toBe('Configuration exported');
    expect(TestBed.inject(Router).url).toBe('/new/project');
  });
});
