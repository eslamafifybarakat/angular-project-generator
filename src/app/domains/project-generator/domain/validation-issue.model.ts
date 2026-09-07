import type { WizardStepId } from './project-config.model';

/**
 * One rejected field. `messageKey` is a translation key, never a message: a
 * validation failure has to read correctly in all four interface languages.
 */
export interface ValidationIssue {
  /** Dotted config path, e.g. 'environments.1.apiUrl'. */
  readonly path: string;
  readonly step: WizardStepId;
  readonly messageKey: string;
}
