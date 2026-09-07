import { registerContentResolver } from './content-registry';
import { toClassName } from './template-context.model';
import type { TemplateContext } from './template-context.model';

/**
 * Root scaffold: `package.json`, `angular.json`, `tsconfig.json`,
 * `README.md`, `src/index.html`, `src/main.ts`, `src/app/app.component.*`,
 * and the era-dependent bootstrap files (`app.config.ts`/`app.routes.ts` for
 * standalone, `app.module.ts`/`app-routing.module.ts` for NgModule eras).
 *
 * Bakes in the five hard-won lessons from `angular22-ddd-starter/README.md`:
 * `addTypeToClassName: true`, a non-empty `security.allowedHosts` whenever
 * SSR is on, and `--legacy-peer-deps` in the install instructions.
 */

function pkgVersion(v: string | null, fallback: string): string {
  return v ? `^${v}` : fallback;
}

function packageJson(ctx: TemplateContext): string {
  const { cfg, profile, ssr } = ctx;
  const slug = cfg.project.slug || 'my-project';
  const v = profile?.version ?? cfg.angular.version;
  const ngVersion = pkgVersion(v, `^${cfg.angular.version}.0.0`);
  const ts = profile?.typescript ? `~${profile.typescript}` : '~5.4.0';
  const rxjs = profile?.rxjs ? `~${profile.rxjs}` : '~7.8.0';
  const usesVitest = (profile?.testing ?? '').toLowerCase().includes('vitest');

  const deps: Record<string, string> = {
    '@angular/common': ngVersion,
    '@angular/compiler': ngVersion,
    '@angular/core': ngVersion,
    '@angular/forms': ngVersion,
    '@angular/platform-browser': ngVersion,
    '@angular/router': ngVersion,
    rxjs,
    tslib: '^2.3.0',
  };
  if (ssr) {
    deps['@angular/platform-server'] = ngVersion;
    deps['@angular/ssr'] = ngVersion;
    deps['express'] = '^5.1.0';
  }

  const devDeps: Record<string, string> = {
    '@angular/cli': ngVersion,
    '@angular/compiler-cli': ngVersion,
    typescript: ts,
  };
  if (ctx.standalone) {
    devDeps['@angular/build'] = ngVersion;
  } else {
    devDeps['@angular-devkit/build-angular'] = ngVersion;
  }
  if (ssr) {
    devDeps['@types/express'] = '^5.0.0';
  }
  if (cfg.developerTools.unit) {
    if (usesVitest) {
      devDeps['vitest'] = '^4.0.0';
      devDeps['jsdom'] = '^28.0.0';
    } else {
      devDeps['jasmine-core'] = '~5.1.0';
      devDeps['karma'] = '~6.4.0';
      devDeps['karma-chrome-launcher'] = '~3.2.0';
      devDeps['karma-coverage'] = '~2.2.0';
      devDeps['karma-jasmine'] = '~5.1.0';
      devDeps['karma-jasmine-html-reporter'] = '~2.1.0';
      devDeps['@types/jasmine'] = '~5.1.0';
    }
  }
  if (cfg.developerTools.eslint) {
    devDeps['@eslint/js'] = '^9.0.0';
    devDeps['angular-eslint'] = ngVersion;
    devDeps['eslint'] = '^9.0.0';
    devDeps['typescript-eslint'] = '^8.0.0';
  }
  if (cfg.developerTools.prettier) {
    devDeps['prettier'] = '^3.3.0';
  }

  const scripts: Record<string, string> = {};
  for (const name of ctx.npmScripts) {
    switch (name) {
      case 'start':
        scripts['start'] = 'ng serve';
        break;
      case 'build':
        scripts['build'] = 'ng build';
        break;
      case 'test':
        scripts['test'] = cfg.developerTools.unit ? 'ng test' : 'echo "no test runner configured" && exit 0';
        break;
      case 'lint':
        scripts['lint'] = 'ng lint';
        break;
      case 'format':
        scripts['format'] = "prettier --write \"src/**/*.{ts,html,scss,json}\"";
        break;
      case 'serve:ssr':
        scripts['serve:ssr'] = `node dist/${slug}/server/server.mjs`;
        break;
      default:
        if (name.startsWith('build:')) {
          const config = name.slice('build:'.length);
          scripts[name] = `ng build --configuration ${config}`;
        }
    }
  }

  const pkg = {
    name: slug,
    version: '0.0.0',
    private: true,
    scripts,
    dependencies: sortKeys(deps),
    devDependencies: sortKeys(devDeps),
  };
  return JSON.stringify(pkg, null, 2) + '\n';
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = obj[key];
  }
  return out;
}

