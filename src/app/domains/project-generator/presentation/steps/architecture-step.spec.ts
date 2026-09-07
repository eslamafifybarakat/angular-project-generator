import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ArchitectureStep } from './architecture-step';
import { ProjectConfigService } from '../../application/project-config.service';

function root(fixture: ComponentFixture<ArchitectureStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function patternButtons(fixture: ComponentFixture<ArchitectureStep>): HTMLButtonElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLButtonElement>('.options > .option'));
}

function treeLines(fixture: ComponentFixture<ArchitectureStep>): string[] {
  return Array.from(root(fixture).querySelectorAll('.tree__row .mono')).map(
    (el) => el.textContent?.trim() ?? '',
  );
}

describe('ArchitectureStep', () => {
  let fixture: ComponentFixture<ArchitectureStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArchitectureStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ArchitectureStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders all four architectures as enabled, keyboard-reachable buttons', () => {
    const buttons = patternButtons(fixture);
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button.disabled).toBe(false);
    }
    // DDD is the default and is the only one marked pressed.
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
    ]);
  });

  it('shows the domains/ preview for DDD and switches to features/ for Feature-based', async () => {
    expect(treeLines(fixture)).toContain('domains/');

    patternButtons(fixture)[1].click();
    await fixture.whenStable();

    expect(configuration.config().architecture.pattern).toBe('feature-based');
    expect(treeLines(fixture)).toContain('features/');
    expect(treeLines(fixture)).not.toContain('domains/');
  });

  it('shows the Custom directory editor only when Custom is selected', async () => {
    expect(root(fixture).querySelector('#arch-core')).toBeNull();

    patternButtons(fixture)[3].click();
    await fixture.whenStable();

    expect(root(fixture).querySelector('#arch-core')).toBeTruthy();
    expect(configuration.config().architecture.pattern).toBe('custom');
  });

  it('adds and removes a Custom directory from the editor', async () => {
    patternButtons(fixture)[3].click();
    await fixture.whenStable();

    const addButton = Array.from(root(fixture).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('directory'),
    ) as HTMLButtonElement;
    addButton.click();
    await fixture.whenStable();

    expect(configuration.config().architecture.custom.additionalDirectories).toEqual(['']);
    expect(root(fixture).querySelectorAll('.kv input').length).toBe(1);

    const removeButton = root(fixture).querySelector('.kv .btn--danger') as HTMLButtonElement;
    removeButton.click();
    await fixture.whenStable();

    expect(configuration.config().architecture.custom.additionalDirectories).toEqual([]);
  });

  it('hides the example-name field and drops example rows from the preview when the toggle is off', async () => {
    const toggle = root(fixture).querySelector<HTMLInputElement>('.switch input[type="checkbox"]');
    expect(toggle?.checked).toBe(true);
    expect(root(fixture).querySelector('#arch-example-name')).toBeTruthy();

    toggle?.click();
    await fixture.whenStable();

    expect(configuration.config().architecture.includeExampleDomain).toBe(false);
    expect(root(fixture).querySelector('#arch-example-name')).toBeNull();
    expect(treeLines(fixture)).not.toContain('domain/');
  });
});
