import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AppConfig, RuntimeOverride } from './app-config.model';

const OVERRIDE_KEYS = ['apiUrl', 'siteUrl', 'enableAnalytics'] as const;

/**
 * Exposes the active environment, with an optional runtime override layer.
 *
 * The build bakes in one `environment*.ts`. `public/config.json` is copied to
 * the deploy root untouched, so an operator can repoint `apiUrl` on a built
 * artifact without a rebuild. Only OVERRIDE_KEYS are honoured.
 */
@Injectable({ providedIn: 'root' })
export class ConfigService {
  private readonly document = inject(DOCUMENT);
  private readonly override = signal<RuntimeOverride>({});

  readonly config = computed<AppConfig>(() => ({ ...environment, ...this.override() }));

  get siteUrl(): string {
    return this.config().siteUrl;
  }

  get apiUrl(): string {
    return this.config().apiUrl;
  }

  /**
   * Called once during bootstrap. Failure is intentionally silent: a missing
   * or malformed config.json must leave the baked-in environment in place
   * rather than take the app down.
   */
  async load(): Promise<void> {
    const win = this.document.defaultView;
    if (!win) {
      return;
    }
    try {
      const res = await win.fetch('config.json', { cache: 'no-cache' });
      if (!res.ok) {
        return;
      }
      const raw: unknown = await res.json();
      this.override.set(this.pick(raw));
    } catch {
      // Keep the compiled environment.
    }
  }

  private pick(raw: unknown): RuntimeOverride {
    if (typeof raw !== 'object' || raw === null) {
      return {};
    }
    const source = raw as Record<string, unknown>;
    const out: { -readonly [K in keyof RuntimeOverride]: RuntimeOverride[K] } = {};
    for (const key of OVERRIDE_KEYS) {
      const value = source[key];
      if (key === 'enableAnalytics') {
        if (typeof value === 'boolean') {
          out.enableAnalytics = value;
        }
      } else if (typeof value === 'string' && value.length > 0) {
        out[key] = value;
      }
    }
    return out;
  }
}
