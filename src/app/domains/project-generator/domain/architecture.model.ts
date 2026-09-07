/**
 * The four folder contracts a generated project can start from.
 *
 * `custom` is a real fifth-ish mode in practice — it is the only one whose
 * directory names are not fixed — but it is still exactly one value of this
 * union, resolved through the same registry as the other three.
 */
export type ArchitectureType = 'ddd' | 'feature-based' | 'simple' | 'custom';

/** The word used for "one slice of the app" — a domain, or a feature. */
export type ArchitectureGroupingLabel = 'domain' | 'feature';

/**
 * Custom architecture's user-defined structure.
 *
 * `coreDir` and `sharedDir` are the only two directories every architecture
 * needs to exist at all (cross-cutting code has to live somewhere); the rest
 * are genuinely optional — an empty string means "this project does not use
 * that bucket", not "unset".
 */
export interface CustomArchitectureConfig {
  readonly coreDir: string;
  readonly sharedDir: string;
  readonly layoutDir: string;
  readonly groupingDir: string;
  readonly groupingLabel: ArchitectureGroupingLabel;
  readonly additionalDirectories: readonly string[];
}

export function defaultCustomArchitecture(): CustomArchitectureConfig {
  return {
    coreDir: 'core',
    sharedDir: 'shared',
    layoutDir: 'layout',
    groupingDir: 'features',
    groupingLabel: 'feature',
    additionalDirectories: [],
  };
}

/** Static, translated metadata for one architecture — the registry's rows. */
export interface ArchitectureProfile {
  readonly id: ArchitectureType;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly helpBodyKey: string;
}

export const ARCHITECTURE_PROFILES: Readonly<Record<ArchitectureType, ArchitectureProfile>> = {
  ddd: {
    id: 'ddd',
    nameKey: 'app.archDdd',
    descriptionKey: 'app.dddD',
    helpBodyKey: 'app.archDddHelp',
  },
  'feature-based': {
    id: 'feature-based',
    nameKey: 'app.archFeature',
    descriptionKey: 'app.featBasedD',
    helpBodyKey: 'app.archFeatureHelp',
  },
  simple: {
    id: 'simple',
    nameKey: 'app.archSimple',
    descriptionKey: 'app.simpleD',
    helpBodyKey: 'app.archSimpleHelp',
  },
  custom: {
    id: 'custom',
    nameKey: 'app.archCustom',
    descriptionKey: 'app.customD',
    helpBodyKey: 'app.archCustomHelp',
  },
} as const;

export const ARCHITECTURE_TYPES: readonly ArchitectureType[] = [
  'ddd',
  'feature-based',
  'simple',
  'custom',
];

/**
 * What the selected architecture + Angular version resolve to.
 *
 * The UI, the file-list deriver and the validator all read this — never the
 * raw `ArchitectureSection` directly — so preview and generation cannot drift
 * apart. `directories` and `groupingDir` are relative to `src/app/`.
 */
export interface ResolvedArchitecture {
  readonly pattern: ArchitectureType;
  readonly profile: ArchitectureProfile;
  /** Fixed structural directories written under `src/app/`, in display order. */
  readonly directories: readonly string[];
  readonly coreDir: string;
  readonly sharedDir: string;
  /** Never empty: falls back to `sharedDir` when the architecture has no dedicated layout bucket. */
  readonly layoutFilesDir: string;
  /** '' when the architecture is flat and has no per-slice grouping folder (Simple). */
  readonly groupingDir: string;
  readonly groupingLabel: ArchitectureGroupingLabel;
  readonly exampleName: string;
}
