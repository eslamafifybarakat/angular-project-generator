// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', '.angular/**', 'out-tsc/**', 'node_modules/**', 'public/og/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'app', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'app', style: 'kebab-case' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // No barrels: every cross-file import goes through an explicit file
      // path. This bans the barrel file itself rather than the aliases —
      // '@core/theme/theme.service' is the intended shape, '@core' or
      // '@core/index' is not.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/index', '**/index.ts', '**/index.js'],
              message: 'Import the file directly (e.g. @core/theme/theme.service) — no barrels.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {},
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [eslint.configs.recommended],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);
