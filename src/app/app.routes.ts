import type { Routes } from '@angular/router';
import { DEFAULT_LANG, LANGUAGES } from '@core/i18n/i18n.model';

/**
 * Route-prefix localization: the default language sits at the root, and every
 * other language gets its own duplicated block under a path prefix.
 *
 * The blocks are built from LANGUAGES rather than written out, so adding a
 * language cannot leave a route behind. Step imports below are literal on
 * purpose — a template-literal `import()` is not statically analysable, so the
 * bundler would silently stop code-splitting them.
 */
const STEP_ROUTES: Routes = [
  {
    path: 'project',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/project-step.component').then(
        (m) => m.ProjectStepComponent,
      ),
  },
  {
    path: 'angular',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/angular-step.component').then(
        (m) => m.AngularStepComponent,
      ),
  },
  {
    path: 'architecture',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/architecture-step.component').then(
        (m) => m.ArchitectureStepComponent,
      ),
  },
  {
    path: 'styling',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/styling-step.component').then(
        (m) => m.StylingStepComponent,
      ),
  },
  {
    path: 'theme',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/theme-step.component').then(
        (m) => m.ThemeStepComponent,
      ),
  },
  {
    path: 'languages',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/languages-step.component').then(
        (m) => m.LanguagesStepComponent,
      ),
  },
  {
    path: 'rendering',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/rendering-step.component').then(
        (m) => m.RenderingStepComponent,
      ),
  },
  {
    path: 'environments',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/environments-step.component').then(
        (m) => m.EnvironmentsStepComponent,
      ),
  },
  {
    path: 'features',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/features-step.component').then(
        (m) => m.FeaturesStepComponent,
      ),
  },
  {
    path: 'tools',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/tools-step.component').then(
        (m) => m.ToolsStepComponent,
      ),
  },
  {
    path: 'example',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/example-step.component').then(
        (m) => m.ExampleStepComponent,
      ),
  },
  {
    path: 'review',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/review-step.component').then(
        (m) => m.ReviewStepComponent,
      ),
  },
];

function localizedChildren(): Routes {
  return [
    {
      path: '',
      loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent),
    },
    {
      path: 'new',
      loadComponent: () =>
        import('@domains/project-generator/presentation/wizard/wizard.component').then(
          (m) => m.WizardComponent,
        ),
      children: [{ path: '', redirectTo: 'project', pathMatch: 'full' }, ...STEP_ROUTES],
    },
    {
      path: 'generate',
      loadComponent: () =>
        import('@domains/project-generator/presentation/generation/generation.component').then(
          (m) => m.GenerationComponent,
        ),
    },
    {
      path: 'ready',
      loadComponent: () =>
        import(
          '@domains/project-generator/presentation/project-ready/project-ready.component'
        ).then((m) => m.ProjectReadyComponent),
    },
  ];
}

export const routes: Routes = [
  ...localizedChildren(),
  ...LANGUAGES.filter((l) => l.code !== DEFAULT_LANG).map((l) => ({
    path: l.prefix,
    children: localizedChildren(),
  })),
  {
    path: '**',
    loadComponent: () =>
      import('./not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
