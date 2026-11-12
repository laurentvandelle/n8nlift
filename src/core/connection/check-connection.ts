import { Check, CheckConnectionInput, CheckName, ConnectionReport } from '#src/core/connection/connection.model';
import { API_KEY_PATH, HEALTH_PATH } from '#src/core/n8n/n8n-client';

export const MIN_NODE_VERSION = '22.18.0';

export const EXIT_NODE_TOO_OLD = 2;
export const EXIT_UNREACHABLE = 3;
export const EXIT_API_KEY_REJECTED = 4;

export const CHECK_LABELS: Record<CheckName, string> = { node: 'Node', url: 'URL', apiKey: 'API key' };

const API_KEY_ENDPOINT = API_KEY_PATH.split('?')[0];

type Step = () => Promise<Check>;

/** Runs the checks in order. After the first failure, the remaining checks are skipped. Read-only. */
export async function checkConnection({ nodeVersion, config, client }: CheckConnectionInput): Promise<ConnectionReport> {
  const steps: [CheckName, Step][] = [
    ['node', (): Promise<Check> => Promise.resolve(checkNode(nodeVersion))],
    ['url', (): Promise<Check> => checkUrl(client)],
    ['apiKey', (): Promise<Check> => checkApiKey(client)],
  ];
  const checks: Check[] = [];
  let failed: Check | undefined;
  for (const [name, step] of steps) {
    if (failed !== undefined) {
      checks.push({ name, status: 'skipped', detail: `skipped because the ${CHECK_LABELS[failed.name]} check failed` });
      continue;
    }
    const check = await step();
    checks.push(check);
    if (check.status === 'failed') {
      failed = check;
    }
  }
  return { checks, warnings: warningsFor(config.url.value), exitCode: failed?.exitCode ?? 0 };
}

function checkNode(nodeVersion: string): Check {
  if (compareVersions(nodeVersion, MIN_NODE_VERSION) >= 0) {
    return { name: 'node', status: 'ok', detail: `${nodeVersion} (requires ≥ ${MIN_NODE_VERSION})` };
  }
  return {
    name: 'node',
    status: 'failed',
    detail: `${nodeVersion} is too old (requires ≥ ${MIN_NODE_VERSION})`,
    hint: 'Install Node 22.18 or later',
    exitCode: EXIT_NODE_TOO_OLD,
  };
}

async function checkUrl(client: CheckConnectionInput['client']): Promise<Check> {
  const result = await client.checkHealth();
  const hint = 'Check N8N_URL: it must be the root URL of your n8n instance, for example https://your-n8n.example.com';
  switch (result.kind) {
  case 'ok':
    return { name: 'url', status: 'ok', detail: `reachable (GET ${HEALTH_PATH} → ${result.status})` };
  case 'unreachable':
    return { name: 'url', status: 'failed', detail: `unreachable: ${result.reason}`, hint, exitCode: EXIT_UNREACHABLE };
  case 'http-error':
    return {
      name: 'url',
      status: 'failed',
      detail: `not healthy (GET ${HEALTH_PATH} → ${result.status})`,
      hint,
      exitCode: EXIT_UNREACHABLE,
    };
  }
}

async function checkApiKey(client: CheckConnectionInput['client']): Promise<Check> {
  const result = await client.checkApiKey();
  if (result.kind === 'ok') {
    return { name: 'apiKey', status: 'ok', detail: `accepted (GET ${API_KEY_ENDPOINT} → ${result.status})` };
  }
  if (result.kind === 'unreachable') {
    return {
      name: 'apiKey',
      status: 'failed',
      detail: `unreachable: ${result.reason}`,
      hint: 'Check N8N_URL and your network, then run ping again',
      exitCode: EXIT_UNREACHABLE,
    };
  }
  const call = `GET ${API_KEY_ENDPOINT} → ${result.status}`;
  if (result.status === 401 || result.status === 403) {
    return {
      name: 'apiKey',
      status: 'failed',
      detail: `rejected (${call})`,
      hint: 'Create a key in n8n → Settings → n8n API, then set N8N_API_KEY in .env',
      exitCode: EXIT_API_KEY_REJECTED,
    };
  }
  if (result.status === 404) {
    return {
      name: 'apiKey',
      status: 'failed',
      detail: `public API not found at /api/v1 (${call})`,
      hint: 'Check N8N_URL, or whether the public API is enabled on the instance',
      exitCode: EXIT_UNREACHABLE,
    };
  }
  return {
    name: 'apiKey',
    status: 'failed',
    detail: `unexpected answer (${call})`,
    hint: 'Check that N8N_URL points to an n8n instance and that it is running',
    exitCode: EXIT_UNREACHABLE,
  };
}

function warningsFor(url: string): string[] {
  if (url.toLowerCase().startsWith('http://')) {
    return ['N8N_URL uses http://: the API key is sent unencrypted. Use https:// outside local development.'];
  }
  return [];
}

/** Compares two `x.y.z` versions (a leading `v` and any pre-release suffix are ignored). */
export function compareVersions(left: string, right: string): number {
  const parse = (version: string): number[] =>
    version
      .replace(/^v/, '')
      .split(/[-+]/)[0]
      .split('.')
      .map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parse(left), parse(right)];
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return Math.sign(difference);
    }
  }
  return 0;
}
