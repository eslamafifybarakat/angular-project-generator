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
  templateUrl: './features-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeaturesStep {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly features: readonly FeatureRow[] = [
    {
      section: 'features',
      key: 'toast',
      templateId: 'toast',
      label: 'Toast',
      descKey: 'angular_project_generator_app_toast_d',
    },
    {
      section: 'features',
      key: 'modal',
      templateId: 'modal',
      label: 'Modal',
      descKey: 'angular_project_generator_app_modal_d',
    },
    {
      section: 'features',
      key: 'datePicker',
      templateId: 'date-picker',
      label: 'Date picker',
      descKey: 'angular_project_generator_app_date_picker_d',
    },
  ];

  protected readonly coreCapabilities: readonly FeatureRow[] = [
    {
      section: 'coreCapabilities',
      key: 'routingHelpers',
      templateId: 'routing-helpers',
      label: 'Routing helpers',
      descKey: 'angular_project_generator_app_core_routing_d',
    },
    {
      section: 'coreCapabilities',
      key: 'httpLayer',
      templateId: 'http-layer',
      label: 'HTTP layer',
      descKey: 'angular_project_generator_app_core_http_d',
    },
    {
      section: 'coreCapabilities',
      key: 'errorHandling',
      templateId: 'error-handling',
      label: 'Error handling',
      descKey: 'angular_project_generator_app_core_err_d',
    },
    {
      section: 'coreCapabilities',
      key: 'storage',
      templateId: 'storage',
      label: 'Storage',
      descKey: 'angular_project_generator_app_core_store_d',
    },
    {
      section: 'coreCapabilities',
      key: 'authentication',
      templateId: 'authentication',
      label: 'Authentication',
      descKey: 'angular_project_generator_app_core_auth_d',
    },
    {
      section: 'coreCapabilities',
      key: 'authorization',
      templateId: 'authorization',
      label: 'Authorization',
      descKey: 'angular_project_generator_app_core_authz_d',
    },
  ];

  private readonly era = computed(() => this.configuration.angularProfile()?.era ?? 'standalone-modern');

  protected choiceLabelKey(choice: string): string {
    switch (choice) {
      case 'none':
        return 'angular_project_generator_app_opt_none';
      case 'install-later':
        return 'angular_project_generator_app_opt_later';
      default:
        return 'angular_project_generator_app_opt_custom';
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
