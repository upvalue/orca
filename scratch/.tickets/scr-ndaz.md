---
id: scr-ndaz
status: closed
deps: [scr-qpwx]
links: []
created: 2026-02-15T00:09:57Z
type: task
priority: 3
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend]
---
# Dependency and link management UI

Add dependency and link management to the ticket detail view.

Dependency management:
- In the detail view, add an 'Add Dependency' button that shows a searchable ticket selector (dropdown or autocomplete that searches ticket IDs and titles)
- Each dependency/blocker row should have a remove button (x) to call tickets.removeDep
- Show visual indicators for blocked status (red badge/icon)

Link management:
- Similar 'Add Link' button with ticket selector
- Remove button on each linked ticket

Dependency tree view:
- Add a tRPC query tickets.getDepTree that returns the full dependency tree for a ticket (recursive, matching the CLI's 'dep tree' output)
- Render as an expandable/collapsible tree view on the detail page
- Each node shows ticket ID, status badge, and title
- Nodes are clickable, linking to their detail views

## Acceptance Criteria

- Add Dependency button opens a searchable ticket selector
- Dependencies can be added and removed from the detail view
- Add Link button opens a searchable ticket selector
- Links can be added and removed (symmetric removal works)
- Dependency tree displays correctly with nested levels
- Tree nodes are clickable and link to ticket detail views
- Tree shows status badges on each node
- Blocked tickets have a visual indicator
- Changes via dep/link management are reflected immediately (optimistic or refetch)


## Notes

**2026-02-15T01:13:58Z**

Implemented dependency and link management UI on the ticket detail view.

Backend: Added tickets.getDepTree tRPC query that recursively builds the full dependency tree with cycle detection, returning DepTreeNode objects.

Shared types: Added DepTreeNode interface.

Frontend: Added TicketSelector (searchable dropdown), ManagedDepsSection (add/remove deps with optimistic updates, blocked indicator), ManagedLinksSection (add/remove symmetric links with optimistic updates), blocked badge in ticket header, and DepTreeView (expandable/collapsible tree with clickable nodes linking to detail pages, status badges on each node). Relationships section is always visible for dependency and link management.
