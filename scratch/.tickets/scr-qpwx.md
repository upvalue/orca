---
id: scr-qpwx
status: closed
deps: [scr-gp5v, scr-8ad1]
links: []
created: 2026-02-15T00:09:44Z
type: task
priority: 2
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend]
---
# Inline editing on ticket detail view

Add inline editing capabilities to the ticket detail view. Users should be able to modify ticket fields directly from the detail page without navigating to a separate edit page.

Editable fields:
- Status: quick action buttons (Start, Close, Reopen) using tRPC tickets.updateStatus
- Priority: clickable to show a dropdown select, saves on change
- Assignee: clickable to show a text input, saves on blur/enter
- Type: clickable to show a dropdown select, saves on change
- Tags: show add/remove tag controls (small + button to add, x on each tag to remove)

Also add quick actions to the list view rows:
- Start (if open), Close (if open/in_progress), Reopen (if closed) as icon buttons

Use optimistic updates via TanStack Query's mutation hooks (onMutate, onError rollback, onSettled invalidate). Show toast notifications for success/failure.

## Acceptance Criteria

- Status can be changed via Start/Close/Reopen buttons on detail view
- Priority is editable inline via dropdown
- Assignee is editable inline via text input
- Type is editable inline via dropdown
- Tags can be added and removed from the detail view
- Quick action buttons on list view rows change status
- Optimistic updates provide immediate visual feedback
- Failed mutations roll back the optimistic update and show an error toast
- Success mutations show a brief success toast
- Changes persist and are reflected when the page is refreshed

## Notes

Implemented inline editing on the ticket detail view and quick action buttons on the list view.

**Detail view changes (TicketDetailPage.tsx):**
- Added Start/Close/Reopen status quick action buttons using `tickets.updateStatus` mutation
- Priority field now renders as an inline Select dropdown, saves on change
- Type field now renders as an inline Select dropdown, saves on change
- Assignee field is click-to-edit with a text Input, saves on blur/Enter, Escape to cancel
- Tags section shows X buttons on each tag to remove, and a "+ Add" button that opens an inline text input for new tags (uses `tickets.addTag` / `tickets.removeTag`)

**List view changes (TicketListPage.tsx):**
- Added an Actions column with icon-only quick action buttons per row (Start, Close, Reopen depending on current status)
- Buttons use `e.stopPropagation()` so row click navigation still works

**Infrastructure:**
- Installed `sonner` for toast notifications, added `<Toaster>` in App.tsx
- Created `components/ui/input.tsx` (shadcn-style Input component)
- All mutations use optimistic updates via `onMutate` (snapshot + setData), `onError` (rollback from snapshot), `onSuccess` (toast), `onSettled` (invalidateQueries)
