import { describe, expect, test } from 'vitest';
import { CommandContext, CommandDefinition } from '#src/cli/cli.model';
import { helpCommand, renderCommandHelp, renderGlobalHelp } from '#src/cli/commands/help/help.command';

const fakeCommand: CommandDefinition = {
  name: 'fake',
  summary: 'Do fake things',
  usage: 'n8nlift fake [options]',
  allowPositionals: false,
  options: { target: { type: 'string', short: 't', description: 'Where to go' } },
  run: () => ({ exitCode: 0, stdout: '', stderr: '' }),
};

const ctx: CommandContext = { version: '1.2.3', registry: [helpCommand, fakeCommand] };

describe('helpCommand', () => {
  test('Should list every registered command when called without a target', () => {
    // Given
    const input = { positionals: [], values: {} };

    // When
    const result = helpCommand.run(input, ctx);

    // Then
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(renderGlobalHelp(ctx.registry));
    expect(result.stdout).toContain('help  Show help for n8nlift or for one command');
    expect(result.stdout).toContain('fake  Do fake things');
  });

  test('Should print the help of one command when called with its name', () => {
    // Given
    const input = { positionals: ['fake'], values: {} };

    // When
    const result = helpCommand.run(input, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: renderCommandHelp(fakeCommand), stderr: '' });
    expect(result.stdout).toContain('Usage: n8nlift fake [options]');
    expect(result.stdout).toContain('-t, --target <target>  Where to go');
    expect(result.stdout).toContain('-h, --help');
  });

  test('Should fail when the target command is unknown', () => {
    // Given
    const input = { positionals: ['nope'], values: {} };

    // When
    const result = helpCommand.run(input, ctx);

    // Then
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Unknown command: nope');
  });
});
