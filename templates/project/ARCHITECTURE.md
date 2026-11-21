# Architecture

Operational rules for agents live in `AGENTS.md`. This file is background.

## Intent

Keep n8n workflows as typed files under version control, and deliver them to one or more n8n instances with Boilerlift (`lift`).

## Modules

- `boilerlift.config.ts`: the targets. Each target names an n8n `url`, an `apiKey` read from the environment, and the `workflows` folder it delivers.
- `workflows/`: one workflow per file. The file name is the workflow's stable name.
- `code/`: the JavaScript of Code nodes, one function per file, tested with Vitest. `package.json` maps `#code/*` to these files, so Node, TypeScript, ESLint and Vitest all resolve the same specifier.
- `credentials/<target>.ts`: written by `lift creds sync`, the credentials each target's instance holds.
- `boilerlift.lock.json`: written by `lift deploy`, the link between each stable name and its n8n id.

## Boundaries

Workflow files import from `boilerlift` and from `code/`. A `code/` file imports no value at all: its function's source text runs inside n8n. Only tests import `vitest`. Nothing imports a workflow file: `lift` loads them. `npm run lint` enforces these with `eslint-plugin-boundaries` and `no-restricted-syntax`.

## Runtime

`lift` reads `.env`, loads `boilerlift.config.ts`, then imports every workflow file of a target with Node's native TypeScript support, which evaluates each `fn.toString()` into a Code node's `jsCode`. `lift deploy` sends them to n8n as drafts; `lift publish` makes the drafts live.

## Out of scope

Running workflows. n8n runs them; this project only defines and delivers them.
