# Contributing to n8nlift

Thanks for your interest. n8nlift is an early-stage project with best-effort support, so small, focused contributions are the easiest to review.

## Before you start

- **Bugs:** open an issue with the bug report template.
- **Features:** open an issue first to discuss the idea before writing code, so your work fits the roadmap.
- **Security issues:** follow [SECURITY.md](SECURITY.md), not a public issue.

Issues labelled [`good first issue`](https://github.com/laurentvandelle/n8nlift/labels/good%20first%20issue) are a good place to start.

## Setup

Requires Node.js 24 or later (see `.nvmrc`).

```sh
git clone https://github.com/laurentvandelle/n8nlift.git
cd n8nlift
npm install
npm run verify   # lint, typecheck, tests
```

| Task                         | Command              |
| ---------------------------- | -------------------- |
| Build into `dist/`           | `npm run build`      |
| Run the built CLI end to end | `npm start`          |
| Tests                        | `npm run test`       |
| Tests in watch mode          | `npm run test:watch` |
| Lint with autofix            | `npm run lint`       |
| Type-check                   | `npm run typecheck`  |

## Project layout

Read [ARCHITECTURE.md](ARCHITECTURE.md) before crossing a module boundary or adding a dependency, and [CONTEXT.md](CONTEXT.md) before naming a domain concept. Architecture decisions are recorded in [docs/adr](docs/adr/README.md).

The `AGENTS.md` files describe conventions per folder. They are written for coding agents but apply to human contributors too.

## Pull requests

1. Fork the repository and create a branch from `main`.
2. Keep the change focused on one topic. Add or update tests.
3. Run `npm run verify` and make sure it passes. CI runs the same check.
4. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, for example `feat(cli): add deliver command` or `fix: handle empty workflow`.
5. Open the pull request and fill in the template. Link the issue it closes.

Do not edit `dist/` or bump the version in `package.json`. Releases are done by the maintainer.

## Code of conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating you agree to uphold it.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
