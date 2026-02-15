---
id: scr-28zq
status: closed
deps: [scr-qpwx]
links: []
created: 2026-02-15T00:10:08Z
type: task
priority: 3
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend]
---
# Board view (Kanban-style)

Add a Kanban board view as an alternative to the list view. Add a toggle in the header to switch between list and board views.

Board columns:
- Open (blue header)
- In Progress (yellow header)
- Closed (green header)

Each card shows: ticket ID, title, priority indicator, type badge, assignee, tags.
Cards should be visually compact but informative.

Drag-and-drop: use a drag-and-drop library (e.g., @dnd-kit/core) to allow dragging tickets between columns, which triggers a status change via tRPC tickets.updateStatus.

Filtering: reuse the same filter bar from the list view (status filter would be redundant in board view, so hide it).

Cards are clickable, navigating to the detail view.

## Acceptance Criteria

- Board view renders three columns: Open, In Progress, Closed
- Toggle between list and board view works
- Cards show ticket ID, title, priority, type, assignee, tags
- Drag-and-drop between columns changes ticket status
- Status change persists after drag-and-drop
- Filters (type, assignee, tag) work on the board view
- Cards are clickable and navigate to detail view
- Board view polls for updates like the list view
- Empty columns show an empty state

## Notes

Implemented Kanban board view as an alternative to the list view.

**New file: `packages/ui/src/pages/BoardView.tsx`**
- Three-column board layout: Open (blue header), In Progress (yellow header), Closed (green header)
- Each card displays ticket ID, title, priority indicator (P0-P4 badge), type badge, assignee, and tags
- Cards are compact with line-clamped titles
- Drag-and-drop powered by `@dnd-kit/core` with `PointerSensor` (8px activation distance to distinguish clicks from drags)
- Dropping a card into a different column triggers `tickets.updateStatus` mutation with optimistic updates, rollback on error, and toast notifications
- Empty columns show a helpful message ("Drag tickets here to change their status to ...")
- `DragOverlay` provides a visual copy of the card while dragging
- Loading state shows skeleton columns

**Modified file: `packages/ui/src/pages/TicketListPage.tsx`**
- Added `viewMode` state (`'list'` | `'board'`) with a toggle button group (List/LayoutGrid icons) in the header
- Status filter is hidden when in board view (redundant since columns represent statuses)
- Board view query excludes status filter so all statuses are fetched for column grouping
- Type, assignee, and tag filters are shared between both views
- Polling inherited from global QueryClient config works for both views

**Dependencies added:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`

