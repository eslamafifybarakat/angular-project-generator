import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { Help } from '@shared/ui/help/help';
import { ProjectConfigService } from '../../application/project-config.service';
import type { HydrationStrategy, RenderingMode } from '../../domain/project-config.model';

@Component({
  selector: 'app-rendering-step',
  imports: [TranslatePipe, Help],
  templateUrl: './rendering-step.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RenderingStep {
  protected readonly configuration = inject(ProjectConfigService);

  protected readonly modes: readonly { value: RenderingMode; label: string; descKey: string }[] = [
    { value: 'ssr', label: 'SSR', descKey: 'angular_project_generator_app_ssr_d' },
    { value: 'csr', label: 'CSR', descKey: 'angular_project_generator_app_csr_d' },
    { value: 'hybrid', label: 'Hybrid', descKey: 'angular_project_generator_app_hybrid_d' },
  ];

  protected readonly rendering = computed(() => this.configuration.config().rendering);
  protected readonly seo = computed(() => this.configuration.config().seo);
  protected readonly profile = this.configuration.angularProfile;
  /** Mirrors `ProjectConfigService.deriveFiles()` so this preview never drifts from the real file list. */
  protected readonly serverFiles = computed<readonly string[]>(() =>
    this.profile()?.era === 'standalone-modern'
      ? [
          'src/main.server.ts',
          'src/server.ts',
          'src/app/app.config.server.ts',
          'src/app/app.routes.server.ts',
        ]
      : ['src/main.server.ts', 'src/server.ts', 'src/app/app.server.module.ts'],
  );
  protected readonly eventReplayAvailable = computed(
    () => this.profile()?.eventReplay !== 'unavailable',
  );

  /**
   * Browser-only rendering plus JSON-LD is allowed but flagged. Whether it
   * should be a hard rejection is an open product question, so the UI warns
   * instead of deciding it here.
   */
  protected readonly showCsrJsonLdWarning = computed(
    () => this.rendering().mode === 'csr' && this.seo().enabled && this.seo().jsonLd,
  );

  protected setMode(mode: RenderingMode): void {
    this.configuration.patch('rendering', {
      mode,
      ...(mode === 'csr' ? { prerender: false } : {}),
    });
  }

  protected setHydration(strategy: HydrationStrategy): void {
    if (strategy === 'event-replay' && !this.eventReplayAvailable()) {
      return;
    }
    this.configuration.patch('rendering', { hydrationStrategy: strategy });
  }

  protected onPrerender(event: Event): void {
    this.configuration.patch('rendering', {
      prerender: (event.target as HTMLInputElement).checked,
    });
  }

  protected onSeoFlag(key: 'enabled' | 'jsonLd' | 'sitemap', event: Event): void {
    this.configuration.patch('seo', { [key]: (event.target as HTMLInputElement).checked });
  }

  protected onSeoText(key: 'siteName' | 'defaultOgImage', event: Event): void {
    this.configuration.patch('seo', { [key]: (event.target as HTMLInputElement).value });
  }
}
