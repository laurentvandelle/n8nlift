import { CommandDefinition } from '#src/cli/cli.model';
import { deployCommand } from '#src/cli/commands/deploy/deploy.command';
import { helpCommand } from '#src/cli/commands/help/help.command';
import { pingCommand } from '#src/cli/commands/ping/ping.command';
import { versionCommand } from '#src/cli/commands/version/version.command';

export const COMMANDS: readonly CommandDefinition[] = [helpCommand, versionCommand, pingCommand, deployCommand];
