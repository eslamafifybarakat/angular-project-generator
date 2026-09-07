export type VersionTier = 'recommended' | 'supported' | 'legacy';

/**
 * How available a capability is in a given Angular major. A plain boolean
 * would lose the "it exists but you have to opt in" middle state that
 * matters for version-accurate guidance (e.g. zoneless was experimental for
 * three majors before it became the default).
 */
export type FeatureStatus = 'unavailable' | 'preview' | 'stable' | 'default';

/** Which generated-file architecture a version maps to. Drives `deriveFiles()`. */
export type GenerationEra = 'ngmodule-legacy' | 'ngmodule-transitional' | 'standalone-modern';

/**
 * One row of the Angular compatibility matrix.
 *
 * Every fact here is sourced from https://angular.dev/reference/versions and
 * the per-major release notes (see README § Supported Angular versions for
 * citations), not guessed. `null` means genuinely not pinned down rather than
 * "probably fine" — rendering the gap is safer than rendering a guess.
 */
export interface AngularVersionProfile {
  readonly version: string;
  readonly releaseDate: string;
  readonly tier: VersionTier;
  /**
   * True only for the one version this repository itself is built on and has
   * actually run `npm install` / `build` / `test` against. Every other
   * version is capability-modeled from documentation, not executed — the UI
   * must never blur that distinction.
   */
  readonly buildVerified: boolean;
  /** False means the generator refuses this version outright. */
  readonly selectable: boolean;
  readonly era: GenerationEra;

  readonly cli: string | null;
  readonly builder: string | null;
  readonly node: string | null;
  readonly typescript: string | null;
  readonly rxjs: string | null;
  readonly bootstrap: string | null;
  readonly ssrPackage: string | null;
  readonly testing: string | null;

  readonly standalone: FeatureStatus;
  readonly ngmodules: FeatureStatus;
  readonly signals: FeatureStatus;
  readonly controlFlow: FeatureStatus;
  readonly defer: FeatureStatus;
  readonly applicationBuilder: FeatureStatus;
  readonly hydration: FeatureStatus;
  readonly eventReplay: FeatureStatus;
  readonly incrementalHydration: FeatureStatus;
  readonly zoneless: FeatureStatus;
  /** `@angular/service-worker` has shipped since Angular 5; not a real gate. */
  readonly serviceWorker: boolean;
}

/** Shared ordering + translation keys for the capability chip grid. */
export const CAPABILITY_ROWS: readonly {
  readonly key: keyof Pick<
    AngularVersionProfile,
    | 'standalone'
    | 'signals'
    | 'controlFlow'
    | 'defer'
    | 'applicationBuilder'
    | 'hydration'
    | 'eventReplay'
    | 'incrementalHydration'
    | 'zoneless'
  >;
  readonly labelKey: string;
}[] = [
  { key: 'standalone', labelKey: 'angular_project_generator_app_cap_standalone' },
  { key: 'signals', labelKey: 'angular_project_generator_app_cap_signals' },
  { key: 'controlFlow', labelKey: 'angular_project_generator_app_cap_control_flow' },
  { key: 'defer', labelKey: 'angular_project_generator_app_cap_defer' },
  { key: 'applicationBuilder', labelKey: 'angular_project_generator_app_cap_app_builder' },
  { key: 'hydration', labelKey: 'angular_project_generator_app_cap_hydration' },
  { key: 'eventReplay', labelKey: 'angular_project_generator_app_cap_event_replay' },
  { key: 'incrementalHydration', labelKey: 'angular_project_generator_app_cap_inc_hydration' },
  { key: 'zoneless', labelKey: 'angular_project_generator_app_cap_zoneless' },
];

export function statusBadge(status: FeatureStatus): { glyph: string; labelKey: string } {
  switch (status) {
    case 'default':
      return { glyph: '✓', labelKey: 'angular_project_generator_app_status_default' };
    case 'stable':
      return { glyph: '✓', labelKey: 'angular_project_generator_app_status_stable' };
    case 'preview':
      return { glyph: '◐', labelKey: 'angular_project_generator_app_status_preview' };
    default:
      return { glyph: '✕', labelKey: 'angular_project_generator_app_status_unavailable' };
  }
}
