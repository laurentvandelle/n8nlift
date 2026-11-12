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
});
