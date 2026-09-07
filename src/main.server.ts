import { bootstrapApplication } from '@angular/platform-browser';
import type { BootstrapContext } from '@angular/platform-browser';
import { config } from '@app/app.config.server';
import { App } from '@app/app';

/**
 * The BootstrapContext argument is required on the server from Angular 20
 * onwards — without it the platform is never established and route extraction
 * fails with NG0401 during prerendering.
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(App, config, context);

export default bootstrap;
