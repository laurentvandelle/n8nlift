import { CommandContext } from '#src/cli/cli.model';

/** A `CommandContext` for tests: no env, no `.env`, a recent Node, a `fetch` that fails if called, no workflow files. */
export function fakeContext(overrides: Partial<CommandContext> = {}): CommandContext {
  return {
    version: '0.0.0',
    registry: [],
    env: {},
    dotEnv: undefined,
    nodeVersion: '24.0.0',
    fetch: () => Promise.reject(new Error('fetch was called, but this test does not expect network calls')),
    loadWorkflowFiles: () => Promise.resolve([]),
    ...overrides,
  };
}
