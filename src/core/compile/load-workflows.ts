import { LoadProblem, LoadResult, LocalWorkflow, WorkflowFile } from '#src/core/compile/workflow.model';

export const STABLE_NAME_PATTERN = /^[a-z0-9-]{1,16}$/;

const EXTENSIONS = ['.workflow.ts', '.json'];

/** The file base name without `.workflow.ts` / `.json`. */
export function stableNameOf(path: string): string {
  const base = path.split(/[\\/]/).pop() ?? path;
  const extension = EXTENSIONS.find((candidate) => base.endsWith(candidate));
  return extension === undefined ? base : base.slice(0, -extension.length);
}

/**
 * Turns the files found under `./workflows` into local workflows. Pure, no I/O.
 * Any problem (invalid or duplicate stable name, unreadable file, missing field, invalid node, duplicate node
 * name, connection to a node that does not exist) fails the whole load,
 * so nothing is sent while one file is wrong.
 */
export function loadWorkflows(files: WorkflowFile[]): LoadResult {
  const problems: LoadProblem[] = [];
  const workflows: LocalWorkflow[] = [];
  const seen = new Map<string, string>();

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const stableName = stableNameOf(file.path);
    if (!STABLE_NAME_PATTERN.test(stableName)) {
      problems.push({
        kind: 'invalid-name',
        path: file.path,
        detail: `stable name "${stableName}" must be 1 to 16 lowercase letters, digits or dashes; rename the file`,
      });
      continue;
    }
    const firstPath = seen.get(stableName);
    if (firstPath !== undefined) {
      problems.push({
        kind: 'duplicate-name',
        path: file.path,
        detail: `stable name "${stableName}" is also used by ${firstPath}; rename one of the two files`,
      });
      continue;
    }
    seen.set(stableName, file.path);
    if ('error' in file) {
      problems.push({ kind: 'unreadable', path: file.path, detail: `cannot be read: ${file.error}` });
      continue;
    }
    const workflow = toWorkflow(stableName, file.path, file.content);
    if (typeof workflow === 'string') {
      problems.push({ kind: 'invalid-shape', path: file.path, detail: workflow });
      continue;
    }
    workflows.push(workflow);
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }
  return { ok: true, workflows: workflows.sort((a, b) => a.stableName.localeCompare(b.stableName)) };
}

/** The workflow, or a sentence saying what is missing. */
function toWorkflow(stableName: string, path: string, content: unknown): LocalWorkflow | string {
  if (!isRecord(content)) {
    return 'must hold an n8n workflow export (an object with name, nodes and connections)';
  }
  const missing: string[] = [];
  if (typeof content.name !== 'string' || content.name.trim() === '') missing.push('name (a string)');
  if (!Array.isArray(content.nodes)) missing.push('nodes (an array)');
  if (!isRecord(content.connections)) missing.push('connections (an object)');
  if (content.settings !== undefined && !isRecord(content.settings)) missing.push('settings (an object, when set)');
  if (missing.length > 0) {
    return `missing or invalid ${missing.join(', ')}`;
  }
  const graphProblems = checkGraph(content.nodes as unknown[], content.connections as Record<string, unknown>);
  if (graphProblems.length > 0) {
    return graphProblems.join('; ');
  }
  return {
    stableName,
    path,
    name: content.name as string,
    nodes: content.nodes as unknown[],
    connections: content.connections as Record<string, unknown>,
    settings: (content.settings as Record<string, unknown> | undefined) ?? {},
  };
}

/** What is wrong with the nodes and connections, one clause each: node fields, duplicate names, dangling edges. */
function checkGraph(nodes: unknown[], connections: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const names = new Set<string>();
  const reported = new Set<string>();

  nodes.forEach((node, index) => {
    if (!isRecord(node)) {
      problems.push(`node at index ${index} must be an object`);
      return;
    }
    const hasName = typeof node.name === 'string' && node.name.trim() !== '';
    const missing: string[] = [];
    if (!hasName) missing.push('name (a non-empty string)');
    if (typeof node.type !== 'string') missing.push('type (a string)');
    if (typeof node.typeVersion !== 'number') missing.push('typeVersion (a number)');
    if (!isPosition(node.position)) missing.push('position (two numbers)');
    if (!isRecord(node.parameters)) missing.push('parameters (an object)');
    if (missing.length > 0) {
      const label = hasName ? `node "${node.name as string}"` : `node at index ${index}`;
      problems.push(`${label} has a missing or invalid ${missing.join(', ')}`);
    }
    if (!hasName) return;
    const name = node.name as string;
    if (names.has(name)) {
      if (!reported.has(name)) problems.push(`node name "${name}" is used twice`);
      reported.add(name);
    }
    names.add(name);
  });

  for (const [source, outputs] of Object.entries(connections)) {
    if (!names.has(source)) {
      problems.push(`connection from "${source}": no node named "${source}"`);
    }
    for (const target of connectionTargets(outputs)) {
      if (target === undefined) {
        problems.push(`connection from "${source}" must map each output type to lists of { node, type, index }`);
      } else if (!names.has(target)) {
        problems.push(`connection from "${source}" to "${target}": no node named "${target}"`);
      }
    }
  }
  return problems;
}

/** Every target node name under one source of `connections`; `undefined` once for a malformed entry. */
function connectionTargets(outputs: unknown): (string | undefined)[] {
  if (!isRecord(outputs)) return [undefined];
  const targets: string[] = [];
  for (const lists of Object.values(outputs)) {
    if (!Array.isArray(lists)) return [undefined];
    for (const list of lists as unknown[]) {
      if (list === null) continue;
      if (!Array.isArray(list)) return [undefined];
      for (const edge of list as unknown[]) {
        if (!isRecord(edge) || typeof edge.node !== 'string') return [undefined];
        targets.push(edge.node);
      }
    }
  }
  return targets;
}

function isPosition(value: unknown): boolean {
  return Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === 'number');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