function angularJson(ctx: TemplateContext): string {
  const { cfg, ssr, standalone } = ctx;
  const slug = cfg.project.slug || 'my-project';
  const sourceRoot = 'src';
  const stylePreprocessorOptions = { includePaths: ['src/styles'] };

  const architectBuild: Record<string, unknown> = standalone
    ? {
        builder: '@angular/build:application',
        options: {
          outputPath: `dist/${slug}`,
          index: 'src/index.html',
          browser: 'src/main.ts',
          polyfills: ['zone.js'],
          tsConfig: 'tsconfig.json',
          assets: [{ glob: '**/*', input: 'public' }],
          styles: ['src/styles.scss'],
          stylePreprocessorOptions,
          ...(ssr
            ? {
                server: 'src/main.server.ts',
                outputMode: 'server',
                ssr: { entry: 'src/server.ts' },
                prerender: cfg.rendering.prerender,
              }
            : {}),
        },
        configurations: buildConfigurations(ctx),
      }
    : {
        builder: '@angular-devkit/build-angular:browser',
        options: {
          outputPath: `dist/${slug}/browser`,
          index: 'src/index.html',
          main: 'src/main.ts',
          polyfills: ['zone.js'],
          tsConfig: 'tsconfig.json',
          assets: [{ glob: '**/*', input: 'public' }],
          styles: ['src/styles.scss'],
          stylePreprocessorOptions,
        },
        configurations: buildConfigurations(ctx),
      };

  const architect: Record<string, unknown> = {
    build: architectBuild,
    serve: {
      builder: standalone ? '@angular/build:dev-server' : '@angular-devkit/build-angular:dev-server',
      configurations: Object.fromEntries(
        cfg.environments.map((env) => [slugifyName(env.name), { buildTarget: `${slug}:build:${slugifyName(env.name)}` }]),
      ),
    },
  };

  if (cfg.developerTools.unit) {
    architect['test'] = standalone
      ? { builder: '@angular/build:unit-test', options: { tsConfig: 'tsconfig.json' } }
      : {
          builder: '@angular-devkit/build-angular:karma',
          options: { polyfills: ['zone.js', 'zone.js/testing'], tsConfig: 'tsconfig.json', assets: [{ glob: '**/*', input: 'public' }], styles: ['src/styles.scss'] },
        };
  }

  if (cfg.developerTools.eslint) {
    architect['lint'] = {
      builder: '@angular-eslint/builder:lint',
      options: { lintFilePatterns: ['src/**/*.ts', 'src/**/*.html'] },
    };
  }

  const project = {
    projectType: 'application',
    schematics: {
      '@schematics/angular:component': { style: 'scss', addTypeToClassName: true },
      '@schematics/angular:directive': { addTypeToClassName: true },
      '@schematics/angular:service': { addTypeToClassName: true },
    },
    root: '',
    sourceRoot,
    prefix: 'app',
    architect,
  };

  const config = {
    $schema: './node_modules/@angular/cli/lib/config/schema.json',
    version: 1,
    newProjectRoot: 'projects',
    projects: { [slug]: project },
  };

  return JSON.stringify(config, null, 2) + '\n';
}

