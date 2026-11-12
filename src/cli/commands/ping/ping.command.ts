import { CliResult, CommandDefinition } from '#src/cli/cli.model';
import { ConnectionConfig } from '#src/core/config/config.model';
import { resolveConnectionConfig } from '#src/core/config/connection-config';
import { EXIT_MISSING_CONFIG, describeMissingConfig } from '#src/core/config/missing-config';
import { CHECK_LABELS, checkConnection } from '#src/core/connection/check-connection';
import { Check, ConnectionReport } from '#src/core/connection/connection.model';
import { createN8nClient } from '#src/core/n8n/n8n-client';

const STATUS_MARKS: Record<Check['status'], string> = { ok: '✓', failed: '✗', skipped: '–' };

const USAGE = `n8nlift ping

Reads N8N_URL and N8N_API_KEY from the environment, then from ./.env.
A variable set in the environment wins over .env.
  N8N_URL      Root URL of your n8n instance (n8nlift adds /api/v1)
  N8N_API_KEY  n8n API key (n8n → Settings → n8n API)

Exit codes:
  0  Every check passed
  1  Usage error or missing configuration
  2  Node.js is older than 22.18
  3  The n8n instance or its public API cannot be reached
  4  The API key is rejected`;

export const pingCommand: CommandDefinition = {
  name: 'ping',
  summary: 'Check the connection to your n8n instance',
  usage: USAGE,
  allowPositionals: false,
  options: {},
  run: async (_input, ctx) => {
    const resolved = resolveConnectionConfig(ctx.env, ctx.dotEnv);
    if (!resolved.ok) {
      return { exitCode: EXIT_MISSING_CONFIG, stdout: '', stderr: describeMissingConfig(resolved.missing) };
    }
    const { config } = resolved;
    const client = createN8nClient({ baseUrl: config.url.value, apiKey: config.apiKey.value, fetch: ctx.fetch });
    const report = await checkConnection({ nodeVersion: ctx.nodeVersion, config, client });
    return render(config, report);
  },
};

function render(config: ConnectionConfig, report: ConnectionReport): CliResult {
  const header = [
    'n8nlift ping',
    `  URL      ${config.url.value} (from ${config.url.source})`,
    `  API key  •••• (set, from ${config.apiKey.source})`,
    ...report.warnings.map((warning) => `  ! ${warning}`),
  ];
  const width = Math.max(...Object.values(CHECK_LABELS).map((label) => label.length)) + 2;
  const checks = report.checks.flatMap((check) => {
    const line = `${STATUS_MARKS[check.status]} ${CHECK_LABELS[check.name].padEnd(width)}${check.detail}`;
    return check.hint === undefined ? [line] : [line, `${' '.repeat(width + 2)}→ ${check.hint}`];
  });
  const failures = report.checks.filter((check) => check.status === 'failed').length;
  const summary =
    failures === 0
      ? 'All checks passed.'
      : `${failures} check${failures === 1 ? '' : 's'} failed. Exit code ${report.exitCode}.`;
  return {
    exitCode: report.exitCode,
    stdout: `${header.join('\n')}\n\n${checks.join('\n')}\n\n${summary}\n`,
    stderr: failures === 0 ? '' : `${summary}\n`,
  };
}
