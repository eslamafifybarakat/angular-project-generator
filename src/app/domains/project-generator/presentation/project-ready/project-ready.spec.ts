import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectReady } from './project-ready';
import { GeneratorService, ProjectConfigService, type GenerationResult } from '../../application';
import { ToastService } from '@shared/ui/toast';

/**
 * ProjectReady only ever reads `generator.result`, so the fake need only
 * expose that one signal plus the `reset()` it calls from `another()`. The
 * real GeneratorService is not used here for the same reason as in
 * generation.spec.ts: its pipeline runs on real timers.
 */
class FakeGeneratorService {
  private readonly outcome = signal<GenerationResult | null>(null);
  readonly result = this.outcome.asReadonly();
  readonly reset = vi.fn();

  setResult(value: GenerationResult | null): void {
    this.outcome.set(value);
  }
}

class FakeRouter {
  readonly navigateByUrl = vi.fn().mockResolvedValue(true);
}

function root(fixture: ComponentFixture<ProjectReady>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function tabButton(fixture: ComponentFixture<ProjectReady>, label: 'files' | 'config' | 'install'): HTMLButtonElement {
  const index = { files: 0, config: 1, install: 2 }[label];
  return root(fixture).querySelectorAll<HTMLButtonElement>('.tabs button')[index];
}

function downloadButton(fixture: ComponentFixture<ProjectReady>): HTMLButtonElement | null {
  return root(fixture).querySelector<HTMLButtonElement>('.zip .btn--primary');
}

describe('ProjectReady', () => {
  let fixture: ComponentFixture<ProjectReady>;
  let configuration: ProjectConfigService;
  let generator: FakeGeneratorService;
  let router: FakeRouter;
  let toast: ToastService;

  beforeEach(async () => {
    generator = new FakeGeneratorService();
    router = new FakeRouter();
    await TestBed.configureTestingModule({
      imports: [ProjectReady],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GeneratorService, useValue: generator },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectReady);
    configuration = TestBed.inject(ProjectConfigService);
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  it('shows the completion header with no zip summary while no result exists yet', () => {
    expect(root(fixture).querySelector('.done__title')).toBeTruthy();
    expect(root(fixture).querySelector('.zip')).toBeNull();
  });

  it('shows the zip summary (name, file count, approximate size) once a result exists', async () => {
    generator.setResult({ zipName: 'my-project.zip', fileCount: 42, approximateKb: 128, blob: null });
    await fixture.whenStable();

    const panel = root(fixture).querySelector('.zip') as HTMLElement;
    expect(panel.querySelector('.zip__name')?.textContent).toBe('my-project.zip');
    expect(panel.querySelector('.hint')?.textContent).toContain('42');
    expect(panel.querySelector('.hint')?.textContent).toContain('128');
  });

  it('defaults to the Files tab and renders the generated file tree rooted at the project slug', () => {
    expect(tabButton(fixture, 'files').getAttribute('aria-pressed')).toBe('true');
    const rows = Array.from(root(fixture).querySelectorAll('.tree__row .mono')).map(
      (el) => el.textContent?.trim(),
    );
    expect(rows[0]).toBe('my-project/');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('switching to the Config tab shows the exact JSON export of the live configuration', async () => {
    tabButton(fixture, 'config').click();
    await fixture.whenStable();

    expect(tabButton(fixture, 'config').getAttribute('aria-pressed')).toBe('true');
    expect(root(fixture).querySelector('.code pre')?.textContent).toBe(configuration.toJson());
  });

  it('switching to the Install tab resolves the dynamic per-step i18n keys to real copy, not raw keys', async () => {
    tabButton(fixture, 'install').click();
    await fixture.whenStable();

    const cards = Array.from(root(fixture).querySelectorAll('.rowcard'));
    expect(cards).toHaveLength(4);
    expect(cards[0].querySelector('.option__title')?.textContent).toContain('Download and extract');
    expect(cards[0].querySelector('.option__desc')?.textContent).toContain(
      'Unzip it wherever you keep your projects.',
    );
  });

  it('shows a placeholder toast when downloading before the archive blob is ready', async () => {
    generator.setResult({ zipName: 'my-project.zip', fileCount: 10, approximateKb: 5, blob: null });
    await fixture.whenStable();

    downloadButton(fixture)?.click();
    await fixture.whenStable();

    expect(toast.message()).toBe('The README will name a package to install.');
  });

  it('downloads the real archive via an object URL once the blob is ready', async () => {
    const blob = new Blob(['zip-bytes']);
    const createObjectURL = vi.fn(() => 'blob:mock-url');
    const revokeObjectURL = vi.fn();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- captured only to restore afterward, never called unbound
    const originalCreate = URL.createObjectURL;
    // eslint-disable-next-line @typescript-eslint/unbound-method -- captured only to restore afterward, never called unbound
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    try {
      generator.setResult({ zipName: 'my-project.zip', fileCount: 10, approximateKb: 5, blob });
      await fixture.whenStable();

      downloadButton(fixture)?.click();
      await fixture.whenStable();

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      clickSpy.mockRestore();
    }
  });

  it('copies the exported configuration to the clipboard and shows a confirmation toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    try {
      tabButton(fixture, 'config').click();
      await fixture.whenStable();
      (root(fixture).querySelector('.config__head .btn') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(writeText).toHaveBeenCalledWith(configuration.toJson());
      expect(toast.message()).toBe('Copied');
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    }
  });

  it('"Start another" resets the generator and the configuration, then returns to the project step', async () => {
    generator.setResult({ zipName: 'my-project.zip', fileCount: 10, approximateKb: 5, blob: null });
    await fixture.whenStable();
    configuration.setProjectName('Changed Name');

    const anotherButton = Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.zip button')).find(
      (b) => !b.className.includes('btn--primary'),
    ) as HTMLButtonElement;
    anotherButton.click();
    await fixture.whenStable();

    expect(generator.reset).toHaveBeenCalledTimes(1);
    expect(configuration.config().project.name).toBe('My Project');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/new/project');
  });
});
