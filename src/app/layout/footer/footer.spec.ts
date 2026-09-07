import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Footer } from './footer';

function root(fixture: ComponentFixture<Footer>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function lines(fixture: ComponentFixture<Footer>): string[] {
  return Array.from(root(fixture).querySelectorAll<HTMLParagraphElement>('.foot__line')).map(
    (el) => el.textContent?.trim() ?? '',
  );
}

describe('Footer', () => {
  let fixture: ComponentFixture<Footer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Footer],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(Footer);
    await fixture.whenStable();
  });

  it('renders inside a <footer> landmark', () => {
    expect(root(fixture).querySelector('footer.foot')).toBeTruthy();
  });

  it('renders the "built with" line naming Angular 22', () => {
    expect(lines(fixture)[0]).toBe('Built with Angular 22 · SSR · prerendered');
  });

  it('renders the spec-provenance and rights lines, translated', () => {
    const text = lines(fixture);
    expect(text[1]).toBe('Generated from the extracted DDD template contract.');
    expect(text[2]).toBe('A configuration tool, not a hosting service.');
  });

  it('renders the environment name and current year in the meta line', () => {
    const meta = root(fixture).querySelector('.foot__meta');
    expect(meta?.textContent).toContain('development');
    expect(meta?.textContent).toContain(String(new Date().getFullYear()));
  });
});
