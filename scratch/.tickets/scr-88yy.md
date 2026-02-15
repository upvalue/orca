---
id: scr-88yy
status: closed
deps: [scr-q26j]
links: []
created: 2026-02-15T00:08:47Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [frontend, ready-for-review]
---
# Ticket list view (main dashboard)

Build the main ticket list view at the / route in packages/ui. This is the primary dashboard showing all tickets.

Features:
- Fetch tickets using the tRPC tickets.list query with polling enabled
- Display as a table using shadcn/ui Table component with columns: ID (monospace), Title, Status, Type, Priority, Assignee, Tags
- Status badges with color coding: open (blue), in_progress (yellow), closed (green)
- Priority indicators: P0 (red), P1 (orange), P2 (default), P3 (gray), P4 (light gray)
- Type badges with distinct styling (epic, bug, feature, task, chore)
- Tags displayed as small badges/chips
- Sorting: clickable column headers to sort by priority, status, created date. Default sort by priority (ascending, P0 first)
- Filtering: filter bar at the top with dropdowns/selects for status, type, assignee, and a tag filter. Use shadcn/ui Select components. Filters should update the tRPC query input.
- Each row is clickable, navigating to /tickets/:id
- Empty state when no tickets match filters
- Loading skeleton while data is fetching

## Acceptance Criteria

- List view renders all tickets from the API in a table
- Columns show: ID, title, status, type, priority, assignee, tags
- Status has colored badges (blue/yellow/green for open/in_progress/closed)
- Priority has visual indicators (color-coded P0-P4)
- Clicking a row navigates to /tickets/:id
- Filter dropdowns for status, type, assignee, tag work and update the list
- Sorting by column headers works (at minimum: priority, created)
- Loading skeleton shows while data is loading
- Empty state displays when no tickets match
- Data auto-refreshes via polling

## Notes

Rewrote `packages/ui/src/pages/TicketListPage.tsx` from the basic scaffold into a full-featured dashboard. Changes:

**New shadcn/ui components added:**
- `components/ui/table.tsx` — Table, TableHeader, TableBody, TableRow, TableHead, TableCell (standard shadcn Table)
- `components/ui/select.tsx` — Select with Trigger, Content, Item (Radix-based, required `@radix-ui/react-select` dependency)
- `components/ui/badge.tsx` and `components/ui/skeleton.tsx` already existed

**TicketListPage implementation:**
- Fetches tickets via `trpc.tickets.list.useQuery(queryInput)` where queryInput is built from filter/sort state. Polling is handled by the global QueryClient config (5s refetchInterval).
- **Table**: shadcn/ui Table with columns: ID (monospace), Title, Status, Type, Priority, Assignee, Tags
- **Status badges**: color-coded — open (blue), in_progress (yellow), closed (green)
- **Priority badges**: color-coded — P0 (red), P1 (orange), P2 (default gray), P3 (gray), P4 (light gray)
- **Type badges**: distinct colors — epic (purple), bug (red), feature (blue), task (gray), chore (amber)
- **Tags**: small secondary badges rendered as chips
- **Sorting**: clickable column headers with arrow icons for ID (sorts by created), Status, Type, and Priority. Default sort is priority ascending (P0 first). Clicking toggles asc/desc; switching columns resets to asc.
- **Filtering**: filter bar with 4 Select dropdowns (status, type, assignee, tag). Assignee and tag options are dynamically populated from the full unfiltered ticket list. Filters update the tRPC query input so filtering is server-side.
- **Clickable rows**: each row navigates to `/tickets/:id` via `useNavigate`
- **Loading skeleton**: shows skeleton placeholders for filter bar and table rows while data is loading
- **Empty state**: dashed border card with message when no tickets match filters

**2026-02-15T00:00:00Z**

Implementation verified complete. All acceptance criteria met: TicketListPage.tsx at the `/` route renders a full-featured ticket dashboard with shadcn/ui Table, color-coded status/priority/type badges, sortable column headers (priority, status, type, created), filter dropdowns (status, type, assignee, tag) that update tRPC query input server-side, clickable rows navigating to `/tickets/:id`, loading skeleton, empty state, and auto-refresh via 5s polling. Supporting shadcn/ui components (table.tsx, select.tsx, badge.tsx, skeleton.tsx) all in place. Build compiles cleanly.
