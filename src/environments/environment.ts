import type { AppConfig } from '@core/config/app-config.model';

/**
 * Default (local development) environment. `angular.json`'s fileReplacements
 * swap this file for one of the siblings per build configuration.
 */
export const environment: AppConfig = {
  name: 'development',
  production: false,
  apiUrl: 'http://localhost:3000/api',
  siteUrl: 'http://localhost:4200',
  defaultLanguage: 'en',
  enableServiceWorker: false,
  enableAnalytics: false,
};
