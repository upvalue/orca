---
id: scr-8ad1
status: closed
deps: [scr-q26j]
links: []
created: 2026-02-15T00:09:01Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [frontend, reviewed]
---
# Ticket detail view

Build the ticket detail view at /tickets/:id route in packages/ui. This displays the full content of a single ticket.

Features:
- Fetch ticket using tRPC tickets.getById query with polling enabled
- Header section: ticket ID (monospace, muted), title (large), status badge, type badge, priority indicator
- Metadata section using shadcn/ui Card: assignee, created date (formatted), priority, type, parent (as link if present), external-ref, tags as badges
- Body section: render the markdown body as HTML. Use a markdown rendering library (e.g., react-markdown or marked) to convert the ticket body to styled HTML. The body may contain sections like Description, Design, Acceptance Criteria, Notes — render them all.
- Computed relationships section at the bottom, each in its own Card:
  - Blockers: list of blocking tickets with id, status badge, title (each linking to their detail view)
  - Blocking: tickets this one is blocking (same format)
  - Children: child tickets (same format)
  - Linked: linked tickets (same format)
  - Only show sections that have data
- Back button/link to return to the list view
- Loading skeleton while data is fetching
- 404 state if ticket not found

## Acceptance Criteria

- Detail view renders at /tickets/:id
- Header shows ticket ID, title, status badge, type badge, priority
- Metadata card shows all frontmatter fields
- Markdown body is rendered as formatted HTML (headings, lists, code blocks, links work)
- Computed relationships (blockers, blocking, children, linked) display as linked lists
- Relationship items link to their own detail views
- Empty relationship sections are hidden
- Back navigation to list view works
- Loading skeleton displays while fetching
- 404 state shows for non-existent ticket IDs
- Data auto-refreshes via polling

## Notes

Implemented the full ticket detail view in packages/ui:

- **Rewrote `src/pages/TicketDetailPage.tsx`** — replaced the basic skeleton with a full-featured detail view. Uses `trpc.tickets.getById.useQuery` with polling (inherited from QueryClient's 5s refetchInterval).
- **Header section**: Displays ticket ID in monospace muted text, title as large heading, status badge (color-coded by status), type badge (color-coded by type), and priority indicator with severity labels (P0-P4).
- **Metadata Card**: Uses shadcn/ui Card component showing status, type, priority, assignee, created date (formatted), parent (as a navigable link), external-ref, and tags rendered as Badge components in a responsive grid layout.
- **Markdown body**: Installed `react-markdown` and renders the ticket body as styled HTML with prose typography classes. Supports headings, lists, code blocks, links, and all markdown sections (Description, Design, Acceptance Criteria, Notes).
- **Relationships section**: Blockers, Blocking, Children, and Linked tickets each rendered in their own Card. Each relationship item shows ticket ID (monospace), status badge, and title — all linking to the respective ticket's detail view. Empty sections are hidden.
- **Loading skeleton**: Shimmer-animated skeleton placeholders for all sections while data is fetching, using a new Skeleton component.
- **404 state**: Clear "Ticket not found" message with back navigation when ticket doesn't exist.
- **Back navigation**: Ghost button with arrow icon linking to the list view.
- **New shadcn/ui components**: Added `badge.tsx` (with default/secondary/destructive/outline variants), `card.tsx` (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter), and `skeleton.tsx`.
- TypeScript compiles with zero errors; Vite build succeeds.
