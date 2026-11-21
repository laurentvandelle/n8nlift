# AGENTS.md

Instructions for AI agents working in this project. It holds n8n workflows as code, delivered to n8n with Boilerlift (the `lift` command). Humans read `README.md` and `ARCHITECTURE.md`.

## Role

This project holds n8n workflows as typed files and delivers them to n8n instances with `lift`. Your job is to write and change those workflow files, check them, and deliver them as drafts.

## Project

- `boilerlift.config.ts`: the targets. Each one has an n8n `url`, an `apiKey` read from the environment, and a `workflows` folder. The variables of `./.env` are loaded first.
- `code/`: the JavaScript of Code nodes, one tested function per file. A workflow imports it through `#code/<name>`.
- `workflows/`: one workflow per file, `<name>.workflow.ts` (a `defineWorkflow({...})` default export) or `<name>.json` (an n8n export). The file name is the workflow's stable name: 1 to 64 lowercase letters, digits or dashes.
- `boilerlift.lock.json`: written by `lift deploy`, it links each stable name to its n8n id. Never edit it by hand.
- Never write a secret in a file. `.env` holds the URL and the API key and is never committed; `.env.example` lists the variables, with empty values.

## Commands

| Command | What it does |
| --- | --- |
| `npm run verify` | Lint (imports and boundaries), type-check, then the tests of `code/` |
| `npm run lint` | ESLint only |
| `npm run typecheck` | `tsc --noEmit` only |
| `npm test` | Vitest only |

Run every `lift` command with `--json`: the result is one JSON object on stdout. Read its `exitCode` first, then the rest. A project with several targets takes `--target <name>` (or `-t <name>`), or `--all`.

| Command | What it does | You may run it |
| --- | --- | --- |
| `npx lift ping --json` | Checks Node.js, that the instance answers, and that it accepts the API key | Freely |
| `npx lift status --json` | Shows where each workflow stands on the target, and the next step | Freely |
| `npx lift deploy --dry-run --json` | Checks every workflow file and shows what deploy would do; writes nothing | Freely |
| `npx lift deploy --json` | Delivers the workflows as drafts; publishes nothing | Freely |
| `npx lift creds sync --json` | Writes the credentials of the instance to `credentials/<target>.ts`, and reports the ones the workflows miss | Freely |
| `npx lift clean --dry-run --json` | Lists the workflows removed from the project that clean would archive; changes nothing | Freely |
| `npx lift publish --json --yes` | Publishes the deployed drafts: they go live | Only after the user says so in this chat |
| `npx lift clean --json --yes` | Archives on n8n the workflows removed from the project | Only after the user says so in this chat |
| `npx lift help [command]` | Prints the help of Boilerlift, or of one command, with its options and exit codes | Freely |

Never run `lift publish` or a real `lift clean` on your own initiative, even with `--yes`: ask the user first, and run it only once they agree in the chat. Without `--yes`, both ask the user a question in a terminal, which an agent cannot answer: always pass `--yes` once the user has agreed.

## Exit codes

| Code | Meaning | Next step |
| --- | --- | --- |
| 0 | Success | — |
| 1 | Usage error, missing or invalid `boilerlift.config.ts`, unknown target, or invalid workflow files | Read the error, fix the command or the file |
| 2 | Node.js is too old | Ask the user to update Node.js |
| 3 | The n8n instance cannot be reached | Check `N8N_URL` in `.env` with the user |
| 4 | The instance rejects the API key | Ask the user for a valid `N8N_API_KEY` |
| 5 | At least one workflow failed; the others were delivered | Read each failed workflow in the JSON |
| 6 | The instance is too old to save drafts | Ask the user to update n8n |
| 7 | Deploy could not write `boilerlift.lock.json` | Fix the file permissions, then deploy again |
| 8 | Workflows use credentials the instance does not have | Ask the user to create them in n8n, then `lift creds sync` |
| 9 | The API key cannot list the credentials | Ask the user for a key with the `credential:list` scope |
| 10 | `creds sync` could not write the credentials file | Fix the file permissions, then sync again |
| 11 | `clean` needs a confirmation: nothing was archived | Ask the user, then rerun with `--yes` once they agree |

## Details

`npx lift help <command>` prints the options and exit codes of one command. Each command is documented on GitHub: `https://github.com/laurentvandelle/boilerlift/blob/main/docs/commands/<name>.md`, where `<name>` is `ping`, `status`, `deploy`, `publish`, `clean`, `creds` or `init`.

## Skills

To create or change a workflow, follow `.claude/skills/BOILERLIFT:ship/SKILL.md` (`/BOILERLIFT:ship <what the workflow should do>` in Claude Code): interview, decision summary, one Build go-ahead, files, checks, draft deploy, QA, then publish on a separate yes. It uses `BOILERLIFT:interviewing`, `BOILERLIFT:plan` and `BOILERLIFT:qa`, in the same folder. An agent that does not load `.claude/skills` reads these files directly.

## Routing

- Before editing `code/**`, read `code/AGENTS.md`.
- Before editing `workflows/**`, read `workflows/AGENTS.md`.
- Before adding a dependency or crossing a module boundary, read `ARCHITECTURE.md`.
- Before naming a domain concept, read `GLOSSARY.md`.
- Before writing or changing a test, read `docs/testing.md`.
- Before writing an architecture decision, read `docs/adr/README.md`.
- Before changing these instruction files, read `docs/agents.md`.
- Before treating a convention as enforced, read `docs/guardrails.md`.
- Before adding a convention after review, read `docs/maintenance.md`.

## Non-negotiables

1. The `AGENTS.md` closest to the file being changed wins over the root file.
2. The code is the source of truth. When a document and the code disagree, report the gap. Do not invent a reconciliation in the same task.
3. A rule lives in one file. Local rules live in the nearest `AGENTS.md`. The root file keeps shared rules only.

## Definition of done

Run `npm run verify`, then `npx lift deploy --dry-run --json`, before handing work back.
Never hand back a failure: fix it, then run the command again.

## Maintenance

Instruction files are code and drift without upkeep.
Before adding or changing a rule after review, read `docs/maintenance.md`.
