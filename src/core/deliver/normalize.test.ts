import { describe, expect, test } from 'vitest';
import { LocalWorkflow } from '#src/core/compile/workflow.model';
import { isSameContent, stableStringify } from '#src/core/deliver/normalize';
import { N8nWorkflow } from '#src/core/n8n/n8n.model';

const LOCAL: LocalWorkflow = {
  stableName: 'crm',
  path: 'workflows/crm.json',
  name: 'CRM',
  nodes: [
    { id: 'l2', name: 'Slack', type: 'slack', credentials: { slackApi: { id: 'dev-1', name: 'Slack bot' } } },
    { id: 'l1', name: 'Hook', type: 'webhook', webhookId: 'local-hook' },
  ],
  connections: { Hook: { main: [[{ node: 'Slack', type: 'main', index: 0 }]] } },
  settings: { executionOrder: 'v1' },
};

function remote(overrides: Partial<N8nWorkflow> = {}): N8nWorkflow {
  return {
    id: 'abc',
    name: 'CRM',
    tags: [],
    nodes: [
      { webhookId: 'server-hook', type: 'webhook', name: 'Hook', id: 's1' },
      { name: 'Slack', type: 'slack', id: 's2', credentials: { slackApi: { id: 'prod-9', name: 'Slack bot' } } },
    ],
    connections: { Hook: { main: [[{ index: 0, type: 'main', node: 'Slack' }]] } },
    settings: { executionOrder: 'v1', redactionPolicy: 'none', saveManualExecutions: true },
    ...overrides,
  };
}

describe('isSameContent', () => {
  test('Should ignore node ids, webhook ids, credential ids, node order, key order and server-only settings', () => {
    // Given
    const draft = remote();

    // When
    const same = isSameContent(LOCAL, draft);

    // Then
    expect(same).toBe(true);
  });

  test.each<[string, Partial<N8nWorkflow>]>([
    ['the name', { name: 'CRM renamed' }],
    ['a setting the file sets', { settings: { executionOrder: 'v0' } }],
    ['the connections', { connections: {} }],
    ['a credential name', { nodes: [{ name: 'Hook', type: 'webhook' }, { name: 'Slack', type: 'slack', credentials: { slackApi: { name: 'Other' } } }] }],
  ])('Should see a change in %s', (_label, overrides) => {
    // Given
    const draft = remote(overrides);

    // When
    const same = isSameContent(LOCAL, draft);

    // Then
    expect(same).toBe(false);
  });
});

describe('stableStringify', () => {
  test('Should sort object keys at every depth', () => {
    // Given
    const value = { b: 1, a: { d: [{ z: 1, y: 2 }], c: 3 } };

    // When
    const text = stableStringify(value);

    // Then
    expect(text).toBe('{"a":{"c":3,"d":[{"y":2,"z":1}]},"b":1}');
  });
});
