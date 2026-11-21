# Boilerlift

Boilerlift is a command-line tool that keeps n8n workflows as typed files in Git and tests them like any other code.
It deploys them to the user's own n8n instance as drafts, and the published version keeps running until the user publishes.

## Terms

### The instance

- **Instance**: the user's own n8n server, reached at the `url` of a target and through its public API with the target's API key. Boilerlift never hosts one.
- **Project config**: `boilerlift.config.ts` at the project root, committed with it: the default export of `defineConfig`, which declares the targets. Every command that talks to n8n requires it. It reads its secrets from `process.env`, which Boilerlift fills from `./.env` first. _Avoid_: `.env`, which only holds variables.
- **Target**: one named entry of the project config: an instance `url`, its API key (`apiKey`, read from an environment variable the user names), and the folder of workflow files it receives (`workflows`). Its name is 1 to 13 of `a-z`, `0-9` and `-`, so its target tag fits an n8n tag name. `ping` and `deploy` run on one target, or on every one with `--all`, in declaration order. Several targets may share an instance or a folder. _Avoid_: environment, which is the process environment the config reads its values from.
- **Instance connection**: the link from Boilerlift to the instance, that `ping` checks. _Avoid_: connection, which is a link between two nodes.

### Workflows

- **Workflow file**: one workflow in the workflows folder of a target: a `.workflow.ts` file whose default export is an n8n export passed to `defineWorkflow`, or a `.json` n8n export. Its base name is its stable name.
- **Local workflow**: a workflow file that passed every check, ready to deploy: its stable name, path, name, nodes, connections and settings.
- **Node**: one step of an n8n workflow, as the export lists it under `nodes`. _Avoid_: node for the runtime; write Node.js.
- **Connection**: a link from the output of one node to another node, as the export lists it under `connections`. _Avoid_: connection for the instance connection.
- **Stable name**: the name of a workflow across runs and instances: the file base name without `.workflow.ts` / `.json`, 1 to 64 of `a-z`, `0-9` and `-`.
- **Lock file**: `boilerlift.lock.json` at the project root, committed with it: for each instance (the cleaned-up `url` of a target), the n8n id of each stable name that `deploy` created there. `deploy` finds its workflows by these ids only. _Avoid_: stable tag, the identity before ADR 0009.

### Versions on the instance

- **Draft**: the latest saved version of a workflow on the instance. `deploy` writes only drafts.
- **Published**: the version of a workflow that runs on its triggers. It changes only when the user publishes, with `lift publish` or in the n8n editor. _Avoid_: live.
- **Archived**: a workflow deleted in the n8n editor. It stays on the instance, with its id, until it is unarchived. A workflow that is not archived is unarchived. _Avoid_: deleted, live.
- **Deleted**: a workflow removed from its instance for good; no id of it is left there. Only `lift clean --delete` deletes one, after archiving it.
- **Restored**: an archived workflow that `deploy` unarchived and brought back as an unpublished draft.

### Status

- **Status**: `lift status`, read-only: the state of each workflow of a target on its instance, and the next step.
- **State**: where one workflow stands, the first that holds in this order: `missing` (no lock entry, or its recorded id answers 404), `archived`, `differs` (differs from n8n: the local file and the draft differ; status cannot tell which side changed), `draft-pending` (draft not yet published: the draft holds the local file but is not the published version), `up-to-date`. A lock entry with no workflow file left is `removed`. A workflow of the instance that the lock file does not record is `unmanaged` (not in my project). _Avoid_: drift, out of sync.

### Deploy

- **Deploy**: delivering every local workflow of a target to its instance: create the new ones, update the changed ones as drafts, restore the archived ones, skip the unchanged ones, and record the id of each one it creates in the lock file.
- **Plan**: what a deploy would do, worked out from reads only: one action per local workflow, the warnings, and the blocker if one stopped it. A dry run shows the plan; a real deploy applies it.
- **Action**: what deploy does with one local workflow: `created`, `recreated` (its recorded id answers 404, so it is created again from code), `updated`, `skipped`, `restored`, `failed` or `not-processed` (a blocker stopped the run first).
- **Blocker**: a failure that stops the whole run: the instance cannot be reached, it rejects the API key, it cannot save drafts, or the lock file cannot be written after a create. A failure on one workflow is not a blocker. _Avoid_: fatal, stop.
- **Dry run**: `deploy --dry-run` computes deploy's plan and writes nothing.
- **Removed**: a workflow removed from the project: the lock file records it for an instance, but no workflow file in the folder of any target on that instance has its stable name any more. `lift status` shows it as `removed`, with `lift clean` next. A workflow another target on the same instance still has a file for is not removed. _Avoid_: deleted, orphan.
- **Clean**: `lift clean`, archiving the removed workflows of a target after a `[y/N]` confirmation (or `--yes` / `--force`), and dropping their entries from the lock file. With `--delete`, it deletes them for good instead, archiving each one first. It never touches a workflow the lock file does not record. _Avoid_: prune.
- **Reset**: `lift reset --target <name>`, removing, on one target, every workflow Boilerlift recorded as deployed for that target's folder, plus the instance's removed workflows, after the target name is typed (or `--yes` / `--force`). It archives them, or deletes them for good with `--delete`, and drops their entries from the lock file. It keeps every entry whose file is in another target's folder on the same instance. _Avoid_: teardown, wipe.
- **Publish**: `lift publish`, making the draft of deployed workflows the published version, after a `[Y/n]` confirmation (or `--yes` / `--force`). Without names, it publishes every `draft-pending` workflow and reports the `differs` ones without publishing them; with names, only those, refusing a `differs` one and skipping an `up-to-date` one.
- **Target tag**: The n8n tag named after the target, `boilerlift:<target>`, added on deploy, for display only.

### Credentials

- **Credential list**: `credentials/<target>.ts`, generated by `lift creds sync` and committed with the project: the key, name, type and n8n id of each credential of the instance of a target, never a secret. _Avoid_: credentials file for the n8n credential data.
- **Credential key**: the name of one credential in a credential list: the kebab-case slug of its n8n name, with `-2`, `-3`… when names collide, in the order of the n8n ids. Unique within a list.
- **Credential marker**: what `credential('key')` stores in a node, under the type of the key, in place of the n8n `{ id, name }`. `deploy` resolves it to the `{ id, name }` of the key in the credential list of the target it deploys to, under the type of that list, after checking the id on the instance.
- **Missing credential**: a key that the workflows of a target use and that the target does not provide: its credential list does not have it, or, for `deploy`, the instance no longer has its id or has it under another type.

### Project setup

- **Agent kit**: the skills and agent instructions that `lift init` writes into a project: `AGENTS.md` and its routed docs, and the `BOILERLIFT:` skills under `.claude/skills/`, which take a workflow request from interview to a deployed draft. _Avoid_: AI kit, Boilerlift skill.
