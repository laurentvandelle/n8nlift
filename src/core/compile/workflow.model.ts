/** One file found under `./workflows`: its parsed content, or why it could not be read. */
export type WorkflowFile =
  | {
      /** Path relative to the current folder, with `/` separators (for example `workflows/crm/import.json`). */
      path: string;
      /** The parsed JSON, or the `default` export of a `.workflow.ts` module. */
      content: unknown;
    }
  | { path: string; error: string };

/** A local workflow ready to deliver. */
export interface LocalWorkflow {
  /** The file base name without `.workflow.ts` / `.json`. It identifies the workflow on the instance. */
  stableName: string;
  path: string;
  name: string;
  nodes: unknown[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export type LoadProblemKind = 'invalid-name' | 'duplicate-name' | 'unreadable' | 'invalid-shape';

export interface LoadProblem {
  kind: LoadProblemKind;
  path: string;
  /** What is wrong, in one sentence. */
  detail: string;
}

export type LoadResult = { ok: true; workflows: LocalWorkflow[] } | { ok: false; problems: LoadProblem[] };
