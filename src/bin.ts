#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMANDS } from '#src/cli/registry';
import { runCli } from '#src/cli/run-cli';

async function main(): Promise<void> {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
  const result = await runCli(process.argv.slice(2), {
    version: packageJson.version,
    registry: COMMANDS,
    env: process.env,
    dotEnv: readDotEnv(join(process.cwd(), '.env')),
    nodeVersion: process.versions.node,
    fetch: globalThis.fetch,
  });

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}

function readDotEnv(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

void main();
