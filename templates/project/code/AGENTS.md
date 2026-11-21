# AGENTS.md — code

## Prohibitions

- A Code node function imports no value: no package, no Node module, no other `code/` file. `import type` is fine. `npm run lint` rejects the rest.
- A Code node function uses nothing outside its own body: no module-level constant, no helper function. Its source text is what runs in n8n, so declare helpers inside it.
- Never write a secret in a Code node function. Read it from an n8n credential in the workflow instead.

## Shape

- `code/<name>.ts` exports one function per Code node. It takes the node's input items and returns its output items, each `{ json: {...} }`.
- A workflow imports it through `#code/<name>` and inlines its source: `` jsCode: `${fn.toString()}\n\nreturn fn($input.all());` ``.
- Only erasable TypeScript: no `enum`, no `namespace`. Node strips the types when `lift` loads the workflow, and `fn.toString()` returns what is left.

## Tests

`code/<name>.test.ts` next to the function, run by `npm test` (Vitest). Import the function through `#code/<name>`. Read `docs/testing.md` first.

## Example

`code/hello.ts`, tested by `code/hello.test.ts`, used by `workflows/hello.workflow.ts`.
