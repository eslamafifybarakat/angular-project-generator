import { DOCUMENT, Injectable, inject } from '@angular/core';
import { ConfigService } from '@core/config/config.service';
import { SITE_NAME } from './seo.model';

const SCRIPT_ID = 'app-json-ld';

/**
 * Maintains a single JSON-LD block in <head>.
 *
 * One script tag, replaced per navigation, so a client-side route change
 * cannot leave two competing graphs behind. Written during render, which means
 * it lands in the prerendered HTML rather than only after hydration.
 */
@Injectable({ providedIn: 'root' })
export class JsonLdService {
  private readonly document = inject(DOCUMENT);
  private readonly config = inject(ConfigService);

  setSoftwareApplication(description: string): void {
    const site = this.config.siteUrl.replace(/\/+$/, '');
    this.write({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': SITE_NAME,
      'applicationCategory': 'DeveloperApplication',
      'operatingSystem': 'Web',
      'url': site,
      'description': description,
      'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
    });
  }

  setBreadcrumb(trail: readonly { name: string; path: string }[]): void {
    const site = this.config.siteUrl.replace(/\/+$/, '');
    this.write({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': trail.map((item, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': `${site}${item.path}`,
      })),
    });
  }

  clear(): void {
    this.document.getElementById(SCRIPT_ID)?.remove();
  }

  private write(graph: unknown): void {
    this.clear();
    const script = this.document.createElement('script');
    script.id = SCRIPT_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(graph);
    this.document.head.appendChild(script);
  }
}
