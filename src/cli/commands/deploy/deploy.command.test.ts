import { describe, expect, test } from 'vitest';
import { CommandContext, WorkflowFile } from '#src/cli/cli.model';
import { fakeContext } from '#src/cli/cli.fake';
import { deployCommand } from '#src/cli/commands/deploy/deploy.command';

const TEXT = { positionals: [], values: {} };
const JSON_INPUT = { positionals: [], values: { json: true } };
const ENV = { N8N_URL: 'https://n8n.example.com', N8N_API_KEY: 'secret' };

interface Stored {
  id: string;
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
  tags: { id: string; name: string }[];
}

/** A `fetch` that answers like the n8n public API, backed by an in-memory instance. */
function fakeN8n(options: { workflows?: Stored[]; failOn?: { call: string; status: number } } = {}): {
  fetch: typeof fetch;
  calls: string[];
  workflows: Stored[];
} {
  const workflows = structuredClone(options.workflows ?? []);
  const tags = workflows.flatMap((workflow) => workflow.tags);
  const calls: string[] = [];
  let nextId = 100;
  const json = (body: unknown, status = 200): Promise<Response> =>
    Promise.resolve(new Response(JSON.stringify(body), { status }));
  const fetch = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const call = `${method} ${url.pathname}`;
    calls.push(`${call}${url.search}`);
    if (options.failOn?.call === call) {
      return json({ message: 'boom' }, options.failOn.status);
    }
    const body = init?.body === undefined ? undefined : (JSON.parse(init.body as string) as Record<string, unknown>);
    const [, , , resource, id, sub] = url.pathname.split('/');
    const find = (): Stored | undefined => workflows.find((workflow) => workflow.id === id);
    if (resource === 'tags') {
      if (method === 'GET') return json({ data: tags, nextCursor: null });
      const tag = { id: `t${nextId++}`, name: body?.name as string };
      tags.push(tag);
      return json(tag);
    }
    if (id === undefined) {
      if (method === 'GET') return json({ data: workflows, nextCursor: null });
      const created = { ...(body as unknown as Stored), id: `w${nextId++}`, tags: [] };
      workflows.push(created);
      return json(created);
    }
    const workflow = find();
    if (workflow === undefined) return json({ message: 'not found' }, 404);
    if (sub === 'tags') {
      workflow.tags = (body as unknown as { id: string }[]).map(({ id: tagId }) => tags.find((t) => t.id === tagId)!);
      return json(workflow.tags);
    }
    if (method === 'PUT') Object.assign(workflow, body);
    return json(workflow);
  };
  return { fetch, calls, workflows };
}

const NODE = { id: 'n1', name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };

function file(path: string, name: string, extra: Record<string, unknown> = {}): WorkflowFile {
  return { path, content: { name, nodes: [NODE], connections: {}, settings: { executionOrder: 'v1' }, ...extra } };
}

function stored(id: string, stableName: string, name: string, extra: Partial<Stored> = {}): Stored {
  return {
    id,
    name,
    nodes: [{ ...NODE, id: 'server' }],
    connections: {},
    settings: { executionOrder: 'v1', redactionPolicy: 'none' },
    tags: [{ id: `tag-${stableName}`, name: `n8nlift:${stableName}` }],
    ...extra,
  };
}

const FILES: WorkflowFile[] = [
  file('workflows/invoice-sync.workflow.ts', 'Invoice sync'),
  file('workflows/crm/crm-import.json', 'CRM import'),
  file('workflows/daily-report.json', 'Daily report'),
];

function context(overrides: Partial<CommandContext>): CommandContext {
  return fakeContext({ registry: [deployCommand], env: ENV, ...overrides });
}

