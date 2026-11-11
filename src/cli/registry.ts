import { CommandDefinition } from '@/cli/cli.model';
import { helpCommand } from '@/cli/commands/help/help.command';
import { versionCommand } from '@/cli/commands/version/version.command';

export const COMMANDS: readonly CommandDefinition[] = [helpCommand, versionCommand];
