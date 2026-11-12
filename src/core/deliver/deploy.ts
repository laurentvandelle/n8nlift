import { LocalWorkflow } from '#src/core/compile/workflow.model';
import { EXIT_API_KEY_REJECTED, EXIT_UNREACHABLE } from '#src/core/connection/check-connection';
import { DeployError, DeployInput, DeployReport, DeployResult } from '#src/core/deliver/deploy.model';
import { isSameContent } from '#src/core/deliver/normalize';
import { ApiFailure, ApiResult, N8nClient, N8nTag, N8nWorkflowBody } from '#src/core/n8n/n8n.model';

export const STABLE_TAG_PREFIX = 'n8nlift:';

/** Exit code when the instance holds two workflows with the same `n8nlift:` tag. */
export const EXIT_DUPLICATE_TAG = 1;

/** The tag that identifies a workflow on the instance. */
export function stableTag(stableName: string): string {
  return `${STABLE_TAG_PREFIX}${stableName}`;
}

class Stop extends Error {
  constructor(readonly deployError: DeployError) {
    super(deployError.detail);
  }
}

/**
 * Delivers the local workflows to the instance. New ones are created (never published) and tagged
 * `n8nlift:<stable-name>`; changed ones are updated as drafts (`publishIfActive=false`); unchanged ones are
 * skipped. Stops at the first failed call and returns what was done so far.
 */
export async function deploy({ workflows, client }: DeployInput): Promise<DeployReport> {
  const results: DeployResult[] = [];
  let current: string | undefined;
  try {
    const remote = unwrap(await client.listWorkflows());
    const byStableName = indexByStableTag(remote);
    const tags = lazyTags(client);
    for (const workflow of [...workflows].sort((a, b) => a.stableName.localeCompare(b.stableName))) {
      current = workflow.stableName;
      const match = byStableName.get(workflow.stableName);
      results.push(
        match === undefined
          ? await create(client, tags, workflow)
          : await update(client, workflow, match),
      );
    }
    return { results };
  } catch (error) {
    if (error instanceof Stop) {
      return { results, error: { ...error.deployError, ...(current === undefined ? {} : { stableName: current }) } };
    }
    throw error;
  }
}

function indexByStableTag(remote: { id: string; tags: N8nTag[] }[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const workflow of remote) {
    for (const tag of workflow.tags) {
      if (!tag.name.startsWith(STABLE_TAG_PREFIX)) {
        continue;
      }
      const stableName = tag.name.slice(STABLE_TAG_PREFIX.length);
      const other = index.get(stableName);
      if (other !== undefined) {
        throw new Stop({
          call: 'GET /api/v1/workflows',
          detail: `workflows ${other} and ${workflow.id} both carry the tag ${tag.name}`,
          hint: `Remove the tag ${tag.name} from one of them in the n8n editor, then run deploy again`,
          exitCode: EXIT_DUPLICATE_TAG,
        });
      }
      index.set(stableName, workflow.id);
    }
  }
  return index;
}

async function create(
  client: N8nClient,
  tags: (name: string) => Promise<N8nTag>,
  workflow: LocalWorkflow,
): Promise<DeployResult> {
  const created = unwrap(await client.createWorkflow(bodyOf(workflow)));
  const tag = await tags(stableTag(workflow.stableName));
  const existing = (created.tags ?? []).map(({ id }) => id).filter((id) => id !== tag.id);
  unwrap(await client.setWorkflowTags(created.id, [...existing, tag.id]));
  return result(workflow, 'created', created.id);
}

async function update(client: N8nClient, workflow: LocalWorkflow, id: string): Promise<DeployResult> {
  const remote = unwrap(await client.getWorkflow(id));
  if (isSameContent(workflow, remote)) {
    return result(workflow, 'skipped', id);
  }
  unwrap(await client.updateWorkflow(id, bodyOf(workflow)));
  return result(workflow, 'updated', id);
}

/** Finds a tag by name, creating it on first use. The tag list is read once. */
function lazyTags(client: N8nClient): (name: string) => Promise<N8nTag> {
  let cache: N8nTag[] | undefined;
  return async (name) => {
    cache ??= unwrap(await client.listTags());
    const found = cache.find((tag) => tag.name === name);
    if (found !== undefined) {
      return found;
    }
    const created = unwrap(await client.createTag(name));
    cache.push(created);
    return created;
  };
}

function bodyOf({ name, nodes, connections, settings }: LocalWorkflow): N8nWorkflowBody {
  return { name, nodes, connections, settings };
}

function result(workflow: LocalWorkflow, action: DeployResult['action'], id: string): DeployResult {
  return { stableName: workflow.stableName, path: workflow.path, action, id, name: workflow.name };
}

function unwrap<T>(result: ApiResult<T>): T {
  if (result.kind === 'ok') {
    return result.body;
  }
  throw new Stop(describeFailure(result));
}

function describeFailure(failure: ApiFailure): DeployError {
  if (failure.kind === 'unreachable') {
    return {
      call: failure.call,
      detail: `unreachable: ${failure.reason}`,
      hint: 'Check N8N_URL and your network, or run n8nlift ping, then run deploy again',
      exitCode: EXIT_UNREACHABLE,
    };
  }
  const detail = `HTTP ${failure.status}${failure.message === undefined ? '' : `: ${failure.message}`}`;
  if (failure.status === 401 || failure.status === 403) {
    return {
      call: failure.call,
      detail,
      hint: 'Create a key in n8n → Settings → n8n API, then set N8N_API_KEY in .env',
      exitCode: EXIT_API_KEY_REJECTED,
    };
  }
  return {
    call: failure.call,
    detail,
    hint: 'Check the workflow file and the n8n instance (n8n 2.35.0 or later), then run deploy again',
    exitCode: EXIT_UNREACHABLE,
  };
}
