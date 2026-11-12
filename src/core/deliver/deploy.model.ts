import { LocalWorkflow } from '#src/core/compile/workflow.model';
import { N8nClient } from '#src/core/n8n/n8n.model';

export type DeployAction = 'created' | 'updated' | 'skipped';

export interface DeployResult {
  stableName: string;
  path: string;
  action: DeployAction;
  /** The workflow id on the instance. */
  id: string;
  name: string;
}

export interface DeployError {
  /** The workflow being processed, or none when the failure came before any workflow. */
  stableName?: string;
  /** The call that failed, for example `PUT /api/v1/workflows/abc`. */
  call: string;
  detail: string;
  /** The next step for the user. */
  hint: string;
  exitCode: number;
}

export interface DeployReport {
  /** The workflows processed before any failure, in stable-name order. */
  results: DeployResult[];
  error?: DeployError;
}

export interface DeployInput {
  workflows: LocalWorkflow[];
  client: N8nClient;
}