function slugifyName(name: string): string {
  return (
    name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  );
}

function buildConfigurations(ctx: TemplateContext): Record<string, unknown> {
  const { cfg, ssr } = ctx;
  const configs: Record<string, unknown> = {};
  cfg.environments.forEach((env, index) => {
    const name = slugifyName(env.name);
    const isProduction = name === 'production';
    configs[name] = {
      ...(isProduction
        ? {
            budgets: cfg.developerTools.budgets
              ? [
                  { type: 'initial', maximumWarning: '500kB', maximumError: '1MB' },
                  { type: 'anyComponentStyle', maximumWarning: '4kB', maximumError: '8kB' },
                ]
              : undefined,
            outputHashing: 'all',
          }
        : { optimization: false, sourceMap: true }),
      fileReplacements: [
        {
          replace: 'src/environments/environment.ts',
          with: `src/environments/environment.${name}.ts`,
        },
      ],
      ...(ssr && index === 0
        ? {
            // Hard lesson: an empty `allowedHosts` makes the built SSR server
            // reject every request with HTTP 400. Real deploy domains should
            // be added to this list alongside localhost.
            security: { allowedHosts: ['localhost', '127.0.0.1'] },
          }
        : {}),
    };
  });
  if (!('development' in configs)) {
    configs['development'] = { optimization: false, sourceMap: true };
  }
  return configs;
}

function tsconfigJson(ctx: TemplateContext): string {
  const target = ctx.standalone ? 'ES2022' : 'ES2020';
  const config = {
    compileOnSave: false,
    compilerOptions: {
      baseUrl: '.',
      outDir: './dist/out-tsc',
      forceConsistentCasingInFileNames: true,
      strict: true,
      noImplicitOverride: true,
      noPropertyAccessFromIndexSignature: true,
      noImplicitReturns: true,
      noFallthroughCasesInSwitch: true,
      skipLibCheck: true,
      esModuleInterop: true,
      sourceMap: true,
      declaration: false,
      experimentalDecorators: true,
      moduleResolution: 'bundler',
      importHelpers: true,
      target,
      module: 'ES2022',
      lib: [target, 'dom'],
      paths: {
        [`@core/*`]: [`src/app/${ctx.resolved.coreDir}/*`],
        [`@shared/*`]: [`src/app/${ctx.resolved.sharedDir}/*`],
        [`@layout/*`]: [`src/app/${ctx.resolved.layoutFilesDir}/*`],
        [`@app/*`]: ['src/app/*'],
      },
    },
    angularCompilerOptions: {
      enableI18nLegacyMessageIdFormat: false,
      strictInjectionParameters: true,
      strictInputAccessModifiers: true,
      strictTemplates: true,
    },
    files: ['src/main.ts'],
    include: ['src/**/*.d.ts'],
  };
  return JSON.stringify(config, null, 2) + '\n';
}

function indexHtml(ctx: TemplateContext): string {
  const { cfg } = ctx;
  const name = cfg.project.name || 'App';
  const themeColorLight = cfg.theme.primaryColor;
  const themeColorDark = cfg.theme.secondaryColor;
  const storageKey = `${cfg.project.slug || 'app'}-theme`;
  return `<!doctype html>
<html lang="${cfg.localization.enabled ? cfg.localization.defaultLanguage : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(name)}</title>
  <base href="/" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <meta name="theme-color" content="${themeColorLight}" />
  <link rel="icon" type="image/x-icon" href="favicon.ico" />
  ${
    cfg.theme.supportDualMode
      ? `<script>
    // No-flash inline theme script — kept in sync with src/styles/_themes.scss
    // and core/theme/theme.model.ts's THEME_COLOR map (three-way sync point).
    (function () {
      try {
        var stored = localStorage.getItem('${storageKey}');
        var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '${themeColorDark}' : '${themeColorLight}';
      } catch (e) {}
    })();
  </script>`
      : ''
  }
</head>
<body>
  <app-root></app-root>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mainTs(ctx: TemplateContext): string {
  if (ctx.standalone) {
    return `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));
