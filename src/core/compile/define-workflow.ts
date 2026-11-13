import { Workflow, WorkflowDefinition, WorkflowNode } from '#src/core/compile/workflow.model';

/**
 * Types an n8n workflow export pasted into a `.workflow.ts` file, and returns it unchanged.
 * The editor then flags a node missing `name`, `type`, `typeVersion`, `position` or `parameters`,
 * a connection from or to a node that does not exist, and a node name used twice.
 *
 * ```ts
 * import { defineWorkflow } from 'n8nlift';
 * export default defineWorkflow({ name: 'Invoice sync', nodes: [...], connections: {...} });
 * ```
 */
export function defineWorkflow<const Nodes extends readonly WorkflowNode[]>(
  workflow: WorkflowDefinition<Nodes>,
): Workflow<Nodes[number]['name']> {
  return workflow;
}
