import { describe, expect, test } from 'vitest';
import { LocalWorkflow } from '#src/core/compile/workflow.model';
import { deploy } from '#src/core/deliver/deploy';
import { ApiFailure, ApiResult, N8nClient, N8nTag, N8nWorkflow } from '#src/core/n8n/n8n.model';

type Method = Exclude<keyof N8nClient, 'checkHealth' | 'checkApiKey'>;

interface FakeInstance {
  client: N8nClient;
  workflows: N8nWorkflow[];
  tags: N8nTag[];
  calls: string[];
}

/** An in-memory n8n instance behind the `N8nClient` interface. `failures` makes one method fail. */
function fakeInstance(
  seed: { workflows?: N8nWorkflow[]; tags?: N8nTag[] } = {},
  failures: Partial<Record<Method, ApiFailure>> = {},
): FakeInstance {
  const workflows = structuredClone(seed.workflows ?? []);
  const tags = structuredClone(seed.tags ?? []);
  const calls: string[] = [];
  let nextId = 1;
  const answer = <T>(method: Method, call: string, body: () => T): Promise<ApiResult<T>> => {
    calls.push(call);
    const failure = failures[method];
    return Promise.resolve(failure ?? { kind: 'ok', status: 200, body: body() });
  };
  const find = (id: string): N8nWorkflow => {
    const workflow = workflows.find((candidate) => candidate.id === id);
    if (workflow === undefined) throw new Error(`no workflow ${id}`);
    return workflow;
  };
  const client: N8nClient = {
    checkHealth: () => Promise.reject(new Error('not used')),
    checkApiKey: () => Promise.reject(new Error('not used')),
    listWorkflows: () =>
      answer('listWorkflows', 'list', () => workflows.map(({ id, name, tags: t }) => ({ id, name, tags: t }))),
    getWorkflow: (id) => answer('getWorkflow', `get ${id}`, () => structuredClone(find(id))),
    createWorkflow: (body) =>
      answer('createWorkflow', `create ${body.name}`, () => {
        const workflow = { id: `w${nextId++}`, tags: [], ...structuredClone(body) };
        workflows.push(workflow);
        return structuredClone(workflow);
      }),
    updateWorkflow: (id, body) =>
      answer('updateWorkflow', `update ${id}`, () => Object.assign(find(id), structuredClone(body))),
    listTags: () => answer('listTags', 'listTags', () => structuredClone(tags)),
    createTag: (name) =>
      answer('createTag', `createTag ${name}`, () => {
        const tag = { id: `t${nextId++}`, name };
        tags.push(tag);
        return tag;
      }),
    setWorkflowTags: (id, tagIds) =>
      answer('setWorkflowTags', `setTags ${id} ${tagIds.join(',')}`, () => {
        const workflow = find(id);
        workflow.tags = tagIds.map((tagId) => tags.find((tag) => tag.id === tagId) ?? { id: tagId, name: '?' });
        return workflow.tags;
      }),
  };
  return { client, workflows, tags, calls };
}

const NODE = {
  id: 'local-id',
  name: 'Start',
  type: 'n8n-nodes-base.manualTrigger',
  typeVersion: 1,
  position: [0, 0],
  parameters: {},
};

function local(stableName: string, overrides: Partial<LocalWorkflow> = {}): LocalWorkflow {
  return {
    stableName,
    path: `workflows/${stableName}.json`,
    name: `Workflow ${stableName}`,
    nodes: [NODE],
    connections: {},
    settings: { executionOrder: 'v1' },
    ...overrides,
  };
}

function remoteOf(workflow: LocalWorkflow, id: string, tags: N8nTag[]): N8nWorkflow {
  return {
    id,
    name: workflow.name,
    nodes: [{ ...NODE, id: 'server-id' }],
    connections: workflow.connections,
    settings: { ...workflow.settings, redactionPolicy: 'none' },
    tags,
  };
}

