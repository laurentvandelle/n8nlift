// A first workflow: a manual trigger, then a Code node. Its stable name is the file name: `hello`.
// Replace it with an export from the n8n editor (⋯ → Download), pasted into defineWorkflow.
import { defineWorkflow } from 'boilerlift';
import { sayHello } from '#code/hello';

export default defineWorkflow({
  name: 'Hello from Boilerlift',
  nodes: [
    {
      parameters: {},
      id: '3b0d6c1e-6f43-4f5a-9d2e-1a7c5e8b9f01',
      name: 'When clicking ‘Execute workflow’',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [0, 0],
    },
    {
      parameters: {
        // The function from code/hello.ts, tested by code/hello.test.ts, then called on the node's input.
        jsCode: `${sayHello.toString()}\n\nreturn sayHello($input.all());`,
      },
      id: '3b0d6c1e-6f43-4f5a-9d2e-1a7c5e8b9f02',
      name: 'Say hello',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [220, 0],
    },
  ],
  connections: {
    'When clicking ‘Execute workflow’': {
      main: [[{ node: 'Say hello', type: 'main', index: 0 }]],
    },
  },
  settings: { executionOrder: 'v1' },
});
