import { describe, expect, test } from 'vitest';
import { versionCommand } from '#src/cli/commands/version/version.command';

describe('versionCommand', () => {
  test('Should print the version from the context', () => {
    // Given
    const ctx = { version: '1.2.3', registry: [versionCommand] };

    // When
    const result = versionCommand.run({ positionals: [], values: {} }, ctx);

    // Then
    expect(result).toEqual({ exitCode: 0, stdout: '1.2.3\n', stderr: '' });
  });
});
