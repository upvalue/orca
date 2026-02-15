---
id: scr-wcoj
status: closed
deps: [scr-t9ap]
links: []
created: 2026-02-15T00:08:03Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [backend]
---
# Build ticket file I/O layer

Create the core file I/O module in packages/api that reads and writes .tickets/*.md files. Use gray-matter to parse YAML frontmatter and extract the markdown body. Extract the title from the first H1 heading in the body. Implement functions: readTicket(filePath) -> Ticket, readAllTickets(ticketsDir) -> Ticket[], computeRelationships(ticketId, allTickets) -> {blockers, blocking, children, linked}. The computeRelationships function should mirror the logic in the bash CLI's show command: blockers are unclosed deps, blocking are other unclosed tickets that have this ticket in their deps, children are tickets with parent == this id, linked are tickets in the links array. The ticketsDir should default to searching parent directories for .tickets/ (matching CLI behavior) but be configurable via env var TICKETS_DIR.

## Acceptance Criteria

- readTicket correctly parses YAML frontmatter and extracts all fields matching the Ticket type
- Title is extracted from first '# ' line in the markdown body
- readAllTickets reads all .md files from .tickets/ directory
- computeRelationships returns correct blockers (unclosed deps), blocking (unclosed tickets that dep on this), children (tickets with parent == id), and linked tickets
- Handles edge cases: missing optional fields, empty deps/links arrays, malformed files
- TICKETS_DIR env var is respected, with parent-directory walk as fallback
- Unit tests pass for parsing and relationship computation


## Notes

**2026-02-15T00:14:45Z**

Implemented the ticket file I/O layer in packages/api/src/tickets.ts with the following functions:

- findTicketsDir(): Resolves .tickets/ directory via TICKETS_DIR env var first, then walks parent directories from cwd (matching bash CLI behavior).
- readTicket(filePath): Parses a single .tickets/*.md file using gray-matter for YAML frontmatter, extracts title from first H1 heading, maps external-ref to externalRef, and normalizes all optional fields.
- parseTicketContent(raw, filePath?): Pure parsing function (no filesystem) for testability.
- readAllTickets(ticketsDir?): Reads all .md files from the tickets directory.
- computeRelationships(ticketId, allTickets): Mirrors the bash CLI show command logic — blockers are unclosed deps, blocking are unclosed tickets that dep on this, children have parent == this id, linked are from the links array.

Added gray-matter and vitest as dependencies. Wrote 35 unit tests covering parsing, filesystem operations, directory resolution, relationship computation, edge cases (missing fields, non-existent references, empty arrays, malformed files), and an integration test with realistic ticket graphs. All tests pass. The api package builds cleanly with tsc.
