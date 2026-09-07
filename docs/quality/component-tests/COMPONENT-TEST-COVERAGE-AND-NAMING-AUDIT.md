# Component Test Coverage & Naming Audit

Date: 2026-09-07
Scope: `angular-project-generator` app source (`src/app/**`), excluding
`src/app/domains/project-generator/infrastructure/templates/*.templates.ts`
(these emit code as string literals for *generated* projects — a different,
external contract, not this app's own components).

## Summary

| Metric | Count |
|---|---|
| Total Angular components discovered | 25 |
| Components with specs before this pass | 3 (`App`, `Dropdown`, `ArchitectureStep`) |
| Specs already in progress (found mid-task, completed as part of this pass) | 4 (`AngularStep`, `StylingStep`, `Modal`, `Toast`) |
| Specs newly created in this pass | 18 |
| Specs migrated (old `.component.spec.ts` → bare) | 0 — none existed |
| Specs enhanced (pre-existing, made more meaningful) | 0 — the 3 pre-existing specs were already meaningful |
| Component classes renamed (`Component` suffix removed) | 0 — already fully compliant project-wide before this task started |
| Files renamed | 0 |
| Imports updated | 0 |
| Routes updated | 0 |
| Lazy imports updated | 0 |
| Barrel exports updated | 0 |
| Stale references fixed | 0 |
| Duplicate specs removed/merged | 0 |
| Tests passing | 234 / 234 |
| Lint | PASS |
| Type-check | PASS |
| Build (SSR + prerender) | PASS (60 routes prerendered) |

## Naming state (items 1–2, 20–21, 37 of the migration brief)

`export\s+class\s+\w+Component\b` across `src/**/*.ts` (excluding `.spec.ts`)
returns **zero matches**. Every component class already uses a bare PascalCase
name with no `Component` suffix (`Header`, `Dropdown`, `Wizard`,
`ProjectReady`, `AngularStep`, etc.) — this was completed by prior work in
this repo before this task began (see commits `5f96ce3` "Add
version-conditional component naming and generated test files" and `abf43ff`
"Make the example-step file preview follow the selected Angular version's
naming"). No renaming, import migration, route migration, or barrel-export
migration was needed in this pass.

The single remaining textual match of `\w+Component\b` project-wide is a
**string literal inside a test assertion**
(`example-step.spec.ts:96`, `expect(...).toContain('export class AppComponent')`),
which verifies the wizard's *legacy-Angular-version code preview* correctly
shows the classic `.component`-suffixed convention for Angular <21 (matching
real `ng generate` behavior pre-2025 style guide). This is intentional
content the feature is supposed to produce, not a naming violation.

No `*.component.ts`, `*.component.html`, `*.component.scss`, or
`*.component.spec.ts` files exist anywhere in `src/`.

## Spec coverage (items 6–9, 36)

All 25 real Angular components now have a co-located `.spec.ts`:

| Component | File | Spec | `it` blocks |
|---|---|---|---|
| App | `src/app/app.ts` | pre-existing | — |
| Dropdown | `src/app/shared/ui/dropdown/dropdown.ts` | pre-existing | 9 |
| Modal | `src/app/shared/ui/modal/modal.ts` | completed this pass | 9 |
| Toast | `src/app/shared/ui/toast/toast.ts` | completed this pass | — |
| Help | `src/app/shared/ui/help/help.ts` | new | 5 |
| Header | `src/app/layout/header/header.ts` | new | 6 |
| Footer | `src/app/layout/footer/footer.ts` | new | 4 |
| Home | `src/app/home/home.ts` | new | 4 |
| NotFound | `src/app/not-found/not-found.ts` | new | 4 |
| Wizard | `.../presentation/wizard/wizard.ts` | new | 9 |
| Dashboard | `.../presentation/dashboard/dashboard.ts` | new | 8 |
| Generation | `.../presentation/generation/generation.ts` | new | 8 |
| ProjectReady | `.../presentation/project-ready/project-ready.ts` | new | 9 |
| ArchitectureStep | `.../presentation/steps/architecture-step.ts` | pre-existing | 5 |
| AngularStep | `.../presentation/steps/angular-step.ts` | completed this pass | 5 |
| StylingStep | `.../presentation/steps/styling-step.ts` | completed this pass | — |
| ProjectStep | `.../presentation/steps/project-step.ts` | new | 6 |
| ThemeStep | `.../presentation/steps/theme-step.ts` | new | 7 |
| LanguagesStep | `.../presentation/steps/languages-step.ts` | new | 9 |
| RenderingStep | `.../presentation/steps/rendering-step.ts` | new | 9 |
| EnvironmentsStep | `.../presentation/steps/environments-step.ts` | new | 7 |
| FeaturesStep | `.../presentation/steps/features-step.ts` | new | 7 |
| ExampleStep | `.../presentation/steps/example-step.ts` | new | 7 |
| ToolsStep | `.../presentation/steps/tools-step.ts` | new | 7 |
| ReviewStep | `.../presentation/steps/review-step.ts` | new | 7 |

Total: 234 passing tests across 32 spec files (25 component specs + 7
pre-existing domain/application/infrastructure specs unrelated to this task).

## Conventions followed

- Test runner: Vitest via `@angular/build:unit-test` (the project's existing,
  only configured runner — no new framework introduced).
- Zoneless change detection: every spec uses `provideZonelessChangeDetection()`
  and `await fixture.whenStable()` after each state change, never a
  Karma-style synchronous `detectChanges()`.
- Standalone components imported directly into `TestBed.configureTestingModule({ imports: [...] })`
  (no NgModule declarations anywhere in this app).
- Real dependencies were preferred over mocks wherever they are cheap,
  synchronous, or side-effect-only (`ProjectConfigService`, `TranslationService`,
  `LanguageService`, `ThemeService`, `ToastService`, `Title`/`Meta`). Fakes were
  used only where the real implementation is genuinely unsuitable for a unit
  test: `GeneratorService` (real timers driving a ~4s pipeline) in
  `generation.spec.ts`/`project-ready.spec.ts`/`dashboard.spec.ts`, and a
  minimal `Router` fake in components with no `routerLink`s. Components that
  render `[routerLink]` or read `router.url`/`router.events` directly
  (`Wizard`, `Dashboard`, `Header`) use a real `Router` via `provideRouter(...)`
  instead, matching the pattern already established in `app.spec.ts`.
- Assertions target real rendered DOM (classes, `aria-*` attributes, disabled
  state, translated text copied verbatim from `src/locales/en.json`) and real
  service state, not implementation internals.

## Issues found and fixed during validation

1. **`languages-step.spec.ts`**: `configuration.config().fonts.ar` failed
   `tsc` (`TS4111`, index-signature access) — fixed to bracket notation
   `fonts['ar']`.
2. **`header.spec.ts`**: `provideRouter([{ path: '**' }])` is an invalid
   Angular route config (a wildcard route needs `component`/`redirectTo`/
   `children`/etc.) — fixed to `{ path: '**', children: [] }`.
3. **`wizard.spec.ts`**: the rail-link lookup helper matched on an exact
   `/new/<step>` href, but the spec's `withHashLocation()` router renders
   hrefs as `#/new/<step>` — fixed the matcher to check the path suffix
   instead of exact equality.
4. **`modal.spec.ts`**: the focus-trap-on-open test failed because jsdom has
   no layout engine, so `FocusTrapDirective`'s real visibility filter
   (`offsetParent`/`getClientRects`) always reports every element as
   invisible, and the trap therefore never focuses anything. This is a test
   *environment* limitation, not a component defect — fixed by stubbing
   `Element.prototype.getClientRects` for the one test that exercises this
   path, restoring it immediately after.
5. **`header.spec.ts`**: the language-switch test raced a genuinely async
   chain (`(valueChange)` → `async switchLanguage()` → real dynamic
   `import('../../../locales/ar.json')` → `router.navigateByUrl`) that
   zoneless change detection cannot track via `fixture.whenStable()` alone
   (no zone.js patching of native promises). Fixed by polling
   (`waitFor(fixture, () => language.lang() === 'ar')`, capped at 20 attempts)
   instead of assuming a fixed number of macrotask flushes.
6. **`project-ready.spec.ts`** (lint only): referencing `URL.createObjectURL`/
   `URL.revokeObjectURL` unbound to save/restore them tripped
   `@typescript-eslint/unbound-method`; an empty `mockImplementation(() => {})`
   tripped `no-empty-function`. Fixed with a scoped `eslint-disable-next-line`
   (the values are captured only for restoration, never called unbound) and
   `mockImplementation(() => undefined)`.

No source (non-test) files needed changes — this was purely a test-authoring
task; no naming, routing, or business-logic changes were required.

## Remaining exceptions

None. Every discovered component has a spec with meaningful behavioral
coverage; naming is fully compliant; no stale references, no duplicate specs,
no `.component.*` files remain.

## Validation

```
npm run test        -- 234 passed, 0 failed (32 spec files)
npm run type-check   -- clean
npm run lint         -- clean
npm run build        -- succeeded, 60 static routes prerendered
                        (pre-existing initial-bundle budget warning,
                        unrelated to this change — spec files are not
                        part of the app build target)
```
