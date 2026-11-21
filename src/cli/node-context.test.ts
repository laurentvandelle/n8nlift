import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';
import { nodeContext } from '#src/cli/node-context';
import { loadWorkflows } from '#src/core/compile/load-workflows';

const WORKFLOW = { name: 'Invoice sync', nodes: [], connections: {} };

/** A new empty folder in the system temp folder, deleted when the test ends. */
async function tempFolder(): Promise<string> {
  const folder = await mkdtemp(join(tmpdir(), 'boilerlift-node-context-'));
  onTestFinished(() => rm(folder, { recursive: true, force: true }));
  return folder;
}

/** Writes `content` to `path` under `folder`, creating the folders on the way. */
async function write(folder: string, path: string, content: string): Promise<void> {
  const file = join(folder, path);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, content);
}

describe('nodeContext', () => {
  test('Should take the version from the package.json of boilerlift when it builds the context', async () => {
    const cwd = await tempFolder();

    const ctx = nodeContext(cwd);

    expect(ctx.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('nodeContext loadWorkflowFiles', () => {
  test('Should read the files of every subfolder, sorted, with paths from the folder when the workflows are nested', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows/zeta.json', JSON.stringify(WORKFLOW));
    await write(cwd, 'workflows/crm/import.json', JSON.stringify(WORKFLOW));
    await write(cwd, 'workflows/billing/invoice.workflow.ts', `const workflow: object = ${JSON.stringify(WORKFLOW)};\nexport default workflow;\n`);

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files).toEqual([
      { path: 'workflows/billing/invoice.workflow.ts', content: WORKFLOW },
      { path: 'workflows/crm/import.json', content: WORKFLOW },
      { path: 'workflows/zeta.json', content: WORKFLOW },
    ]);
  });

  test('Should skip every file under node_modules when the folder holds one', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows/a.json', JSON.stringify(WORKFLOW));
    await write(cwd, 'workflows/node_modules/some-package/package.json', '{"name":"some-package"}');
    await write(cwd, 'workflows/crm/node_modules/b.json', JSON.stringify(WORKFLOW));

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files.map((file) => file.path)).toEqual(['workflows/a.json']);
  });

  test('Should skip the other files when the folder holds files that are neither .workflow.ts nor .json', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows/a.json', JSON.stringify(WORKFLOW));
    await write(cwd, 'workflows/notes.md', '# Notes\n');
    await write(cwd, 'workflows/helper.ts', 'export const helper = 1;\n');

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files.map((file) => file.path)).toEqual(['workflows/a.json']);
  });

  test('Should return the parse error of that file and read the others when a JSON file is invalid', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows/a.json', JSON.stringify(WORKFLOW));
    await write(cwd, 'workflows/broken.json', '');

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files).toEqual([
      { path: 'workflows/a.json', content: WORKFLOW },
      { path: 'workflows/broken.json', error: 'Unexpected end of JSON input' },
    ]);
  });

  test('Should return the error of that file when a .workflow.ts file throws on import', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows/throws.workflow.ts', "throw new Error('boom');\n");

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files).toEqual([{ path: 'workflows/throws.workflow.ts', error: 'boom' }]);
  });

  test('Should resolve [] when the folder does not exist', async () => {
    const cwd = await tempFolder();

    const files = await nodeContext(cwd).loadWorkflowFiles('workflows');

    expect(files).toEqual([]);
  });

  test('Should reject when the folder cannot be read for another reason than being missing', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'workflows', 'a file, not a folder');

    const loading = nodeContext(cwd).loadWorkflowFiles('workflows');

    await expect(loading).rejects.toMatchObject({ code: 'ENOTDIR' });
  });
});

