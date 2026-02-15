---
id: scr-t9ap
status: closed
deps: [scr-444d]
links: []
created: 2026-02-15T00:07:49Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [frontend, backend]
---
# Define shared TypeScript types for ticket data model

Create the shared type definitions in packages/shared that both the API server and UI will use. Define the Ticket interface matching the YAML frontmatter schema exactly: id, status, deps, links, created, type, priority, assignee, external-ref, parent, tags. Also define TicketStatus, TicketType, and TicketPriority as union types/enums. Include the title field (extracted from first H1 in body) and body (raw markdown string) as part of the Ticket type. Define tRPC router input/output types for list filters (status, type, assignee, tag) and detail response (with computed fields: blockers, blocking, children, linked).

## Acceptance Criteria

- Ticket interface has all frontmatter fields: id, status, deps, links, created, type, priority, assignee, externalRef, parent, tags
- Ticket interface includes title (string) and body (string, raw markdown)
- TicketStatus = 'open' | 'in_progress' | 'closed'
- TicketType = 'task' | 'bug' | 'feature' | 'epic' | 'chore'
- TicketPriority = 0 | 1 | 2 | 3 | 4
- TicketDetail extends Ticket with computed: blockers, blocking, children, linked (each an array of {id, status, title})
- ListTicketsInput type for filters (all optional): status, type, assignee, tag, sortBy, sortOrder
- Package builds successfully and is importable from other workspace packages

## Notes

### Implementation Summary

Defined all shared TypeScript types in `packages/shared/src/index.ts`:

- **`TicketStatus`** — union type: `'open' | 'in_progress' | 'closed'`
- **`TicketType`** — union type: `'task' | 'bug' | 'feature' | 'epic' | 'chore'`
- **`TicketPriority`** — union type: `0 | 1 | 2 | 3 | 4`
- **`Ticket`** — interface with all frontmatter fields (id, status, deps, links, created, type, priority, assignee, externalRef, parent, tags) plus title and body
- **`TicketRef`** — minimal reference type (`{id, status, title}`) for relationship arrays
- **`TicketDetail`** — extends Ticket with computed relationship fields: blockers, blocking, children, linked (each `TicketRef[]`)
- **`ListTicketsInput`** — all-optional filter/sort input: status, type, assignee, tag, sortBy, sortOrder
- **`ListTicketsOutput`** and **`GetTicketDetailOutput`** — output type aliases for tRPC router endpoints

The `external-ref` YAML key is mapped to `externalRef` (camelCase) in the TypeScript interface. Optional fields (assignee, externalRef, parent) are typed as `string | null`. Package builds cleanly with `tsc --build` and is importable from `@scratch/api` and `@scratch/ui` via workspace references.
