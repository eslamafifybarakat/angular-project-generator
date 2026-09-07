import { ChangeDetectionStrategy, Component, effect, inject, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '@core/i18n/language.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { mirrorPath } from '@core/i18n/i18n.model';
import { GeneratorService } from '../../application/generator.service';
import { ProjectConfigService } from '../../application/project-config.service';

@Component({
  selector: 'app-generation',
  imports: [TranslatePipe],
  templateUrl: './generation.html',
  styleUrl: './generation.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Generation {
  protected readonly generator = inject(GeneratorService);
  protected readonly configuration = inject(ProjectConfigService);
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  constructor() {
    // Deep-linking here with a broken configuration must not start a run.
    if (this.configuration.isValid()) {
      this.generator.start();
    }

    effect(() => {
      if (this.generator.runState() === 'ready') {
        untracked(() => {
          void this.router.navigateByUrl(mirrorPath('/ready', this.language.lang()));
        });
      }
    });
  }

  protected retry(): void {
    this.generator.start();
  }

  protected async backToReview(): Promise<void> {
    this.generator.reset();
    await this.router.navigateByUrl(mirrorPath('/new/review', this.language.lang()));
  }

  protected stageClass(position: number): string {
    return `stage stage--${this.generator.stateOf(position)}`;
  }
}
