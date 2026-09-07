import { beforeEach, describe, expect, it } from 'vitest';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Toast } from './toast';
import { ToastService } from './toast.service';

function root(fixture: ComponentFixture<Toast>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function toastEl(fixture: ComponentFixture<Toast>): HTMLElement | null {
  return root(fixture).querySelector('.toast');
}

function closeButton(fixture: ComponentFixture<Toast>): HTMLButtonElement | null {
  return root(fixture).querySelector('.toast__close');
}

describe('Toast', () => {
  let fixture: ComponentFixture<Toast>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toast],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(Toast);
    toastService = TestBed.inject(ToastService);
    await fixture.whenStable();
  });

  it('renders nothing while the service has no message', () => {
    expect(toastEl(fixture)).toBeNull();
  });

  it('renders the message with a polite status role once the service shows one', async () => {
    toastService.show('Project generated successfully');
    await fixture.whenStable();

    const el = toastEl(fixture);
    expect(el).toBeTruthy();
    expect(el?.getAttribute('role')).toBe('status');
    expect(el?.getAttribute('aria-live')).toBe('polite');
    expect(root(fixture).querySelector('.toast__text')?.textContent).toBe(
      'Project generated successfully',
    );
  });

  it('gives the close button a translated aria-label', async () => {
    toastService.show('Saved');
    await fixture.whenStable();

    expect(closeButton(fixture)?.getAttribute('aria-label')).toBe('Dismiss notification');
  });

  it('dismisses the toast through the service when the close button is clicked', async () => {
    toastService.show('Saved');
    await fixture.whenStable();
    expect(toastEl(fixture)).toBeTruthy();

    closeButton(fixture)?.click();
    await fixture.whenStable();

    expect(toastEl(fixture)).toBeNull();
    expect(toastService.message()).toBeNull();
  });

  it('replaces the previous message when a new one is shown before the first is dismissed', async () => {
    toastService.show('First message');
    await fixture.whenStable();
    toastService.show('Second message');
    await fixture.whenStable();

    const texts = root(fixture).querySelectorAll('.toast__text');
    expect(texts.length).toBe(1);
    expect(texts[0].textContent).toBe('Second message');
  });
});
