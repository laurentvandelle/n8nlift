import { CliResult, CommandDefinition } from '#src/cli/cli.model';
import { loadWorkflows } from '#src/core/compile/load-workflows';
import { LoadProblem } from '#src/core/compile/workflow.model';
import { resolveConnectionConfig } from '#src/core/config/connection-config';
import { EXIT_MISSING_CONFIG, describeMissingConfig } from '#src/core/config/missing-config';
import { deploy } from '#src/core/deliver/deploy';
import { DeployAction, DeployReport, DeployResult } from '#src/core/deliver/deploy.model';
import { createN8nClient } from '#src/core/n8n/n8n-client';

const WORKFLOWS_DIR = 'workflows';
const EXIT_INVALID_FILES = 1;

const USAGE = `n8nlift deploy [--json]

Delivers every workflow under ./workflows (*.workflow.ts with a default export, or *.json),
pasted from an n8n export, to your n8n instance:
  new workflows are created (never published) and tagged n8nlift:<stable-name>,
  changed workflows are updated as drafts: the published version keeps running,
  unchanged workflows are skipped.
The stable name is the file name without .workflow.ts / .json: 1 to 16 of a-z, 0-9 and -.

Reads N8N_URL and N8N_API_KEY like n8nlift ping.

Exit codes:
  0  Every workflow delivered, or nothing to deploy
  1  Usage error, missing configuration, invalid workflow files,
     or two instance workflows with the same n8nlift: tag
  3  The n8n instance cannot be reached or its API returned an error
  4  The API key is rejected`;

const MARKS: Record<DeployAction, string> = { created: '+', updated: '~', skipped: '=' };

export const deployCommand: CommandDefinition = {
  name: 'deploy',
  summary: 'Deliver your workflows to your n8n instance as drafts',
  usage: USAGE,
  allowPositionals: false,
  options: {
    json: { type: 'boolean', description: 'Print the report as JSON' },
  },
  run: async (input, ctx) => {
    const json = input.values.json === true;
    const resolved = resolveConnectionConfig(ctx.env, ctx.dotEnv);
    if (!resolved.ok) {
      return { exitCode: EXIT_MISSING_CONFIG, stdout: '', stderr: describeMissingConfig(resolved.missing) };
    }
    const { config } = resolved;
    const loaded = loadWorkflows(await ctx.loadWorkflowFiles(WORKFLOWS_DIR));
    if (!loaded.ok) {
      return invalidFiles(loaded.problems);
    }
    const instance = config.url.value;
    if (loaded.workflows.length === 0) {
      return json
        ? renderJson(instance, { results: [] })
        : { exitCode: 0, stdout: `Nothing to deploy: no workflow in ./${WORKFLOWS_DIR}.\n`, stderr: '' };
    }
    const client = createN8nClient({ baseUrl: instance, apiKey: config.apiKey.value, fetch: ctx.fetch });
    const report = await deploy({ workflows: loaded.workflows, client });
    return json ? renderJson(instance, report) : renderText(instance, report, loaded.workflows.length);
  },
};

function invalidFiles(problems: LoadProblem[]): CliResult {
  const lines = problems.map((problem) => `✗ ${problem.path}  ${problem.detail}`);
  return {
    exitCode: EXIT_INVALID_FILES,
    stdout: '',
    stderr: `Invalid workflow files. Nothing was sent to n8n.\n${lines.join('\n')}\n`,
  };
}

function summarize(results: DeployResult[]): Record<DeployAction, number> {
  const count = (action: DeployAction): number => results.filter((result) => result.action === action).length;
  return { created: count('created'), updated: count('updated'), skipped: count('skipped') };
}

function renderText(instance: string, report: DeployReport, total: number): CliResult {
  const names = [...report.results.map((result) => result.stableName), report.error?.stableName ?? ''];
  const width = Math.max(...names.map((name) => name.length)) + 3;
  const lines = report.results.map((result) => {
    const prefix = `${MARKS[result.action]} ${result.action.padEnd(9)}${result.stableName.padEnd(width)}`;
    switch (result.action) {
    case 'created':
      return `${prefix}${result.path}`;
    case 'updated':
      return `${prefix}${result.path} (draft; published version still running)`;
    case 'skipped':
      return `${prefix}unchanged`;
    }
  });
  const stdout = [`n8nlift deploy → ${instance}`, ...lines];
  const { error } = report;
  if (error === undefined) {
    const { created, updated, skipped } = summarize(report.results);
    const drafts = created + updated > 0 ? ' Drafts are not live until you publish them.' : '';
    stdout.push(`${created} created, ${updated} updated, ${skipped} skipped.${drafts}`);
    return { exitCode: 0, stdout: `${stdout.join('\n')}\n`, stderr: '' };
  }
  const name = error.stableName === undefined ? '' : error.stableName.padEnd(width);
  const remaining = total - report.results.length;
  const stderr = [
    `✗ failed   ${name}${error.call} → ${error.detail}`,
    `           → ${error.hint}`,
    `Stopped: ${remaining} workflow${remaining === 1 ? '' : 's'} not processed.`,
  ];
  return { exitCode: error.exitCode, stdout: `${stdout.join('\n')}\n`, stderr: `${stderr.join('\n')}\n` };
}

function renderJson(instance: string, report: DeployReport): CliResult {
  const { error } = report;
  const payload = {
    instance,
    results: report.results.map(({ stableName, path, action, id, name }) => ({ stableName, path, action, id, name })),
    summary: summarize(report.results),
    error:
      error === undefined
        ? null
        : {
          stableName: error.stableName ?? null,
          call: error.call,
          detail: error.detail,
          hint: error.hint,
          exitCode: error.exitCode,
        },
  };
  return { exitCode: error?.exitCode ?? 0, stdout: `${JSON.stringify(payload, null, 2)}\n`, stderr: '' };
}
