import type { ProjectConfig } from './project-config.model';

/**
 * A named starting point. Presets are applied as a patch over the defaults and
 * stay fully editable afterwards.
 *
 * Every preset must produce a configuration that passes validation — there is
 * no preset for an unverified Angular version, an unavailable stylesheet
 * language, or a customized date picker.
 */
export interface Preset {
  readonly id: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly patch: PresetPatch;
}

export type PresetPatch = {
  readonly [K in keyof ProjectConfig]?: ProjectConfig[K] extends readonly unknown[]
    ? ProjectConfig[K]
    : Partial<ProjectConfig[K]>;
};
