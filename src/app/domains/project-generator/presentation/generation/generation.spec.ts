import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Generation } from './generation';
import {
  GeneratorService,
  ProjectConfigService,
  type GenerationRecord,
  type GenerationResult,
  type PipelineStage,
  type RunState,
  type StageState,
} from '../../application';

/**
 * The real GeneratorService drives its pipeline on real setTimeout delays
 * (~320ms per stage across 13 stages), which would make this suite slow and
 * timing-flaky. This fake mirrors its public signal/method surface exactly,
 * so the component's rendering and navigation logic can be driven
 * deterministically instead.
 */
class FakeGeneratorService {
  private readonly state = signal<RunState>('idle');
  private readonly index = signal(-1);
  private readonly outcome = signal<GenerationResult | null>(null);
  private readonly stageList = signal<readonly PipelineStage[]>([
    { labelKey: 'angular_project_generator_generate_stage_1', detail: '', skipped: false },
    { labelKey: 'angular_project_generator_generate_stage_2', detail: 'angular-22', skipped: false },
    { labelKey: 'angular_project_generator_generate_stage_5', detail: '', skipped: true },
  ]);

  readonly runState = this.state.asReadonly();
  readonly activeIndex = this.index.asReadonly();
  readonly result = this.outcome.asReadonly();
  readonly recent = signal<readonly GenerationRecord[]>([]).asReadonly();
  readonly stages = this.stageList.asReadonly();
  readonly progress = computed(() => {
    const total = this.stageList().length;
    if (total === 0) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(((this.index() + 1) / total) * 100)));
  });

  readonly start = vi.fn((): boolean => {
    this.state.set('running');
    return true;
  });
  readonly cancel = vi.fn();
  readonly reset = vi.fn((): void => {
    this.state.set('idle');
    this.index.set(-1);
    this.outcome.set(null);
  });

  stateOf(position: number): StageState {
    const stage = this.stageList()[position];
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

  // -- test-only helpers --------------------------------------------------
  setRunState(next: RunState): void {
    this.state.set(next);
  }
  setActiveIndex(next: number): void {
    this.index.set(next);
  }
}

class FakeRouter {
  readonly navigateByUrl = vi.fn().mockResolvedValue(true);
}

function root(fixture: ComponentFixture<Generation>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function actionButtons(fixture: ComponentFixture<Generation>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.run__actions button'));
}

function stageItems(fixture: ComponentFixture<Generation>): HTMLLIElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLLIElement>('.stages > li'));
}

describe('Generation', () => {
  let configuration: ProjectConfigService;
  let generator: FakeGeneratorService;
  let router: FakeRouter;

  beforeEach(async () => {
    generator = new FakeGeneratorService();
    router = new FakeRouter();
    await TestBed.configureTestingModule({
      imports: [Generation],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GeneratorService, useValue: generator },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    configuration = TestBed.inject(ProjectConfigService);
  });

  function create(): ComponentFixture<Generation> {
    return TestBed.createComponent(Generation);
  }

  it('starts the generator immediately for a deep link with a valid configuration, and renders the running UI', async () => {
    const fixture = create();
    await fixture.whenStable();

    expect(generator.start).toHaveBeenCalledTimes(1);
    expect(root(fixture).querySelector('.run__title')).toBeTruthy();
    const bar = root(fixture).querySelector('.progress') as HTMLElement;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(stageItems(fixture)).toHaveLength(3);
    expect(root(fixture).querySelector('.note--err')).toBeNull();
  });

  it('refuses to start a run and shows the failure note when the configuration itself is invalid', async () => {
    configuration.setProjectName('');
    configuration.setProjectSlug('');

    const fixture = create();
    await fixture.whenStable();

    expect(generator.start).not.toHaveBeenCalled();
    expect(root(fixture).querySelector('.note--err')).toBeTruthy();
    expect(actionButtons(fixture)).toHaveLength(2);
  });

  it('shows the failure note and Back/Retry actions once the generator itself reports a failed run', async () => {
    const fixture = create();
    await fixture.whenStable();

    generator.setRunState('failed');
    await fixture.whenStable();

    expect(root(fixture).querySelector('.note--err')).toBeTruthy();
    expect(root(fixture).querySelector('.stages')).toBeNull();
    expect(actionButtons(fixture)).toHaveLength(2);
  });

  it('clicking Retry starts a new run from the failed state', async () => {
    const fixture = create();
    await fixture.whenStable();
    generator.setRunState('failed');
    await fixture.whenStable();

    actionButtons(fixture)[1].click();
    await fixture.whenStable();

    expect(generator.start).toHaveBeenCalledTimes(2);
  });

  it('clicking "Back to review" resets the generator and navigates to the review step', async () => {
    const fixture = create();
    await fixture.whenStable();
    generator.setRunState('failed');
    await fixture.whenStable();

    actionButtons(fixture)[0].click();
    await fixture.whenStable();

    expect(generator.reset).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/new/review');
  });

  it('navigates to /ready once the generator reports the run is ready', async () => {
    const fixture = create();
    await fixture.whenStable();

    generator.setRunState('ready');
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/ready');
  });

  it('marks each stage element with its computed state (done / running / pending)', async () => {
    const fixture = create();
    await fixture.whenStable();

    generator.setActiveIndex(1);
    await fixture.whenStable();

    const items = stageItems(fixture);
    expect(items[0].className).toContain('stage--done');
    expect(items[1].className).toContain('stage--running');
    // Stage 2 is skipped but position (2) is still ahead of the active index (1).
    expect(items[2].className).toContain('stage--pending');
  });

  it('renders the numeric progress percentage and flags a skipped stage once reached', async () => {
    const fixture = create();
    await fixture.whenStable();

    generator.setActiveIndex(2);
    await fixture.whenStable();

    expect(root(fixture).querySelector('.run__pct')?.textContent).toContain('100%');
    const items = stageItems(fixture);
    expect(items[2].className).toContain('stage--skipped');
    expect(items[2].querySelector('.badge--muted')?.textContent?.trim()).toBe('skipped');
    // The non-skipped, already-passed stage 1 shows its concrete detail instead.
    expect(items[1].querySelector('.badge--muted')?.textContent?.trim()).toBe('angular-22');
  });
});
