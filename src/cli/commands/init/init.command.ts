import { CommandDefinition } from '#src/cli/cli.model';
import { InitFile } from '#src/cli/commands/init/init.model';
import { renderFolderIsFile, renderInit, renderTooManyFolders } from '#src/cli/commands/init/init.render';
import { defineCommand } from '#src/cli/define-command';
import { EXIT_INIT_WRITE_FAILED, EXIT_OK, EXIT_USAGE } from '#src/core/common/exit-codes';
import { err, ok } from '#src/core/common/result';

/**
 * The template files whose name in the template is not their name in the project. npm leaves `.gitignore` files out
 * of a published package, so the template stores it as `_gitignore`.
 */
const PROJECT_NAMES: Readonly<Record<string, string>> = { _gitignore: '.gitignore' };

/** Written in the template where the generated project needs the version of Boilerlift that created it. */
export const VERSION_PLACEHOLDER = '{{boilerliftVersion}}';

const DESCRIPTION = `Writes a ready-to-use Boilerlift project into folder, created when missing, or into the
current folder: boilerlift.config.ts with one target, dev, read from N8N_URL and N8N_API_KEY,
an example workflow in workflows/ with its tested Code node function in code/, package.json
with npm run verify (ESLint, tsc, Vitest), tsconfig.json, eslint.config.mjs, .env.example,
.gitignore and README.md.

It also writes the Agent kit: AGENTS.md with its docs, and the BOILERLIFT: skills in
.claude/skills/, with which an AI agent takes a workflow request from interview to a checked
draft on n8n.

init never overwrites a file: one already there is left as it is and reported as skipped, so
it can run in a folder that already holds part of a project, and again after a failed write.
It never writes .env and never runs npm install.`;

export const initCommand: CommandDefinition = defineCommand({
  name: 'init',
  summary: 'Start a Boilerlift project in a folder',
  help: {
    positionals: '[folder]',
    description: DESCRIPTION,
    exitCodes: [
      [EXIT_OK, 'Every file is created, or was already there'],
      [EXIT_USAGE, 'Usage error, or folder is an existing file'],
      [EXIT_INIT_WRITE_FAILED, 'At least one file could not be written; the others were. Run init again to fill the gaps'],
    ],
  },
  allowPositionals: true,
  options: {
    json: { type: 'boolean', description: 'Print the result as JSON', format: true },
  },
  needs: ['version', 'isFile', 'loadProjectTemplate', 'createFile'],
  prepare: async ({ positionals, format }, { isFile }) => {
    if (positionals.length > 1) {
      return err(renderTooManyFolders(positionals, format));
    }
    const folder = positionals[0] ?? '.';
    if (await isFile(folder)) {
      return err(renderFolderIsFile(folder, format));
    }
    return ok(folder);
  },
  modes: {},
  default: async (folder, { version, loadProjectTemplate, createFile }) => {
    const template = (await loadProjectTemplate())
      .map((file) => ({ path: PROJECT_NAMES[file.path] ?? file.path, text: file.text.replaceAll(VERSION_PLACEHOLDER, version) }))
      .sort((a, b) => a.path.localeCompare(b.path));
    const files: InitFile[] = [];
    // One at a time, so a failed write never stops the others.
    for (const { path, text } of template) {
      files.push({ path, ...(await createFile(inFolder(folder, path), text)) });
    }
    return files;
  },
  render: (files, { format, prepared }) => renderInit(files, prepared, format),
});

/** `path` of the project, relative to the current folder. */
function inFolder(folder: string, path: string): string {
  return folder === '.' ? path : `${folder.replace(/\/+$/, '')}/${path}`;
}
