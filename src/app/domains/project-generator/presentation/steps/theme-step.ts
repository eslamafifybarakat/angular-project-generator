import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { Help } from '@shared/ui/help';
import { colorScale, isHexColor, type ScaleStop } from '@shared/utils';
import { ProjectConfigService } from '../../application';
import type { ThemeSource } from '../../domain';

type ColorKey = 'primaryColor' | 'secondaryColor' | 'accentColor';

@Component({
  selector: 'app-theme-step',
  imports: [TranslatePipe, Help],
  templateUrl: './theme-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeStep {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly colorRows: readonly { key: ColorKey; labelKey: string }[] = [
    { key: 'primaryColor', labelKey: 'angular_project_generator_app_c_primary' },
    { key: 'secondaryColor', labelKey: 'angular_project_generator_app_c_secondary' },
    { key: 'accentColor', labelKey: 'angular_project_generator_app_c_accent' },
  ];

  protected readonly theme = computed(() => this.configuration.config().theme);

  protected scale(value: string): readonly ScaleStop[] {
    return colorScale(value);
  }

  /** Falls back to black for the swatch so the picker never renders empty. */
  protected pickerValue(value: string): string {
    return isHexColor(value) ? value : '#000000';
  }

  protected issues(key: ColorKey) {
    return this.configuration.issuesForPath(`theme.${key}`);
  }

  protected setSource(source: ThemeSource): void {
    this.configuration.patch('theme', { source });
  }

  protected onColor(key: ColorKey, event: Event): void {
    this.configuration.patch('theme', { [key]: (event.target as HTMLInputElement).value });
  }

  protected onDualMode(event: Event): void {
    this.configuration.patch('theme', {
      supportDualMode: (event.target as HTMLInputElement).checked,
    });
  }

  protected onDefaultScales(event: Event): void {
    this.configuration.patch('theme', {
      useDefaultScales: (event.target as HTMLInputElement).checked,
    });
  }
}
