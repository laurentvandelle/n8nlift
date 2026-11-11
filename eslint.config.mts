
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';
import boundaries from 'eslint-plugin-boundaries';

const noBarrelOrRelative = {
  patterns: [
    {
      group: ['./*', '../*', '../**', './**', '#/*', '#/**'],
      message: 'No relative import: use the @/ alias (@/cli/…, @/core/…, @/sdk/…).',
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
        tsconfigRootDir: new URL('.', import.meta.url).pathname,
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
        { type: 'cli-command', pattern: 'src/cli/commands/*', capture: ['name'] },
        { type: 'cli', pattern: 'src/cli' },
        { type: 'sdk', pattern: 'src/sdk' },
        { type: 'core', pattern: 'src/core' },
      ],
      'boundaries/files': [
        { category: 'test', pattern: '**/*.test.ts' },
        { category: 'cli-model', pattern: 'src/cli/*.model.ts' },
        { category: 'bin', pattern: 'src/bin.ts' },
        { category: 'index', pattern: 'src/index.ts' },
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
              from: { element: { type: 'core' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'sdk' } },
              allow: { to: { element: { type: ['sdk', 'core'] } } },
            },
            {
              // A command sees only itself, the CLI contracts (cli/*.model.ts), core and sdk. Never another command.
              from: { element: { type: 'cli-command' } },
              allow: { to: { element: { type: ['core', 'sdk'] } } },
            },
            {
              from: { element: { type: 'cli-command' } },
              allow: { to: { file: { categories: 'cli-model' } } },
            },
            {
              from: { element: { type: 'cli-command' } },
              allow: {
                to: { element: { type: 'cli-command', captured: { name: '{{ from.element.captured.name }}' } } },
              },
            },
            {
              from: { element: { type: 'cli' } },
              allow: { to: { element: { type: ['cli', 'cli-command', 'core', 'sdk'] } } },
            },
            // 4. Entry points: bin runs the CLI, index exposes the SDK only.
            {
              from: { file: { categories: 'bin' } },
              allow: { to: { element: { type: 'cli' } } },
            },
            {
              from: { file: { categories: 'index' } },
              allow: { to: { element: { type: 'sdk' } } },
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
