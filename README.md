# create-typescript-npm-library

Simple typescript app with vitest to create a npm library with types

## Installation

```sh
npx degit https://github.com/laurentvandelle/create-typescript-npm-library app
```

## Getting started

1. Install nodejs : https://nodejs.org/en/

2. Install node_modules with `npm install`

3. Rename the package: set `name`, `description`, `author` and `repository` in `package.json`

4. Available commands with `npm run` (`npm start` builds, then runs `debug/main.ts` against `dist/`)

## Running Tests

To run the tests for your library, use the following command:

```sh
npm run test
```

This will execute all test files using Vitest (`npm run test:watch` for watch mode).

## Publish your library

To publish your library to npm, use the following command:

```sh
npm run pub
```

This bumps the patch version, then `prepublishOnly` runs `npm run verify` and `npm run build` before publishing. Only `dist/` is published (see `files` in `package.json`). Ensure you are logged into npm (`npm login`).

## Folder tree

```
|   eslint.config.mts
|   .gitignore
|   vitest.config.mts
|   LICENSE
|   package-lock.json
|   package.json
|   README.md
|   tsconfig.json
|   tsconfig.build.json
|
+---debug
    +---main.ts
    +---package-lock.json
    +---package.json
|
+---src
|   +---functions
        hello.test.ts
        hello.ts
    +---libs
        .gitkeep
    +---models
        hello.model.ts
|
+---docs
    +---adr
```
