# AGENTS.md — src/sdk

## Prohibitions

- `sdk/` imports only from `sdk/`, `core/`, npm packages and Node core. Never from `cli/`. Lint enforces this.

## Shape

- `sdk/` is what users import to write workflows: typed node factories and reusable blocks.
- Every public symbol is re-exported from `src/index.ts` under the `// SDK` comment. Nothing else is public.
- Empty for now (`.gitkeep`). The first node factory creates the first folder.

## Tests

- Tests sit next to the code as `*.test.ts`, like the rest of `src/`.
