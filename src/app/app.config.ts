import {
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
  inject,
  provideAppInitializer,
  type ApplicationConfig,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';
import { ConfigService } from '@core/config/config.service';
import { TranslationService } from '@core/i18n/translation.service';
import { LanguageService } from '@core/i18n/language.service';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    // withEventReplay(): clicks that land between first paint and hydration are
    // replayed rather than dropped. On a prerendered wizard that gap is exactly
    // when an impatient user hits "Next".
    provideClientHydration(withEventReplay()),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.enableServiceWorker,
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(async () => {
      const config = inject(ConfigService);
      const translations = inject(TranslationService);
      const language = inject(LanguageService);
      await config.load();
      await translations.load(language.lang());
    }),
  ],
};
