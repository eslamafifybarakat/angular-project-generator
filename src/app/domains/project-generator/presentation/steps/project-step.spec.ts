import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProjectStep } from './project-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<ProjectStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function nameInput(fixture: ComponentFixture<ProjectStep>): HTMLInputElement {
  return root(fixture).querySelector('#project-name') as HTMLInputElement;
}

function slugInput(fixture: ComponentFixture<ProjectStep>): HTMLInputElement {
  return root(fixture).querySelector('#project-slug') as HTMLInputElement;
}

function descriptionTextarea(fixture: ComponentFixture<ProjectStep>): HTMLTextAreaElement {
  return root(fixture).querySelector('#project-description') as HTMLTextAreaElement;
}

function dropdownTrigger(fixture: ComponentFixture<ProjectStep>): HTMLButtonElement {
  return root(fixture).querySelector('.dropdown__trigger') as HTMLButtonElement;
}

function dropdownOptions(fixture: ComponentFixture<ProjectStep>): HTMLLIElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLLIElement>('.dropdown__option'));
}

function previewText(fixture: ComponentFixture<ProjectStep>): string {
  return root(fixture).querySelector('.code pre')?.textContent ?? '';
}

function setValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('ProjectStep', () => {
  let fixture: ComponentFixture<ProjectStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(ProjectStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders the default project field values and the Portal type in the dropdown', () => {
    expect(nameInput(fixture).value).toBe('My Project');
    expect(slugInput(fixture).value).toBe('my-project');
    expect(descriptionTextarea(fixture).value).toBe('');
    expect(dropdownTrigger(fixture).textContent).toContain('Portal');
    expect(nameInput(fixture).getAttribute('aria-invalid')).toBe('false');
    expect(slugInput(fixture).getAttribute('aria-invalid')).toBe('false');
  });

  it('shows a required-name error and aria-invalid when the name is cleared', async () => {
    setValue(nameInput(fixture), '');
    await fixture.whenStable();

    expect(configuration.config().project.name).toBe('');
    expect(configuration.issuesForPath('project.name').length).toBeGreaterThan(0);
    expect(nameInput(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(root(fixture).querySelector('#project-name-error')).toBeTruthy();
  });

  it('shows a slug-format error for an invalid slug and clears it once fixed', async () => {
    setValue(slugInput(fixture), 'Not A Valid Slug!');
    await fixture.whenStable();

    expect(configuration.issuesForPath('project.slug').length).toBeGreaterThan(0);
    expect(slugInput(fixture).getAttribute('aria-invalid')).toBe('true');

    setValue(slugInput(fixture), 'fixed-slug');
    await fixture.whenStable();

    expect(configuration.config().project.slug).toBe('fixed-slug');
    expect(configuration.issuesForPath('project.slug')).toHaveLength(0);
    expect(slugInput(fixture).getAttribute('aria-invalid')).toBe('false');
  });

  it('updates the project description via the textarea', async () => {
    setValue(descriptionTextarea(fixture), 'An internal admin portal.');
    await fixture.whenStable();

    expect(configuration.config().project.description).toBe('An internal admin portal.');
  });

  it('selects a different project type from the dropdown and updates ProjectConfigService', async () => {
    dropdownTrigger(fixture).click();
    await fixture.whenStable();

    const options = dropdownOptions(fixture);
    const saasIndex = options.findIndex((option) => option.textContent?.includes('SaaS'));
    expect(saasIndex).toBeGreaterThanOrEqual(0);

    options[saasIndex].click();
    await fixture.whenStable();

    expect(configuration.config().project.type).toBe('SaaS');
    expect(dropdownTrigger(fixture).textContent).toContain('SaaS');
  });

  it('keeps the preview lines in sync with name and slug, falling back to an em dash when empty', async () => {
    expect(previewText(fixture)).toContain('My Project');
    expect(previewText(fixture)).toContain('my-project');

    setValue(nameInput(fixture), '');
    setValue(slugInput(fixture), '');
    await fixture.whenStable();

    expect(previewText(fixture)).not.toContain('My Project');
    expect(previewText(fixture)).toContain('—');
  });
});
