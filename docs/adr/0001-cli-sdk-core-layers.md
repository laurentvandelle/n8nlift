# Split src into cli, sdk and core, with one folder per command

n8nlift is both a CLI (deploy, publish, status, secrets, sync) and a library users import to write workflows. `src/` is split into three layers: `cli/` (commands and their dispatch), `sdk/` (the only public API, re-exported from `src/index.ts`) and `core/` (logic shared by both, such as the n8n API client). Each command lives in its own folder `src/cli/commands/<name>/` with its code and its tests, is listed in one explicit registry, and receives its dependencies through an injected context, so commands stay isolated and testable with fakes. `eslint-plugin-boundaries` enforces the direction: cli → sdk, core; sdk → core; core → core; a command never imports another command.

## Considered options

- A flat `src/commands/` next to `functions/` and `models/`: less upfront structure, but the library and the CLI would mix and the split would have to happen later, under load.
- Separate npm packages for the CLI and the SDK: the cleanest boundary, but workspaces and two release cycles cost too much before the first real command exists.

## Consequences

- `runCli` and the CLI types are no longer public. `debug/` exercises the CLI by running `dist/bin.js`.
- Help text is generated from each command's definition, so adding a command means adding a folder and one line in `src/cli/registry.ts`.
