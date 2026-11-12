# AGENTS.md — src/core

## Prohibitions

- `core/` never imports from `cli/`. Lint enforces this.
- `compile/` imports only `compile/` and shared `core/` folders. It never imports `deliver/`.
- `deliver/` may import `compile/` (to read what it produces) and shared `core/` folders.
- A shared `core/` folder (for example `config/`) imports neither `compile/` nor `deliver/`.

## Shape

- `compile/` turns workflow code into n8n workflow JSON. No network.
- `deliver/` sends compiled workflows to the user's n8n instance, through the n8n public API, as drafts.
- Shared concerns get their own folder next to them, created by the first code that needs them: `config/` (connection config from env and `.env`), `n8n/` (the n8n client), `connection/` (the checks behind `ping`).
- Each folder holds its code, its tests and its `*.model.ts`. `compile/` and `deliver/` are empty for now (`.gitkeep`).

## Tests

- Tests sit next to the code as `*.test.ts`, like the rest of `src/`.
- `deliver/` and `connection/` tests use a fake n8n client, never a real instance. `n8n/` tests use a fake `fetch`.
