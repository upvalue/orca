---
id: scr-pur6
status: closed
deps: [scr-88yy, scr-8ad1]
links: []
created: 2026-02-15T00:10:22Z
type: task
priority: 3
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend]
---
# Error handling, loading states, and polish

Add consistent error handling, loading states, and UI polish across the entire app.

Error handling:
- React error boundary at the app root with a user-friendly fallback UI
- Per-route error boundaries that catch and display route-specific errors
- tRPC error handling: display user-friendly messages for common errors (not found, validation, server error)
- Toast notifications (shadcn/ui Sonner or Toast) for mutation success/failure

Loading states:
- Skeleton loaders (shadcn/ui Skeleton) for the list view (table rows)
- Skeleton loader for the detail view (metadata card, body, relationships)
- Inline loading indicators for mutations (button loading states)

Polish:
- Responsive design: list view table becomes cards on mobile, detail view stacks vertically
- Collapsible sidebar or responsive nav
- Consistent spacing, typography, and color usage
- Favicon and page title management (show ticket ID in title on detail page)
- Keyboard shortcuts: Escape to go back, / to focus search

## Acceptance Criteria

- Error boundary catches rendering errors and shows fallback UI
- tRPC errors display user-friendly toast messages
- Skeleton loaders appear while list and detail views are loading
- Buttons show loading state during mutations
- Toast notifications appear for successful and failed operations
- App is usable on mobile (responsive breakpoints work)
- Page title updates to show ticket ID on detail page
- No unhandled promise rejections or uncaught errors in console during normal use

## Notes

Implemented all error handling, loading states, and polish features:

**Error handling:**
- Created `ErrorBoundary` component (`src/components/ErrorBoundary.tsx`) with full-page and inline variants
- App-root error boundary wraps the entire provider tree in `main.tsx`
- Per-route error boundaries wrap each route in `App.tsx` (inline variant)
- Global tRPC error handler in `QueryClient` translates error codes (NOT_FOUND, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, INTERNAL_SERVER_ERROR, etc.) into user-friendly toast messages
- Smart retry logic: skips retry on NOT_FOUND errors, retries up to 2 times otherwise
- Network/connection errors show a specific "Unable to connect" message

**Toast notifications:**
- Global `mutations.onError` fallback on QueryClient catches any mutation without its own handler
- All existing per-mutation `onSuccess`/`onError` toasts preserved (status, priority, type, assignee, tag add/remove)

**Loading states:**
- Improved skeleton loaders for list view with responsive desktop table + mobile card skeletons
- Improved detail view skeleton with action buttons, metadata grid, body content, and relationship placeholders
- Inline loading spinners (Loader2 icon) on status action buttons, tag remove/add buttons
- `disabled` state on Select dropdowns during mutations (type, priority)

**Responsive design:**
- List view: table hidden on mobile (`hidden md:block`), card layout shown instead (`md:hidden`)
- Mobile cards show ticket ID, title, status badge, type/priority badges, assignee, tags, and quick actions
- Detail view: metadata grid goes from 1 column on mobile to 2 (sm) to 4 (lg)
- Filter dropdowns use half-width on mobile, fixed width on desktop
- Responsive header with hamburger menu on mobile (`sm:hidden`), desktop nav hidden on mobile

**Page titles:**
- `usePageTitle` hook sets `document.title` and restores on unmount
- List page: "Tickets — Scratch"
- Detail page: "{ticket.id} — {ticket.title}" (falls back to "{id} — Scratch" while loading)

**Keyboard shortcuts:**
- `/` focuses the search input on the list page (skipped when already in an input)
- `Escape` navigates back to list from detail page (skipped when in an input)

**Other polish:**
- Search bar with Search icon on list page for client-side filtering by title/ID
- SVG favicon added (`public/favicon.svg`)
- Favicon link added to `index.html`

