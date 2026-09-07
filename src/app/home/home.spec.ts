import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { Home } from './home';

function root(fixture: ComponentFixture<Home>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
  });

  it('renders the dashboard, with its hero heading matching the SEO title', () => {
    const el = root(fixture);
    expect(el.querySelector('app-dashboard')).toBeTruthy();
    expect(el.querySelector('.hero__title')?.textContent).toBe('Angular Developers Platform');
  });

  it('applies the hero copy as the page title and meta description via SeoService', () => {
    const title = TestBed.inject(Title);
    const meta = TestBed.inject(Meta);

    expect(title.getTitle()).toBe('Angular Developers Platform · Angular Project Generator');
    expect(meta.getTag('name="description"')?.content).toBe(
      'Configure your architecture, theme, rendering and tooling — review once, then generate a production-ready Angular project.',
    );
    expect(meta.getTag('name="robots"')?.content).toBe('index,follow');
  });

  it('publishes a canonical link pointing at the site root', () => {
    const canonical = document.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('http://localhost:4200/');
  });

  it('writes a SoftwareApplication JSON-LD block describing the app', () => {
    const script = document.getElementById('app-json-ld');
    expect(script).toBeTruthy();

    const graph = JSON.parse(script?.textContent ?? '{}') as Record<string, unknown>;
    expect(graph['@type']).toBe('SoftwareApplication');
    expect(graph['name']).toBe('Angular Project Generator');
    expect(graph['description']).toBe(
      'Configure your architecture, theme, rendering and tooling — review once, then generate a production-ready Angular project.',
    );
  });
});