describe('deploy', () => {
  test('Should create a new workflow and tag it with its stable name', async () => {
    // Given
    const instance = fakeInstance({ tags: [{ id: 'tx', name: 'other' }] });

    // When
    const report = await deploy({ workflows: [local('invoice-sync')], client: instance.client });

    // Then
    expect(report).toEqual({
      results: [
        {
          stableName: 'invoice-sync',
          path: 'workflows/invoice-sync.json',
          action: 'created',
          id: 'w1',
          name: 'Workflow invoice-sync',
        },
      ],
    });
    expect(instance.calls).toEqual([
      'list',
      'create Workflow invoice-sync',
      'listTags',
      'createTag n8nlift:invoice-sync',
      'setTags w1 t2',
    ]);
    expect(instance.workflows[0]?.tags).toEqual([{ id: 't2', name: 'n8nlift:invoice-sync' }]);
  });

  test('Should reuse an existing stable tag and read the tag list once', async () => {
    // Given
    const instance = fakeInstance({ tags: [{ id: 'ta', name: 'n8nlift:a' }] });

    // When
    await deploy({ workflows: [local('b'), local('a')], client: instance.client });

    // Then
    expect(instance.calls.filter((call) => call === 'listTags')).toHaveLength(1);
    expect(instance.calls).toContain('setTags w1 ta');
    expect(instance.calls).toContain('createTag n8nlift:b');
  });

  test('Should update a changed workflow without touching its tags', async () => {
    // Given
    const workflow = local('crm-import');
    const tags = [
      { id: 't1', name: 'n8nlift:crm-import' },
      { id: 't2', name: 'hand-added' },
    ];
    const instance = fakeInstance({ workflows: [{ ...remoteOf(workflow, 'abc', tags), name: 'Old name' }] });

    // When
    const report = await deploy({ workflows: [workflow], client: instance.client });

    // Then
    expect(report.results).toEqual([expect.objectContaining({ action: 'updated', id: 'abc' })]);
    expect(instance.calls).toEqual(['list', 'get abc', 'update abc']);
    expect(instance.workflows[0]).toMatchObject({ name: 'Workflow crm-import', tags });
  });

  test('Should skip a workflow whose current draft matches, ignoring node ids and server settings', async () => {
    // Given
    const workflow = local('daily-report');
    const instance = fakeInstance({
      workflows: [remoteOf(workflow, 'abc', [{ id: 't1', name: 'n8nlift:daily-report' }])],
    });

    // When
    const report = await deploy({ workflows: [workflow], client: instance.client });

    // Then
    expect(report.results).toEqual([expect.objectContaining({ action: 'skipped', id: 'abc' })]);
    expect(instance.calls).toEqual(['list', 'get abc']);
  });

  test('Should write nothing on a second run', async () => {
    // Given
    const instance = fakeInstance();
    const workflows = [local('a'), local('b')];
    await deploy({ workflows, client: instance.client });
    instance.calls.length = 0;

    // When
    const report = await deploy({ workflows, client: instance.client });

    // Then
    expect(report.results.map(({ action }) => action)).toEqual(['skipped', 'skipped']);
    expect(instance.calls).toEqual(['list', 'get w1', 'get w3']);
  });

  test('Should stop before any write when two instance workflows carry the same stable tag', async () => {
    // Given
    const tag = { id: 't1', name: 'n8nlift:dup' };
    const workflow = local('dup');
    const instance = fakeInstance({ workflows: [remoteOf(workflow, 'a', [tag]), remoteOf(workflow, 'b', [tag])] });

    // When
    const report = await deploy({ workflows: [workflow, local('new')], client: instance.client });

    // Then
    expect(report.results).toEqual([]);
    expect(report.error).toMatchObject({ exitCode: 1, detail: 'workflows a and b both carry the tag n8nlift:dup' });
    expect(report.error?.stableName).toBeUndefined();
    expect(instance.calls).toEqual(['list']);
  });

  test('Should stop at the first failed call and keep the results so far', async () => {
    // Given
    const instance = fakeInstance(
      { workflows: [remoteOf(local('a'), 'abc', [{ id: 't1', name: 'n8nlift:a' }])] },
      { createWorkflow: { kind: 'http-error', call: 'POST /api/v1/workflows', status: 400, message: 'bad body' } },
    );

    // When
    const report = await deploy({ workflows: [local('a'), local('b'), local('c')], client: instance.client });

    // Then
    expect(report.results.map(({ stableName }) => stableName)).toEqual(['a']);
    expect(report.error).toEqual({
      stableName: 'b',
      call: 'POST /api/v1/workflows',
      detail: 'HTTP 400: bad body',
      hint: expect.any(String) as string,
      exitCode: 3,
    });
    expect(instance.calls).not.toContain('create Workflow c');
  });

  test.each<[ApiFailure, number]>([
    [{ kind: 'unreachable', call: 'GET /api/v1/workflows', reason: 'connection refused' }, 3],
    [{ kind: 'http-error', call: 'GET /api/v1/workflows', status: 401 }, 4],
    [{ kind: 'http-error', call: 'GET /api/v1/workflows', status: 403 }, 4],
  ])('Should map a failed list (%o) to exit %s', async (failure, exitCode) => {
    // Given
    const instance = fakeInstance({}, { listWorkflows: failure });

    // When
    const report = await deploy({ workflows: [local('a')], client: instance.client });

    // Then
    expect(report.error).toMatchObject({ call: 'GET /api/v1/workflows', exitCode });
  });
});
