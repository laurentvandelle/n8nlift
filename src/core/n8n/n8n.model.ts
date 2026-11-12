export type ProbeResult =
  | { kind: 'ok'; status: number }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'http-error'; status: number };

export interface N8nClientOptions {
  /** The instance root, without trailing slash (for example `https://n8n.example.com`). */
  baseUrl: string;
  apiKey: string;
  fetch: typeof fetch;
  timeoutMs?: number;
}

export interface N8nClient {
  /** `GET /healthz`: is the instance up and reachable? */
  checkHealth(): Promise<ProbeResult>;
  /** `GET /api/v1/workflows?limit=1` with `X-N8N-API-KEY`: does the public API accept the key? */
  checkApiKey(): Promise<ProbeResult>;
}
