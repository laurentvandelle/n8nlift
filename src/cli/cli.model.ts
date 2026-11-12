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
  env: Readonly<Record<string, string | undefined>>;
  /** Raw text of `./.env`, or `undefined` when there is no file. */
  dotEnv: string | undefined;
  nodeVersion: string;
  fetch: typeof fetch;
}

export interface CommandDefinition {
  name: string;
  summary: string;
  usage: string;
  allowPositionals: boolean;
  options: Record<string, CommandOption>;
  run(input: CommandInput, ctx: CommandContext): Promise<CliResult>;
}
