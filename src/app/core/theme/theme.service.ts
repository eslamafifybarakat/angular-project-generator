import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { THEME_COLOR, THEME_STORAGE_KEY, isTheme, type Theme } from './theme.model';

/**
 * Owns the active theme.
 *
 * The initial value is read back off <html data-theme>, which the inline
 * script in index.html has already set before first paint. Reading it here
 * rather than recomputing means hydration cannot disagree with the server
 * markup, and there is no flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly current = signal<Theme>(this.initial());

  readonly theme = this.current.asReadonly();
  readonly isDark = computed(() => this.current() === 'dark');

  toggle(): void {
    this.use(this.current() === 'dark' ? 'light' : 'dark');
  }

  use(theme: Theme): void {
    this.current.set(theme);
    this.document.documentElement.setAttribute('data-theme', theme);
    this.document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[theme]);
    try {
      this.document.defaultView?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Private browsing: the attribute above is still applied for this session.
    }
  }

  private initial(): Theme {
    const attr = this.document.documentElement.getAttribute('data-theme');
    return isTheme(attr) ? attr : 'light';
  }
}
