---
id: scr-444d
status: closed
deps: []
links: []
created: 2026-02-15T00:07:39Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [frontend, backend]
---
# Initialize monorepo with npm workspaces

Set up the npm workspaces monorepo structure with three packages: packages/shared, packages/api, packages/ui. Configure root package.json with workspaces, create base tsconfig.json with path aliases, and per-package tsconfig files that extend the base. Add ESLint and Prettier configs. Add root-level dev scripts (dev, build, lint) using concurrently to run api and ui in parallel.

## Acceptance Criteria

- Root package.json has workspaces: ['packages/*']
- packages/shared, packages/api, packages/ui directories exist with their own package.json
- Base tsconfig.json exists with strict mode and composite project references
- Each package has a tsconfig.json extending the base
- ESLint and Prettier are configured
- npm install succeeds from root
- npm run dev starts both api and ui concurrently

## Notes

Monorepo initialized with the following structure:

- **Root package.json**: Configured with `workspaces: ["packages/*"]`, dev dependencies for TypeScript, ESLint, Prettier, and concurrently. Root scripts: `dev` (runs api+ui in parallel via concurrently), `build` (builds shared first, then api+ui in parallel), `lint`, `format`, `format:check`.
- **packages/shared**: Common code package. Both api and ui depend on it via `@scratch/shared`.
- **packages/api**: API package with tsconfig referencing shared.
- **packages/ui**: UI package with tsconfig referencing shared.
- **Base tsconfig.json**: Strict mode, composite project references, Node16 module resolution, path aliases (`@scratch/shared`, `@scratch/api`, `@scratch/ui`), and `@types/node` for Node globals.
- **Per-package tsconfig.json**: Each extends the base, sets its own rootDir/outDir, and declares project references to dependencies.
- **ESLint**: Configured via `.eslintrc.json` with `@typescript-eslint` parser and recommended rules.
- **Prettier**: Configured via `.prettierrc` (single quotes, trailing commas, 100 print width).
- **.gitignore**: Excludes node_modules, dist, and tsbuildinfo files.

All acceptance criteria verified: `npm install` succeeds, `npm run build` compiles all packages, `npm run lint` passes, and `npm run dev` starts both api and ui watch modes concurrently.
