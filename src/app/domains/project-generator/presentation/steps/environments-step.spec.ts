import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { EnvironmentsStep } from './environments-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<EnvironmentsStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function rowcards(fixture: ComponentFixture<EnvironmentsStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.rowcard'));
}

function nameInput(card: HTMLElement): HTMLInputElement {
  return card.querySelector('input[id^="env-name-"]') as HTMLInputElement;
}

function apiInput(card: HTMLElement): HTMLInputElement {
  return card.querySelector('input[id^="env-api-"]') as HTMLInputElement;
}

function siteInput(card: HTMLElement): HTMLInputElement {
  return card.querySelector('input[id^="env-site-"]') as HTMLInputElement;
}

function removeEnvButton(card: HTMLElement): HTMLButtonElement | null {
  return card.querySelector<HTMLButtonElement>('.rowcard__head .btn--danger');
}

function kvRows(card: HTMLElement): HTMLElement[] {
  return Array.from(card.querySelectorAll<HTMLElement>('.kv'));
}

function addVarButton(card: HTMLElement): HTMLButtonElement {
  return card.querySelector(':scope > button.btn') as HTMLButtonElement;
}

function addEnvironmentButton(fixture: ComponentFixture<EnvironmentsStep>): HTMLButtonElement {
  return root(fixture).querySelector('.group > button.btn') as HTMLButtonElement;
}

function filesPre(fixture: ComponentFixture<EnvironmentsStep>): HTMLElement | null {
  return root(fixture).querySelectorAll<HTMLElement>('.code pre')[0] ?? null;
}

function setValue(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input'));
}

describe('EnvironmentsStep', () => {
  let fixture: ComponentFixture<EnvironmentsStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnvironmentsStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(EnvironmentsStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders the three default environments, marking only the first as Default with remove buttons visible', () => {
    const cards = rowcards(fixture);
    expect(cards).toHaveLength(3);
    expect(cards.map((c) => c.querySelector('h3')?.textContent)).toEqual([
      'development',
      'staging',
      'production',
    ]);
    expect(cards[0].querySelector('.badge--accent')).toBeTruthy();
    expect(cards[1].querySelector('.badge--accent')).toBeNull();
    expect(cards[2].querySelector('.badge--accent')).toBeNull();
    for (const card of cards) {
      expect(removeEnvButton(card)).toBeTruthy();
    }
  });

  it('shows the generated file list and configuration-names comment for the three environments', () => {
    const text = filesPre(fixture)?.textContent ?? '';
    expect(text).toContain('src/environments/environment.ts');
    expect(text).toContain('src/environments/environment.development.ts');
    expect(text).toContain('src/environments/environment.staging.ts');
    expect(text).toContain('src/environments/environment.production.ts');
    expect(text).toContain('development, staging, production');
  });

  it('adding an environment appends a blank, invalid entry with a visible name-required error', async () => {
    addEnvironmentButton(fixture).click();
    await fixture.whenStable();

    const cards = rowcards(fixture);
    expect(cards).toHaveLength(4);
    expect(configuration.config().environments).toHaveLength(4);
    expect(configuration.config().environments[3]).toMatchObject({
      name: '',
      apiUrl: '',
      siteUrl: '',
    });

    const newCard = cards[3];
    expect(nameInput(newCard).getAttribute('aria-invalid')).toBe('true');
    expect(apiInput(newCard).getAttribute('aria-invalid')).toBe('true');
    expect(siteInput(newCard).getAttribute('aria-invalid')).toBe('true');
    expect(newCard.querySelectorAll('.error').length).toBeGreaterThan(0);
  });

  it('editing a field updates ProjectConfigService and clears the validation error once fixed', async () => {
    const card = rowcards(fixture)[0];
    setValue(nameInput(card), '');
    await fixture.whenStable();

    expect(configuration.issuesForPath('environments.0.name').length).toBeGreaterThan(0);
    expect(nameInput(rowcards(fixture)[0]).getAttribute('aria-invalid')).toBe('true');

    setValue(nameInput(rowcards(fixture)[0]), 'dev-env');
    await fixture.whenStable();

    expect(configuration.config().environments[0].name).toBe('dev-env');
    expect(configuration.issuesForPath('environments.0.name')).toHaveLength(0);
    expect(nameInput(rowcards(fixture)[0]).getAttribute('aria-invalid')).toBe('false');
  });

  it('removing an environment re-indexes the remaining ones and moves the Default badge', async () => {
    removeEnvButton(rowcards(fixture)[0])?.click();
    await fixture.whenStable();

    const cards = rowcards(fixture);
    expect(cards).toHaveLength(2);
    expect(configuration.config().environments.map((e) => e.name)).toEqual(['staging', 'production']);
    expect(cards[0].querySelector('h3')?.textContent).toBe('staging');
    expect(cards[0].querySelector('.badge--accent')).toBeTruthy();
  });

  it('hides every remove button once only one environment remains', async () => {
    removeEnvButton(rowcards(fixture)[0])?.click();
    await fixture.whenStable();
    removeEnvButton(rowcards(fixture)[0])?.click();
    await fixture.whenStable();

    const cards = rowcards(fixture);
    expect(cards).toHaveLength(1);
    expect(configuration.config().environments).toHaveLength(1);
    expect(removeEnvButton(cards[0])).toBeNull();
  });

  it('adds, edits and removes an extra environment variable on one environment', async () => {
    const card = rowcards(fixture)[0];
    addVarButton(card).click();
    await fixture.whenStable();

    let kv = kvRows(rowcards(fixture)[0]);
    expect(kv).toHaveLength(1);
    const [keyInput, valueInput] = Array.from(kv[0].querySelectorAll<HTMLInputElement>('input'));
    setValue(keyInput, 'FEATURE_FLAG');
    setValue(valueInput, 'true');
    await fixture.whenStable();

    expect(configuration.config().environments[0].extra).toEqual([
      { key: 'FEATURE_FLAG', value: 'true' },
    ]);

    kv = kvRows(rowcards(fixture)[0]);
    (kv[0].querySelector('.btn--danger') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(configuration.config().environments[0].extra).toEqual([]);
    expect(kvRows(rowcards(fixture)[0])).toHaveLength(0);
  });
});
