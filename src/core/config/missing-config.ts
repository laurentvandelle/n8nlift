import { ConfigKey } from '#src/core/config/config.model';

export const EXIT_MISSING_CONFIG = 1;

const EXAMPLE_LINES: Record<ConfigKey, string> = {
  N8N_URL: 'N8N_URL=https://your-n8n.example.com',
  N8N_API_KEY: 'N8N_API_KEY=your-n8n-api-key',
};

/** The message for missing connection values, with the lines to add to `.env`. Ends with a newline. */
export function describeMissingConfig(missing: ConfigKey[]): string {
  const lines = missing.map((key) => `  ${EXAMPLE_LINES[key]}`).join('\n');
  const one = missing.length === 1;
  return `Missing ${missing.join(' and ')}.\nAdd ${one ? 'this line' : 'these lines'} to .env, or set ${one ? 'it' : 'them'} in your environment:\n${lines}\n`;
}
