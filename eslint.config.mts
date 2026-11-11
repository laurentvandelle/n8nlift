
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';

const noBarrelOrRelative = {
  patterns: [
    {
      group: ['./*', '../*', '../**', './**', '#/*', '#/**'],
      message: 'No relative import: use the @/ alias (@/functions/…, @/models/…).',
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'debug/**', 'eslint.config.mts'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.mts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Folded from the former .eslintrc.json.
      indent: ['error', 2],
      semi: ['warn', 'always'],
      'no-console': 'warn',
      'no-throw-literal': 'error',
      'no-warning-comments': 'off',
      'no-else-return': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-disabled-tests': 'warn',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', noBarrelOrRelative],
    },
  },
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
      },
      'boundaries/elements': [
        { type: 'functions', pattern: 'src/functions', partialMatch: false },
        { type: 'models', pattern: 'src/models', partialMatch: false },
        { type: 'libs', pattern: 'src/libs', partialMatch: false },
      ],
      'boundaries/files': [
        { category: 'test', pattern: '**/*.test.ts' },
        { category: 'entry', pattern: 'src/*.ts' },
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
            // 3. One allow per layer: itself plus the layers it may use.
            {
              from: { element: { type: 'models' } },
              allow: { to: { element: { type: 'models' } } },
            },
            {
              from: { element: { type: 'functions' } },
              allow: { to: { element: { type: ['functions', 'models'] } } },
            },
            {
              from: { element: { type: 'libs' } },
              allow: { to: { element: { type: 'libs' } } },
            },
            {
              from: { file: { categories: 'entry' } },
              allow: { to: { element: { type: ['functions', 'models', 'libs'] } } },
            },
            // 5. Test runner: nobody, then tests.
            {
              disallow: { to: { module: { source: 'vitest' } } },
              message: 'Production source does not import vitest.',
            },
            {
              from: { file: { categories: 'test' } },
              allow: { to: { module: { source: 'vitest' } } },
            },
          ],
        },
      ],
    },
  },
);
