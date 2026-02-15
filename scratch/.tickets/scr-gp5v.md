---
id: scr-gp5v
status: closed
deps: [scr-bhaz]
links: []
created: 2026-02-15T00:09:18Z
type: task
priority: 2
assignee: Phil
parent: scr-qzpf
tags: [backend]
---
# Add write operations to tRPC API (create, update, status, tags, notes)

Extend the tRPC API server with mutation procedures for write operations:

- tickets.create: mutation that creates a new ticket. Input: title, description (optional), design (optional), acceptance (optional), type, priority, assignee (optional), tags (optional), parent (optional). Generates an ID using the same algorithm as the CLI (directory-prefix + 4-char random alphanumeric). Writes a new .tickets/{id}.md file with YAML frontmatter and markdown body.
- tickets.update: mutation that updates a ticket's frontmatter fields. Input: id (required), and optional fields: priority, assignee, type, tags, externalRef, parent. Reads the file, updates frontmatter, writes back.
- tickets.updateStatus: mutation shorthand for status changes. Input: id, status. Validates status is one of open/in_progress/closed.
- tickets.addNote: mutation that appends a timestamped note to the ticket body. Input: id, text. Appends '## Notes' section if not present, then '**YYYY-MM-DDTHH:MM:SSZ** — {text}'.
- tickets.addDep / tickets.removeDep: mutations to manage the deps array.
- tickets.addLink / tickets.removeLink: mutations to manage the links array (symmetric: also updates the target ticket's links).
- tickets.addTag / tickets.removeTag: mutations to manage tags array.

All mutations should validate inputs with zod and return the updated ticket. Use file locking or atomic writes to prevent corruption.

## Acceptance Criteria

- tickets.create generates correct ID format and writes valid .tickets/*.md file
- Created files are parseable by the CLI (./ticket show works on them)
- tickets.update modifies frontmatter fields while preserving body content
- tickets.updateStatus changes status and is reflected in subsequent reads
- tickets.addNote appends correctly formatted timestamped note
- tickets.addDep/removeDep modify the deps array correctly
- tickets.addLink/removeLink update both sides of the symmetric link
- tickets.addTag/removeTag modify the tags array
- All mutations validate inputs and return proper tRPC errors for invalid data
- Written files maintain the same YAML formatting the CLI produces (flow-style arrays for deps, links, tags)


## Notes

**2026-02-15T00:48:34Z**

Implemented all write operations as tRPC mutation procedures in packages/api.

**packages/api/src/tickets.ts** — Added 4 new exported functions:
- `generateId(ticketsDir?)`: Replicates the CLI's ID generation algorithm (directory prefix + 4-char random alphanumeric).
- `serializeTicket(ticket)`: Serializes a Ticket object to CLI-compatible markdown with YAML frontmatter, using flow-style arrays for deps/links/tags, correct field ordering, and stripped milliseconds from timestamps.
- `writeTicket(ticket, ticketsDir?)`: Atomically writes a ticket file (write to .tmp, then rename) to prevent corruption.
- `readTicketById(id, ticketsDir?)`: Reads a single ticket by ID, throws if not found.

**packages/api/src/router.ts** — Added 10 mutation procedures to the tickets sub-router:
- `tickets.create`: Creates a new ticket with generated ID, writes .tickets/{id}.md.
- `tickets.update`: Updates frontmatter fields (priority, assignee, type, tags, externalRef, parent) while preserving body.
- `tickets.updateStatus`: Changes ticket status (validated to open/in_progress/closed).
- `tickets.addNote`: Appends timestamped note in CLI-compatible format.
- `tickets.addDep` / `tickets.removeDep`: Manages the deps array with existence validation.
- `tickets.addLink` / `tickets.removeLink`: Manages symmetric links (updates both source and target tickets).
- `tickets.addTag` / `tickets.removeTag`: Manages the tags array.

All mutations validate inputs with Zod schemas and return proper tRPC errors for invalid data. All mutations return the updated ticket. Created files are parseable by the CLI (`./ticket show` verified).

**packages/api/src/tickets.test.ts** — Added 18 new tests (53 total, all passing) covering:
- generateId prefix extraction for hyphenated, underscored, and single-word directory names
- serializeTicket flow-style arrays, optional field omission, and round-trip fidelity
- writeTicket + readTicketById filesystem operations and atomic writes
- CLI compatibility verification (field ordering and format matching)
