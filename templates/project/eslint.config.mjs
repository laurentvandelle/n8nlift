// @ts-check
// `npm run lint`: the import style and the boundaries between workflows/ and code/.

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import boundaries from 'eslint-plugin-boundaries';

const noRelative = {
  patterns: [
    {
      group: ['./*', '../*', '../**', './**'],
      message: 'No relative import: import a Code node function through #code/<name>.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', 'credentials/**', 'eslint.config.mjs'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['workflows/**/*.ts', 'code/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', noRelative],
    },
  },
  {
    // A Code node function runs inside n8n, from its source text: its file imports no value, not even another code/ file.
    files: ['code/**/*.ts'],
    ignores: ['code/**/*.test.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportDeclaration[importKind!='type']",
          message: 'A Code node function runs inside n8n: its file imports nothing (import type is fine).',
        },
      ],
    },
  },
  {
    files: ['boilerlift.config.ts', 'workflows/**/*.ts', 'code/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
      'boundaries/elements': [
        { type: 'workflows', pattern: 'workflows', partialMatch: false },
        { type: 'code', pattern: 'code', partialMatch: false },
      ],
      'boundaries/files': [
        { category: 'test', pattern: '**/*.test.ts' },
        { category: 'entry', pattern: '*.ts' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          checkAllOrigins: true,
          checkUnknownLocals: true,
          policies: [
            // 1. npm packages and Node core: allowed unless a later policy says otherwise.
            { allow: { to: { module: { origin: ['external', 'core'] } } } },
            // 2. A workflow uses the Code node functions.
            {
              from: { element: { type: 'workflows' } },
              allow: { to: { element: { type: 'code' } } },
            },
            // 3. Test runner: nobody, then tests.
            {
              disallow: { to: { module: { source: 'vitest' } } },
              message: 'Only a test imports vitest.',
            },
            {
              from: { file: { categories: 'test' } },
              allow: { to: { module: { source: 'vitest' } } },
            },
            // 4. A test imports the function it tests.
            {
              from: { file: { categories: 'test' } },
              allow: { to: { element: { type: 'code' } } },
            },
          ],
        },
      ],
    },
  },
);
