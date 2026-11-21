# AGENTS.md — workflows

## Prohibitions

- Never write a secret in a workflow file: no API key, token or password. Reference an n8n credential instead.
- Never rename a workflow file to change its title: the file name is its stable name, and a new name is a new workflow on n8n. Change `name` inside the file instead.
- Never edit `boilerlift.lock.json` by hand.

## Shape

- One workflow per file: `<name>.workflow.ts`, a `defineWorkflow({...})` default export, or `<name>.json`, an n8n export.
- `<name>` is 1 to 64 lowercase letters, digits or dashes.
- Every node needs a unique `name` and `id`. `connections` refers to nodes by `name`.
- A Code node takes its `jsCode` from a function in `code/`, imported through `#code/<name>`: never a relative import, never JavaScript written inline in the string.

## Tests

`npx lift deploy --dry-run --json` checks every workflow file and writes nothing. Run it after each change.

## Example

`workflows/hello.workflow.ts`
