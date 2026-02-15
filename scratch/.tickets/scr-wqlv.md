---
id: scr-wqlv
status: closed
deps: [scr-88yy, scr-8ad1]
links: []
created: 2026-02-15T00:10:36Z
type: task
priority: 2
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend, backend]
---
# Production build and single-command dev startup

Configure the production build pipeline and ensure a single command starts everything for development.

Development:
- Root 'npm run dev' starts both the API server (tsx watch) and UI (vite dev) concurrently using the 'concurrently' package
- Verify hot reload works for both API and UI changes

Production build:
- 'npm run build' builds all packages: shared (tsc), api (tsc), ui (vite build)
- The API server in production serves the built React SPA from packages/ui/dist as static files
- A single 'npm start' command starts the production API server which serves both the API and the SPA
- Configure proper SPA fallback (all non-/api routes serve index.html)
- Environment variable for the .tickets directory path in production

## Acceptance Criteria

- 'npm run dev' starts both API and UI with hot reload from the repo root
- 'npm run build' produces production builds of all packages without errors
- 'npm start' starts a single server that serves both the API and the built SPA
- SPA routing works in production (direct URL access to /tickets/:id serves the app)
- Static assets are served with proper cache headers
- Build output is in a gitignore'd directory
- README documents how to start in dev and production modes

## Notes

Rewrote API server (packages/api/src/index.ts) to use a custom HTTP server instead of tRPC's standalone adapter. In production, it serves the built SPA from packages/ui/dist with proper MIME types, immutable cache headers on hashed assets, no-cache on HTML, and SPA fallback (all non-/trpc routes serve index.html). The tRPC API is mounted at /trpc. Updated the UI tRPC client to use a relative /trpc URL, and added a Vite dev proxy so the same URL works in development. Root package.json has dev (concurrently), build (shared then api+ui), and start (node) scripts. README updated with dev and production instructions. All 53 existing tests pass.

