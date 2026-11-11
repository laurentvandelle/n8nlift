# AGENTS.md — src

## Routing

- Before editing `src/cli/**`, read `src/cli/AGENTS.md`.
- Before editing `src/sdk/**`, read `src/sdk/AGENTS.md`.
- Before editing `src/core/**`, read `src/core/AGENTS.md`.

## Prohibitions

- Do not import from `debug/` or `dist/`.
- Layer direction: `cli` → `sdk`, `core`. `sdk` → `core`. `core` → `core` only. `npm run lint:check` (`eslint-plugin-boundaries`) enforces it.
- `bin.ts` imports only from `cli/`. `index.ts` re-exports only from `sdk/`.

## Shape

- `bin.ts` is the executable: it builds the `CommandContext` and hands `process.argv` to `runCli`.
- `index.ts` is the public API: the SDK only, under a `// SDK` comment.
- Imports across folders use the `@/` alias (`@/cli/cli.model`). Relative imports fail lint. `tsc-alias` rewrites the alias at build time; `vitest.config.mts` resolves it in tests.
- Type files are named `*.model.ts` and hold types only.
- Exported functions declare their return type (`@typescript-eslint/explicit-function-return-type`).

## Tests

- Tests sit next to the code as `*.test.ts`. Vitest only picks up `src/**/*.test.ts`.
- Import `describe`, `expect`, `test` from `vitest` explicitly.
- Each test is written as `// Given`, `// When`, `// Then` blocks, with a title starting with "Should".

## Example

- `src/cli/commands/version/version.command.ts` and `src/cli/commands/version/version.command.test.ts`
