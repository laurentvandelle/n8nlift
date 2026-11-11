export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CommandOption {
  type: 'boolean' | 'string';
  short?: string;
  description: string;
}

export interface CommandInput {
  positionals: string[];
  values: Record<string, string | boolean | undefined>;
}

export interface CommandContext {
  version: string;
  registry: readonly CommandDefinition[];
}

export interface CommandDefinition {
  name: string;
  summary: string;
  usage: string;
  allowPositionals: boolean;
  options: Record<string, CommandOption>;
  run(input: CommandInput, ctx: CommandContext): CliResult;
}
