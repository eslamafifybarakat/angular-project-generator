import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HelpComponent } from '@shared/ui/help/help.component';
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
  imports: [TranslatePipe, HelpComponent],
  templateUrl: './angular-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AngularStepComponent {
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
        return { class: 'badge--accent', key: 'app.recommended' };
      case 'legacy':
        return { class: 'badge--warn', key: 'app.legacyTier' };
      default:
        return { class: 'badge--muted', key: 'app.supportedTier' };
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
