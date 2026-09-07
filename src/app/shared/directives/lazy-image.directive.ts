import { Directive, ElementRef, inject, input, output } from '@angular/core';

const DEFAULT_FALLBACK = '/brand/mark-color.svg';

/**
 * Standard handling for every `<img>` in the app: native `loading="lazy"` +
 * `decoding="async"` rather than a hand-rolled IntersectionObserver — the
 * real `src` stays a normal attribute, so SSR/prerendering still ships a
 * real, indexable image in the markup instead of an empty tag a script has
 * to fill in later. A fade-in class applies once the image actually loads,
 * and a same-origin brand-mark fallback swaps in on `error` (a 404, a bad
 * URL, an offline asset) rather than leaving a broken-image icon on screen.
 */
@Directive({
  selector: 'img[appLazyImage]',
  host: {
    loading: 'lazy',
    decoding: 'async',
    '(error)': 'onError()',
    '(load)': 'onLoad()',
    '[class.lazy-image]': 'true',
  },
})
export class LazyImageDirective {
  /** Swapped in on error. Defaults to the app's own brand mark. */
  readonly lazyImageFallback = input<string>(DEFAULT_FALLBACK);
  readonly loaded = output<void>();

  private readonly host = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private usingFallback = false;

  protected onLoad(): void {
    this.host.nativeElement.classList.add('lazy-image--loaded');
    this.loaded.emit();
  }

  protected onError(): void {
    if (this.usingFallback) {
      return; // the fallback itself failed to load — stop, don't loop forever
    }
    this.usingFallback = true;
    this.host.nativeElement.src = this.lazyImageFallback();
  }
}