`;
  }
  return `import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
`;
}

function appComponentTs(ctx: TemplateContext): string {
  const { cfg, resolved } = ctx;
  const imports: string[] = ['RouterOutlet'];
  const importLines: string[] = [`import { RouterOutlet } from '@angular/router';`];
  importLines.push(`import { HeaderComponent } from '@layout/header/header.component';`);
  importLines.push(`import { FooterComponent } from '@layout/footer/footer.component';`);
  imports.push('HeaderComponent', 'FooterComponent');
  if (cfg.features.toast === 'customized') {
    importLines.push(`import { ToastComponent } from '@shared/ui/toast/toast.component';`);
    imports.push('ToastComponent');
  }
  const bodyLines: string[] = [];
  if (cfg.theme.supportDualMode) {
    importLines.push(`import { ThemeService } from '@core/theme/theme.service';`);
    bodyLines.push('  private readonly theme = inject(ThemeService);');
  }
  if (cfg.localization.enabled) {
    importLines.push(`import { LanguageService } from '@core/i18n/language.service';`);
    bodyLines.push('  private readonly lang = inject(LanguageService);');
  }

  return `// Generator Example
// Remove or replace this example when starting your application.
import { Component${bodyLines.length ? ', inject' : ''} } from '@angular/core';
${importLines.join('\n')}

@Component({
  selector: 'app-root',
  imports: [${imports.join(', ')}],
  templateUrl: './app.component.html',
})
export class AppComponent {
${bodyLines.join('\n')}
  // SSR-consistent data-theme / lang / dir attributes are applied by these
  // services' own effects — see ${resolved.coreDir}/theme and ${resolved.coreDir}/i18n.
}
`;
}

function appComponentHtml(ctx: TemplateContext): string {
  const { cfg } = ctx;
  return `<!-- Generator Example -->
<app-header />
<main>
  <router-outlet />
</main>
<app-footer />
${cfg.features.toast === 'customized' ? '<app-toast />\n' : ''}`;
}

function appConfigTs(ctx: TemplateContext): string {
  const { cfg } = ctx;
  const providers: string[] = [
    'provideBrowserGlobalErrorListeners()',
    'provideZonelessChangeDetection()',
    'provideRouter(routes)',
  ];
  const importLines = [
    `import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';`,
    `import { provideRouter } from '@angular/router';`,
    `import { routes } from './app.routes';`,
  ];
  if (ctx.ssr) {
    const hydrationCall =
      cfg.rendering.hydrationStrategy === 'event-replay'
        ? 'provideClientHydration(withEventReplay())'
        : 'provideClientHydration()';
    importLines.push(
      `import { provideClientHydration${cfg.rendering.hydrationStrategy === 'event-replay' ? ', withEventReplay' : ''} } from '@angular/platform-browser';`,
    );
    providers.push(hydrationCall);
  }
  return `${importLines.join('\n')}

export const appConfig: ApplicationConfig = {
  providers: [${providers.map((p) => `\n    ${p},`).join('')}\n  ],
};
`;
}

function appRoutesTs(): string {
  return `import { Routes } from '@angular/router';

export const routes: Routes = [];
`;
}

function appModuleTs(ctx: TemplateContext): string {
  const className = toClassName(ctx.cfg.project.slug || 'app');
  return `import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, AppRoutingModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class ${className}Module {}
`;
}

function appRoutingModuleTs(): string {
  return `import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
`;
}

