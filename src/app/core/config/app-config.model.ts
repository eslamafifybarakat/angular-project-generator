/** Shape of every `src/environments/environment*.ts` file. */
export interface AppConfig {
  readonly name: string;
  readonly production: boolean;
  readonly apiUrl: string;
  readonly siteUrl: string;
  readonly defaultLanguage: string;
  readonly enableServiceWorker: boolean;
  readonly enableAnalytics: boolean;
}

/**
 * Keys a deployed `public/config.json` is allowed to override at runtime.
 * Anything else in that file is ignored, so a bad deploy-time edit cannot
 * reach into the rest of the app.
 */
export type RuntimeOverride = Partial<Pick<AppConfig, 'apiUrl' | 'siteUrl' | 'enableAnalytics'>>;
