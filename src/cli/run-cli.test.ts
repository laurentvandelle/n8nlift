import { describe, expect, test } from 'vitest';
import { CommandContext, CommandDefinition } from '@/cli/cli.model';
import { helpCommand, renderCommandHelp, renderGlobalHelp } from '@/cli/commands/help/help.command';
import { versionCommand } from '@/cli/commands/version/version.command';
import { runCli } from '@/cli/run-cli';

const echoCommand: CommandDefinition = {
  name: 'echo',
  summary: 'Echo the parsed input',
  usage: 'n8nlift echo [options]',
  allowPositionals: false,
  options: { name: { type: 'string', short: 'n', description: 'Name to echo' } },
  run: ({ values }) => ({ exitCode: 0, stdout: `${String(values.name)}\n`, stderr: '' }),
};

const ctx: CommandContext = { version: '1.2.3', registry: [helpCommand, versionCommand, echoCommand] };
const GLOBAL_HELP = renderGlobalHelp(ctx.registry);

describe('runCli', () => {
  test.each([['--version'], ['-v'], ['version']])('Should print the version when called with %s', (arg) => {
    // Given
    const args = [arg];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: '1.2.3\n', stderr: '' });
  });

  test.each([['--help'], ['-h'], ['help']])('Should print the global help when called with %s', (arg) => {
    // Given
    const args = [arg];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: GLOBAL_HELP, stderr: '' });
  });

  test('Should print the global help when called without arguments', () => {
    // Given
    const args: string[] = [];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: GLOBAL_HELP, stderr: '' });
  });

  test('Should print the help of a command when called with --help after it', () => {
    // Given
    const args = ['version', '--help'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: renderCommandHelp(versionCommand), stderr: '' });
  });

  test('Should parse the options of a command and pass them to it', () => {
    // Given
    const args = ['echo', '-n', 'lift'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: 'lift\n', stderr: '' });
  });

  test('Should print the global help and fail when the command is unknown', () => {
    // Given
    const args = ['foo'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: foo');
    expect(result.stderr).toContain(GLOBAL_HELP);
  });

  test('Should print the global help and fail when the global option is unknown', () => {
    // Given
    const args = ['--nope'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown option: --nope');
    expect(result.stderr).toContain(GLOBAL_HELP);
  });

  test('Should print the command help and fail when a command option is unknown', () => {
    // Given
    const args = ['echo', '--nope'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain(renderCommandHelp(echoCommand));
  });

  test('Should fail when a command that takes no arguments gets one', () => {
    // Given
    const args = ['version', 'extra'];

    // When
    const result = runCli(args, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(renderCommandHelp(versionCommand));
  });
});
