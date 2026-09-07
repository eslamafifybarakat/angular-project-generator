import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { Help } from '@shared/ui/help/help';
import { ProjectConfigService } from '../../application/project-config.service';
import { AngularVersionRepository } from '../../infrastructure/angular-version.repository';
import {
  CAPABILITY_ROWS,
  statusBadge,
  type AngularVersionProfile,
  type FeatureStatus,
} from '../../domain/angular-version.model';

@Component({
  selector: 'app-angular-step',
  imports: [TranslatePipe, Help],
  templateUrl: './angular-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AngularStep {
  private readonly versions = inject(AngularVersionRepository);
  protected readonly configuration = inject(ProjectConfigService);

  /** Newest first — the order a version picker should read in. */
  protected readonly rows = [...this.versions.list()].sort(
    (a, b) => Number(b.version) - Number(a.version),
  );
  protected readonly capabilityRows = CAPABILITY_ROWS;

  protected readonly selected = computed(() => this.configuration.config().angular.version);
  protected readonly issues = computed(() => this.configuration.issuesForPath('angular.version'));

  protected tierBadge(row: AngularVersionProfile): { class: string; key: string } {
    switch (row.tier) {
      case 'recommended':
        return { class: 'badge--accent', key: 'angular_project_generator_app_recommended' };
      case 'legacy':
        return { class: 'badge--warn', key: 'angular_project_generator_app_legacy_tier' };
      default:
        return { class: 'badge--muted', key: 'angular_project_generator_app_supported_tier' };
    }
  }

  protected capabilityOf(row: AngularVersionProfile, key: string): FeatureStatus {
    return row[key as keyof AngularVersionProfile] as FeatureStatus;
  }

  protected badge(status: FeatureStatus): { glyph: string; labelKey: string } {
    return statusBadge(status);
  }

  protected select(row: AngularVersionProfile): void {
    if (!row.selectable) {
      return;
    }
    this.configuration.setAngularVersion(row.version);
  }
}
