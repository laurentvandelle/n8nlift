# AGENTS.md

Instructions for every coding agent. Humans read `README.md` and `ARCHITECTURE.md`.

## Role

This repository is `n8nlift`, a TypeScript CLI published to npm that validates typed workflow files and delivers them to n8n. Source lives in `src/`: the `n8nlift` command starts in `src/bin.ts`; `src/index.ts` is the package entry point and exports `defineWorkflow` and the workflow types. `debug/` runs the built `dist/bin.js` like an external user.

## Commands

Local setup: see `README.md`. Package manager: npm (`package-lock.json`).

| Task                                            | Command                |
| ----------------------------------------------- | ---------------------- |
| Build (`tsc` into `dist/`)                       | `npm run build`        |
| Build, then run `debug/main.ts` against `dist/` | `npm start`            |
| Run tests (Vitest)                              | `npm run test`         |
| Tests in watch mode                             | `npm run test:watch`   |
| Lint, check only                                | `npm run lint:check`   |
| Lint with autofix                               | `npm run lint`         |
| Type-check, no emit                             | `npm run typecheck`    |
| Lint check, type-check, tests                   | `npm run verify`       |
| Bump patch version, verify, build, publish      | `npm run pub`          |

Run `npm run verify` before handing work back.
Never hand back a failure: fix it, then run the command again.

`npm run pub` bumps the version and publishes to npm. Never run it unless the user asks.

## Routing

- Before editing `src/**`, read `src/AGENTS.md`.
- Before adding a dependency or crossing a module boundary, read `ARCHITECTURE.md`.
- Before naming a domain concept, read `CONTEXT.md`.
- Before writing an architecture decision, read `docs/adr/README.md`.
- Before changing these instruction files, read `docs/agents.md`.
- Before treating a convention as enforced, read `docs/guardrails.md`.
- Before adding a convention after review, read `docs/maintenance.md`.

## Non-negotiables

1. The `AGENTS.md` closest to the file being changed wins over the root file.
2. The code is the source of truth. When a document and the code disagree, report the gap. Do not invent a reconciliation in the same task.
3. A rule lives in one file. Local rules live in the nearest `AGENTS.md`. The root file keeps shared rules only.

- Do not edit `dist/`. It is build output from `npm run build`.

## Boundaries

- `debug/` uses only the built `dist/` (it runs `dist/bin.js` and depends on `n8nlift` as `file:../dist`). It never imports from `src/`.
- `src/` never imports from `debug/`.

No check enforces these. `tsconfig.json` excludes `debug/` and ESLint ignores it. Boundaries inside `src/` are in `src/AGENTS.md`.

## Maintenance

Instruction files are code and drift without upkeep.
Before adding or changing a rule after review, read `docs/maintenance.md`.
