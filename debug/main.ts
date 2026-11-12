import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const bin = join(import.meta.dirname, '..', 'dist', 'bin.js');
// execFileSync(process.execPath, [bin, '--help'], { stdio: 'inherit' });
// console.log('--------------------------------');
// execFileSync(process.execPath, [bin, 'ping'], { stdio: 'inherit' });
// console.log('--------------------------------');
// Delivers ./workflows (demo.workflow.ts and sub/other.json). Run it twice: the second run skips both.
execFileSync(process.execPath, [bin, 'deploy'], { stdio: 'inherit' });
