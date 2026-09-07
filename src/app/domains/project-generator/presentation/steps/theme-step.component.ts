import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { HelpComponent } from '@shared/ui/help/help.component';
import { colorScale, type ScaleStop } from '@shared/utils/color-scale';
import { isHexColor } from '@shared/utils/validators';
import { ProjectConfigService } from '../../application/project-config.service';
import type { ThemeSource } from '../../domain/project-config.model';

type ColorKey = 'primaryColor' | 'secondaryColor' | 'accentColor';

@Component({
  selector: 'app-theme-step',
  imports: [TranslatePipe, HelpComponent],
  templateUrl: './theme-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeStepComponent {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly colorRows: readonly { key: ColorKey; labelKey: string }[] = [
    { key: 'primaryColor', labelKey: 'app.cPrimary' },
    { key: 'secondaryColor', labelKey: 'app.cSecondary' },
    { key: 'accentColor', labelKey: 'app.cAccent' },
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
