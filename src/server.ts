import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Static assets from the browser build. `index: false` matters: the Angular
 * engine below owns HTML responses, including the prerendered ones.
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Everything else — including unmatched paths, which must reach the Angular
 * 404 route and return 200 for the shell, never a bare 400 from the host
 * check. See README §"allowedHosts".
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] ?? 4000);
  app.listen(port, () => {
    console.log(`Angular Project Generator SSR server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