describe('nodeContext lock file', () => {
  test('Should read the text of the lock file when the folder has one', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'boilerlift.lock.json', '{"version":1,"instances":{}}\n');

    const text = await nodeContext(cwd).readLockFile('boilerlift.lock.json');

    expect(text).toBe('{"version":1,"instances":{}}\n');
  });

  test('Should read undefined when the folder has no lock file', async () => {
    const cwd = await tempFolder();

    const text = await nodeContext(cwd).readLockFile('boilerlift.lock.json');

    expect(text).toBeUndefined();
  });

  test('Should write the whole lock file under the folder when it writes the lock file', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'boilerlift.lock.json', 'old text that is longer than the new one\n');

    const written = await nodeContext(cwd).writeLockFile('boilerlift.lock.json', '{}\n');

    expect({ written, text: await readFile(join(cwd, 'boilerlift.lock.json'), 'utf8') }).toEqual({ written: { ok: true, value: undefined }, text: '{}\n' });
  });

  test('Should return the reason when the lock file cannot be written', async () => {
    const cwd = await tempFolder();
    await mkdir(join(cwd, 'boilerlift.lock.json'));

    const written = await nodeContext(cwd).writeLockFile('boilerlift.lock.json', '{}\n');

    expect({ ok: written.ok, namesTheFile: !written.ok && written.error.reason.includes('boilerlift.lock.json') }).toEqual({
      ok: false,
      namesTheFile: true,
    });
  });
});

describe('nodeContext project config', () => {
  test('Should return the default export of boilerlift.config.ts when the folder has one', async () => {
    const cwd = await tempFolder();
    const config = { targets: { dev: { url: 'https://n8n.example.com', apiKey: 'secret', workflows: './workflows' } } };
    await write(cwd, 'boilerlift.config.ts', `const config: object = ${JSON.stringify(config)};\nexport default config;\n`);

    const file = await nodeContext(cwd).loadProjectConfig();

    expect(file).toEqual({ kind: 'loaded', content: config });
  });

  test('Should return missing when the folder has no boilerlift.config.ts', async () => {
    const cwd = await tempFolder();

    const file = await nodeContext(cwd).loadProjectConfig();

    expect(file).toEqual({ kind: 'missing' });
  });

  test('Should let boilerlift.config.ts read a variable of .env from process.env when the environment does not set it', async () => {
    const cwd = await tempFolder();
    onTestFinished(() => {
      delete process.env.BOILERLIFT_TEST_FROM_FILE;
    });
    await write(cwd, '.env', 'BOILERLIFT_TEST_FROM_FILE=from-file\n');
    await write(cwd, 'boilerlift.config.ts', 'export default { key: process.env.BOILERLIFT_TEST_FROM_FILE };\n');

    const file = await nodeContext(cwd).loadProjectConfig();

    expect(file).toEqual({ kind: 'loaded', content: { key: 'from-file' } });
  });

  test('Should keep the value of the environment when .env sets the same variable', async () => {
    const cwd = await tempFolder();
    process.env.BOILERLIFT_TEST_IN_BOTH = 'from-env';
    onTestFinished(() => {
      delete process.env.BOILERLIFT_TEST_IN_BOTH;
    });
    await write(cwd, '.env', 'BOILERLIFT_TEST_IN_BOTH=from-file\n');
    await write(cwd, 'boilerlift.config.ts', 'export default { key: process.env.BOILERLIFT_TEST_IN_BOTH };\n');

    const file = await nodeContext(cwd).loadProjectConfig();

    expect(file).toEqual({ kind: 'loaded', content: { key: 'from-env' } });
  });

  test('Should return the reason when boilerlift.config.ts throws on import', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'boilerlift.config.ts', "throw new Error('bad config');\n");

    const file = await nodeContext(cwd).loadProjectConfig();

    expect(file).toEqual({ kind: 'unreadable', reason: 'bad config' });
  });

  test.each([
    ['an existing folder', 'workflows/a.json', true],
    ['a file', 'workflows', false],
    ['a missing path', 'other/a.json', false],
  ])('Should tell whether the path is a folder when it is %s', async (_condition, written, expected) => {
    const cwd = await tempFolder();
    await write(cwd, written, '{}');

    const isDirectory = await nodeContext(cwd).isDirectory('workflows');

    expect(isDirectory).toBe(expected);
  });
});

describe('nodeContext loadCredentialsFiles', () => {
  test('Should import the default export of each .ts file of the folder, sorted, when the folder has lists', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'credentials/prod.ts', 'export default [{ key: "b" }];\n');
    await write(cwd, 'credentials/dev.ts', 'export default [{ key: "a" }];\n');
    await write(cwd, 'credentials/notes.md', 'not a list');

    const files = await nodeContext(cwd).loadCredentialsFiles('credentials');

    expect(files).toEqual([
      { path: 'credentials/dev.ts', content: [{ key: 'a' }] },
      { path: 'credentials/prod.ts', content: [{ key: 'b' }] },
    ]);
  });

  test('Should resolve [] when the folder does not exist', async () => {
    const cwd = await tempFolder();

    const files = await nodeContext(cwd).loadCredentialsFiles('credentials');

    expect(files).toEqual([]);
  });

  test('Should return the error of that file when a list throws on import', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'credentials/dev.ts', 'throw new Error("broken list");\n');

    const files = await nodeContext(cwd).loadCredentialsFiles('credentials');

    expect(files).toEqual([{ path: 'credentials/dev.ts', error: 'broken list' }]);
  });
});

