import {
  ApiResult,
  N8nClient,
  N8nClientOptions,
  N8nTag,
  N8nWorkflow,
  N8nWorkflowSummary,
  ProbeResult,
} from '#src/core/n8n/n8n.model';

export const HEALTH_PATH = '/healthz';
export const API_KEY_PATH = '/api/v1/workflows?limit=1';

const API = '/api/v1';
const PAGE_LIMIT = 250;
const DEFAULT_TIMEOUT_MS = 10_000;

type Method = 'GET' | 'POST' | 'PUT';

interface Page<T> {
  data: T[];
  nextCursor?: string | null;
}

/** A minimal client for the n8n instance and its public API. */
export function createN8nClient({
  baseUrl,
  apiKey,
  fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: N8nClientOptions): N8nClient {
  const request = async <T>(
    method: Method,
    path: string,
    { body, auth = true }: { body?: unknown; auth?: boolean } = {},
  ): Promise<ApiResult<T>> => {
    const call = `${method} ${path.split('?')[0]}`;
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          accept: 'application/json',
          ...(auth ? { 'X-N8N-API-KEY': apiKey } : {}),
          ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await response.text();
      if (response.ok) {
        return { kind: 'ok', status: response.status, body: parseJson(text) as T };
      }
      const message = errorMessage(text);
      return { kind: 'http-error', call, status: response.status, ...(message === undefined ? {} : { message }) };
    } catch (error) {
      return { kind: 'unreachable', call, reason: describeNetworkError(error, timeoutMs) };
    }
  };

  const probe = async (path: string, auth: boolean): Promise<ProbeResult> => {
    const result = await request<unknown>('GET', path, { auth });
    switch (result.kind) {
    case 'ok':
      return { kind: 'ok', status: result.status };
    case 'http-error':
      return { kind: 'http-error', status: result.status };
    case 'unreachable':
      return { kind: 'unreachable', reason: result.reason };
    }
  };

  const listAll = async <T>(path: string): Promise<ApiResult<T[]>> => {
    const items: T[] = [];
    let cursor: string | undefined;
    let status: number;
    do {
      const separator = path.includes('?') ? '&' : '?';
      const page = await request<Page<T>>(
        'GET',
        `${path}${separator}limit=${PAGE_LIMIT}${cursor === undefined ? '' : `&cursor=${encodeURIComponent(cursor)}`}`,
      );
      if (page.kind !== 'ok') {
        return page;
      }
      status = page.status;
      items.push(...(page.body.data ?? []));
      cursor = page.body.nextCursor ?? undefined;
    } while (cursor !== undefined && cursor !== '');
    return { kind: 'ok', status, body: items };
  };

  const workflowPath = (id: string): string => `${API}/workflows/${encodeURIComponent(id)}`;

  return {
    checkHealth: () => probe(HEALTH_PATH, false),
    checkApiKey: () => probe(API_KEY_PATH, true),
    listWorkflows: async (): Promise<ApiResult<N8nWorkflowSummary[]>> => {
      const result = await listAll<N8nWorkflowSummary>(`${API}/workflows?excludePinnedData=true`);
      return result.kind === 'ok'
        ? { ...result, body: result.body.map(({ id, name, tags }) => ({ id, name, tags: tags ?? [] })) }
        : result;
    },
    getWorkflow: (id) => request<N8nWorkflow>('GET', workflowPath(id)),
    createWorkflow: (body) => request<N8nWorkflow>('POST', `${API}/workflows`, { body }),
    updateWorkflow: (id, body) => request<N8nWorkflow>('PUT', `${workflowPath(id)}?publishIfActive=false`, { body }),
    listTags: () => listAll<N8nTag>(`${API}/tags`),
    createTag: (name) => request<N8nTag>('POST', `${API}/tags`, { body: { name } }),
    setWorkflowTags: (id, tagIds) =>
      request<N8nTag[]>('PUT', `${workflowPath(id)}/tags`, { body: tagIds.map((tagId) => ({ id: tagId })) }),
  };
}

function parseJson(text: string): unknown {
  if (text === '') {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** The `message` field of an n8n error body, when there is one. */
function errorMessage(text: string): string | undefined {
  const body = parseJson(text);
  if (typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string') {
    return body.message;
  }
  return undefined;
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
