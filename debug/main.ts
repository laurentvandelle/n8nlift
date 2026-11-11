import { runCli } from 'n8nlift';

const result = runCli(['--help'], '0.0.0');
process.stdout.write(result.stdout);
