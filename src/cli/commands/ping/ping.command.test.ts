import { describe, expect, test } from 'vitest';
import { CommandContext } from '#src/cli/cli.model';
import { fakeContext } from '#src/cli/cli.fake';
import { pingCommand } from '#src/cli/commands/ping/ping.command';

const INPUT = { positionals: [], values: {} };
const API_KEY = 'super-secret-key';
const ENV = { N8N_URL: 'https://n8n.example.com', N8N_API_KEY: API_KEY };

/** A `fetch` that answers by path: `/healthz` and `/api/v1/workflows`. */
function fakeN8n(statuses: { health?: number; apiKey?: number; error?: Error }): {
  fetch: typeof fetch;
  urls: string[];
} {
  const urls: string[] = [];
  const fetch = (input: string | URL | Request): Promise<Response> => {
    const url = input instanceof Request ? input.url : input.toString();
    urls.push(url);
    if (statuses.error !== undefined) {
      return Promise.reject(statuses.error);
    }
    const status = url.includes('/api/v1/') ? (statuses.apiKey ?? 200) : (statuses.health ?? 200);
    return Promise.resolve(new Response('{}', { status }));
  };
  return { fetch, urls };
}

function context(overrides: Partial<CommandContext>): CommandContext {
  return fakeContext({ registry: [pingCommand], nodeVersion: '24.1.0', ...overrides });
}

describe('pingCommand', () => {
  test('Should exit 1 and print the lines to add when both values are missing', async () => {
    // Given
    const ctx = context({});

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Missing N8N_URL and N8N_API_KEY.');
    expect(result.stderr).toContain('  N8N_URL=https://your-n8n.example.com\n');
    expect(result.stderr).toContain('  N8N_API_KEY=your-n8n-api-key\n');
  });

  test('Should exit 1 and name only the missing value', async () => {
    // Given
    const ctx = context({ dotEnv: 'N8N_URL=https://n8n.example.com\n' });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Missing N8N_API_KEY.');
    expect(result.stderr).not.toContain('N8N_URL=');
  });

  test('Should exit 0 and report every check when the instance accepts the key', async () => {
    // Given
    const { fetch, urls } = fakeN8n({});
    const ctx = context({ env: ENV, fetch });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(urls).toEqual(['https://n8n.example.com/healthz', 'https://n8n.example.com/api/v1/workflows?limit=1']);
    expect(result.stdout).toBe(`n8nlift ping
  URL      https://n8n.example.com (from env)
  API key  •••• (set, from env)

✓ Node     24.1.0 (requires ≥ 22.18.0)
✓ URL      reachable (GET /healthz → 200)
✓ API key  accepted (GET /api/v1/workflows → 200)

All checks passed.
`);
  });

  test('Should never print the API key', async () => {
    // Given
    const { fetch } = fakeN8n({ apiKey: 401 });
    const ctx = context({ env: ENV, fetch });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.stdout).not.toContain(API_KEY);
    expect(result.stderr).not.toContain(API_KEY);
    expect(result.stdout).toContain('API key  •••• (set, from env)');
  });

  test('Should show where each value comes from', async () => {
    // Given
    const { fetch } = fakeN8n({});
    const ctx = context({
      env: { N8N_API_KEY: API_KEY },
      dotEnv: 'N8N_URL=https://from-file.example.com\nN8N_API_KEY=other',
      fetch,
    });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.stdout).toContain('URL      https://from-file.example.com (from .env)');
    expect(result.stdout).toContain('API key  •••• (set, from env)');
  });

  test('Should exit 2 when Node is too old', async () => {
    // Given
    const { fetch, urls } = fakeN8n({});
    const ctx = context({ env: ENV, fetch, nodeVersion: '20.11.0' });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(2);
    expect(urls).toEqual([]);
    expect(result.stdout).toContain('✗ Node     20.11.0 is too old (requires ≥ 22.18.0)');
    expect(result.stdout).toContain('– URL      skipped because the Node check failed');
  });

  test('Should exit 3, skip the API key and warn about http:// when the URL is unreachable', async () => {
    // Given
    const refused = new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } });
    const { fetch } = fakeN8n({ error: refused });
    const ctx = context({ env: { ...ENV, N8N_URL: 'http://localhost:1' }, fetch });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(3);
    expect(result.stdout).toContain('  ! N8N_URL uses http://');
    expect(result.stdout).toContain('✗ URL      unreachable: connection refused');
    expect(result.stdout).toContain('           → Check N8N_URL');
    expect(result.stdout).toContain('– API key  skipped because the URL check failed');
    expect(result.stderr).toBe('1 check failed. Exit code 3.\n');
  });

  test('Should exit 4 with a next step when the API key is rejected', async () => {
    // Given
    const { fetch } = fakeN8n({ apiKey: 401 });
    const ctx = context({ env: ENV, fetch });

    // When
    const result = await pingCommand.run(INPUT, ctx);

    // Then
    expect(result.exitCode).toBe(4);
    expect(result.stdout).toContain('✗ API key  rejected (GET /api/v1/workflows → 401)');
    expect(result.stdout).toContain(
      '           → Create a key in n8n → Settings → n8n API, then set N8N_API_KEY in .env',
    );
    expect(result.stdout).toContain('1 check failed. Exit code 4.');
    expect(result.stderr).toBe('1 check failed. Exit code 4.\n');
  });
});
