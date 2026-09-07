import type { AppConfig } from '@core/config/app-config.model';

/** Local build pointed at the shared dev API. */
export const environment: AppConfig = {
  name: 'dev',
  production: false,
  apiUrl: 'https://api.dev.angular-project-generator.dev/api',
  siteUrl: 'http://localhost:5000',
  defaultLanguage: 'en',
  enableServiceWorker: false,
  enableAnalytics: false,
};
