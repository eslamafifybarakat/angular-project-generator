import { slugify } from '@shared/utils';
import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';
import type { EnvironmentEntry } from '../../domain';

/** One environment file per user-defined environment name, per
 * `TEMPLATE_SPECIFICATION.md` §9 — "do not assume the environment names are
 * fixed". Only `production`/`siteUrl`/`apiUrl`/`defaultLanguage` are generic;
 * anything typed into a per-environment "extra" variable is passed through
 * as-is rather than invented. */

function environmentTs(env: EnvironmentEntry, ctx: TemplateContext): string {
  const isProd = slugify(env.name) === 'production';
  const extra = env.extra
    .filter((v) => v.key.trim().length > 0)
    .map((v) => `  ${JSON.stringify(v.key)}: ${JSON.stringify(v.value)},`)
    .join('\n');
  return `export const environment = {
  production: ${isProd},
  siteUrl: ${JSON.stringify(env.siteUrl)},
  apiUrl: ${JSON.stringify(env.apiUrl)},
  defaultLanguage: ${JSON.stringify(ctx.cfg.localization.enabled ? ctx.cfg.localization.defaultLanguage : 'en')},
${extra}
};
`;
}

registerContentResolver((path, ctx) => {
  const match = /^src\/environments\/environment\.([a-z0-9-]+)\.ts$/.exec(path);
  if (match) {
    const targetSlug = match[1];
    const env = ctx.cfg.environments.find((e) => (slugify(e.name) || 'unnamed') === targetSlug);
    if (env) return environmentTs(env, ctx);
  }
  if (path === 'src/environments/environment.ts') {
    const first = ctx.cfg.environments[0];
    if (first) return environmentTs(first, ctx);
  }
  return undefined;
});
