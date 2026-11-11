# AGENTS.md — src/core

## Prohibitions

- `core/` imports only from `core/`, npm packages and Node core. Never from `cli/` or `sdk/`. Lint enforces this.
- Nothing in `core/` is exported from `src/index.ts`. The SDK re-exports what users need.

## Shape

- One folder per concern, for example `core/n8n-api/` or `core/config/`, each with its code, its tests and its `*.model.ts`.
- Empty for now (`.gitkeep`). The first command or SDK feature that needs shared logic creates the first folder.

## Tests

- Tests sit next to the code as `*.test.ts`, like the rest of `src/`.
