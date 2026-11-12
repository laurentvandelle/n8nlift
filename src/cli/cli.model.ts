import { WorkflowFile } from '#src/core/compile/workflow.model';

export type { WorkflowFile };

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
  /**
   * Reads every `*.workflow.ts` and `*.json` file under `dir`, recursively. Paths are relative to the
   * current folder. Resolves `[]` when `dir` does not exist. A file that cannot be parsed or imported
   * comes back with an `error` instead of `content`.
   */
  loadWorkflowFiles(dir: string): Promise<WorkflowFile[]>;
}

export interface CommandDefinition {
  name: string;
  summary: string;
  usage: string;
  allowPositionals: boolean;
  options: Record<string, CommandOption>;
  run(input: CommandInput, ctx: CommandContext): Promise<CliResult>;
}
