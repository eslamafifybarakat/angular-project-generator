import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';

/** `shared/utils/slugify.ts` and the `layout/header`/`layout/footer` shell
 * components — always generated regardless of architecture, per
 * `deriveFiles()`. Header/footer use inline templates for the same reason
 * as the toast/modal components (see `features.templates.ts`). */

function slugifyTs(): string {
  return `const COMBINING_MARKS = /[\\u0300-\\u036f]/g;

/** Lowercases, strips diacritics/punctuation, and hyphenates — pure
 * function, no framework dependency, usable from any layer. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
`;
}

function headerComponentTs(ctx: TemplateContext): string {
  const { cfg } = ctx;
  const name = cfg.project.name || 'App';
  const hasTheme = cfg.theme.supportDualMode;
  const hasLang = cfg.localization.enabled;
  const imports: string[] = ['RouterLink'];
  const importLines = [`import { RouterLink } from '@angular/router';`];
  const inject: string[] = [];
  if (hasTheme) {
    importLines.push(`import { ThemeService } from '@core/theme/theme.service';`);
    inject.push('  protected readonly theme = inject(ThemeService);');
  }
  if (hasLang) {
    importLines.push(`import { LanguageService } from '@core/i18n/language.service';`);
    inject.push('  protected readonly language = inject(LanguageService);');
  }
  return `import { ChangeDetectionStrategy, Component${inject.length ? ', inject' : ''} } from '@angular/core';
${importLines.join('\n')}

@Component({
  selector: 'app-header',
  imports: [${imports.join(', ')}],
  template: \`
    <header class="site-header">
      <a routerLink="/" class="brand">${escapeTemplate(name)}</a>
      <nav>
${hasTheme ? '        <button type="button" (click)="theme.toggle()">Toggle theme</button>\n' : ''}${hasLang ? '        <span>{{ language.lang() }}</span>\n' : ''}      </nav>
    </header>
  \`,
  styles: \`
    .site-header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-md, 1rem); border-block-end: 1px solid var(--line, #2a323d); }
    .brand { font-weight: 600; color: var(--text, inherit); text-decoration: none; }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {
${inject.join('\n')}
}
`;
}

function escapeTemplate(value: string): string {
  return value.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function footerComponentTs(ctx: TemplateContext): string {
  const name = ctx.cfg.project.name || 'App';
  const year = new Date().getFullYear();
  return `import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: \`
    <footer class="site-footer">
      <p>&copy; ${year} ${escapeTemplate(name)}</p>
    </footer>
  \`,
  styles: \`
    .site-footer { padding: var(--space-md, 1rem); text-align: center; color: var(--muted, inherit); }
  \`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent {}
`;
}

registerContentResolver((path, ctx) => {
  if (path.endsWith('/utils/slugify.ts')) return slugifyTs();
  if (path.endsWith('/header/header.component.ts')) return headerComponentTs(ctx);
  if (path.endsWith('/footer/footer.component.ts')) return footerComponentTs(ctx);
  return undefined;
});
