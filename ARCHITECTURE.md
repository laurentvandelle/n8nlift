# Architecture

Operational rules for agents live in `AGENTS.md`. This file is background.

## Intent

`n8nlift` is a command-line tool written in TypeScript and published to npm. It compiles n8n workflows written as TypeScript into n8n workflow JSON and delivers them to the user's n8n instance. Node definitions are not part of this repository. For now the CLI only has `help` and `version`. The real commands (deploy, publish, status, secrets, sync) come in later work.

## Modules

- `src/bin.ts` — the `n8nlift` executable (`bin` in `package.json`). Reads the version from `package.json`, builds the command context and hands `process.argv` to `runCli`.
- `src/index.ts` — the package entry point. Exports nothing yet.
- `src/cli/` — the CLI: `run-cli.ts` (dispatch), `registry.ts` (the list of commands), `cli.model.ts` (contracts) and `commands/<name>/`, one folder per command.
- `src/core/` — the work behind the commands: `compile/` (workflow code → n8n JSON) and `deliver/` (push to n8n as drafts), plus shared folders as they appear. Empty for now.
- `debug/` — a separate npm package that depends on `file:../dist` and runs the built `dist/bin.js`, used to try the CLI as a user would.

Why this split: `docs/adr/0001-cli-and-core-layers.md`.

## Boundaries

- `cli` may import `core`. `core` never imports `cli`.
- `deliver` may import `compile`. `compile` never imports `deliver`. Shared `core/` folders import neither.
- A command imports only its own folder, the CLI contracts and `core`. Never another command.
- Commands get the outside world through the injected `CommandContext` and return a `CliResult`. `bin.ts` does the I/O.
- `debug/` sees only the published surface in `dist/`, never `src/`.

`eslint-plugin-boundaries` in `eslint.config.mts` enforces the `src/` rules.

## Runtime

`npm run build` compiles `src/` with `tsc` (module `node20`, target `ES2024` for Node 24, CommonJS output since `package.json` has no `"type"`) into `dist/`, emitting `.d.ts` and source maps. Imports keep the `#src/` alias in `dist/`: Node resolves it at runtime through the `imports` field of `package.json` (`#src/*` → `./dist/*.js`), so no rewrite step runs. `package.json` points `main` at `dist/index.js` and `types` at `dist/index.d.ts`. `npm start` builds, then runs `debug/main.ts` with `node` (Node 24 strips TypeScript types natively).

## Out of scope

No runtime dependencies, no bundler, no ESM dual build.