function readmeMd(ctx: TemplateContext): string {
  const { cfg, profile, ssr } = ctx;
  const name = cfg.project.name || 'My Project';
  const featureLines: string[] = [];
  featureLines.push(`- Angular ${cfg.angular.version}${profile?.buildVerified ? ' (verified build)' : ' (capability-modeled, not independently build-tested by the generator)'}`);
  featureLines.push(`- Architecture: ${cfg.architecture.pattern}`);
  featureLines.push(`- Rendering: ${cfg.rendering.mode}${cfg.rendering.prerender ? ' + prerender' : ''}`);
  featureLines.push(`- Localization: ${cfg.localization.enabled ? cfg.localization.selectedLanguages.join(', ') : 'disabled'}`);
  featureLines.push(`- SEO: ${cfg.seo.enabled ? 'enabled' : 'disabled'}`);
  featureLines.push(`- Toast: ${cfg.features.toast}`);
  featureLines.push(`- Modal: ${cfg.features.modal}`);
  featureLines.push(`- Date picker: ${cfg.features.datePicker}`);

  const installLater: string[] = [];
  if (cfg.features.toast === 'install-later') {
    installLater.push(
      `- **Toast**: no toast implementation is generated. A common choice compatible with modern Angular is [\`ngx-toastr\`](https://www.npmjs.com/package/ngx-toastr) — check its README for the version matching Angular ${cfg.angular.version} before installing.`,
    );
  }
  if (cfg.features.modal === 'install-later') {
    installLater.push(
      `- **Modal**: no modal implementation is generated. Angular CDK's [\`Dialog\`](https://material.angular.io/cdk/dialog/overview) is a solid, framework-native choice — pin \`@angular/cdk\` to the same major as your Angular version.`,
    );
  }
  if (cfg.features.datePicker === 'install-later') {
    installLater.push(
      `- **Date picker**: no date-picker implementation exists in this generator's source material. Angular CDK's [\`Datepicker\`](https://material.angular.io/components/datepicker/overview) (via \`@angular/material\`) or a standalone package such as [\`ngx-daterangepicker-material\`](https://www.npmjs.com/package/ngx-daterangepicker-material) are common choices — verify the package's Angular ${cfg.angular.version} compatibility before installing, this was not verified by the generator.`,
    );
  }

  return `# ${name}

${cfg.project.description || 'Generated by the Angular Project Generator.'}

## Configuration

${featureLines.join('\n')}

## Install

\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

The \`--legacy-peer-deps\` flag is the documented default here, not a fallback
for a problem specific to this project: a standard Angular + Vitest peer
chain has a reproducible npm 10.9.x arborist failure on a fresh install
(\`Cannot read properties of null (reading 'edgesOut')\`), and the flag avoids it.

## Develop

\`\`\`bash
npm start
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`
${
  ssr
    ? `\n${ctx.npmScripts.includes('serve:ssr') ? '## Serve SSR\n\n```bash\nnpm run build\nnpm run serve:ssr\n```\n' : ''}`
    : ''
}
${installLater.length > 0 ? `## Features to install later\n\n${installLater.join('\n')}\n` : ''}
## Scripts

${ctx.npmScripts.map((s) => `- \`npm run ${s}\``).join('\n')}
`;
}

registerContentResolver((path, ctx) => {
  switch (path) {
    case 'package.json':
      return packageJson(ctx);
    case 'angular.json':
      return angularJson(ctx);
    case 'tsconfig.json':
      return tsconfigJson(ctx);
    case 'README.md':
      return readmeMd(ctx);
    case 'src/index.html':
      return indexHtml(ctx);
    case 'src/main.ts':
      return mainTs(ctx);
    case 'src/app/app.component.ts':
      return appComponentTs(ctx);
    case 'src/app/app.component.html':
      return appComponentHtml(ctx);
    case 'src/app/app.config.ts':
      return appConfigTs(ctx);
    case 'src/app/app.routes.ts':
      return appRoutesTs();
    case 'src/app/app.module.ts':
      return appModuleTs(ctx);
    case 'src/app/app-routing.module.ts':
      return appRoutingModuleTs();
    default:
      return undefined;
  }
});
