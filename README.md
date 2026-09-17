# Internal App & Service Template 🚀

[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

_Modern, 100% self-contained boilerplate for internal applications, private
tools, and backend services._

---

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B3263?style=for-the-badge&logo=eslint&logoColor=white)
![NPM](https://img.shields.io/badge/NPM-%23CB3837.svg?style=for-the-badge&logo=npm&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

This repository provides an idiomatic, zero-patch starter template for **private
internal apps, CLI tools, and backend services**. All configurations are
standardized with native tools (ESLint 9 Flat Config, Prettier, Vitest, tsdown,
and Husky), completely free of external ecosystem coupling.

> [!IMPORTANT] This project is private (`"private": true`) and is **not intended
> to be published to npm**. It is 100% self-contained with no proprietary
> external dependencies or patches.

---

## Project Structure

```text
.
├── bin/
│   └── git-hooks/           # Native shell git hooks (branch validation, staged file checks)
├── src/
│   ├── utils/               # Localized utility helpers (dateUtils, numeric)
│   ├── index.ts             # Application entry point
│   └── index.test.ts        # Vitest test suite
├── index.html               # Vite local dev harness
├── tsconfig.json            # Standalone TypeScript compiler configuration
├── tsdown.config.mjs        # Native tsdown Node ESM bundler configuration
├── vite.config.ts           # Vite dev server configuration
├── vitest.config.ts         # Vitest test suite configuration
├── eslint.config.ts         # Native ESLint 9 flat configuration
├── prettier.config.mjs      # Native Prettier configuration
├── commitlint.config.mjs    # Native conventional commitlint configuration
├── .lintstagedrc.mjs        # Native lint-staged configuration
├── .markdownlint-cli2.mjs   # Native markdownlint configuration
└── package.json
```

---

## Getting Started

```sh
npm install
```

Clean, zero-patch install using standard npm.

---

## Commands

### Development & Execution

```sh
npm run dev   # Typecheck and start the local Vite development server
npm run build # Typecheck and bundle the production Node ESM output to dist/
npm start     # Run the compiled service (node dist/index.mjs)
```

### Quality & Testing

```sh
npm test           # Typecheck and run Vitest suite
npm run test:watch # Run Vitest in interactive watch mode
npm run check      # Typecheck and run ESLint
npm run fix        # Format (Prettier) and automatically apply ESLint fixes
npm run clean      # Remove compiled artifacts and TypeScript cache
npm run finalize   # Run fix, check, and test in sequence
```

### Git & Commit Workflows

Scoped conventional commits are provided with automated pre-commit staging
checks:

```sh
npm run commit:feat -- "add user auth endpoint"
npm run commit:fix -- "resolve database connection timeout"
npm run commit:chore -- "upgrade dependencies"
```

Direct `git commit` commands remain guarded by Husky (`pre-commit`,
`commit-msg`, `pre-push`).

---

## Continuous Integration

GitHub Actions workflows in `.github/workflows/`:

- **PR Checks** (`pr-checks.yml`) — Validates pull requests against `main` by
  installing dependencies, building the application, and running the test suite.
- **Main CI** (`push-main.yml`) — Ensures all merges and direct pushes to `main`
  build and pass tests cleanly.
- **Reusable Pipelines** (`call-pipeline.yml`, `dispatch-pipeline.yml`,
  `dispatch-workspace-update.yml`) — Enables manual pipeline dispatch and
  automated workspace fix routines.
