// ---------------------------------------------------------------------------
// tRPC router — ticket procedures (read + write)
// ---------------------------------------------------------------------------

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import type { Ticket, TicketDetail, TicketStatus, DepTreeNode } from '../shared/index.js';
import {
  readAllTickets,
  readTicketById,
  computeRelationships,
  generateId,
  writeTicket,
} from './tickets.js';

// ---------------------------------------------------------------------------
// tRPC initialisation
// ---------------------------------------------------------------------------

const t = initTRPC.create();

// ---------------------------------------------------------------------------
// Zod input schemas
// ---------------------------------------------------------------------------

const listTicketsInput = z
  .object({
    status: z.enum(['open', 'in_progress', 'closed']).optional(),
    type: z.enum(['task', 'bug', 'feature', 'epic', 'chore']).optional(),
    assignee: z.string().optional(),
    tag: z.string().optional(),
    sortBy: z.enum(['priority', 'status', 'created', 'title', 'type']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  })
  .optional();

const getByIdInput = z.object({
  id: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Zod input schemas — mutations
// ---------------------------------------------------------------------------

const statusEnum = z.enum(['open', 'in_progress', 'closed']);
const typeEnum = z.enum(['task', 'bug', 'feature', 'epic', 'chore']);
const priorityEnum = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);

const createTicketInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  design: z.string().optional(),
  acceptance: z.string().optional(),
  type: typeEnum,
  priority: priorityEnum,
  assignee: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parent: z.string().optional(),
});

const updateTicketInput = z.object({
  id: z.string().min(1),
  priority: priorityEnum.optional(),
  assignee: z.string().nullable().optional(),
  type: typeEnum.optional(),
  tags: z.array(z.string()).optional(),
  externalRef: z.string().nullable().optional(),
  parent: z.string().nullable().optional(),
});

const updateStatusInput = z.object({
  id: z.string().min(1),
  status: statusEnum,
});

const addNoteInput = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const depInput = z.object({
  id: z.string().min(1),
  depId: z.string().min(1),
});

const linkInput = z.object({
  id: z.string().min(1),
  targetId: z.string().min(1),
});

