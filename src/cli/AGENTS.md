# AGENTS.md — src/cli

## Prohibitions

- A command never imports another command. It may import its own folder, `#src/cli/*.model.ts` and `core/`. Lint enforces this.
- A command does no I/O of its own: no `process`, no `console`, no direct network or file access. `run` returns a `Promise<CliResult>`; `bin.ts` writes it. Anything a command needs from the outside world is a field of `CommandContext`, added by the first command that needs it. It carries `env`, `dotEnv` (the raw text of `./.env`), `nodeVersion`, `fetch` and `loadWorkflowFiles` (the `*.workflow.ts` and `*.json` files under a folder) today.

## Shape

- One folder per command: `commands/<name>/<name>.command.ts` exports `<name>Command: CommandDefinition`, next to `<name>.command.test.ts`. Add `<name>.model.ts` only once the command has its own types.
- Register every command in `registry.ts`. It is the only list of commands.
- `run-cli.ts` dispatches: global `-h/--help` and `-v/--version` aliases, command lookup, option parsing with `node:util` `parseArgs` from the command's `options`, and `<command> --help`.
- Help text is generated from the definitions (`commands/help/help.command.ts`). Do not hand-write help strings.
- CLI contracts (`CliResult`, `CommandDefinition`, `CommandContext`) live in `cli.model.ts`.

## Tests

- Await `<name>Command.run(input, ctx)` directly with a context from `fakeContext()` (`cli/cli.fake.ts`). Use fakes, not `vi.mock`. A fake `fetch` stands in for the network.
- Dispatch behavior is tested in `run-cli.test.ts`, with a fake command when the real ones do not cover the case.

## Example

- `src/cli/commands/help/help.command.ts` and `src/cli/commands/help/help.command.test.ts`
