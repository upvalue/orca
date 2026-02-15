---
id: scr-2hsh
status: closed
deps: [scr-gp5v, scr-88yy]
links: []
created: 2026-02-15T00:09:31Z
type: task
priority: 2
assignee: Phil
parent: scr-qzpf
tags: [ready-for-work, frontend]
---
# Ticket creation form

Build a ticket creation form in the UI. Add a 'New Ticket' button to the list view header that navigates to /tickets/new (or opens a dialog).

Form fields using shadcn/ui form components:
- Title (required text input)
- Description (textarea, optional)
- Type (select: task, bug, feature, epic, chore — default task)
- Priority (select: P0-P4, default P2)
- Assignee (text input, optional)
- Parent (text input for parent ticket ID, optional)
- Tags (text input with comma-separated tags, or a tag input component)
- Design (expandable textarea, optional)
- Acceptance Criteria (expandable textarea, optional)

Use react-hook-form with zod validation. On submit, call tRPC tickets.create mutation. Show success toast and redirect to new ticket detail view. Show error toast on failure.

## Acceptance Criteria

- New Ticket button is visible on the list view
- Form renders with all fields: title, description, type, priority, assignee, parent, tags, design, acceptance
- Title is required, form cannot submit without it
- Type and priority have dropdown selects with correct options
- Design and acceptance criteria sections are collapsible/expandable
- Successful creation shows a toast and redirects to /tickets/:newId
- Failed creation shows an error toast
- Created ticket appears in the list view
- Created ticket is valid and readable by the CLI

## Notes

**2026-02-15T01:12:00Z**

Implemented the ticket creation form at /tickets/new. Added react-hook-form, @hookform/resolvers, and zod to the UI package. Created shadcn/ui components: form.tsx, label.tsx, textarea.tsx, collapsible.tsx. Built TicketCreatePage with all required fields (title, description, type select, priority select, assignee, parent, tags as comma-separated input, collapsible design and acceptance criteria textareas). Form uses zod validation (title required), calls tRPC tickets.create mutation, shows success/error toasts via sonner, and redirects to the new ticket detail page on success. Added "New Ticket" button with Plus icon to the TicketListPage header. Route placed before /tickets/:id to avoid matching "new" as an ID. Build passes, API tests pass (53/53).
