import { describe, expect, test } from 'vitest';
import { createN8nClient } from '#src/core/n8n/n8n-client';

interface Call {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(answer: () => Promise<Response>): { fetch: typeof fetch; calls: Call[] } {
  const calls: Call[] = [];
  const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    calls.push({ url: input instanceof Request ? input.url : input.toString(), init });
    return answer();
  };
  return { fetch, calls };
}

function networkError(code: string): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) });
}

describe('createN8nClient', () => {
  test('Should call GET /healthz without the API key', async () => {
    // Given
    const { fetch, calls } = fakeFetch(() => Promise.resolve(new Response('{}', { status: 200 })));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.checkHealth();

    // Then
    expect(result).toEqual({ kind: 'ok', status: 200 });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('https://n8n.example.com/healthz');
    expect(calls[0]?.init?.method).toBe('GET');
    expect(calls[0]?.init?.headers).not.toHaveProperty('X-N8N-API-KEY');
  });

  test('Should send the API key to the workflows endpoint', async () => {
    // Given
    const { fetch, calls } = fakeFetch(() => Promise.resolve(new Response('{"data":[]}', { status: 200 })));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.checkApiKey();

    // Then
    expect(result).toEqual({ kind: 'ok', status: 200 });
    expect(calls[0]?.url).toBe('https://n8n.example.com/api/v1/workflows?limit=1');
    expect(calls[0]?.init?.method).toBe('GET');
    expect(calls[0]?.init?.headers).toMatchObject({ 'X-N8N-API-KEY': 'secret' });
    expect(calls[0]?.init?.signal).toBeInstanceOf(AbortSignal);
  });

  test.each([[401], [404], [500]])('Should report HTTP status %s as an http-error', async (status) => {
    // Given
    const { fetch } = fakeFetch(() => Promise.resolve(new Response('', { status })));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.checkApiKey();

    // Then
    expect(result).toEqual({ kind: 'http-error', status });
  });

  test.each([
    ['ENOTFOUND', 'host not found (DNS)'],
    ['ECONNREFUSED', 'connection refused'],
    ['SELF_SIGNED_CERT_IN_CHAIN', 'TLS error (SELF_SIGNED_CERT_IN_CHAIN)'],
  ])('Should report a %s network error as unreachable', async (code, reason) => {
    // Given
    const { fetch } = fakeFetch(() => Promise.reject(networkError(code)));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.checkHealth();

    // Then
    expect(result).toEqual({ kind: 'unreachable', reason });
  });

  test('Should report the cause of a network error that has no code', async () => {
    // Given
    const { fetch } = fakeFetch(() => Promise.reject(new TypeError('fetch failed', { cause: new Error('bad port') })));
    const client = createN8nClient({ baseUrl: 'http://localhost:1', apiKey: 'secret', fetch });

    // When
    const result = await client.checkHealth();

    // Then
    expect(result).toEqual({ kind: 'unreachable', reason: 'fetch failed: bad port' });
  });

  test('Should report a timeout as unreachable', async () => {
    // Given
    const fetch = (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(init.signal?.reason as Error);
        });
      });
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch, timeoutMs: 5 });

    // When
    const result = await client.checkHealth();

    // Then
    expect(result).toEqual({ kind: 'unreachable', reason: 'no answer after 0.005 s (timeout)' });
  });
});

describe('createN8nClient public API calls', () => {
  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status });
  }

  test('Should follow nextCursor when listing workflows', async () => {
    // Given
    const pages = [
      json({ data: [{ id: '1', name: 'A', tags: [{ id: 't', name: 'n8nlift:a' }], nodes: [] }], nextCursor: 'next=1' }),
      json({ data: [{ id: '2', name: 'B' }], nextCursor: null }),
    ];
    const { fetch, calls } = fakeFetch(() => Promise.resolve(pages.shift() ?? json({ data: [] })));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.listWorkflows();

    // Then
    expect(result).toEqual({
      kind: 'ok',
      status: 200,
      body: [
        { id: '1', name: 'A', tags: [{ id: 't', name: 'n8nlift:a' }] },
        { id: '2', name: 'B', tags: [] },
      ],
    });
    expect(calls.map((call) => call.url)).toEqual([
      'https://n8n.example.com/api/v1/workflows?excludePinnedData=true&limit=250',
      'https://n8n.example.com/api/v1/workflows?excludePinnedData=true&limit=250&cursor=next%3D1',
    ]);
  });

  test('Should update a workflow as a draft with publishIfActive=false', async () => {
    // Given
    const { fetch, calls } = fakeFetch(() => Promise.resolve(json({ id: 'abc' })));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });
    const body = { name: 'A', nodes: [], connections: {}, settings: {} };

    // When
    const result = await client.updateWorkflow('abc', body);

    // Then
    expect(result).toMatchObject({ kind: 'ok', body: { id: 'abc' } });
    expect(calls[0]?.url).toBe('https://n8n.example.com/api/v1/workflows/abc?publishIfActive=false');
    expect(calls[0]?.init?.method).toBe('PUT');
    expect(calls[0]?.init?.headers).toMatchObject({ 'X-N8N-API-KEY': 'secret', 'content-type': 'application/json' });
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual(body);
  });

  test('Should send tag ids as objects when setting workflow tags', async () => {
    // Given
    const { fetch, calls } = fakeFetch(() => Promise.resolve(json([])));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    await client.setWorkflowTags('abc', ['t1', 't2']);

    // Then
    expect(calls[0]?.url).toBe('https://n8n.example.com/api/v1/workflows/abc/tags');
    expect(JSON.parse(calls[0]?.init?.body as string)).toEqual([{ id: 't1' }, { id: 't2' }]);
  });

  test('Should name the call and keep the n8n message on an HTTP error', async () => {
    // Given
    const { fetch } = fakeFetch(() => Promise.resolve(json({ message: 'request/body must have name' }, 400)));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.createWorkflow({ name: '', nodes: [], connections: {}, settings: {} });

    // Then
    expect(result).toEqual({
      kind: 'http-error',
      call: 'POST /api/v1/workflows',
      status: 400,
      message: 'request/body must have name',
    });
  });

  test('Should name the call when the instance is unreachable', async () => {
    // Given
    const { fetch } = fakeFetch(() => Promise.reject(networkError('ECONNREFUSED')));
    const client = createN8nClient({ baseUrl: 'https://n8n.example.com', apiKey: 'secret', fetch });

    // When
    const result = await client.getWorkflow('abc');

    // Then
    expect(result).toEqual({ kind: 'unreachable', call: 'GET /api/v1/workflows/abc', reason: 'connection refused' });
  });
});
