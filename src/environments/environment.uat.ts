import type { AppConfig } from '@core/config/app-config.model';

export const environment: AppConfig = {
  name: 'uat',
  production: true,
  apiUrl: 'https://api.uat.angular-project-generator.dev/api',
  siteUrl: 'https://uat.angular-project-generator.dev',
  defaultLanguage: 'en',
  enableServiceWorker: true,
  enableAnalytics: false,
};
