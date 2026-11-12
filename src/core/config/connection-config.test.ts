import { describe, expect, test } from 'vitest';
import { resolveConnectionConfig } from '#src/core/config/connection-config';

describe('resolveConnectionConfig', () => {
  test('Should read both values from the environment', () => {
    // Given
    const env = { N8N_URL: 'https://n8n.example.com', N8N_API_KEY: 'secret' };

    // When
    const result = resolveConnectionConfig(env, undefined);

    // Then
    expect(result).toEqual({
      ok: true,
      config: {
        url: { value: 'https://n8n.example.com', source: 'env' },
        apiKey: { value: 'secret', source: 'env' },
      },
    });
  });

  test('Should read both values from the .env text', () => {
    // Given
    const dotEnv = 'N8N_URL=https://n8n.example.com\n# a comment\nN8N_API_KEY="secret"\n';

    // When
    const result = resolveConnectionConfig({}, dotEnv);

    // Then
    expect(result).toEqual({
      ok: true,
      config: {
        url: { value: 'https://n8n.example.com', source: '.env' },
        apiKey: { value: 'secret', source: '.env' },
      },
    });
  });

  test('Should prefer the environment over .env', () => {
    // Given
    const env = { N8N_URL: 'https://from-env.example.com' };
    const dotEnv = 'N8N_URL=https://from-file.example.com\nN8N_API_KEY=secret';

    // When
    const result = resolveConnectionConfig(env, dotEnv);

    // Then
    expect(result).toEqual({
      ok: true,
      config: {
        url: { value: 'https://from-env.example.com', source: 'env' },
        apiKey: { value: 'secret', source: '.env' },
      },
    });
  });

  test('Should fall back to .env when the environment value is empty', () => {
    // Given
    const env = { N8N_URL: '', N8N_API_KEY: 'secret' };
    const dotEnv = 'N8N_URL=https://n8n.example.com';

    // When
    const result = resolveConnectionConfig(env, dotEnv);

    // Then
    expect(result).toMatchObject({ ok: true, config: { url: { value: 'https://n8n.example.com', source: '.env' } } });
  });

  test('Should strip trailing slashes from the URL', () => {
    // Given
    const env = { N8N_URL: 'https://n8n.example.com//', N8N_API_KEY: 'secret' };

    // When
    const result = resolveConnectionConfig(env, undefined);

    // Then
    expect(result).toMatchObject({ ok: true, config: { url: { value: 'https://n8n.example.com' } } });
  });

  test('Should list every missing value', () => {
    // Given
    const env = { N8N_URL: '  ' };

    // When
    const result = resolveConnectionConfig(env, 'OTHER=1');

    // Then
    expect(result).toEqual({ ok: false, missing: ['N8N_URL', 'N8N_API_KEY'] });
  });
});
