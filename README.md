# n8nlift

**Code is the source. n8n is the runtime.**

Write n8n workflows in TypeScript, test them like any other code, and lift them from dev to prod.

n8nlift is a command-line tool for people who want their n8n workflows to live in Git, not only in the editor. You build workflows from typed node factories and reusable blocks, run unit tests, then deploy to your n8n instance. Updates land as drafts, so the published version keeps running until you choose to publish.

## Why n8nlift

- **Typed building blocks.** One factory per node and reusable subgraphs, no raw JSON pasted by hand.
- **Tested before shipped.** Workflows are plain TypeScript: lint, typecheck and test them in CI.
- **Safe delivery.** Deploy as draft, review, then publish. Requires n8n 2.35.0 or later.
- **Built for AI coding agents.** Agents edit code and run the CLI instead of calling the n8n API directly.
- **Your instance, your rules.** n8nlift talks to your own n8n instance through its public API. Nothing is hosted for you.

## Install

```sh
npm install -g n8nlift
```

Requires Node.js 22.18 or later, and n8n 2.35.0 or later.

## Quick start

> To be confirmed once the commands are migrated.

```sh
n8nlift --help            # list the available commands
n8nlift ping              # check the connection to your n8n instance
n8nlift deploy            # deliver ./workflows to your instance as drafts
n8nlift help <command>    # show the options of one command
n8nlift --version         # print the installed version
```

## Check your connection

Before deploying anything, check that your project can reach your n8n instance. `n8nlift ping` reads two values from the environment, then from a `.env` file in the current folder. A variable set in the environment wins over `.env`.

| Variable      | Value                                                            |
| ------------- | ---------------------------------------------------------------- |
| `N8N_URL`     | Root URL of your n8n instance. n8nlift adds `/api/v1` itself.    |
| `N8N_API_KEY` | An n8n API key, created in n8n → Settings → n8n API.             |

```sh
# .env — keep it out of Git
N8N_URL=https://your-n8n.example.com
N8N_API_KEY=your-n8n-api-key
```

Add the script to your project's `package.json`, then run `npm run ping`:

```json
{
  "scripts": {
    "ping": "n8nlift ping"
  }
}
```

`ping` is read-only. It checks, in order, that Node.js is 22.18 or later, that the instance answers on `GET /healthz`, and that the public API accepts your key (`GET /api/v1/workflows`). After a failed check the next ones are skipped, and each failure prints the next step. The key is never printed. An `http://` URL gets a warning, because the key travels unencrypted.

| Exit code | Meaning                                                |
| --------- | ------------------------------------------------------ |
| 0         | Every check passed                                     |
| 1         | Usage error or missing `N8N_URL` / `N8N_API_KEY`       |
| 2         | Node.js is older than 22.18                            |
| 3         | The instance or its public API cannot be reached       |
| 4         | The API key is rejected                                |

> Requires n8n 2.35.0 or later. `ping` cannot check this: the n8n API doesn't expose its version.

## Deploy

`n8nlift deploy` delivers every workflow under `./workflows` to your instance. It reads the same `N8N_URL` and `N8N_API_KEY` as `ping`.

```text
workflows/
  invoice-sync.workflow.ts   # export default <workflow pasted from an n8n export>
  crm/crm-import.json        # a workflow exported from n8n
```

The file name without `.workflow.ts` / `.json` is the workflow's **stable name**: 1 to 16 lowercase letters, digits or dashes, unique across all folders. n8nlift tags the workflow `n8nlift:<stable-name>` on the instance and finds it again by that tag, so renaming the workflow in n8n keeps the link (the name in the file wins on the next update); renaming the file makes a new workflow.

```text
n8nlift deploy → https://your-n8n.example.com
+ created  invoice-sync   workflows/invoice-sync.workflow.ts
~ updated  crm-import     workflows/crm/crm-import.json (draft; published version still running)
= skipped  daily-report   unchanged
1 created, 1 updated, 1 skipped. Drafts are not live until you publish them.
```

- New workflows are created and never published.
- Changed workflows are updated as drafts: the published version keeps running until you publish in n8n.
- Workflows whose current draft already matches the file are skipped, so a rerun changes nothing.
- `--json` prints the same report as JSON, for scripts and AI agents.
- The first failed call stops the run, names the workflow and the call, and exits non-zero.

| Exit code | Meaning                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| 0         | Every workflow delivered, or nothing to deploy                                               |
| 1         | Usage error, missing configuration, invalid workflow files, or a duplicate `n8nlift:` tag    |
| 3         | The instance cannot be reached or its API returned an error                                  |
| 4         | The API key is rejected                                                                      |

## Status

Early stage, best-effort support. Multi-environment support (dev, staging, prod), plan and drift detection are on the roadmap.

> n8nlift is an independent open source project. It is not affiliated with, endorsed by, or sponsored by n8n GmbH.

## Development

```sh
npm install
npm run verify   # lint, typecheck, tests
npm run build    # compile into dist/
```

`npm start` builds, then runs `debug/main.ts` against `dist/` as an external consumer would.

## License

[MIT](LICENSE)
