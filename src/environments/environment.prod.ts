import type { AppConfig } from '@core/config/app-config.model';

export const environment: AppConfig = {
  name: 'production',
  production: true,
  apiUrl: 'https://api.angular-project-generator.dev/api',
  siteUrl: 'https://angular-project-generator.dev',
  defaultLanguage: 'en',
  enableServiceWorker: true,
  enableAnalytics: true,
};
