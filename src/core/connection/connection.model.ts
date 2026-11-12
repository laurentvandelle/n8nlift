import { ConnectionConfig } from '#src/core/config/config.model';
import { N8nClient } from '#src/core/n8n/n8n.model';

export type CheckName = 'node' | 'url' | 'apiKey';

export type CheckStatus = 'ok' | 'failed' | 'skipped';

export interface Check {
  name: CheckName;
  status: CheckStatus;
  detail: string;
  /** The next step for the user, set on a failed check. */
  hint?: string;
  /** The process exit code, set on a failed check. */
  exitCode?: number;
}

export interface ConnectionReport {
  checks: Check[];
  warnings: string[];
  /** The first failed check's exit code, or 0 when every check passed. */
  exitCode: number;
}

export interface CheckConnectionInput {
  nodeVersion: string;
  config: ConnectionConfig;
  /** Only the two read-only probes: `ping` never writes. */
  client: Pick<N8nClient, 'checkHealth' | 'checkApiKey'>;
}
