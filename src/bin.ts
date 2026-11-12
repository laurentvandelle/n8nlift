#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { WorkflowFile } from '#src/cli/cli.model';
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
    loadWorkflowFiles,
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

/** Reads every `*.workflow.ts` and `*.json` file under `dir`, recursively, sorted by path. */
async function loadWorkflowFiles(dir: string): Promise<WorkflowFile[]> {
  let entries: string[];
  try {
    entries = await readdir(dir, { recursive: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  const files = entries
    .filter((entry) => entry.endsWith('.workflow.ts') || entry.endsWith('.json'))
    .filter((entry) => !entry.split(sep).includes('node_modules'))
    .map((entry) => resolve(dir, entry))
    .sort();
  return Promise.all(files.map(readWorkflowFile));
}

async function readWorkflowFile(absolute: string): Promise<WorkflowFile> {
  const path = relative(process.cwd(), absolute).split(sep).join('/');
  try {
    if (absolute.endsWith('.json')) {
      return { path, content: JSON.parse(await readFile(absolute, 'utf8')) as unknown };
    }
    // Node 22.18 and later strip TypeScript types natively, so a .workflow.ts file imports as is.
    const module = (await import(pathToFileURL(absolute).href)) as { default?: unknown };
    return { path, content: module.default };
  } catch (error) {
    return { path, error: error instanceof Error ? error.message : String(error) };
  }
}

void main();
