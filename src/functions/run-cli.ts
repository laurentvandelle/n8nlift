import { parseArgs } from 'node:util';
import { CliResult } from '@/models/cli.model';

export const HELP_TEXT = `Usage: n8nlift <command> [options]

Write n8n workflows in TypeScript, test them, and lift them from dev to prod.

Commands:
  (none yet: deploy, publish, status, secrets and sync are coming)

Options:
  -h, --help     Show this help
  -v, --version  Print the n8nlift version
`;

export function runCli(args: string[], version: string): CliResult {
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    });

    const [command] = positionals;
    if (command !== undefined) {
      return failure(`Unknown command: ${command}`);
    }
    if (values.version) {
      return { exitCode: 0, stdout: `${version}\n`, stderr: '' };
    }
    return { exitCode: 0, stdout: HELP_TEXT, stderr: '' };
  } catch (error) {
    return failure(error instanceof Error ? error.message : String(error));
  }
}

function failure(reason: string): CliResult {
  return { exitCode: 1, stdout: '', stderr: `${reason}\n\n${HELP_TEXT}` };
}
