# AGENTS.md — src

## Prohibitions

- Do not import from `debug/` or `dist/`.
- Do not put runtime code in `models/`. It holds exported types only.
- `models/` does not import from `functions/`.

## Shape

- `functions/` holds exported functions. `models/` holds exported types. `libs/` is an empty placeholder (`.gitkeep`).
- Every public symbol is re-exported from `index.ts`, grouped under `// Functions` and `// Models` comments.
- Imports across folders use the `@/` alias (`@/models/cli.model`). `tsc-alias` rewrites it at build time; `vitest.config.mts` resolves it in tests.
- Type files are named `*.model.ts`.
- Exported functions declare their return type (`@typescript-eslint/explicit-function-return-type`).

## Tests

- Tests sit next to the code as `*.test.ts`. Vitest only picks up `src/**/*.test.ts`.
- Import `describe`, `expect`, `test` from `vitest` explicitly.
- Each test is written as `// Given`, `// When`, `// Then` blocks, with a title starting with "Should".

## Example

- `src/functions/run-cli.ts` and `src/functions/run-cli.test.ts`
