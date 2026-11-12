import { parseEnv } from 'node:util';
import { ConfigKey, ConfigResult, ConfigValue } from '#src/core/config/config.model';

/**
 * Reads `N8N_URL` and `N8N_API_KEY` from the environment, then from the text of `./.env`.
 * A real environment variable wins over `.env`. Empty values count as missing.
 */
export function resolveConnectionConfig(
  env: Readonly<Record<string, string | undefined>>,
  dotEnvText: string | undefined,
): ConfigResult {
  const dotEnv = dotEnvText === undefined ? {} : parseEnv(dotEnvText);
  const url = pick('N8N_URL', env, dotEnv);
  const apiKey = pick('N8N_API_KEY', env, dotEnv);
  if (url === undefined || apiKey === undefined) {
    const missing: ConfigKey[] = [];
    if (url === undefined) missing.push('N8N_URL');
    if (apiKey === undefined) missing.push('N8N_API_KEY');
    return { ok: false, missing };
  }
  return { ok: true, config: { url: { ...url, value: url.value.replace(/\/+$/, '') }, apiKey } };
}

function pick(
  key: ConfigKey,
  env: Readonly<Record<string, string | undefined>>,
  dotEnv: Readonly<Record<string, string | undefined>>,
): ConfigValue | undefined {
  const fromEnv = env[key]?.trim();
  if (fromEnv !== undefined && fromEnv !== '') {
    return { value: fromEnv, source: 'env' };
  }
  const fromDotEnv = dotEnv[key]?.trim();
  if (fromDotEnv !== undefined && fromDotEnv !== '') {
    return { value: fromDotEnv, source: '.env' };
  }
  return undefined;
}
