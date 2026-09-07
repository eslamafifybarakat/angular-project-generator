import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n';
import { slugify } from '@shared/utils';
import { ProjectConfigService } from '../../application';

@Component({
  selector: 'app-environments-step',
  imports: [TranslatePipe],
  templateUrl: './environments-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnvironmentsStep {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly environments = computed(() => this.configuration.config().environments);

  protected readonly fileList = computed(() =>
    this.environments().flatMap((env, index) => {
      const name = slugify(env.name) || 'unnamed';
      const rows = [`src/environments/environment.${name}.ts`];
      if (index === 0) {
        rows.unshift('src/environments/environment.ts');
      }
      return rows;
    }),
  );

  protected readonly configurationNames = computed(() =>
    this.environments()
      .map((env) => slugify(env.name) || 'unnamed')
      .join(', '),
  );

  protected issues(index: number, field: string) {
    return this.configuration.issuesForPath(`environments.${index}.${field}`);
  }

  protected onField(index: number, field: 'name' | 'apiUrl' | 'siteUrl', event: Event): void {
    this.configuration.updateEnvironment(index, {
      [field]: (event.target as HTMLInputElement).value,
    });
  }

  protected onVariable(
    index: number,
    varIndex: number,
    field: 'key' | 'value',
    event: Event,
  ): void {
    this.configuration.updateEnvironmentVariable(index, varIndex, {
      [field]: (event.target as HTMLInputElement).value,
    });
  }
}
