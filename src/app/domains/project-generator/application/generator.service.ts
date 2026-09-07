import { Injectable, computed, inject, signal } from '@angular/core';
import { ProjectConfigService } from './project-config.service';

export type StageState = 'pending' | 'running' | 'done' | 'skipped';

export interface PipelineStage {
  /** Translation key for the stage label. */
  readonly labelKey: string;
  /** Short, already-concrete detail — a count, a slug, an adapter name. */
  readonly detail: string;
  readonly skipped: boolean;
}

export interface GenerationResult {
  readonly zipName: string;
  readonly fileCount: number;
  readonly approximateKb: number;
}

export type RunState = 'idle' | 'running' | 'ready' | 'failed';

export interface GenerationRecord {
  readonly name: string;
  readonly slug: string;
  readonly angularVersion: string;
  readonly fileCount: number;
}

const STAGE_MS = 320;
const SKIPPED_MS = 130;

/**
 * The seam where a real generator engine attaches.
 *
 * Everything above this service is honest: the stage list, the file list and
 * the validation gate are all derived from the actual configuration. What this
 * class does *not* do is write files — `run()` walks the real pipeline stages
 * on a timer and reports the result the engine would have produced. Replacing
 * the body of `run()` with a call to that engine is the whole of the work; no
 * component needs to change.
 */
@Injectable({ providedIn: 'root' })
export class GeneratorService {
  private readonly configuration = inject(ProjectConfigService);

  private readonly index = signal(-1);
  private readonly state = signal<RunState>('idle');
  private readonly outcome = signal<GenerationResult | null>(null);
  private readonly history = signal<readonly GenerationRecord[]>([]);
  private timer: ReturnType<typeof setTimeout> | null = null;

  readonly activeIndex = this.index.asReadonly();
  readonly runState = this.state.asReadonly();
  readonly result = this.outcome.asReadonly();

  /**
   * Generations completed in this session, newest first.
   *
   * In memory only: nothing is written to storage, so the dashboard's "recent
   * configurations" list is empty on a fresh visit rather than pretending to
   * remember work from a previous one.
   */
  readonly recent = this.history.asReadonly();

  readonly stages = computed<readonly PipelineStage[]>(() => {
    const cfg = this.configuration.config();
    const profile = this.configuration.angularProfile();
    const anyCustomFeature =
      cfg.features.toast === 'customized' || cfg.features.modal === 'customized';
    const fileCount = this.configuration.generatedFiles().length;

    return [
      { labelKey: 'generate.stage.1', detail: '', skipped: false },
      { labelKey: 'generate.stage.2', detail: '', skipped: false },
      {
        labelKey: 'generate.stage.3',
        detail: profile ? `angular-${profile.version} · ${profile.era}` : `angular-${cfg.angular.version}`,
        skipped: false,
      },
      { labelKey: 'generate.stage.4', detail: cfg.architecture.pattern, skipped: false },
      { labelKey: 'generate.stage.5', detail: '', skipped: !anyCustomFeature },
      {
        labelKey: 'generate.stage.6',
        detail: cfg.theme.source === 'template' ? 'ddd-template' : 'default',
        skipped: false,
      },
      {
        labelKey: 'generate.stage.7',
        detail: cfg.localization.enabled ? cfg.localization.selectedLanguages.join('+') : '',
        skipped: !cfg.localization.enabled,
      },
      {
        labelKey: 'generate.stage.8',
        detail: `${cfg.environments.length}`,
        skipped: false,
      },
      { labelKey: 'generate.stage.9', detail: '', skipped: !cfg.seo.enabled },
      { labelKey: 'generate.stage.10', detail: '', skipped: false },
      { labelKey: 'generate.stage.11', detail: `${fileCount}`, skipped: false },
      { labelKey: 'generate.stage.12', detail: '', skipped: false },
      {
        labelKey: 'generate.stage.13',
        detail: `${cfg.project.slug || 'project'}.zip`,
        skipped: false,
      },
    ];
  });

  readonly progress = computed(() => {
    const total = this.stages().length;
    if (total === 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(((this.index() + 1) / total) * 100)));
  });

  stateOf(position: number): StageState {
    const stage = this.stages()[position];
    const active = this.index();
    if (stage?.skipped) {
      return position <= active ? 'skipped' : 'pending';
    }
    if (position < active) {
      return 'done';
    }
    if (position === active) {
      return this.state() === 'running' ? 'running' : 'done';
    }
    return 'pending';
  }

  /**
   * Refuses to start on an invalid configuration. The review step disables its
   * button too, but the guard belongs here as well: a deep link into the
   * generation route must not be able to skip the gate.
   */
  start(): boolean {
    if (!this.configuration.isValid()) {
      this.state.set('failed');
      return false;
    }
    this.cancel();
    this.index.set(-1);
    this.outcome.set(null);
    this.state.set('running');
    this.step();
    return true;
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  reset(): void {
    this.cancel();
    this.index.set(-1);
    this.state.set('idle');
    this.outcome.set(null);
  }

  private step(): void {
    const stages = this.stages();
    const next = this.index() + 1;
    if (next >= stages.length) {
      this.finish();
      return;
    }
    this.index.set(next);
    const delay = stages[next].skipped ? SKIPPED_MS : STAGE_MS;
    this.timer = setTimeout(() => this.step(), delay);
  }

  private finish(): void {
    const cfg = this.configuration.config();
    const files = this.configuration.generatedFiles();
    this.outcome.set({
      zipName: `${cfg.project.slug || 'project'}.zip`,
      fileCount: files.length,
      // Deliberately labelled as approximate in the UI: there is no archive to
      // measure, so this is a size estimate and is presented as one.
      approximateKb: Math.round(files.length * 2.7 + 24),
    });
    this.history.update((all) =>
      [
        {
          name: cfg.project.name,
          slug: cfg.project.slug,
          angularVersion: cfg.angular.version,
          fileCount: files.length,
        },
        ...all,
      ].slice(0, 4),
    );
    this.state.set('ready');
  }
}
