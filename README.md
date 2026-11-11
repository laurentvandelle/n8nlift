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

Requires Node.js 24 or later.

## Quick start

> To be confirmed once the commands are migrated.

```sh
n8nlift --help     # list the available commands
n8nlift --version  # print the installed version
```

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
