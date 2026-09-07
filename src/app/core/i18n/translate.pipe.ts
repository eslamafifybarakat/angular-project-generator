import { Pipe, type PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';

/**
 * Impure on purpose: it must re-evaluate when the active language changes or a
 * lazily-loaded catalog arrives. Both are signal reads, so with zoneless
 * change detection the cost is a map lookup per marked-dirty check.
 */
@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translations = inject(TranslationService);

  transform(key: string, params?: Readonly<Record<string, string | number>>): string {
    // Read the version signal so the pipe is invalidated on catalog changes.
    void this.translations.version();
    return this.translations.translate(key, params);
  }
}
