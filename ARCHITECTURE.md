# Architecture

Operational rules for agents live in `AGENTS.md`. This file is background.

## Intent

A starter for an npm library written in TypeScript that ships its own type declarations. Users clone it with `degit` and replace the sample `hello` code.

## Modules

- `src/index.ts` — the package entry point. Re-exports everything public.
- `src/functions/` — exported functions.
- `src/models/` — exported types.
- `src/libs/` — empty placeholder.
- `debug/` — a separate npm package that depends on `file:../dist`, used to try the built library as a consumer would.

## Boundaries

- `functions/` may import from `models/`. `models/` imports nothing from `functions/`.
- `debug/` sees only the published surface in `dist/`, never `src/`.

## Runtime

`npm run build` compiles `src/` with `tsc` (module `node20`, target `ES2024` for Node 24, CommonJS output since `package.json` has no `"type"`) into `dist/`, emitting `.d.ts` and source maps. `tsc-alias` then rewrites `@/` imports to relative paths. `package.json` points `main` at `dist/index.js` and `types` at `dist/index.d.ts`. `npm start` builds, then runs `debug/main.ts` with `node` (Node 24 strips TypeScript types natively).

## Out of scope

No runtime dependencies, no bundler, no ESM dual build.
