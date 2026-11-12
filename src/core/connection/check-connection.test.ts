import { describe, expect, test } from 'vitest';
import { ConnectionConfig } from '#src/core/config/config.model';
import { checkConnection, compareVersions } from '#src/core/connection/check-connection';
import { N8nClient, ProbeResult } from '#src/core/n8n/n8n.model';

const HTTPS_CONFIG: ConnectionConfig = {
  url: { value: 'https://n8n.example.com', source: 'env' },
  apiKey: { value: 'secret', source: 'env' },
};

interface FakeClient extends Pick<N8nClient, 'checkHealth' | 'checkApiKey'> {
  calls: string[];
}

function fakeClient(health: ProbeResult, apiKey: ProbeResult): FakeClient {
  const calls: string[] = [];
  return {
    calls,
    checkHealth: (): Promise<ProbeResult> => {
      calls.push('health');
      return Promise.resolve(health);
    },
    checkApiKey: (): Promise<ProbeResult> => {
      calls.push('apiKey');
      return Promise.resolve(apiKey);
    },
  };
}

const OK: ProbeResult = { kind: 'ok', status: 200 };

describe('checkConnection', () => {
  test('Should pass every check and exit 0 when the instance accepts the key', async () => {
    // Given
    const client = fakeClient(OK, OK);

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(0);
    expect(report.warnings).toEqual([]);
    expect(report.checks.map(({ name, status }) => [name, status])).toEqual([
      ['node', 'ok'],
      ['url', 'ok'],
      ['apiKey', 'ok'],
    ]);
    expect(report.checks[1]?.detail).toBe('reachable (GET /healthz → 200)');
  });

  test('Should fail with exit 2 and skip the other checks when Node is too old', async () => {
    // Given
    const client = fakeClient(OK, OK);

    // When
    const report = await checkConnection({ nodeVersion: '22.17.1', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(2);
    expect(report.checks[0]).toMatchObject({ status: 'failed', hint: 'Install Node 22.18 or later' });
    expect(report.checks[1]).toMatchObject({ status: 'skipped', detail: 'skipped because the Node check failed' });
    expect(report.checks[2]).toMatchObject({ status: 'skipped' });
    expect(client.calls).toEqual([]);
  });

  test('Should fail with exit 3 and skip the API key when the URL is unreachable', async () => {
    // Given
    const client = fakeClient({ kind: 'unreachable', reason: 'connection refused' }, OK);

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(3);
    expect(report.checks[1]).toMatchObject({ status: 'failed', detail: 'unreachable: connection refused' });
    expect(report.checks[1]?.hint).toContain('Check N8N_URL');
    expect(report.checks[2]).toMatchObject({ status: 'skipped', detail: 'skipped because the URL check failed' });
    expect(client.calls).toEqual(['health']);
  });

  test('Should fail with exit 3 when /healthz answers with an error status', async () => {
    // Given
    const client = fakeClient({ kind: 'http-error', status: 503 }, OK);

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(3);
    expect(report.checks[1]?.detail).toBe('not healthy (GET /healthz → 503)');
  });

  test.each([[401], [403]])('Should fail with exit 4 when the API key gets %s', async (status) => {
    // Given
    const client = fakeClient(OK, { kind: 'http-error', status });

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(4);
    expect(report.checks[2]).toMatchObject({
      status: 'failed',
      detail: `rejected (GET /api/v1/workflows → ${status})`,
      hint: 'Create a key in n8n → Settings → n8n API, then set N8N_API_KEY in .env',
    });
  });

  test('Should fail with exit 3 when the public API is not found', async () => {
    // Given
    const client = fakeClient(OK, { kind: 'http-error', status: 404 });

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

    // Then
    expect(report.exitCode).toBe(3);
    expect(report.checks[2]?.detail).toBe('public API not found at /api/v1 (GET /api/v1/workflows → 404)');
    expect(report.checks[2]?.hint).toContain('public API is enabled');
  });

  test.each<[ProbeResult]>([[{ kind: 'http-error', status: 500 }], [{ kind: 'unreachable', reason: 'connection reset' }]])(
    'Should fail with exit 3 when the API key check gets %o',
    async (apiKey) => {
      // Given
      const client = fakeClient(OK, apiKey);

      // When
      const report = await checkConnection({ nodeVersion: '24.1.0', config: HTTPS_CONFIG, client });

      // Then
      expect(report.exitCode).toBe(3);
      expect(report.checks[2]?.status).toBe('failed');
    },
  );

  test('Should warn without failing when the URL uses http://', async () => {
    // Given
    const config: ConnectionConfig = { ...HTTPS_CONFIG, url: { value: 'http://localhost:5678', source: '.env' } };

    // When
    const report = await checkConnection({ nodeVersion: '24.1.0', config, client: fakeClient(OK, OK) });

    // Then
    expect(report.exitCode).toBe(0);
    expect(report.warnings).toHaveLength(1);
    expect(report.warnings[0]).toContain('http://');
  });
});

describe('compareVersions', () => {
  test.each([
    ['22.18.0', '22.18.0', 0],
    ['22.18.1', '22.18.0', 1],
    ['22.9.0', '22.18.0', -1],
    ['v24.0.0', '22.18.0', 1],
    ['23.0.0-nightly', '22.18.0', 1],
  ])('Should compare %s with %s as %s', (left, right, expected) => {
    // Given
    const versions = [left, right] as const;

    // When
    const result = compareVersions(...versions);

    // Then
    expect(result).toBe(expected);
  });
});
