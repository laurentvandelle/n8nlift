// A workflow pasted from an n8n export (editor → ⋯ → Download) into defineWorkflow, as the default export.
// Its stable name is the file name: `demo`. Edit a parameter, then deploy again to get a draft.
// Break a connection target (for example 'Set mesage') and the editor flags it.
import { defineWorkflow } from 'n8nlift';

export default defineWorkflow({
  name: 'n8nlift demo',
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
      parameters: {
        assignments: {
          assignments: [
            { id: 'a1', name: 'message', value: 'Hello from n8nlift', type: 'string' },
          ],
        },
        options: {},
      },
      id: '8f2c1a52-1d7e-4b0e-9a8a-0d6f3c2b1a02',
      name: 'Set message',
      type: 'n8n-nodes-base.set',
      typeVersion: 3.4,
      position: [220, 0],
    },
  ],
  connections: {
    'When clicking ‘Execute workflow’': {
      main: [[{ node: 'Set message', type: 'main', index: 0 }]],
    },
  },
  settings: { executionOrder: 'v1' },
});