const tagInput = z.object({
  id: z.string().min(1),
  tag: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Status ordering for sort comparisons
// ---------------------------------------------------------------------------

const STATUS_ORDER: Record<TicketStatus, number> = {
  open: 0,
  in_progress: 1,
  closed: 2,
};

// ---------------------------------------------------------------------------
// Ticket sub-router
// ---------------------------------------------------------------------------

const ticketsRouter = t.router({
  /**
   * tickets.list — return all tickets with optional filters and sorting.
   * Returns Ticket[] (without computed relationships for performance).
   */
  list: t.procedure.input(listTicketsInput).query(({ input }) => {
    let tickets = readAllTickets();

    // Apply filters
    if (input?.status) {
      tickets = tickets.filter((t) => t.status === input.status);
    }
    if (input?.type) {
      tickets = tickets.filter((t) => t.type === input.type);
    }
    if (input?.assignee) {
      tickets = tickets.filter((t) => t.assignee === input.assignee);
    }
    if (input?.tag) {
      tickets = tickets.filter((t) => t.tags.includes(input.tag!));
    }

    // Apply sorting
    const sortBy = input?.sortBy ?? 'priority';
    const sortOrder = input?.sortOrder ?? 'asc';
    const direction = sortOrder === 'asc' ? 1 : -1;

    tickets.sort((a: Ticket, b: Ticket) => {
      let cmp = 0;
      switch (sortBy) {
        case 'priority':
          cmp = a.priority - b.priority;
          break;
        case 'status':
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case 'created':
          cmp = a.created.localeCompare(b.created);
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'type':
          cmp = a.type.localeCompare(b.type);
          break;
      }
      return cmp * direction;
    });

    return tickets;
  }),

  /**
   * tickets.getById — return a single ticket with computed relationships.
   */
  getById: t.procedure.input(getByIdInput).query(({ input }) => {
    const allTickets = readAllTickets();
    const ticket = allTickets.find((t) => t.id === input.id);

    if (!ticket) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    const relationships = computeRelationships(input.id, allTickets);
    const detail: TicketDetail = {
      ...ticket,
      ...relationships,
    };

    return detail;
  }),

  /**
   * tickets.getReady — return open/in_progress tickets with all deps resolved (closed).
   * Sorted by priority (ascending = highest priority first).
   */
  getReady: t.procedure.query(() => {
    const allTickets = readAllTickets();
    const ticketMap = new Map<string, Ticket>();
    for (const t of allTickets) {
      ticketMap.set(t.id, t);
    }

    const ready = allTickets.filter((ticket) => {
      // Only open or in_progress
      if (ticket.status !== 'open' && ticket.status !== 'in_progress') {
        return false;
      }
      // All deps must be closed (or non-existent in the system)
      if (ticket.deps.length === 0) {
        return true;
      }
      return ticket.deps.every((depId) => {
        const dep = ticketMap.get(depId);
        return !dep || dep.status === 'closed';
      });
    });

    // Sort by priority ascending (0 = highest)
    ready.sort((a, b) => a.priority - b.priority);

    return ready;
  }),

  /**
   * tickets.getBlocked — return open/in_progress tickets with at least one unclosed dep.
   */
  getBlocked: t.procedure.query(() => {
    const allTickets = readAllTickets();
    const ticketMap = new Map<string, Ticket>();
    for (const t of allTickets) {
      ticketMap.set(t.id, t);
    }

    const blocked = allTickets.filter((ticket) => {
      // Only open or in_progress
      if (ticket.status !== 'open' && ticket.status !== 'in_progress') {
        return false;
      }
      // Must have at least one dep that is not closed
      if (ticket.deps.length === 0) {
        return false;
      }
      return ticket.deps.some((depId) => {
        const dep = ticketMap.get(depId);
        return dep && dep.status !== 'closed';
      });
    });

    // Sort by priority ascending (0 = highest)
    blocked.sort((a, b) => a.priority - b.priority);

    return blocked;
  }),

  /**
   * tickets.getDepTree — return the full dependency tree for a ticket (recursive).
   * Matches the CLI's 'dep tree' output structure.
   */
  getDepTree: t.procedure.input(getByIdInput).query(({ input }) => {
    const allTickets = readAllTickets();
    const byId = new Map<string, Ticket>();
    for (const t of allTickets) {
      byId.set(t.id, t);
    }

    const rootTicket = byId.get(input.id);
    if (!rootTicket) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    function buildTree(ticketId: string, visited: Set<string>): DepTreeNode | null {
      const ticket = byId.get(ticketId);
      if (!ticket) return null;

      // Prevent cycles
      if (visited.has(ticketId)) {
        return { id: ticket.id, status: ticket.status, title: ticket.title, children: [] };
      }
      visited.add(ticketId);

      const children: DepTreeNode[] = [];
      for (const depId of ticket.deps) {
        const child = buildTree(depId, visited);
        if (child) children.push(child);
      }

      return {
        id: ticket.id,
        status: ticket.status,
        title: ticket.title,
        children,
      };
    }

    return buildTree(input.id, new Set<string>()) as DepTreeNode;
  }),

  // =========================================================================
  // Mutations — write operations
  // =========================================================================

  /**
   * tickets.create — create a new ticket.
   * Generates an ID using the same algorithm as the CLI.
   */
  create: t.procedure.input(createTicketInput).mutation(({ input }) => {
    const id = generateId();
    const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    // Build the markdown body matching CLI format
    let body = `\n# ${input.title}\n`;
    if (input.description) {
      body += `\n${input.description}\n`;
    }
    if (input.design) {
      body += `\n## Design\n\n${input.design}\n`;
    }
    if (input.acceptance) {
      body += `\n## Acceptance Criteria\n\n${input.acceptance}\n`;
    }

    const ticket: Ticket = {
      id,
      status: 'open',
      deps: [],
      links: [],
      created: now,
      type: input.type,
      priority: input.priority,
      assignee: input.assignee ?? null,
      externalRef: null,
      parent: input.parent ?? null,
      tags: input.tags ?? [],
      title: input.title,
      body,
    };

    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.update — update a ticket's frontmatter fields.
   * Preserves the body content.
   */
  update: t.procedure.input(updateTicketInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    // Update only the fields that were provided
    if (input.priority !== undefined) ticket.priority = input.priority;
    if (input.assignee !== undefined) ticket.assignee = input.assignee;
    if (input.type !== undefined) ticket.type = input.type;
    if (input.tags !== undefined) ticket.tags = input.tags;
    if (input.externalRef !== undefined) ticket.externalRef = input.externalRef;
    if (input.parent !== undefined) ticket.parent = input.parent;

    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.updateStatus — shorthand for status changes.
   */
  updateStatus: t.procedure.input(updateStatusInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    ticket.status = input.status;
    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.addNote — append a timestamped note to the ticket body.
   */
  addNote: t.procedure.input(addNoteInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

    // Add Notes section if missing, then append timestamped note
    if (!ticket.body.includes('## Notes')) {
      ticket.body += '\n## Notes\n';
    }
    ticket.body += `\n**${timestamp}**\n\n${input.text}\n`;

    // Re-extract the title since body changed
    const titleMatch = ticket.body.match(/^# (.+)$/m);
    ticket.title = titleMatch ? titleMatch[1].trim() : ticket.title;

    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.addDep — add a dependency to a ticket.
   */
  addDep: t.procedure.input(depInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    // Verify dependency ticket exists
    try {
      readTicketById(input.depId);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Dependency ticket "${input.depId}" not found`,
      });
    }

    // Don't add duplicate
    if (ticket.deps.includes(input.depId)) {
      return ticket;
    }

    ticket.deps.push(input.depId);
    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.removeDep — remove a dependency from a ticket.
   */
  removeDep: t.procedure.input(depInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    if (!ticket.deps.includes(input.depId)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Dependency "${input.depId}" not found in ticket "${input.id}"`,
      });
    }

    ticket.deps = ticket.deps.filter((d) => d !== input.depId);
    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.addLink — add a symmetric link between two tickets.
   * Updates both the source and target ticket's links arrays.
   */
  addLink: t.procedure.input(linkInput).mutation(({ input }) => {
    let ticket: Ticket;
    let target: Ticket;

    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    try {
      target = readTicketById(input.targetId);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Target ticket "${input.targetId}" not found`,
      });
    }

    // Add link to source if not already present
    if (!ticket.links.includes(input.targetId)) {
      ticket.links.push(input.targetId);
      writeTicket(ticket);
    }

    // Add symmetric link to target if not already present
    if (!target.links.includes(input.id)) {
      target.links.push(input.id);
      writeTicket(target);
    }

    return ticket;
  }),

  /**
   * tickets.removeLink — remove a symmetric link between two tickets.
   * Updates both the source and target ticket's links arrays.
   */
  removeLink: t.procedure.input(linkInput).mutation(({ input }) => {
    let ticket: Ticket;
    let target: Ticket;

    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    try {
      target = readTicketById(input.targetId);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Target ticket "${input.targetId}" not found`,
      });
    }

    if (!ticket.links.includes(input.targetId)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Link to "${input.targetId}" not found in ticket "${input.id}"`,
      });
    }

    // Remove from both sides
    ticket.links = ticket.links.filter((l) => l !== input.targetId);
    writeTicket(ticket);

    target.links = target.links.filter((l) => l !== input.id);
    writeTicket(target);

    return ticket;
  }),

  /**
   * tickets.addTag — add a tag to a ticket.
   */
  addTag: t.procedure.input(tagInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    // Don't add duplicate
    if (ticket.tags.includes(input.tag)) {
      return ticket;
    }

    ticket.tags.push(input.tag);
    writeTicket(ticket);
    return ticket;
  }),

  /**
   * tickets.removeTag — remove a tag from a ticket.
   */
  removeTag: t.procedure.input(tagInput).mutation(({ input }) => {
    let ticket: Ticket;
    try {
      ticket = readTicketById(input.id);
    } catch {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Ticket "${input.id}" not found`,
      });
    }

    if (!ticket.tags.includes(input.tag)) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Tag "${input.tag}" not found in ticket "${input.id}"`,
      });
    }

    ticket.tags = ticket.tags.filter((t) => t !== input.tag);
    writeTicket(ticket);
    return ticket;
  }),
});

// ---------------------------------------------------------------------------
// Root router
// ---------------------------------------------------------------------------

export const appRouter = t.router({
  tickets: ticketsRouter,
});

export type AppRouter = typeof appRouter;
