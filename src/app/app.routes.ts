import type { Routes } from '@angular/router';
import { DEFAULT_LANG, LANGUAGES } from '@core/i18n';

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
      import('@domains/project-generator/presentation/steps/project-step').then(
        (m) => m.ProjectStep,
      ),
  },
  {
    path: 'angular',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/angular-step').then(
        (m) => m.AngularStep,
      ),
  },
  {
    path: 'architecture',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/architecture-step').then(
        (m) => m.ArchitectureStep,
      ),
  },
  {
    path: 'styling',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/styling-step').then(
        (m) => m.StylingStep,
      ),
  },
  {
    path: 'theme',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/theme-step').then(
        (m) => m.ThemeStep,
      ),
  },
  {
    path: 'languages',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/languages-step').then(
        (m) => m.LanguagesStep,
      ),
  },
  {
    path: 'rendering',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/rendering-step').then(
        (m) => m.RenderingStep,
      ),
  },
  {
    path: 'environments',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/environments-step').then(
        (m) => m.EnvironmentsStep,
      ),
  },
  {
    path: 'features',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/features-step').then(
        (m) => m.FeaturesStep,
      ),
  },
  {
    path: 'tools',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/tools-step').then(
        (m) => m.ToolsStep,
      ),
  },
  {
    path: 'example',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/example-step').then(
        (m) => m.ExampleStep,
      ),
  },
  {
    path: 'review',
    loadComponent: () =>
      import('@domains/project-generator/presentation/steps/review-step').then(
        (m) => m.ReviewStep,
      ),
  },
];

function localizedChildren(): Routes {
  return [
    {
      path: '',
      loadComponent: () => import('./home/home').then((m) => m.Home),
    },
    {
      path: 'new',
      loadComponent: () =>
        import('@domains/project-generator/presentation/wizard/wizard').then(
          (m) => m.Wizard,
        ),
      children: [{ path: '', redirectTo: 'project', pathMatch: 'full' }, ...STEP_ROUTES],
    },
    {
      path: 'generate',
      loadComponent: () =>
        import('@domains/project-generator/presentation/generation/generation').then(
          (m) => m.Generation,
        ),
    },
    {
      path: 'ready',
      loadComponent: () =>
        import(
          '@domains/project-generator/presentation/project-ready/project-ready'
        ).then((m) => m.ProjectReady),
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
      import('./not-found/not-found').then((m) => m.NotFound),
  },
];
