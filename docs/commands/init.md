# `lift init`

Starts a Boilerlift project: it writes the files a person or an AI agent needs to work on a first workflow, then prints the next steps. It needs no `boilerlift.config.ts`, so it runs in an empty folder.

```sh
lift init            # in the current folder
lift init my-app     # in my-app, created when missing
lift init --json     # the result as JSON, for scripts and AI agents
```

`lift help init` prints every option and the exit codes.

## What it writes

| File | What it is |
| --- | --- |
| `boilerlift.config.ts` | One target, `dev`: `url` from `N8N_URL`, `apiKey` from `N8N_API_KEY`, workflows in `./workflows` (see [Configure your targets](../configuration.md)) |
| `workflows/hello.workflow.ts` | An example workflow: a manual trigger, then a Code node, with no credentials |
| `code/hello.ts`, `code/hello.test.ts` | The JavaScript of that Code node, as a function the workflow inlines with `toString()`, and its Vitest test |
| `package.json` | `"type": "module"`, the `#code/*` import, `boilerlift`, ESLint, TypeScript and Vitest as devDependencies, and the scripts `verify` (`lint`, `typecheck`, `test`), `ping`, `check` (`lift deploy --dry-run`), `deploy`, `status`, `n8n:publish`, `creds` and `clean` |
| `tsconfig.json` | Type-checking for the config, the workflow files and the Code node functions |
| `eslint.config.mjs` | `npm run lint`: no relative import, a Code node function imports nothing, only tests import Vitest |
| `.env.example` | `N8N_URL=` and `N8N_API_KEY=`, with empty values |
| `.gitignore` | `node_modules`, `.env` and `boilerlift.lock.json` |
| `README.md` | The next steps |

It also writes the Agent kit, for AI agents:

| File | What it is |
| --- | --- |
| `AGENTS.md` | Instructions for AI agents: every command, run with `--json`, how to read the result and the exit codes, which commands need the user's go-ahead, and where the `BOILERLIFT:` skills are |
| `CLAUDE.md` | One line, `@AGENTS.md`, so Claude Code reads `AGENTS.md` |
| `.github/copilot-instructions.md` | One line that points GitHub Copilot to `AGENTS.md` |
| `workflows/AGENTS.md`, `code/AGENTS.md` | The rules of each folder |
| `ARCHITECTURE.md`, `GLOSSARY.md` | The layout of the project, and the words of n8n and Boilerlift |
| `docs/` | How to write the instruction files, the tests and an architecture decision |
| `.claude/skills/BOILERLIFT:ship/` | The entry skill: `/BOILERLIFT:ship <what the workflow should do>` interviews the user, shows the decision summary, and on one Build go-ahead writes the files, runs `npm run verify` and `lift deploy --dry-run`, deploys a draft and gives the QA scenarios. It publishes only on a separate yes |
| `.claude/skills/BOILERLIFT:interviewing/` | The interview, in rounds of multiple-choice questions |
| `.claude/skills/BOILERLIFT:plan/` | The decision summary of the workflow, in a strict template, shown in the chat only |
| `.claude/skills/BOILERLIFT:qa/` | The QA scenarios to run in n8n on the deployed draft |

The files come from [`templates/project/`](../../templates/project/), which ships in the npm package.

## Never overwrites

A file already there is left as it is, and reported as skipped: init never overwrites a file and never appends to one, `AGENTS.md`, `CLAUDE.md`, `.gitignore` and each file of the Agent kit included: a skill folder that is partly there gets only its missing files. In a folder that already holds part of a project, init creates what is missing and exits 0. Run again, it reports every file as skipped.

init never writes `.env`, so no secret is ever written, and never runs `npm install`.

```text
✓ .env.example
– .gitignore (already there, left as it is)
✓ AGENTS.md
✓ boilerlift.config.ts
…

The project is not ready yet. Run these commands, in order, to finish the setup:
→ cd my-app
→ npm install
→ cp .env.example .env, then fill in N8N_URL and N8N_API_KEY
→ npx lift ping
```

`✓` created, `–` skipped, `✗` could not be written, with the reason. The project is not usable until the commands after the `→` are run: init prints them every time, even when every file was skipped.

## When a write fails

A file that cannot be written (permission denied, full disk) does not stop the others. It is marked `✗` with the reason, and init exits 12. Fix the cause and run `lift init` again: it writes only the missing files.

A folder argument that is an existing file is a usage error: nothing is written, exit 1.

## JSON

```json
{
  "folder": "my-app",
  "files": [
    { "path": ".env.example", "status": "created" },
    { "path": ".gitignore", "status": "skipped" },
    { "path": "README.md", "status": "failed", "reason": "EACCES: permission denied, open '…'" }
  ],
  "next": ["cd my-app", "npm install", "cp .env.example .env, then fill in N8N_URL and N8N_API_KEY", "npx lift ping"],
  "exitCode": 12
}
```

`path` is relative to the project folder. `status` is `created`, `skipped` or `failed`.
