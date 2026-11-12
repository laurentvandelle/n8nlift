#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMMANDS } from '#src/cli/registry';
import { runCli } from '#src/cli/run-cli';

const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { version: string };
const result = runCli(process.argv.slice(2), { version: packageJson.version, registry: COMMANDS });

process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.exitCode;
