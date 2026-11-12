import { CommandDefinition, CommandOption } from '#src/cli/cli.model';

const HELP_OPTION: CommandOption = { type: 'boolean', short: 'h', description: 'Show this help' };
const VERSION_OPTION: CommandOption = { type: 'boolean', short: 'v', description: 'Print the n8nlift version' };

export const helpCommand: CommandDefinition = {
  name: 'help',
  summary: 'Show help for n8nlift or for one command',
  usage: 'n8nlift help [command]',
  allowPositionals: true,
  options: {},
  run: ({ positionals }, ctx) => {
    const [target] = positionals;
    if (target === undefined) {
      return { exitCode: 0, stdout: renderGlobalHelp(ctx.registry), stderr: '' };
    }
    const command = ctx.registry.find((candidate) => candidate.name === target);
    if (command === undefined) {
      return { exitCode: 1, stdout: '', stderr: `Unknown command: ${target}\n\n${renderGlobalHelp(ctx.registry)}` };
    }
    return { exitCode: 0, stdout: renderCommandHelp(command), stderr: '' };
  },
};

export function renderGlobalHelp(registry: readonly CommandDefinition[]): string {
  const commands = table(registry.map((command) => [command.name, command.summary]));
  const options = table(optionRows({ help: HELP_OPTION, version: VERSION_OPTION }));
  return `Usage: n8nlift <command> [options]

Write n8n workflows in TypeScript, test them, and lift them from dev to prod.

Commands:
${commands}
Coming: deploy, publish, status, secrets, sync

Options:
${options}
Run \`n8nlift help <command>\` for the options of one command.
`;
}

export function renderCommandHelp(command: CommandDefinition): string {
  const options = table(optionRows({ ...command.options, help: HELP_OPTION }));
  return `Usage: ${command.usage}

${command.summary}

Options:
${options}`;
}

function optionRows(options: Record<string, CommandOption>): string[][] {
  return Object.entries(options).map(([name, option]) => {
    const flag = option.short === undefined ? `    --${name}` : `-${option.short}, --${name}`;
    const value = option.type === 'string' ? ` <${name}>` : '';
    return [`${flag}${value}`, option.description];
  });
}

function table(rows: string[][]): string {
  const width = Math.max(...rows.map(([left]) => left.length));
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}\n`).join('');
}
