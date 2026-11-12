export type ConfigSource = 'env' | '.env';

export type ConfigKey = 'N8N_URL' | 'N8N_API_KEY';

export interface ConfigValue {
  value: string;
  source: ConfigSource;
}

export interface ConnectionConfig {
  url: ConfigValue;
  apiKey: ConfigValue;
}

export type ConfigResult = { ok: true; config: ConnectionConfig } | { ok: false; missing: ConfigKey[] };
