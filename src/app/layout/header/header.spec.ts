import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { LanguageService } from '@core/i18n';
import { ThemeService } from '@core/theme';
import { Header } from './header';

function root(fixture: ComponentFixture<Header>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function navLinks(fixture: ComponentFixture<Header>): HTMLAnchorElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLAnchorElement>('.nav a'));
}

function langTrigger(fixture: ComponentFixture<Header>): HTMLButtonElement {
  return root(fixture).querySelector('app-dropdown .dropdown__trigger') as HTMLButtonElement;
}

function langOptions(fixture: ComponentFixture<Header>): HTMLLIElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLLIElement>('app-dropdown .dropdown__option'));
}

function themeButton(fixture: ComponentFixture<Header>): HTMLButtonElement {
  return root(fixture).querySelector('.btn--icon:not(.bar__menu)') as HTMLButtonElement;
}

function menuButton(fixture: ComponentFixture<Header>): HTMLButtonElement {
  return root(fixture).querySelector('.bar__menu') as HTMLButtonElement;
}

function nav(fixture: ComponentFixture<Header>): HTMLElement {
  return root(fixture).querySelector('.nav') as HTMLElement;
}

/** Lets a real async chain (dynamic import + router navigation) settle a macrotask turn. */
async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/**
 * `switchLanguage` is `async` and its (valueChange) binding discards the
 * returned promise, so under zoneless CD `fixture.whenStable()` cannot track
 * it — the real dynamic `import('../../../locales/ar.json')` inside
 * `TranslationService.load` may take more than one macrotask turn to settle
 * in the test bundler. Poll until the condition holds instead of assuming a
 * fixed number of ticks.
 */
async function waitFor(fixture: ComponentFixture<Header>, condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt++) {
    await fixture.whenStable();
    if (condition()) {
      return;
    }
    await flush();
  }
  throw new Error('Condition never became true');
}

describe('Header', () => {
  let fixture: ComponentFixture<Header>;

  beforeEach(async () => {
    // LanguageService/ThemeService persist their state onto the real document
    // and localStorage, which otherwise leaks between tests in this file.
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.setAttribute('lang', 'en');
    document.documentElement.setAttribute('dir', 'ltr');

    await TestBed.configureTestingModule({
      imports: [Header],
      // A wildcard route so the language switcher's real navigateByUrl call
      // resolves instead of failing to match an empty route table.
      providers: [provideZonelessChangeDetection(), provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();
    fixture = TestBed.createComponent(Header);
    await fixture.whenStable();
  });

  it('renders the brand and the translated primary nav with language-aware hrefs', () => {
    const el = root(fixture);
    expect(el.querySelector('.brand__name')?.textContent).toBe('Angular Project Generator');
    expect(el.querySelector('.brand__sub')?.textContent).toBe('Phase 2 prototype');

    const links = navLinks(fixture);
    expect(links.map((a) => a.textContent?.trim())).toEqual(['Home', 'New project']);
    expect(links[0].getAttribute('href')).toBe('/');
    expect(links[1].getAttribute('href')).toBe('/new');
    expect(nav(fixture).getAttribute('aria-label')).toBe('Menu');
  });

  it('lists all four interface languages with English selected initially', async () => {
    expect(langTrigger(fixture).textContent).toContain('English');

    langTrigger(fixture).click();
    await fixture.whenStable();

    const labels = langOptions(fixture).map((li) => li.querySelector('.dropdown__option-label')?.textContent);
    expect(labels).toEqual(['English', 'العربية', '中文', 'Русский']);
  });

  it('switching the language updates LanguageService, <html lang> and the dropdown label', async () => {
    const language = TestBed.inject(LanguageService);
    expect(language.lang()).toBe('en');

    langTrigger(fixture).click();
    await fixture.whenStable();
    langOptions(fixture)[1].click(); // العربية
    await waitFor(fixture, () => language.lang() === 'ar');

    expect(language.lang()).toBe('ar');
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(langTrigger(fixture).textContent).toContain('العربية');
  });

  it('toggles the theme and flips the toggle button aria-label', async () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.isDark()).toBe(false);
    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Switch to the dark theme');

    themeButton(fixture).click();
    await fixture.whenStable();

    expect(theme.isDark()).toBe(true);
    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Switch to the light theme');

    themeButton(fixture).click();
    await fixture.whenStable();

    expect(theme.isDark()).toBe(false);
    expect(themeButton(fixture).getAttribute('aria-label')).toBe('Switch to the dark theme');
  });

  it('opens and closes the mobile nav menu from the hamburger button', async () => {
    expect(menuButton(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(nav(fixture).className).not.toContain('nav--open');

    menuButton(fixture).click();
    await fixture.whenStable();

    expect(menuButton(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(nav(fixture).className).toContain('nav--open');

    menuButton(fixture).click();
    await fixture.whenStable();

    expect(menuButton(fixture).getAttribute('aria-expanded')).toBe('false');
    expect(nav(fixture).className).not.toContain('nav--open');
  });

  it('closes the mobile menu when a nav link is clicked', async () => {
    menuButton(fixture).click();
    await fixture.whenStable();
    expect(nav(fixture).className).toContain('nav--open');

    navLinks(fixture)[0].click();
    await fixture.whenStable();

    expect(nav(fixture).className).not.toContain('nav--open');
    expect(menuButton(fixture).getAttribute('aria-expanded')).toBe('false');
  });
});
