import { parseArgs } from 'node:util';
import { CliResult, CommandContext, CommandDefinition } from '@/cli/cli.model';
import { renderCommandHelp, renderGlobalHelp } from '@/cli/commands/help/help.command';

const GLOBAL_ALIASES: Record<string, string> = {
  '-h': 'help',
  '--help': 'help',
  '-v': 'version',
  '--version': 'version',
};

export function runCli(args: string[], ctx: CommandContext): CliResult {
  const [first = '--help', ...rest] = args;
  const name = GLOBAL_ALIASES[first] ?? first;
  if (name.startsWith('-')) {
    return failure(`Unknown option: ${name}`, renderGlobalHelp(ctx.registry));
  }
  const command = ctx.registry.find((candidate) => candidate.name === name);
  if (command === undefined) {
    return failure(`Unknown command: ${name}`, renderGlobalHelp(ctx.registry));
  }
  return runCommand(command, rest, ctx);
}

function runCommand(command: CommandDefinition, args: string[], ctx: CommandContext): CliResult {
  try {
    const options = Object.fromEntries(
      Object.entries(command.options).map(([name, { type, short }]) => [name, { type, short }]),
    );
    const { values, positionals } = parseArgs({
      args,
      strict: true,
      allowPositionals: command.allowPositionals,
      options: { ...options, help: { type: 'boolean', short: 'h' } },
    });
    if (values.help === true) {
      return { exitCode: 0, stdout: renderCommandHelp(command), stderr: '' };
    }
    return command.run({ positionals, values }, ctx);
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error), renderCommandHelp(command));
  }
}

function failure(reason: string, help: string): CliResult {
  return { exitCode: 1, stdout: '', stderr: `${reason}\n\n${help}` };
}
