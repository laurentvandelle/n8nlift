import { N8nClient, N8nClientOptions, ProbeResult } from '#src/core/n8n/n8n.model';

export const HEALTH_PATH = '/healthz';
export const API_KEY_PATH = '/api/v1/workflows?limit=1';

const DEFAULT_TIMEOUT_MS = 10_000;

/** A minimal, read-only client for the n8n instance. */
export function createN8nClient({
  baseUrl,
  apiKey,
  fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: N8nClientOptions): N8nClient {
  const probe = async (path: string, headers: Record<string, string>): Promise<ProbeResult> => {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: { accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) {
        return { kind: 'ok', status: response.status };
      }
      return { kind: 'http-error', status: response.status };
    } catch (error) {
      return { kind: 'unreachable', reason: describeNetworkError(error, timeoutMs) };
    }
  };

  return {
    checkHealth: () => probe(HEALTH_PATH, {}),
    checkApiKey: () => probe(API_KEY_PATH, { 'X-N8N-API-KEY': apiKey }),
  };
}

function describeNetworkError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return `no answer after ${timeoutMs / 1000} s (timeout)`;
  }
  const code = errorCode(error);
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'host not found (DNS)';
  }
  if (code === 'ECONNREFUSED') {
    return 'connection refused';
  }
  if (code === 'ECONNRESET') {
    return 'connection reset';
  }
  if (code !== undefined && /^(CERT_|UNABLE_TO_|DEPTH_ZERO|SELF_SIGNED|ERR_TLS)/.test(code)) {
    return `TLS error (${code})`;
  }
  if (code !== undefined) {
    return `network error (${code})`;
  }
  if (error instanceof Error && error.cause instanceof Error && error.cause.message !== '') {
    return `${error.message}: ${error.cause.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}

/** `fetch` wraps the system error in `cause`; read its `code` when there is one. */
function errorCode(error: unknown): string | undefined {
  const cause = error instanceof Error ? error.cause : undefined;
  for (const candidate of [cause, error]) {
    if (typeof candidate === 'object' && candidate !== null && 'code' in candidate) {
      if (typeof candidate.code === 'string') {
        return candidate.code;
      }
    }
  }
  return undefined;
}