describe('deployCommand', () => {
  test('Should create, update as a draft and skip, then print the summary', async () => {
    // Given
    const n8n = fakeN8n({
      workflows: [
        stored('crm1', 'crm-import', 'CRM import (old)', { tags: [{ id: 'tag-crm-import', name: 'n8nlift:crm-import' }, { id: 'h', name: 'hand-added' }] }),
        stored('rep1', 'daily-report', 'Daily report'),
      ],
    });
    const ctx = context({ fetch: n8n.fetch, loadWorkflowFiles: () => Promise.resolve(FILES) });

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(`n8nlift deploy → https://n8n.example.com
~ updated  crm-import     workflows/crm/crm-import.json (draft; published version still running)
= skipped  daily-report   unchanged
+ created  invoice-sync   workflows/invoice-sync.workflow.ts
1 created, 1 updated, 1 skipped. Drafts are not live until you publish them.
`);
    expect(n8n.calls).toContain('PUT /api/v1/workflows/crm1?publishIfActive=false');
    expect(n8n.calls).not.toContain('PUT /api/v1/workflows/rep1?publishIfActive=false');
    expect(n8n.calls).toContain('POST /api/v1/workflows');
    expect(n8n.calls.filter((call) => call.startsWith('PUT /api/v1/workflows/crm1/tags'))).toEqual([]);
    expect(n8n.workflows.find((w) => w.id === 'crm1')?.tags.map((t) => t.name)).toEqual(['n8nlift:crm-import', 'hand-added']);
    expect(n8n.workflows.find((w) => w.name === 'Invoice sync')?.tags.map((t) => t.name)).toEqual(['n8nlift:invoice-sync']);
  });

  test('Should make no write on a rerun', async () => {
    // Given
    const n8n = fakeN8n();
    const ctx = context({ fetch: n8n.fetch, loadWorkflowFiles: () => Promise.resolve(FILES) });
    await deployCommand.run(TEXT, ctx);
    n8n.calls.length = 0;

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result.stdout).toContain('0 created, 0 updated, 3 skipped.\n');
    expect(n8n.calls.every((call) => call.startsWith('GET '))).toBe(true);
  });

  test('Should print a stable JSON report with --json', async () => {
    // Given
    const n8n = fakeN8n({ workflows: [stored('rep1', 'daily-report', 'Daily report')] });
    const files = [file('workflows/daily-report.json', 'Daily report'), file('workflows/new.json', 'New')];
    const ctx = context({ fetch: n8n.fetch, loadWorkflowFiles: () => Promise.resolve(files) });

    // When
    const result = await deployCommand.run(JSON_INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      instance: 'https://n8n.example.com',
      results: [
        { stableName: 'daily-report', path: 'workflows/daily-report.json', action: 'skipped', id: 'rep1', name: 'Daily report' },
        { stableName: 'new', path: 'workflows/new.json', action: 'created', id: 'w100', name: 'New' },
      ],
      summary: { created: 1, updated: 0, skipped: 1 },
      error: null,
    });
  });

  test('Should stop at the first failure, name the workflow and the call, and keep the exit code in JSON', async () => {
    // Given
    const n8n = fakeN8n({ failOn: { call: 'POST /api/v1/workflows', status: 500 } });
    const ctx = context({ fetch: n8n.fetch, loadWorkflowFiles: () => Promise.resolve(FILES) });

    // When
    const text = await deployCommand.run(TEXT, ctx);
    const json = await deployCommand.run(JSON_INPUT, ctx);

    // Then
    expect(text.exitCode).toBe(3);
    expect(text.stdout).toBe('n8nlift deploy → https://n8n.example.com\n');
    expect(text.stderr).toBe(`✗ failed   crm-import   POST /api/v1/workflows → HTTP 500: boom
           → Check the workflow file and the n8n instance (n8n 2.35.0 or later), then run deploy again
Stopped: 3 workflows not processed.
`);
    expect(json.exitCode).toBe(3);
    expect(JSON.parse(json.stdout)).toMatchObject({
      results: [],
      error: { stableName: 'crm-import', call: 'POST /api/v1/workflows', detail: 'HTTP 500: boom', exitCode: 3 },
    });
  });

  test('Should exit 4 when the API key is rejected', async () => {
    // Given
    const n8n = fakeN8n({ failOn: { call: 'GET /api/v1/workflows', status: 401 } });
    const ctx = context({ fetch: n8n.fetch, loadWorkflowFiles: () => Promise.resolve(FILES) });

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result.exitCode).toBe(4);
    expect(result.stderr).toContain('✗ failed   GET /api/v1/workflows → HTTP 401: boom');
    expect(result.stderr).toContain('→ Create a key in n8n → Settings → n8n API');
  });

  test('Should say there is nothing to deploy and exit 0 when ./workflows is empty', async () => {
    // Given
    const ctx = context({});

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: 'Nothing to deploy: no workflow in ./workflows.\n', stderr: '' });
  });

  test('Should exit 1 and send nothing when a stable name is invalid or duplicated', async () => {
    // Given
    const files = [
      file('workflows/Bad_Name.json', 'Bad'),
      file('workflows/a/sync.json', 'Sync'),
      file('workflows/sync.workflow.ts', 'Sync again'),
    ];
    const ctx = context({ loadWorkflowFiles: () => Promise.resolve(files) });

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Invalid workflow files. Nothing was sent to n8n.');
    expect(result.stderr).toContain('✗ workflows/Bad_Name.json  stable name "Bad_Name"');
    expect(result.stderr).toContain(
      '✗ workflows/sync.workflow.ts  stable name "sync" is also used by workflows/a/sync.json',
    );
  });

  test('Should exit 1 with the same message as ping when the configuration is missing', async () => {
    // Given
    const ctx = context({ env: {}, loadWorkflowFiles: () => Promise.resolve(FILES) });

    // When
    const result = await deployCommand.run(TEXT, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Missing N8N_URL and N8N_API_KEY.');
    expect(result.stderr).toContain('  N8N_URL=https://your-n8n.example.com\n');
  });
});
