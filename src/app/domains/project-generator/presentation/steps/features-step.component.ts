import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import type { TemplateCapabilityId } from '../../domain/component-template.model';
import type { FeatureChoice } from '../../domain/project-config.model';
import { componentTemplateRegistry, isEraCompatible } from '../../infrastructure/templates/component-template-registry';
import { ProjectConfigService } from '../../application/project-config.service';

type SectionKey = 'features' | 'coreCapabilities';

interface FeatureRow {
  readonly section: SectionKey;
  readonly key: string;
  readonly templateId: TemplateCapabilityId;
  readonly label: string;
  readonly descKey: string;
}

/**
 * One component drives both groups shown on this step — the three
 * UI-component templates and the six Core Capabilities — because both are
 * backed by the same ComponentTemplateRegistry and the same tri-state
 * FeatureChoice. 'customized' is only ever present as a choice when
 * isEraCompatible() says the current Angular version can actually run the
 * template — absent from the control, not present-and-disabled, so nobody
 * has to wonder why a button doesn't work.
 */
@Component({
  selector: 'app-features-step',
  imports: [TranslatePipe, NgTemplateOutlet],
  templateUrl: './features-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesStepComponent {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly features: readonly FeatureRow[] = [
    { section: 'features', key: 'toast', templateId: 'toast', label: 'Toast', descKey: 'app.toastD' },
    { section: 'features', key: 'modal', templateId: 'modal', label: 'Modal', descKey: 'app.modalD' },
    {
      section: 'features',
      key: 'datePicker',
      templateId: 'date-picker',
      label: 'Date picker',
      descKey: 'app.datePickerD',
    },
  ];

  protected readonly coreCapabilities: readonly FeatureRow[] = [
    {
      section: 'coreCapabilities',
      key: 'routingHelpers',
      templateId: 'routing-helpers',
      label: 'Routing helpers',
      descKey: 'app.coreRoutingD',
    },
    {
      section: 'coreCapabilities',
      key: 'httpLayer',
      templateId: 'http-layer',
      label: 'HTTP layer',
      descKey: 'app.coreHttpD',
    },
    {
      section: 'coreCapabilities',
      key: 'errorHandling',
      templateId: 'error-handling',
      label: 'Error handling',
      descKey: 'app.coreErrD',
    },
    {
      section: 'coreCapabilities',
      key: 'storage',
      templateId: 'storage',
      label: 'Storage',
      descKey: 'app.coreStoreD',
    },
    {
      section: 'coreCapabilities',
      key: 'authentication',
      templateId: 'authentication',
      label: 'Authentication',
      descKey: 'app.coreAuthD',
    },
    {
      section: 'coreCapabilities',
      key: 'authorization',
      templateId: 'authorization',
      label: 'Authorization',
      descKey: 'app.coreAuthzD',
    },
  ];

  private readonly era = computed(() => this.configuration.angularProfile()?.era ?? 'standalone-modern');

  protected choiceLabelKey(choice: string): string {
    switch (choice) {
      case 'none':
        return 'app.optNone';
      case 'install-later':
        return 'app.optLater';
      default:
        return 'app.optCustom';
    }
  }

  protected current(row: FeatureRow): FeatureChoice {
    const section = this.configuration.config()[row.section] as unknown as Record<string, FeatureChoice>;
    return section[row.key];
  }

  protected select(row: FeatureRow, choice: FeatureChoice): void {
    this.configuration.patch(row.section, { [row.key]: choice });
  }

  protected issues(row: FeatureRow) {
    return this.configuration.issuesForPath(`${row.section}.${row.key}`);
  }

  /** 'customized' only appears once a real, era-compatible template exists — never present-but-disabled. */
  protected choicesFor(row: FeatureRow): readonly FeatureChoice[] {
    const base: FeatureChoice[] = ['none', 'install-later'];
    return this.isAvailable(row.templateId) ? [...base, 'customized'] : base;
  }

  protected isAvailable(id: TemplateCapabilityId): boolean {
    return isEraCompatible(id, this.era());
  }

  protected manifestFor(row: FeatureRow) {
    return componentTemplateRegistry[row.templateId];
  }

  protected angularVersion(): string {
    return this.configuration.config().angular.version;
  }

  /** Display names of capabilities force-included alongside this one, or null when there are none. */
  protected dependencyNames(row: FeatureRow): string | null {
    const deps = this.manifestFor(row).requiredCapabilities ?? [];
    if (deps.length === 0) return null;
    return deps.map((id) => componentTemplateRegistry[id].displayName).join(', ');
  }
}
