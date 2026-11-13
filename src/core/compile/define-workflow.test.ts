import { describe, expect, test } from 'vitest';
import { defineWorkflow } from '#src/core/compile/define-workflow';

const TRIGGER = {
  parameters: {},
  name: 'Start',
  type: 'n8n-nodes-base.manualTrigger',
  typeVersion: 1,
  position: [0, 0],
} as const;

const SET = {
  parameters: { options: {} },
  name: 'Set message',
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: [220, 0],
} as const;

describe('defineWorkflow', () => {
  test('Should return its argument unchanged', () => {
    // Given
    const workflow = {
      name: 'Demo',
      nodes: [TRIGGER, SET],
      connections: { Start: { main: [[{ node: 'Set message', type: 'main', index: 0 }]] } },
    } as const;

    // When
    const result = defineWorkflow(workflow);

    // Then
    expect(result).toBe(workflow);
  });

  test('Should accept a full n8n export pasted as is', () => {
    // Given
    const pasted = (): unknown =>
      defineWorkflow({
        name: 'Pasted export',
        nodes: [
          {
            parameters: {},
            id: '8f2c1a52-1d7e-4b0e-9a8a-0d6f3c2b1a01',
            name: 'When clicking ‘Execute workflow’',
            type: 'n8n-nodes-base.manualTrigger',
            typeVersion: 1,
            position: [0, 0],
          },
          {
            parameters: { assignments: { assignments: [{ id: 'a1', name: 'message', value: 'Hi', type: 'string' }] } },
            id: '8f2c1a52-1d7e-4b0e-9a8a-0d6f3c2b1a02',
            name: 'Set message',
            type: 'n8n-nodes-base.set',
            typeVersion: 3.4,
            position: [220, 0],
            disabled: false,
          },
        ],
        connections: {
          'When clicking ‘Execute workflow’': { main: [[{ node: 'Set message', type: 'main', index: 0 }], null] },
        },
        settings: { executionOrder: 'v1' },
        pinData: {},
        meta: { instanceId: 'abc' },
        versionId: '1c2d',
        active: false,
        tags: [],
        id: 'wf1',
      });

    // When
    const result = pasted();

    // Then
    expect(result).toMatchObject({ name: 'Pasted export', versionId: '1c2d' });
  });

  test('Should reject wrong shapes at type-check time', () => {
    // Given
    const checks = (): unknown[] => [
      defineWorkflow({
        name: 'Missing typeVersion',
        // @ts-expect-error a node needs typeVersion
        nodes: [{ parameters: {}, name: 'Start', type: 'n8n-nodes-base.manualTrigger', position: [0, 0] }],
        connections: {},
      }),
      defineWorkflow({
        name: 'Unknown target',
        nodes: [TRIGGER, SET],
        // @ts-expect-error "Set mesage" is not a node name
        connections: { Start: { main: [[{ node: 'Set mesage', type: 'main', index: 0 }]] } },
      }),
      defineWorkflow({
        name: 'Unknown source',
        nodes: [TRIGGER, SET],
        connections: {
          // @ts-expect-error "Stat" is not a node name
          Stat: { main: [[{ node: 'Set message', type: 'main', index: 0 }]] },
        },
      }),
      defineWorkflow({
        name: 'Duplicate name',
        // @ts-expect-error "Start" is used twice
        nodes: [TRIGGER, { ...SET, name: 'Start' }],
        connections: {},
      }),
    ];

    // When
    const workflows = checks();

    // Then
    expect(workflows).toHaveLength(4);
  });
});
