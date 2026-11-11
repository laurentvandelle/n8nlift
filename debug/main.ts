import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const bin = join(import.meta.dirname, '..', 'dist', 'bin.js');
execFileSync(process.execPath, [bin, '--help'], { stdio: 'inherit' });
