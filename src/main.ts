import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig, App } from '@app';

bootstrapApplication(App, appConfig).catch((err: unknown) => {
  console.error(err);
});
