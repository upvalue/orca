---
id: scr-qzpf
status: closed
deps: []
links: []
created: 2026-02-15T00:01:26Z
type: epic
priority: 2
assignee: Phil
tags: [human-reviewed]
---
# Create a React UI app for ./ticket

Build a React-based web UI that provides a visual interface for the `./ticket` CLI
ticketing system. The UI should read from and write to the same `.tickets/` directory
of Markdown files with YAML frontmatter, ensuring full interoperability with the CLI.

## Architecture Overview

The app consists of three layers:

1. **API Server** — A lightweight Node.js/Express backend that wraps the `./ticket` CLI
   (or directly reads/writes `.tickets/*.md` files) and exposes a REST API.
2. **React Frontend** — A single-page app (Vite + React + TypeScript) that consumes
   the API and renders ticket management views.
3. **Shared Types** — TypeScript type definitions for the ticket data model, shared
   between frontend and backend.

### Recommended Tech Stack

- **Build tool:** Vite
- **Frontend:** React 18+ with TypeScript
- **Routing:** React Router
- **Styling:** Tailwind CSS (or CSS Modules — see open question)
- **State management:** React Query (TanStack Query) for server state
- **Backend:** Node.js + Express (TypeScript)
- **Markdown parsing:** gray-matter (YAML frontmatter) + marked/remark (body)
- **Monorepo structure:** npm workspaces (`packages/api`, `packages/ui`, `packages/shared`)

## Plan / Sub-tickets

### Phase 1: Project Scaffolding & Data Layer

**1.1 — Initialize monorepo and project structure**
- Set up npm workspaces: `packages/shared`, `packages/api`, `packages/ui`
- Configure TypeScript (base tsconfig + per-package configs)
- Set up ESLint + Prettier
- Add dev scripts to root package.json

**1.2 — Define shared TypeScript types**
- `Ticket` interface matching the YAML frontmatter schema:
  `id, status, deps, links, created, type, priority, assignee, external-ref, parent, tags`
- Enum types for `TicketStatus`, `TicketType`, `TicketPriority`
- API request/response types

**1.3 — Build the API server**
- File I/O layer: read/write `.tickets/*.md` files (parse YAML frontmatter + Markdown body)
- REST endpoints:
  - `GET /api/tickets` — List tickets (with query params for status, assignee, tag, type filters)
  - `GET /api/tickets/:id` — Get single ticket (include computed fields: blockers, blocking, children, linked)
  - `POST /api/tickets` — Create ticket
  - `PATCH /api/tickets/:id` — Update ticket (status, assignee, priority, tags, body, etc.)
  - `POST /api/tickets/:id/notes` — Add a timestamped note
  - `PUT /api/tickets/:id/deps` — Manage dependencies
  - `PUT /api/tickets/:id/links` — Manage links
  - `GET /api/tickets/dep-tree/:id` — Get dependency tree
  - `GET /api/tickets/ready` — List ready tickets
  - `GET /api/tickets/blocked` — List blocked tickets
- Input validation and error handling
- CORS configuration for dev

**1.4 — Scaffold the React app with Vite**
- Initialize Vite + React + TypeScript project
- Set up React Router with route structure
- Configure Tailwind CSS (or chosen styling approach)
- Set up TanStack Query provider
- Create API client module (fetch wrapper with typed responses)

### Phase 2: Core UI Views

**2.1 — Ticket list view (main dashboard)**
- Table/card view of all tickets
- Columns: ID, title, status, type, priority, assignee, tags
- Sorting by priority, status, created date
- Filtering by status, type, assignee, tag
- Visual indicators for priority levels and status
- Quick-action buttons (start, close, reopen)

**2.2 — Ticket detail view**
- Full ticket display: frontmatter fields + rendered Markdown body
- Editable fields (inline or modal): status, priority, assignee, tags, type
- Sections for: Description, Design, Acceptance Criteria, Notes
- Display computed relationships: Blockers, Blocking, Children, Linked tickets
- Add note form

**2.3 — Ticket creation form**
- Form with fields: title, description, type, priority, assignee, tags, parent
- Design and Acceptance Criteria as optional expandable sections
- Validation matching CLI constraints
- Redirect to new ticket detail on success

**2.4 — Ticket editing**
- Edit ticket body (Markdown editor or textarea)
- Edit frontmatter fields via form controls
- Optimistic updates with TanStack Query

### Phase 3: Advanced Features

**3.1 — Dependency & link management UI**
- Add/remove dependencies from ticket detail view
- Dependency tree visualization (expandable tree or graph)
- Visual blocked/ready status indicators
- Link management (add/remove symmetric links)

**3.2 — Board view (Kanban-style)**
- Columns for Open / In Progress / Closed
- Drag-and-drop to change status
- Filterable by assignee, type, tag

**3.3 — Ready & Blocked views**
- Dedicated views for ready and blocked ticket lists
- Show which dependencies are unresolved for blocked tickets

**3.4 — Search and bulk operations**
- Full-text search across ticket titles and bodies
- Bulk status changes
- Bulk tagging

### Phase 4: Polish & Deployment

**4.1 — Error handling & loading states**
- Consistent error boundaries
- Loading skeletons
- Toast notifications for mutations

**4.2 — Responsive design**
- Mobile-friendly layouts
- Collapsible sidebar/navigation

**4.3 — Build & deployment configuration**
- Production build pipeline
- API server serves the built React SPA in production
- Single `npm start` to run both in dev (concurrently)
- Optional: Docker setup

## Open Questions for Product Owner

1. **Styling preference:** Should we use Tailwind CSS, CSS Modules, or a component
   library like shadcn/ui? Tailwind + shadcn/ui would give the fastest path to a
   polished look.

   PO: shadcn/ui and tailwind is fine

2. **API approach — CLI wrapper vs. direct file I/O?** The API server could either
   shell out to `./ticket` for each operation (simpler, guaranteed consistency) or
   directly read/write the `.tickets/*.md` files (faster, no process spawning). Direct
   file I/O is recommended for performance, but the CLI wrapper approach is safer if
   the ticket format might change. Which is preferred?

    direct file I/O is ok

3. **Real-time updates:** Should the UI auto-refresh when ticket files change on disk
   (e.g., via file watching / WebSocket push)? This matters if CLI and UI are used
   simultaneously.

    polling seems OK here

4. **Authentication:** Is any auth needed, or is this a local-only dev tool assumed to
   run on the developer's machine?

   authentication is not reuqired

5. **Scope of Phase 1 vs. MVP:** Is the full plan desired, or should we ship a
   minimal MVP (list + detail + create) first and iterate? If MVP-first, which
   features are must-haves for the first release?

   MVP can be read only

6. **Markdown editing:** Should the ticket body editor support live Markdown preview,
   or is a plain textarea sufficient?

   we don't need an editor

7. **Deployment target:** Is this intended to run locally only (localhost), or should
   it be deployable to a shared server? This affects auth and multi-user concerns.

   localhost only, no multi user

8. **Monorepo vs. subdirectory:** Should the React app live in a `packages/` monorepo
   structure within this repo, or in a single `ui/` subdirectory? Monorepo is
   recommended if the API server is also TypeScript.

   monorepo

   make the API server use trpc

