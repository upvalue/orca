---
id: scr-nw5x
status: closed
deps: [scr-444d]
links: []
created: 2026-02-15T01:17:58Z
type: feature
priority: 2
tags: [frontend, backend]
---

# Move away from multiple packages

Multiple packages are more trouble than they're worth, move everything to the toplevel and a shared package. Afterwards, do an end to end test and use playwright-cli to ensure the system still functions as intended.

## Plan

### Current State

npm workspaces monorepo with 3 packages under `packages/`:
- `@scratch/shared` — pure TypeScript type definitions (Ticket, TicketDetail, etc.)
- `@scratch/api` — tRPC HTTP server (reads/writes .tickets/ markdown files)
- `@scratch/ui` — React SPA (Vite + Tailwind + shadcn/ui)

`shared` is a dependency of both `api` and `ui`. `ui` also imports the `AppRouter` type from `api` for tRPC client inference. Build orchestration uses `concurrently` with `shared` built first.

### Target State

Flat project structure with no npm workspaces:
- `shared/` — local directory (not an npm package) containing shared types
- `api/` — API server source (was `packages/api/src/`)
- `ui/` — React SPA source (was `packages/ui/src/`)
- Single root `package.json` with all dependencies merged

### Migration Steps

#### Step 1: Move source files to top level
1. Move `packages/shared/src/` → `shared/` (single `index.ts` with type exports)
2. Move `packages/api/src/` → `api/` (index.ts, router.ts, tickets.ts, tickets.test.ts)
3. Move `packages/ui/src/` → `ui/` and `packages/ui/index.html` → root `index.html`
4. Move `packages/ui/src/components/` → `ui/components/`
5. Move `packages/ui/components.json` → root `components.json`

#### Step 2: Merge package.json
1. Remove `"workspaces"` field from root `package.json`
2. Merge all dependencies from `packages/api/package.json` and `packages/ui/package.json` into root
3. Remove all three `packages/*/package.json` files
4. Remove `@scratch/shared` entries (no longer an npm dependency, just a relative import)
5. Set `"type": "module"` at root level for Vite compatibility

#### Step 3: Update imports across all files
1. Replace all `from '@scratch/shared'` → `from '../shared/index.js'` (or appropriate relative path)
2. Replace `from '@scratch/api'` (in `ui/lib/trpc.ts`) → `from '../../api/index.js'` (type-only import for AppRouter)
3. Update any `from './router.js'` style imports if directory structure changes

#### Step 4: Update TypeScript configuration
1. Simplify root `tsconfig.json`: remove project references, remove `@scratch/*` path aliases, remove composite/incremental if no longer needed
2. Keep separate tsconfig files for API (Node16 module resolution) and UI (bundler module resolution, react-jsx) since they have fundamentally different compilation targets
3. API tsconfig: `rootDir` becomes project root or `api/`, `outDir: dist/`
4. UI tsconfig: `noEmit: true` stays (Vite handles bundling), update path alias `@/*` → `./ui/*`

#### Step 5: Update Vite configuration
1. Move `packages/ui/vite.config.ts` → root `vite.config.ts`
2. Remove `@scratch/shared` and `@scratch/api` aliases — use relative imports instead
3. Update `@` alias to point to `./ui/`
4. Keep proxy config for dev server (`/trpc` → localhost:3001)
5. Update `root` or source paths if needed to reflect new directory layout

#### Step 6: Update API server
1. Fix `UI_DIST` path in `api/index.ts` — update from `../../ui/dist` to the new relative path to Vite's build output
2. Verify `__dirname` resolution still works after restructure

#### Step 7: Update build & dev scripts
1. `dev` script: `concurrently` running `tsx watch api/index.ts` and `vite`
2. `build` script: no need to build shared separately (no compilation step for pure types used via relative imports). Just `tsc --build` for API and `vite build` for UI
3. `start` script: `node dist/index.js` (or wherever API compiles to)
4. `test` script: `vitest run`
5. `lint`/`format` scripts: update glob patterns from `packages/*/src/**/*` to `{api,ui,shared}/**/*`

#### Step 8: Update vitest configuration
1. Move `packages/api/vitest.config.ts` → root `vitest.config.ts`
2. Remove `@scratch/shared` alias — use relative imports in test files
3. Update include patterns

#### Step 9: Clean up
1. Remove `packages/` directory entirely
2. Remove workspace symlinks from `node_modules/@scratch/`
3. Run `npm install` to regenerate clean lockfile
4. Update `.eslintrc.json` if it references package paths
5. Update `.prettierignore` / `.gitignore` if needed

#### Step 10: Verify
1. `npm install` — succeeds cleanly
2. `npm run build` — API compiles, UI builds
3. `npm run dev` — both servers start, UI loads in browser
4. `npm test` — vitest passes (tickets.test.ts)
5. `npm start` — production mode serves SPA correctly

#### Step 11: End-to-end test with playwright-cli
1. Start the dev server (`npm run dev`)
2. Use `playwright-cli` to open the app in a browser
3. Verify: ticket list page loads and displays tickets
4. Verify: can navigate to a ticket detail page
5. Verify: can create a new ticket
6. Verify: board view works
7. Capture results and confirm the system functions as intended

## Notes

Migrated from npm workspaces monorepo (3 packages under `packages/`) to a flat project structure:

- `packages/shared/src/` -> `shared/` (plain directory with type exports, no longer an npm package)
- `packages/api/src/` -> `api/` (tRPC server source files)
- `packages/ui/src/` -> `ui/` (React SPA source files)
- `packages/ui/index.html` -> root `index.html`
- `packages/ui/components.json` -> root `components.json`
- `packages/ui/vite.config.ts` -> root `vite.config.ts`
- `packages/api/vitest.config.ts` -> root `vitest.config.ts`

Key changes:
- Single root `package.json` with all dependencies merged, `"type": "module"`, no workspaces
- All `@scratch/shared` and `@scratch/api` imports replaced with relative paths
- Separate tsconfig files: `tsconfig.api.json` (Node16/composite for API+shared) and `tsconfig.ui.json` (bundler/noEmit for UI)
- Vite config updated: `@` alias points to `./ui/`, build output to `dist/client/`
- API server: added ESM-compatible `__dirname` via `import.meta.url`, `UI_DIST` now resolves to `dist/client/`
- Vitest config simplified: no aliases needed, tests found at `api/**/*.test.ts`
- `.gitignore` simplified (removed packages-specific patterns)

Verification results:
- `npm install` -- clean install, 0 vulnerabilities
- `npm run build` -- tsc compiles API, vite builds UI (2133 modules)
- `npm test` -- all 53 vitest tests pass
- `npm run dev` -- both API (port 3001) and Vite (port 5173/5174) start correctly
- `npm start` -- production mode serves SPA and API from single server
- Playwright E2E: ticket list loads, ticket detail navigation works, ticket creation works, board view works
