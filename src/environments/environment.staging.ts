import type { AppConfig } from '@core/config/app-config.model';

export const environment: AppConfig = {
  name: 'staging',
  production: true,
  apiUrl: 'https://api.staging.angular-project-generator.dev/api',
  siteUrl: 'https://staging.angular-project-generator.dev',
  defaultLanguage: 'en',
  enableServiceWorker: true,
  enableAnalytics: false,
};
