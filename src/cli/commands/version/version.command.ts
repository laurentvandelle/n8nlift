import { CommandDefinition } from '@/cli/cli.model';

export const versionCommand: CommandDefinition = {
  name: 'version',
  summary: 'Print the n8nlift version',
  usage: 'n8nlift version',
  allowPositionals: false,
  options: {},
  run: (_input, ctx) => ({ exitCode: 0, stdout: `${ctx.version}\n`, stderr: '' }),
};