describe('nodeContext writeCredentialsFile', () => {
  test('Should create the folder and write the whole file when the folder does not exist', async () => {
    const cwd = await tempFolder();

    const result = await nodeContext(cwd).writeCredentialsFile('credentials/dev.ts', 'export default [];\n');

    expect(result).toEqual({ ok: true, value: undefined });
    expect(await readFile(join(cwd, 'credentials/dev.ts'), 'utf8')).toBe('export default [];\n');
  });

  test('Should return the reason when a file stands where the folder goes', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'credentials', 'a file, not a folder');

    const result = await nodeContext(cwd).writeCredentialsFile('credentials/dev.ts', 'export default [];\n');

    expect(result.ok).toBe(false);
  });
});

describe('nodeContext createFile', () => {
  test('Should create the file and its folders when nothing is at the path', async () => {
    const cwd = await tempFolder();

    const creation = await nodeContext(cwd).createFile('my-app/workflows/hello.workflow.ts', 'export default {};\n');

    expect([creation, await readFile(join(cwd, 'my-app/workflows/hello.workflow.ts'), 'utf8')]).toEqual([
      { status: 'created' },
      'export default {};\n',
    ]);
  });

  test('Should leave the file untouched and return exists when a file is already at the path', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'AGENTS.md', '# Mine\n');

    const creation = await nodeContext(cwd).createFile('AGENTS.md', '# Template\n');

    expect([creation, await readFile(join(cwd, 'AGENTS.md'), 'utf8')]).toEqual([{ status: 'exists' }, '# Mine\n']);
  });

  test('Should return the reason, not throw, when the file cannot be written', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'notes.txt', 'a file\n');

    const creation = await nodeContext(cwd).createFile('notes.txt/README.md', '# Project\n');

    expect(creation.status === 'failed' && creation.reason.includes('notes.txt')).toBe(true);
  });
});

describe('nodeContext loadProjectTemplate', () => {
  test('Should read every file of the template, sorted, with paths from the template folder when it is loaded', async () => {
    const cwd = await tempFolder();

    const template = await nodeContext(cwd).loadProjectTemplate();

    expect(template.map((file) => file.path)).toEqual([
      '.claude/skills/BOILERLIFT:interviewing/SKILL.md',
      '.claude/skills/BOILERLIFT:plan/SKILL.md',
      '.claude/skills/BOILERLIFT:qa/SKILL.md',
      '.claude/skills/BOILERLIFT:ship/SKILL.md',
      '.env.example',
      '.github/copilot-instructions.md',
      'AGENTS.md',
      'ARCHITECTURE.md',
      'CLAUDE.md',
      'GLOSSARY.md',
      'README.md',
      '_gitignore',
      'boilerlift.config.ts',
      'code/AGENTS.md',
      'code/hello.test.ts',
      'code/hello.ts',
      'docs/adr/README.md',
      'docs/agents.md',
      'docs/guardrails.md',
      'docs/maintenance.md',
      'docs/testing.md',
      'eslint.config.mjs',
      'package.json',
      'tsconfig.json',
      'workflows/AGENTS.md',
      'workflows/hello.workflow.ts',
    ]);
  });
});

describe('nodeContext isFile', () => {
  test('Should tell a file from a folder and a missing path when it checks each', async () => {
    const cwd = await tempFolder();
    await write(cwd, 'notes.txt', 'a file\n');

    const ctx = nodeContext(cwd);

    expect([await ctx.isFile('notes.txt'), await ctx.isFile('.'), await ctx.isFile('missing')]).toEqual([true, false, false]);
  });
});

describe('project template', () => {
  test('Should hold an example workflow that deploy accepts when the template is loaded', async () => {
    const files = await nodeContext(join(__dirname, '..', '..', 'templates', 'project')).loadWorkflowFiles('workflows');

    const loaded = loadWorkflows(files);

    expect([files.map((file) => file.path), loaded.ok]).toEqual([['workflows/hello.workflow.ts'], true]);
  });
});
