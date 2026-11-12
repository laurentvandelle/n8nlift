import { CommandDefinition } from '#src/cli/cli.model';
import { helpCommand } from '#src/cli/commands/help/help.command';
import { versionCommand } from '#src/cli/commands/version/version.command';

export const COMMANDS: readonly CommandDefinition[] = [helpCommand, versionCommand];
