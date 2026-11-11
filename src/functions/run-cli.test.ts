import { describe, expect, test } from 'vitest';
import { HELP_TEXT, runCli } from '@/functions/run-cli';

describe('runCli', () => {
  test('Should print the version when called with --version', () => {
    // Given
    const args = ['--version'];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: '1.2.3\n', stderr: '' });
  });

  test('Should print the version when called with -v', () => {
    // Given
    const args = ['-v'];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result.stdout).toBe('1.2.3\n');
  });

  test('Should print the help when called with --help', () => {
    // Given
    const args = ['--help'];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: HELP_TEXT, stderr: '' });
  });

  test('Should print the help when called without arguments', () => {
    // Given
    const args: string[] = [];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: HELP_TEXT, stderr: '' });
  });

  test('Should print the help and fail when the command is unknown', () => {
    // Given
    const args = ['foo'];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unknown command: foo');
    expect(result.stderr).toContain(HELP_TEXT);
  });

  test('Should print the help and fail when the option is unknown', () => {
    // Given
    const args = ['--nope'];

    // When
    const result = runCli(args, '1.2.3');

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(HELP_TEXT);
  });
});
