// ---------------------------------------------------------------------------
// Ticket data model — shared types for API server and UI
// ---------------------------------------------------------------------------

/** Ticket status values matching the YAML frontmatter schema. */
export type TicketStatus = 'open' | 'in_progress' | 'closed';

/** Ticket type values matching the YAML frontmatter schema. */
export type TicketType = 'task' | 'bug' | 'feature' | 'epic' | 'chore';

/** Ticket priority values (0 = highest, 4 = lowest). */
export type TicketPriority = 0 | 1 | 2 | 3 | 4;

/**
 * Core ticket interface matching the YAML frontmatter schema exactly.
 *
 * The `title` field is extracted from the first H1 heading in the markdown body.
 * The `body` field contains the raw markdown string (everything after frontmatter).
 * The `externalRef` field maps to the `external-ref` YAML key.
 */
export interface Ticket {
  /** Unique ticket identifier, e.g. "scr-t9ap". */
  id: string;

  /** Current workflow status. */
  status: TicketStatus;

  /** IDs of tickets this ticket depends on (blockers). */
  deps: string[];

  /** IDs of symmetrically linked tickets. */
  links: string[];

  /** ISO 8601 creation timestamp. */
  created: string;

  /** Classification of the ticket. */
  type: TicketType;

  /** Priority level (0 = highest, 4 = lowest). */
  priority: TicketPriority;

  /** Person assigned to this ticket, or null if unassigned. */
  assignee: string | null;

  /** External reference identifier (maps to `external-ref` in YAML). */
  externalRef: string | null;

  /** ID of the parent ticket, or null if top-level. */
  parent: string | null;

  /** Freeform tags for categorization. */
  tags: string[];

  /** Title extracted from the first H1 heading in the markdown body. */
  title: string;

  /** Raw markdown body (everything after the YAML frontmatter). */
  body: string;
}

// ---------------------------------------------------------------------------
// Computed / relationship types for ticket detail views
// ---------------------------------------------------------------------------

/** Minimal reference to a related ticket used in relationship arrays. */
export interface TicketRef {
  id: string;
  status: TicketStatus;
  title: string;
}

/**
 * Extended ticket with computed relationship fields.
 *
 * - `blockers`  — tickets that this ticket depends on (from `deps`)
 * - `blocking`  — tickets that depend on this ticket
 * - `children`  — tickets whose `parent` is this ticket
 * - `linked`    — symmetrically linked tickets (from `links`)
 */
export interface TicketDetail extends Ticket {
  /** Tickets this ticket depends on (resolved from `deps`). */
  blockers: TicketRef[];

  /** Tickets that list this ticket in their `deps`. */
  blocking: TicketRef[];

  /** Tickets whose `parent` field points to this ticket. */
  children: TicketRef[];

  /** Symmetrically linked tickets (resolved from `links`). */
  linked: TicketRef[];
}

// ---------------------------------------------------------------------------
// tRPC router input / output types
// ---------------------------------------------------------------------------

/** Sortable fields for the ticket list. */
export type TicketSortField = 'priority' | 'status' | 'created' | 'title' | 'type';

/** Sort direction. */
export type SortOrder = 'asc' | 'desc';

/** Input type for filtering and sorting the ticket list. All fields are optional. */
export interface ListTicketsInput {
  /** Filter by ticket status. */
  status?: TicketStatus;

  /** Filter by ticket type. */
  type?: TicketType;

  /** Filter by assignee name (exact match). */
  assignee?: string;

  /** Filter by tag (tickets that include this tag). */
  tag?: string;

  /** Field to sort results by. */
  sortBy?: TicketSortField;

  /** Sort direction, defaults to ascending. */
  sortOrder?: SortOrder;
}

/** Output type for the list tickets endpoint. */
export type ListTicketsOutput = Ticket[];

/** Output type for the get ticket detail endpoint. */
export type GetTicketDetailOutput = TicketDetail;

// ---------------------------------------------------------------------------
// Dependency tree types
// ---------------------------------------------------------------------------

/**
 * A node in the dependency tree.
 * Each node represents a ticket and has its own children (dependencies).
 */
export interface DepTreeNode {
  /** Ticket ID. */
  id: string;

  /** Current workflow status. */
  status: TicketStatus;

  /** Title extracted from the ticket. */
  title: string;

  /** Recursive child nodes (dependencies of this ticket). */
  children: DepTreeNode[];
}
