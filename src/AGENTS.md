# AGENTS.md — src

## Routing

- Before editing `src/cli/**`, read `src/cli/AGENTS.md`.
- Before editing `src/core/**`, read `src/core/AGENTS.md`.

## Prohibitions

- Do not import from `debug/` or `dist/`.
- Layer direction: `cli` → `core`. `core` never imports `cli`. `npm run lint:check` (`eslint-plugin-boundaries`) enforces it.
- `bin.ts` imports only from `cli/`. `index.ts` exports nothing yet; the CLI is not a public API.

## Shape

- `bin.ts` is the executable: it builds the `CommandContext` and hands `process.argv` to `runCli`.
- `index.ts` is the package entry point. It stays empty until the package needs a user-facing type.
- Imports across folders use the `#src/` alias (`#src/cli/cli.model`). Relative imports fail lint. Node resolves the alias at runtime through `package.json` `imports` (`#src/*` → `./dist/*.js`). `tsconfig.json` `paths` maps it to `src/` for type-checking and lint, and `vitest.config.mts` maps it in tests. The alias must start with `#`: Node rejects other prefixes such as `@/`.
- Type files are named `*.model.ts` and hold types only.
- Exported functions declare their return type (`@typescript-eslint/explicit-function-return-type`).

## Tests

- Tests sit next to the code as `*.test.ts`. Vitest only picks up `src/**/*.test.ts`.
- Import `describe`, `expect`, `test` from `vitest` explicitly.
- Each test is written as `// Given`, `// When`, `// Then` blocks, with a title starting with "Should".

## Example

- `src/cli/commands/version/version.command.ts` and `src/cli/commands/version/version.command.test.ts`
