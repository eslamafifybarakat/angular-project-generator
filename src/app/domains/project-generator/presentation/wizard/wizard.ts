import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { LanguageService, TranslatePipe, TranslationService, mirrorPath } from '@core/i18n';
import { SeoService } from '@core/seo';
import { ToastService } from '@shared/ui/toast';
import { ProjectConfigService } from '../../application';
import { WIZARD_STEPS, type WizardStepId } from '../../domain';

@Component({
  selector: 'app-wizard',
  imports: [RouterOutlet, RouterLink, TranslatePipe],
  templateUrl: './wizard.html',
  styleUrl: './wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Wizard {
  protected readonly configuration = inject(ProjectConfigService);
  protected readonly language = inject(LanguageService);
  private readonly translations = inject(TranslationService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  protected readonly steps = WIZARD_STEPS;

  /**
   * Placeholder names shown in the manifest, exactly as they appear in the
   * template files. They live here rather than in the template because
   * Angular decodes HTML entities before it parses interpolation, so a
   * literal double-brace in the HTML would be read as a binding.
   */
  protected readonly token = {
    PROJECT_NAME: '{{PROJECT_NAME}}',
    PROJECT_SLUG: '{{PROJECT_SLUG}}',
    ANGULAR_VERSION: '{{ANGULAR_VERSION}}',
    LANGUAGES: '{{LANGUAGES}}',
    SSR_ENABLED: '{{SSR_ENABLED}}',
  } as const;
  protected readonly manifestOpen = signal(false);
  /** Steps the person has actually opened, so the rail does not flag untouched ones. */
  private readonly visited = signal<ReadonlySet<string>>(new Set());

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentStep = computed<WizardStepId>(() => {
    const last = this.url().split('?')[0].split('/').filter(Boolean).at(-1) ?? '';
    return (WIZARD_STEPS as readonly string[]).includes(last)
      ? (last as WizardStepId)
      : WIZARD_STEPS[0];
  });

  protected readonly currentIndex = computed(() => WIZARD_STEPS.indexOf(this.currentStep()));
  protected readonly isLastStep = computed(
    () => this.currentIndex() === WIZARD_STEPS.length - 1,
  );

  constructor() {
    // The wizard component itself persists across steps — only its
    // <router-outlet> child swaps — so a one-time apply() in the constructor
    // would leave every one of the twelve step URLs advertising the same
    // title and canonical. Re-run per step instead.
    effect(() => {
      const step = this.currentStep();
      this.seo.apply({
        title: this.translations.translate(this.stepTitleKey(step)),
        description: this.translations.translate(`angular_project_generator_step_intro_${step}`),
        path: `/new/${step}`,
        noIndex: true,
      });
    });
  }

  protected stepLink(step: WizardStepId): string {
    return mirrorPath(`/new/${step}`, this.language.lang());
  }

  protected stepTitleKey(step: WizardStepId): string {
    return `angular_project_generator_step_title_${step}`;
  }

  protected stepNumber(step: WizardStepId): string {
    return String(WIZARD_STEPS.indexOf(step) + 1).padStart(2, '0');
  }

  protected isVisited(step: WizardStepId): boolean {
    return this.visited().has(step);
  }

  /** A step is only flagged once it has been seen — an untouched step is not "wrong". */
  protected hasIssues(step: WizardStepId): boolean {
    return this.isVisited(step) && this.configuration.issuesFor(step).length > 0;
  }

  protected markVisited(step: WizardStepId): void {
    this.visited.update((set) => new Set(set).add(step));
  }

  protected toggleManifest(): void {
    this.manifestOpen.update((open) => !open);
  }

  protected async next(): Promise<void> {
    const index = this.currentIndex();
    this.markVisited(this.currentStep());
    const target = WIZARD_STEPS[Math.min(WIZARD_STEPS.length - 1, index + 1)];
    await this.router.navigateByUrl(this.stepLink(target));
  }

  protected async previous(): Promise<void> {
    const index = this.currentIndex();
    if (index === 0) {
      await this.router.navigateByUrl(mirrorPath('/', this.language.lang()));
      return;
    }
    await this.router.navigateByUrl(this.stepLink(WIZARD_STEPS[index - 1]));
  }

  protected async generate(): Promise<void> {
    if (!this.configuration.isValid()) {
      return;
    }
    await this.router.navigateByUrl(mirrorPath('/generate', this.language.lang()));
  }

  protected exportConfig(): void {
    // No download in the prototype: the JSON is the artifact, and the review
    // tab on the ready screen shows it in full.
    this.toast.show(this.translations.translate('angular_project_generator_app_export_done'));
  }
}
