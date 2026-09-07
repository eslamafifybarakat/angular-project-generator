import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { NotFound } from './not-found';

function root(fixture: ComponentFixture<NotFound>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(NotFound);
    await fixture.whenStable();
  });

  it('renders the 404 code, translated title and body copy', () => {
    const el = root(fixture);
    expect(el.querySelector('.missing__code')?.textContent).toBe('404');
    expect(el.querySelector('.missing__title')?.textContent).toBe('That page does not exist');
    expect(el.querySelector('.missing__body')?.textContent).toBe(
      'The link may be out of date, or the path may have a typo in it.',
    );
  });

  it('renders a translated CTA link back to the dashboard, at the language-aware home path', () => {
    const cta = root(fixture).querySelector<HTMLAnchorElement>('a.btn.btn--primary');
    expect(cta?.textContent?.trim()).toBe('Back to the dashboard');
    expect(cta?.getAttribute('href')).toBe('/');
  });

  it('applies a noindex page title and description via SeoService', () => {
    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);

    expect(title.getTitle()).toBe('That page does not exist · Angular Project Generator');
    expect(meta.getTag('name="description"')?.content).toBe(
      'The link may be out of date, or the path may have a typo in it.',
    );
    expect(meta.getTag('name="robots"')?.content).toBe('noindex,follow');
  });

  it('publishes a canonical link pointing at /404', () => {
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('http://localhost:4200/404');
  });
});
