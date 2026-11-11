# Architecture

Operational rules for agents live in `AGENTS.md`. This file is background.

## Intent

`n8nlift` is a command-line tool and a library, written in TypeScript and published to npm with its own type declarations. Users write n8n workflows in code with the library, and the CLI turns them into deployments on their n8n instance. For now the CLI only has `help` and `version`. The real commands (deploy, publish, status, secrets, sync) come in later work.

## Modules

- `src/bin.ts` — the `n8nlift` executable (`bin` in `package.json`). Reads the version from `package.json`, builds the command context and hands `process.argv` to `runCli`.
- `src/index.ts` — the package entry point. Re-exports the SDK only.
- `src/cli/` — the CLI: `run-cli.ts` (dispatch), `registry.ts` (the list of commands), `cli.model.ts` (contracts) and `commands/<name>/`, one folder per command.
- `src/sdk/` — what users import to write workflows. Empty for now.
- `src/core/` — logic shared by the CLI and the SDK, one folder per concern. Empty for now.
- `debug/` — a separate npm package that depends on `file:../dist` and runs the built `dist/bin.js`, used to try the CLI as a user would.

Why this split: `docs/adr/0001-cli-sdk-core-layers.md`.

## Boundaries

- `cli` may import `sdk` and `core`. `sdk` may import `core`. `core` imports only itself.
- A command imports only its own folder, the CLI contracts, `core` and `sdk`. Never another command.
- Commands get the outside world through the injected `CommandContext` and return a `CliResult`. `bin.ts` does the I/O.
- `debug/` sees only the published surface in `dist/`, never `src/`.

`eslint-plugin-boundaries` in `eslint.config.mts` enforces the `src/` rules.

## Runtime

`npm run build` compiles `src/` with `tsc` (module `node20`, target `ES2024` for Node 24, CommonJS output since `package.json` has no `"type"`) into `dist/`, emitting `.d.ts` and source maps. `tsc-alias` then rewrites `@/` imports to relative paths. `package.json` points `main` at `dist/index.js` and `types` at `dist/index.d.ts`. `npm start` builds, then runs `debug/main.ts` with `node` (Node 24 strips TypeScript types natively).

## Out of scope

No runtime dependencies, no bundler, no ESM dual build.
