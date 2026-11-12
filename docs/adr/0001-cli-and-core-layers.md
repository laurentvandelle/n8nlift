# Split src into cli and core, with one folder per command

n8nlift is a CLI only: it compiles workflows written in TypeScript into n8n JSON and delivers them to the user's n8n instance. Node definitions do not live in this repository. `src/` has two layers: `cli/` (commands and their dispatch) and `core/` (the work behind them). Inside `core/`, `compile/` and `deliver/` are separate stages: `deliver/` may read what `compile/` produces, `compile/` never knows about delivery, and other `core/` folders are shared helpers that know neither stage. Each command lives in its own folder `src/cli/commands/<name>/` with its code and its tests, is listed in one explicit registry, and receives its dependencies through an injected context, so commands stay isolated and testable with fakes. `eslint-plugin-boundaries` enforces these directions, and a command never imports another command.

## Considered options

- A flat `src/commands/` next to `functions/` and `models/`: less upfront structure, but command code and compile/deliver logic would mix and the split would have to happen later, under load.
- A library layer (`sdk/`) for node factories in this package: dropped, because nodes are not part of this repository.

## Consequences

- `runCli` and the CLI types are not public. `src/index.ts` exports nothing yet. `debug/` exercises the CLI by running `dist/bin.js`.
- Help text is generated from each command's definition, so adding a command means adding a folder and one line in `src/cli/registry.ts`.
