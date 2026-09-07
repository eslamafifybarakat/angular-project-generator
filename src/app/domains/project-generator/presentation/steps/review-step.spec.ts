import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ReviewStep } from './review-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<ReviewStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function topNote(fixture: ComponentFixture<ReviewStep>): HTMLElement | null {
  return root(fixture).querySelector<HTMLElement>('.note');
}

function generateButton(fixture: ComponentFixture<ReviewStep>): HTMLButtonElement {
  return root(fixture).querySelector('.btn--primary') as HTMLButtonElement;
}

function rowcards(fixture: ComponentFixture<ReviewStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.rowcard--slim'));
}

function cardTitle(card: HTMLElement): string {
  return card.querySelector('h3')?.textContent?.trim() ?? '';
}

function cardByTitle(fixture: ComponentFixture<ReviewStep>, title: string): HTMLElement {
  return rowcards(fixture).find((card) => cardTitle(card) === title) as HTMLElement;
}

function cardValue(card: HTMLElement): string {
  return card.querySelector('.option__desc')?.textContent?.trim() ?? '';
}

function editLink(card: HTMLElement): HTMLAnchorElement {
  return card.querySelector('a.btn--ghost') as HTMLAnchorElement;
}

describe('ReviewStep', () => {
  let fixture: ComponentFixture<ReviewStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewStep],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ReviewStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('shows the ready note with the generated file count and zip name for the valid default configuration', () => {
    expect(configuration.isValid()).toBe(true);
    const note = topNote(fixture);
    expect(note?.className).toContain('note--ok');
    expect(note?.textContent).toContain('Ready to generate');
    expect(note?.textContent).toContain(String(configuration.generatedFiles().length));
    expect(note?.textContent).toContain('my-project.zip');
    expect(generateButton(fixture).disabled).toBe(false);
  });

  it('lists all eleven steps as Valid rowcards in wizard order', () => {
    const cards = rowcards(fixture);
    expect(cards).toHaveLength(11);
    expect(cards.map(cardTitle)).toEqual([
      'Project',
      'Angular',
      'Architecture',
      'Styling',
      'Theme',
      'Languages',
      'Rendering & SEO',
      'Environments',
      'Features',
      'Developer tools',
      'Example code',
    ]);
    for (const card of cards) {
      expect(card.querySelector('.badge--ok')).toBeTruthy();
      expect(card.querySelector('.badge--err')).toBeNull();
    }
  });

  it("shows each row's derived summary value", () => {
    expect(cardValue(cardByTitle(fixture, 'Project'))).toBe('My Project · my-project');
    expect(cardValue(cardByTitle(fixture, 'Angular'))).toBe('Angular 22');
    expect(cardValue(cardByTitle(fixture, 'Rendering & SEO'))).toBe('SSR · SEO');
    expect(cardValue(cardByTitle(fixture, 'Environments'))).toBe('development, staging, production');
    expect(cardValue(cardByTitle(fixture, 'Developer tools'))).toBe(
      `${configuration.enabledToolCount()} / ${configuration.totalToolCount()}`,
    );
  });

  it("links each row's Edit action to the matching step route", () => {
    expect(editLink(cardByTitle(fixture, 'Project')).getAttribute('href')).toBe('/new/project');
    expect(editLink(cardByTitle(fixture, 'Rendering & SEO')).getAttribute('href')).toBe(
      '/new/rendering',
    );
    expect(editLink(cardByTitle(fixture, 'Environments')).getAttribute('href')).toBe(
      '/new/environments',
    );
  });

  it('shows the blocked note, an invalid badge and inline errors, and disables Generate when validation fails', async () => {
    configuration.patch('project', { name: '' });
    await fixture.whenStable();

    const note = topNote(fixture);
    expect(note?.className).toContain('note--err');
    expect(note?.textContent).toContain('Fix the items below before generating');

    const projectCard = cardByTitle(fixture, 'Project');
    expect(projectCard.querySelector('.badge--err')?.textContent).toContain('Needs attention');
    expect(projectCard.querySelectorAll('.error').length).toBeGreaterThan(0);
    expect(generateButton(fixture).disabled).toBe(true);
  });

  it('navigates to /generate when Generate is clicked while the configuration is valid', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    generateButton(fixture).click();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith('/generate');
  });

  it('does not navigate when the configuration is invalid (the button is disabled)', async () => {
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    configuration.patch('project', { name: '' });
    await fixture.whenStable();

    expect(generateButton(fixture).disabled).toBe(true);
    generateButton(fixture).click();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
