import { describe, expect, test } from 'vitest';
import { loadWorkflows, stableNameOf } from '#src/core/compile/load-workflows';
import { WorkflowFile } from '#src/core/compile/workflow.model';

const EXPORT = { name: 'Invoice sync', nodes: [], connections: {} };

describe('stableNameOf', () => {
  test.each([
    ['workflows/invoice-sync.workflow.ts', 'invoice-sync'],
    ['workflows/crm/crm-import.json', 'crm-import'],
    ['workflows\\win\\daily.json', 'daily'],
  ])('Should derive the stable name of %s', (path, expected) => {
    // Given
    const file = path;

    // When
    const name = stableNameOf(file);

    // Then
    expect(name).toBe(expected);
  });
});

describe('loadWorkflows', () => {
  test('Should load every file, sorted by stable name, with settings defaulting to {}', () => {
    // Given
    const files: WorkflowFile[] = [
      { path: 'workflows/sub/zeta.json', content: { ...EXPORT, name: 'Zeta', settings: { timezone: 'UTC' } } },
      { path: 'workflows/alpha.workflow.ts', content: { ...EXPORT, id: 'ignored', active: true } },
    ];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: true,
      workflows: [
        { stableName: 'alpha', path: 'workflows/alpha.workflow.ts', ...EXPORT, settings: {} },
        { stableName: 'zeta', path: 'workflows/sub/zeta.json', ...EXPORT, name: 'Zeta', settings: { timezone: 'UTC' } },
      ],
    });
  });

  test.each(['Invoice', 'with_underscore', 'seventeen-chars-x'])('Should reject the stable name %s', (name) => {
    // Given
    const files: WorkflowFile[] = [{ path: `workflows/${name}.json`, content: EXPORT }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toMatchObject({ ok: false, problems: [{ kind: 'invalid-name', path: `workflows/${name}.json` }] });
  });

  test('Should reject a stable name used twice, naming both paths, across folders and extensions', () => {
    // Given
    const files: WorkflowFile[] = [
      { path: 'workflows/crm/sync.json', content: EXPORT },
      { path: 'workflows/sync.workflow.ts', content: EXPORT },
    ];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [
        {
          kind: 'duplicate-name',
          path: 'workflows/sync.workflow.ts',
          detail: 'stable name "sync" is also used by workflows/crm/sync.json; rename one of the two files',
        },
      ],
    });
  });

  test('Should report an unreadable file', () => {
    // Given
    const files: WorkflowFile[] = [{ path: 'workflows/broken.json', error: 'Unexpected token } in JSON' }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [{ kind: 'unreadable', path: 'workflows/broken.json', detail: 'cannot be read: Unexpected token } in JSON' }],
    });
  });

  test('Should name every missing field', () => {
    // Given
    const files: WorkflowFile[] = [{ path: 'workflows/empty.json', content: { nodes: {} } }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [
        {
          kind: 'invalid-shape',
          path: 'workflows/empty.json',
          detail: 'missing or invalid name (a string), nodes (an array), connections (an object)',
        },
      ],
    });
  });

  test('Should reject a module without a default export', () => {
    // Given
    const files: WorkflowFile[] = [{ path: 'workflows/nothing.workflow.ts', content: undefined }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toMatchObject({ ok: false, problems: [{ kind: 'invalid-shape' }] });
  });

  test('Should accept a full n8n export unchanged, unknown keys included', () => {
    // Given
    const nodes = [
      { parameters: {}, id: 'n1', name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0] },
      { parameters: {}, id: 'n2', name: 'Done', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [220, 0], disabled: true },
    ];
    const connections = { Start: { main: [[{ node: 'Done', type: 'main', index: 0 }], null] } };
    const content = { name: 'Full', nodes, connections, id: 'wf1', meta: { instanceId: 'x' }, pinData: {}, versionId: 'v1' };
    const files: WorkflowFile[] = [{ path: 'workflows/full.json', content }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: true,
      workflows: [{ stableName: 'full', path: 'workflows/full.json', name: 'Full', nodes, connections, settings: {} }],
    });
  });

  test('Should name each node with a missing or invalid field, by name or else by index', () => {
    // Given
    const nodes = [
      { name: 'Start', type: 'n8n-nodes-base.manualTrigger', position: [0], parameters: {} },
      { type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [0, 0], parameters: {} },
      'not a node',
    ];
    const files: WorkflowFile[] = [{ path: 'workflows/nodes.json', content: { ...EXPORT, nodes } }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [
        {
          kind: 'invalid-shape',
          path: 'workflows/nodes.json',
          detail:
            'node "Start" has a missing or invalid typeVersion (a number), position (two numbers); ' +
            'node at index 1 has a missing or invalid name (a non-empty string); ' +
            'node at index 2 must be an object',
        },
      ],
    });
  });

  test('Should reject a node name used twice, once', () => {
    // Given
    const node = { name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };
    const files: WorkflowFile[] = [{ path: 'workflows/twice.json', content: { ...EXPORT, nodes: [node, node, node] } }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [{ kind: 'invalid-shape', path: 'workflows/twice.json', detail: 'node name "Start" is used twice' }],
    });
  });

  test('Should reject a connection from or to a node that does not exist, and a malformed one', () => {
    // Given
    const node = { name: 'Start', type: 'n8n-nodes-base.manualTrigger', typeVersion: 1, position: [0, 0], parameters: {} };
    const connections = {
      Start: { main: [[{ node: 'Missing', type: 'main', index: 0 }]] },
      Ghost: { main: [[{ node: 'Start', type: 'main', index: 0 }]] },
      Broken: 'nope',
    };
    const files: WorkflowFile[] = [{ path: 'workflows/edges.workflow.ts', content: { ...EXPORT, nodes: [node], connections } }];

    // When
    const result = loadWorkflows(files);

    // Then
    expect(result).toEqual({
      ok: false,
      problems: [
        {
          kind: 'invalid-shape',
          path: 'workflows/edges.workflow.ts',
          detail:
            'connection from "Start" to "Missing": no node named "Missing"; ' +
            'connection from "Ghost": no node named "Ghost"; ' +
            'connection from "Broken": no node named "Broken"; ' +
            'connection from "Broken" must map each output type to lists of { node, type, index }',
        },
      ],
    });
  });
});
