import { LocalWorkflow } from '#src/core/compile/workflow.model';
import { N8nWorkflow } from '#src/core/n8n/n8n.model';

export interface Comparable {
  name: string;
  nodes: unknown[];
  connections: unknown;
  settings: Record<string, unknown>;
}

/**
 * The part of a workflow that deploy compares. Node `id` and `webhookId` are dropped, credentials keep
 * only their name per type, nodes are sorted by name, and settings keep only the keys the local file sets,
 * so server defaults (for example `redactionPolicy`) never count as a change.
 */
export function comparable(
  workflow: Pick<N8nWorkflow, 'name' | 'nodes' | 'connections' | 'settings'>,
  settingsKeys: string[],
): Comparable {
  const nodes = (workflow.nodes ?? []).map(normalizeNode);
  nodes.sort((a, b) => nodeName(a).localeCompare(nodeName(b)));
  const settings = workflow.settings ?? {};
  return {
    name: workflow.name,
    nodes,
    connections: workflow.connections ?? {},
    settings: Object.fromEntries(settingsKeys.filter((key) => key in settings).map((key) => [key, settings[key]])),
  };
}

/** True when the instance's current draft already holds the local workflow. */
export function isSameContent(local: LocalWorkflow, remote: N8nWorkflow): boolean {
  const keys = Object.keys(local.settings);
  return stableStringify(comparable(local, keys)) === stableStringify(comparable(remote, keys));
}

function normalizeNode(node: unknown): unknown {
  if (typeof node !== 'object' || node === null) {
    return node;
  }
  const { id: _id, webhookId: _webhookId, credentials, ...rest } = node as Record<string, unknown>;
  if (typeof credentials !== 'object' || credentials === null) {
    return rest;
  }
  const reduced = Object.fromEntries(
    Object.entries(credentials as Record<string, unknown>).map(([type, value]) => [
      type,
      { name: typeof value === 'object' && value !== null ? (value as { name?: unknown }).name : undefined },
    ]),
  );
  return { ...rest, credentials: reduced };
}

function nodeName(node: unknown): string {
  const name = typeof node === 'object' && node !== null ? (node as { name?: unknown }).name : undefined;
  return typeof name === 'string' ? name : '';
}

/** JSON with object keys sorted, so key order never counts as a change. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
}
