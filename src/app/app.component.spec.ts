import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideZonelessChangeDetection(), provideRouter([])],
    }).compileComponents();
  });

  it('renders the header, a main landmark and the footer', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelector('app-header')).toBeTruthy();
    expect(root.querySelector('main#main')).toBeTruthy();
    expect(root.querySelector('app-footer')).toBeTruthy();
  });

  it('exposes a skip link as the first focusable element', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const skip = (fixture.nativeElement as HTMLElement).querySelector('a.skip-link');

    expect(skip).toBeTruthy();
    expect(skip?.getAttribute('href')).toBe('#main');
  });
});
