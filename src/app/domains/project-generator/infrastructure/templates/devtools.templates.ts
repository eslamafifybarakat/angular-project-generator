import { registerContentResolver } from './content-registry';
import type { TemplateContext } from './template-context.model';

function eslintConfigJs(ctx: TemplateContext): string {
  if (!ctx.standalone) {
    return `// Legacy (NgModule-era) Angular versions predate angular-eslint's flat-config
// package line — use a .eslintrc.json with "plugin:@angular-eslint/recommended"
// instead of this flat config for this Angular version.
module.exports = {};
`;
  }
  return `// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
);
`;
}

function prettierrc(): string {
  return (
    JSON.stringify(
      {
        printWidth: 100,
        singleQuote: true,
        overrides: [{ files: '*.html', options: { parser: 'angular' } }],
      },
      null,
      2,
    ) + '\n'
  );
}

function editorconfig(): string {
  return `root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
`;
}

registerContentResolver((path, ctx) => {
  if (path === 'eslint.config.js') return eslintConfigJs(ctx);
  if (path === '.prettierrc') return prettierrc();
  if (path === '.editorconfig') return editorconfig();
  return undefined;
});
