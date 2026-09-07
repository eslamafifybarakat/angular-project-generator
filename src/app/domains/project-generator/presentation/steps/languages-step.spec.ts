import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { LanguagesStep } from './languages-step';
import { ProjectConfigService } from '../../application';

function root(fixture: ComponentFixture<LanguagesStep>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function langRows(fixture: ComponentFixture<LanguagesStep>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('.langlist .check'));
}

function langRow(fixture: ComponentFixture<LanguagesStep>, name: string): HTMLElement {
  const row = langRows(fixture).find((el) => el.querySelector('.check__text')?.textContent?.trim().startsWith(name));
  if (!row) {
    throw new Error(`No language row found for "${name}"`);
  }
  return row;
}

function langCheckbox(fixture: ComponentFixture<LanguagesStep>, name: string): HTMLInputElement {
  return langRow(fixture, name).querySelector('input[type="checkbox"]') as HTMLInputElement;
}

function fontRow(fixture: ComponentFixture<LanguagesStep>, name: string): HTMLElement {
  const row = Array.from(root(fixture).querySelectorAll<HTMLElement>('.rowcard')).find((el) =>
    el.querySelector('h3')?.textContent?.trim().includes(name),
  );
  if (!row) {
    throw new Error(`No font row found for "${name}"`);
  }
  return row;
}

function dropdownHost(fixture: ComponentFixture<LanguagesStep>, triggerId: string): HTMLElement {
  const trigger = root(fixture).querySelector<HTMLButtonElement>(`#${triggerId}`);
  if (!trigger) {
    throw new Error(`No dropdown trigger found for id "${triggerId}"`);
  }
  return trigger.parentElement as HTMLElement;
}

function dropdownOptions(host: HTMLElement): HTMLLIElement[] {
  return Array.from(host.querySelectorAll<HTMLLIElement>('.dropdown__option'));
}

describe('LanguagesStep', () => {
  let fixture: ComponentFixture<LanguagesStep>;
  let configuration: ProjectConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LanguagesStep],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(LanguagesStep);
    configuration = TestBed.inject(ProjectConfigService);
    await fixture.whenStable();
  });

  it('renders the localization toggle on and all twelve catalog languages, with only English and Arabic checked', () => {
    const toggle = root(fixture).querySelector<HTMLInputElement>('.switch input[type="checkbox"]');
    expect(toggle?.checked).toBe(true);

    const rows = langRows(fixture);
    expect(rows).toHaveLength(12);
    expect(rows.filter((row) => row.querySelector('input')?.checked).map((row) => row.querySelector('.check__text')?.textContent?.trim())).toEqual([
      'English · English',
      'Arabic · العربية',
    ]);
  });

  it('shows the RTL badge next to Arabic but not next to English', () => {
    expect(langRow(fixture, 'Arabic').querySelector('.badge--info')?.textContent).toBe('RTL');
    expect(langRow(fixture, 'English').querySelector('.badge--info')).toBeNull();
  });

  it('shows the Default language dropdown when multiple languages are selected, and the route-prefix preview marks English (the default) with an empty prefix', () => {
    const trigger = root(fixture).querySelector('#default-language');
    expect(trigger?.querySelector('.dropdown__value')?.textContent).toContain('English');

    const preview = root(fixture).querySelector('.code pre')?.textContent ?? '';
    expect(preview).toContain("path: ''");
    expect(preview).toContain('// English');
    expect(preview).toContain("path: 'ar'");
    expect(preview).toContain('// Arabic');
  });

  it('selecting Arabic as the Default language updates ProjectConfigService and flips which language gets the empty route prefix', async () => {
    const host = dropdownHost(fixture, 'default-language');
    (host.querySelector('.dropdown__trigger') as HTMLButtonElement).click();
    await fixture.whenStable();

    const arabicOption = dropdownOptions(host).find((li) => li.textContent?.includes('Arabic'))!;
    arabicOption.click();
    await fixture.whenStable();

    expect(configuration.config().localization.defaultLanguage).toBe('ar');
    const preview = root(fixture).querySelector('.code pre')?.textContent ?? '';
    expect(preview).toContain("path: ''");
    expect(preview).toContain("path: 'en'");
  });

  it("shows each selected language's font dropdown defaulting to the configured font, with a script-appropriate sample and correct direction", () => {
    const englishRow = fontRow(fixture, 'English');
    expect(englishRow.querySelector('#font-en .dropdown__value')?.textContent).toContain('Figtree');
    expect(englishRow.querySelector('.fontsample')?.getAttribute('dir')).toBe('ltr');
    expect(englishRow.querySelector('.fontsample')?.textContent).toBe('Sample text preview');

    const arabicRow = fontRow(fixture, 'Arabic');
    expect(arabicRow.querySelector('#font-ar .dropdown__value')?.textContent).toContain('Cairo');
    expect(arabicRow.querySelector('.fontsample')?.getAttribute('dir')).toBe('rtl');
    expect(arabicRow.querySelector('.fontsample')?.textContent).toBe('نصٌّ تجريبي للمعاينة');
  });

  it("changing the Arabic font via its dropdown updates ProjectConfigService.fonts and the dropdown's displayed value", async () => {
    const host = dropdownHost(fixture, 'font-ar');
    (host.querySelector('.dropdown__trigger') as HTMLButtonElement).click();
    await fixture.whenStable();

    const tajawalOption = dropdownOptions(host).find((li) => li.textContent?.includes('Tajawal'))!;
    tajawalOption.click();
    await fixture.whenStable();

    expect(configuration.config().fonts['ar']).toBe('Tajawal');
    expect(fontRow(fixture, 'Arabic').querySelector('#font-ar .dropdown__value')?.textContent).toContain('Tajawal');
  });

  it('shows the RTL note by default (Arabic selected) and adds the Chinese note only once Chinese is checked', async () => {
    const notes = () => Array.from(root(fixture).querySelectorAll<HTMLElement>('.note--info'));

    expect(notes().some((n) => n.textContent?.includes('RTL language is selected'))).toBe(true);
    expect(notes().some((n) => n.textContent?.includes('system font stack'))).toBe(false);

    langCheckbox(fixture, 'Chinese').click();
    await fixture.whenStable();

    expect(configuration.config().localization.selectedLanguages).toContain('zh');
    expect(notes().some((n) => n.textContent?.includes('system font stack'))).toBe(true);
    expect(notes().some((n) => n.textContent?.includes('RTL language is selected'))).toBe(true);
  });

  it('shows a validation error under Included languages once every language is unchecked', async () => {
    langCheckbox(fixture, 'English').click();
    await fixture.whenStable();
    langCheckbox(fixture, 'Arabic').click();
    await fixture.whenStable();

    expect(configuration.config().localization.selectedLanguages).toEqual([]);
    expect(configuration.issuesForPath('localization.selectedLanguages')).toHaveLength(1);
    expect(root(fixture).querySelector('.error')?.textContent).toBe('Select at least one language.');
  });

  it('turning localization off hides every language section and shows the explanatory hint', async () => {
    const toggle = root(fixture).querySelector<HTMLInputElement>('.switch input[type="checkbox"]')!;
    toggle.click();
    await fixture.whenStable();

    expect(configuration.config().localization.enabled).toBe(false);
    expect(root(fixture).querySelector('.langlist')).toBeNull();
    expect(root(fixture).querySelector('.rowcard')).toBeNull();
    expect(root(fixture).querySelector('.hint')?.textContent).toBe(
      'Off writes no i18n folder, no locale files and no duplicated routes.',
    );
  });
});
