import { registerContentResolver } from './content-registry';
import { componentClassName, componentFileStem, toClassName } from './template-context.model';
import type { TemplateContext } from './template-context.model';

/**
 * SSR bootstrap files. Standalone eras get the Angular 22-shaped
 * `@angular/ssr` + Express server (`AngularNodeAppEngine`); NgModule eras get
 * the older `@nguniversal/express-engine`-style split (`AppServerModule` +
 * a hand-rolled Express server) — these are genuinely different packages and
 * file shapes, not a config difference, per `TEMPLATE_SPECIFICATION.md` §5.
 */

function mainServerTs(ctx: TemplateContext): string {
  if (ctx.standalone) {
    const appStem = componentFileStem('app', ctx.naming);
    const appClass = componentClassName('app', ctx.naming);
    return `import { bootstrapApplication } from '@angular/platform-browser';
import type { BootstrapContext } from '@angular/platform-browser';
import { ${appClass} } from './app/${appStem}';
import { config } from './app/app.config.server';

// A BootstrapContext must be threaded through here, or route extraction
// fails during prerendering with "NG0401: Missing Platform" — a gotcha the
// Angular 22 CLI's own SSR scaffold does not surface until it's hit.
const bootstrap = (context: BootstrapContext) => bootstrapApplication(${appClass}, config, context);

export default bootstrap;
`;
  }
  return `import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { ngExpressEngine } from '@nguniversal/express-engine';
import * as express from 'express';
import { join } from 'node:path';
import { AppServerModule } from './app/app.server.module';

export function app(): express.Express {
  const server = express();
  const distFolder = join(process.cwd(), 'dist/browser');

  server.engine('html', ngExpressEngine({ bootstrap: AppServerModule }));
  server.set('view engine', 'html');
  server.set('views', distFolder);

  server.get('*.*', express.static(distFolder, { maxAge: '1y' }));

  server.get('*', (req, res) => {
    res.render('index', { req, providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }] });
  });

  return server;
}

app().listen(process.env['PORT'] || 4000);
`;
}

function serverTs(ctx: TemplateContext): string {
  if (!ctx.standalone) {
    // NgModule-era servers are self-contained in main.server.ts above —
    // no separate server.ts entry exists for that bootstrap shape.
    return `// NgModule-era SSR: the Express server lives in src/main.server.ts.
export {};
`;
  }
  return `import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, () => {
    console.log(\`Node Express server listening on http://localhost:\${port}\`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
`;
}

function appConfigServerTs(): string {
  return `import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
`;
}

function appRoutesServerTs(ctx: TemplateContext): string {
  const mode = ctx.cfg.rendering.prerender ? 'Prerender' : 'Server';
  return `import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // A prerendered wildcard is impossible (it would need to match infinite
  // unknown paths) — the catch-all always falls back to a live/client render.
  { path: '**', renderMode: RenderMode.${mode === 'Prerender' ? 'Client' : 'Server'} },
];
`;
}

function appServerModuleTs(ctx: TemplateContext): string {
  const className = toClassName(ctx.cfg.project.slug || 'app');
  return `import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppModule } from './app.module';
import { AppComponent } from './app.component';

@NgModule({
  imports: [AppModule, ServerModule],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
// Referenced as AppServerModule by src/main.server.ts's ngExpressEngine call.
// (Class name kept fixed regardless of ${className} to match @nguniversal's
// expected bootstrap export.)
`;
}

registerContentResolver((path, ctx) => {
  switch (path) {
    case 'src/main.server.ts':
      return mainServerTs(ctx);
    case 'src/server.ts':
      return serverTs(ctx);
    case 'src/app/app.config.server.ts':
      return appConfigServerTs();
    case 'src/app/app.routes.server.ts':
      return appRoutesServerTs(ctx);
    case 'src/app/app.server.module.ts':
      return appServerModuleTs(ctx);
    default:
      return undefined;
  }
});
