export type ProbeResult =
  | { kind: 'ok'; status: number }
  | { kind: 'unreachable'; reason: string }
  | { kind: 'http-error'; status: number };

/** The outcome of one public API call. `call` names it, for example `PUT /api/v1/workflows/abc`. */
export type ApiResult<T> =
  | { kind: 'ok'; status: number; body: T }
  | { kind: 'unreachable'; call: string; reason: string }
  | { kind: 'http-error'; call: string; status: number; message?: string };

export type ApiFailure = Exclude<ApiResult<never>, { kind: 'ok' }>;

export interface N8nClientOptions {
  /** The instance root, without trailing slash (for example `https://n8n.example.com`). */
  baseUrl: string;
  apiKey: string;
  fetch: typeof fetch;
  timeoutMs?: number;
}

export interface N8nTag {
  id: string;
  name: string;
}

/** A workflow as `GET /api/v1/workflows` lists it. */
export interface N8nWorkflowSummary {
  id: string;
  name: string;
  tags: N8nTag[];
}

/** A workflow as `GET /api/v1/workflows/{id}` returns it: the top-level fields are the current draft. */
export interface N8nWorkflow extends N8nWorkflowSummary {
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

/** The fields n8nlift writes on create and update. */
export interface N8nWorkflowBody {
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface N8nClient {
  /** `GET /healthz`: is the instance up and reachable? */
  checkHealth(): Promise<ProbeResult>;
  /** `GET /api/v1/workflows?limit=1` with `X-N8N-API-KEY`: does the public API accept the key? */
  checkApiKey(): Promise<ProbeResult>;
  /** Every workflow on the instance, following `nextCursor`. */
  listWorkflows(): Promise<ApiResult<N8nWorkflowSummary[]>>;
  getWorkflow(id: string): Promise<ApiResult<N8nWorkflow>>;
  /** `POST /api/v1/workflows`: the new workflow is never published. */
  createWorkflow(body: N8nWorkflowBody): Promise<ApiResult<N8nWorkflow>>;
  /** `PUT /api/v1/workflows/{id}?publishIfActive=false`: the change lands as a draft. */
  updateWorkflow(id: string, body: N8nWorkflowBody): Promise<ApiResult<N8nWorkflow>>;
  /** Every tag on the instance, following `nextCursor`. */
  listTags(): Promise<ApiResult<N8nTag[]>>;
  createTag(name: string): Promise<ApiResult<N8nTag>>;
  /** `PUT /api/v1/workflows/{id}/tags`: replaces the workflow's tags. */
  setWorkflowTags(id: string, tagIds: string[]): Promise<ApiResult<N8nTag[]>>;
}
