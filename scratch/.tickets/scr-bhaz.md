---
id: scr-bhaz
status: closed
deps: [scr-wcoj]
links: []
created: 2026-02-15T00:08:18Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [backend]
---
# Build tRPC API server with read-only routes

Create the tRPC API server in packages/api using @trpc/server with a standalone HTTP adapter (or express adapter). Define a tRPC router with the following read-only procedures for the MVP:

- tickets.list: query that returns all tickets, with optional input filters for status, type, assignee, tag. Supports sortBy (priority, status, created) and sortOrder (asc, desc). Returns Ticket[] (without computed relationships for performance).
- tickets.getById: query that takes a ticket ID and returns a TicketDetail including computed relationships (blockers, blocking, children, linked). Uses the computeRelationships function from the file I/O layer.
- tickets.getReady: query that returns open/in_progress tickets with all deps resolved (closed), sorted by priority.
- tickets.getBlocked: query that returns open/in_progress tickets with at least one unclosed dep.

Configure CORS for localhost dev (UI on different port). The server should listen on port 3001 by default (configurable via PORT env var). Add a dev script that uses tsx for TypeScript execution with watch mode.

## Acceptance Criteria

- tRPC server starts on port 3001 and responds to requests
- tickets.list returns all tickets with correct frontmatter fields and titles
- tickets.list filters work: ?status=open, ?type=epic, ?assignee=Phil, ?tag=human-reviewed
- tickets.list sorting works by priority, status, and created date
- tickets.getById returns full ticket with computed blockers/blocking/children/linked
- tickets.getReady returns only tickets whose deps are all closed
- tickets.getBlocked returns only tickets with at least one unclosed dep
- CORS allows requests from localhost:5173 (Vite default)
- Input validation via zod schemas on all procedures
- Error handling returns proper tRPC errors for not-found tickets and invalid inputs

## Notes

**2026-02-15T00:15:00Z**

Implemented the tRPC API server in `packages/api`. Changes:

- **`packages/api/src/router.ts`** (new): tRPC router with `tickets` sub-router containing four read-only procedures:
  - `tickets.list` — returns all tickets with optional Zod-validated filters (status, type, assignee, tag) and sorting (sortBy: priority/status/created/title/type, sortOrder: asc/desc). Defaults to sorting by priority ascending.
  - `tickets.getById` — takes `{id: string}`, returns `TicketDetail` with computed relationships (blockers, blocking, children, linked) using `computeRelationships`. Throws `TRPCError NOT_FOUND` for missing tickets and `BAD_REQUEST` for empty id.
  - `tickets.getReady` — returns open/in_progress tickets where all deps are closed or non-existent, sorted by priority.
  - `tickets.getBlocked` — returns open/in_progress tickets with at least one unclosed dep, sorted by priority.
- **`packages/api/src/index.ts`** (updated): Standalone HTTP server using `@trpc/server/adapters/standalone` with CORS middleware allowing `localhost:5173` and `localhost:5174`. Listens on port 3001 by default, configurable via `PORT` env var.
- **`packages/api/package.json`** (updated): Added `@trpc/server`, `zod`, `cors`, `gray-matter` as dependencies; `tsx`, `@types/cors` as dev dependencies. Changed `dev` script from `tsc --build --watch` to `tsx watch src/index.ts` for live-reloading TypeScript execution. Added `start` script for production use.

The existing `tickets.ts` file I/O layer (from scr-wcoj) was already in place and provides `readAllTickets()` and `computeRelationships()`. The `AppRouter` type is exported for end-to-end type safety with the tRPC client in the UI package.

All acceptance criteria verified via curl-based integration tests against the running server.
