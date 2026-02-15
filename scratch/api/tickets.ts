import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import matter from 'gray-matter';
import type { Ticket, TicketPriority, TicketRef, TicketStatus, TicketType } from '../shared/index.js';

// ---------------------------------------------------------------------------
// findTicketsDir — locate the .tickets/ directory
// ---------------------------------------------------------------------------

/**
 * Locate the `.tickets/` directory.
 *
 * Resolution order:
 * 1. `TICKETS_DIR` environment variable (if set and non-empty)
 * 2. Walk parent directories from `startDir` (default `process.cwd()`) looking
 *    for a `.tickets/` subdirectory.
 * 3. Check the filesystem root (`/`).
 *
 * Throws if no `.tickets/` directory can be found.
 */
export function findTicketsDir(startDir?: string): string {
  // 1. Explicit env var takes priority
  const envDir = process.env.TICKETS_DIR;
  if (envDir) {
    return envDir;
  }

  // 2. Walk parent directories
  let dir = path.resolve(startDir ?? process.cwd());
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, '.tickets');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    dir = path.dirname(dir);
  }

  // 3. Check root
  const rootCandidate = path.join(dir, '.tickets');
  if (fs.existsSync(rootCandidate) && fs.statSync(rootCandidate).isDirectory()) {
    return rootCandidate;
  }

  throw new Error('Could not find .tickets/ directory');
}

// ---------------------------------------------------------------------------
// readTicket — parse a single .tickets/*.md file into a Ticket
// ---------------------------------------------------------------------------

/**
 * Read and parse a single ticket Markdown file.
 *
 * Uses `gray-matter` to split YAML frontmatter from the Markdown body, then
 * extracts the title from the first `# ` heading line in the body.
 */
export function readTicket(filePath: string): Ticket {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseTicketContent(raw, filePath);
}

/**
 * Parse raw ticket file content into a Ticket object.
 * Exported for testing without filesystem access.
 */
export function parseTicketContent(raw: string, filePath?: string): Ticket {
  const { data, content } = matter(raw);

  // Extract title from first H1 heading
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Normalise optional / array fields to match the Ticket interface
  const id: string = data.id ?? (filePath ? path.basename(filePath, '.md') : '');
  const status: TicketStatus = data.status ?? 'open';
  const deps: string[] = Array.isArray(data.deps) ? data.deps.map(String) : [];
  const links: string[] = Array.isArray(data.links) ? data.links.map(String) : [];
  const created: string =
    data.created instanceof Date ? data.created.toISOString() : String(data.created ?? '');
  const type: TicketType = data.type ?? 'task';
  const priority: TicketPriority = typeof data.priority === 'number' ? (data.priority as TicketPriority) : 2;
  const assignee: string | null = data.assignee ?? null;
  const externalRef: string | null = data['external-ref'] ?? null;
  const parent: string | null = data.parent ?? null;
  const tags: string[] = Array.isArray(data.tags) ? data.tags.map(String) : [];

  return {
    id,
    status,
    deps,
    links,
    created,
    type,
    priority,
    assignee,
    externalRef,
    parent,
    tags,
    title,
    body: content,
  };
}

// ---------------------------------------------------------------------------
// readAllTickets — read every .md file from a tickets directory
// ---------------------------------------------------------------------------

/**
 * Read all `.md` ticket files from the given directory (or auto-detected
 * directory if none provided).
 */
export function readAllTickets(ticketsDir?: string): Ticket[] {
  const dir = ticketsDir ?? findTicketsDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  return files.map((f) => readTicket(path.join(dir, f)));
}

// ---------------------------------------------------------------------------
// computeRelationships — mirror the bash CLI "show" command logic
// ---------------------------------------------------------------------------

export interface ComputedRelationships {
  /** Unclosed tickets that this ticket depends on (from its `deps`). */
  blockers: TicketRef[];
  /** Unclosed tickets that depend on this ticket (have this ticket in their `deps`). */
  blocking: TicketRef[];
  /** Tickets whose `parent` field equals this ticket's id. */
  children: TicketRef[];
  /** Tickets referenced in this ticket's `links` array. */
  linked: TicketRef[];
}

/**
 * Compute relationship data for a given ticket.
 *
 * This mirrors the logic in the bash CLI's `show` command:
 *
 * - **blockers** — the target ticket's own `deps`, filtered to unclosed tickets.
 * - **blocking** — other *unclosed* tickets that list this ticket in their `deps`.
 * - **children** — tickets whose `parent` equals this ticket's id.
 * - **linked**   — tickets referenced in this ticket's `links` array.
 */
export function computeRelationships(ticketId: string, allTickets: Ticket[]): ComputedRelationships {
  const byId = new Map<string, Ticket>();
  for (const t of allTickets) {
    byId.set(t.id, t);
  }

  const target = byId.get(ticketId);

  // Blockers: target's deps that are not closed
  const blockers: TicketRef[] = [];
  if (target) {
    for (const depId of target.deps) {
      const dep = byId.get(depId);
      if (dep && dep.status !== 'closed') {
        blockers.push({ id: dep.id, status: dep.status, title: dep.title });
      }
    }
  }

  // Blocking: other unclosed tickets that have ticketId in their deps
  const blocking: TicketRef[] = [];
  for (const t of allTickets) {
    if (t.id === ticketId) continue;
    if (t.status === 'closed') continue;
    if (t.deps.includes(ticketId)) {
      blocking.push({ id: t.id, status: t.status, title: t.title });
    }
  }

  // Children: tickets whose parent == ticketId
  const children: TicketRef[] = [];
  for (const t of allTickets) {
    if (t.parent === ticketId) {
      children.push({ id: t.id, status: t.status, title: t.title });
    }
  }

  // Linked: tickets in the target's links array
  const linked: TicketRef[] = [];
  if (target) {
    for (const linkId of target.links) {
      const linkedTicket = byId.get(linkId);
      if (linkedTicket) {
        linked.push({ id: linkedTicket.id, status: linkedTicket.status, title: linkedTicket.title });
      }
    }
  }

  return { blockers, blocking, children, linked };
}

// ---------------------------------------------------------------------------
// generateId — replicate the bash CLI's ID generation algorithm
// ---------------------------------------------------------------------------

/**
 * Generate a ticket ID using the same algorithm as the CLI.
 *
 * 1. Take the name of the directory containing `.tickets/`
 * 2. Split on hyphens/underscores, take the first letter of each segment
 * 3. If the prefix is less than 2 characters (single-word dir), use first 3 chars
 * 4. Append a hyphen and 4 random lowercase alphanumeric characters
 */
export function generateId(ticketsDir?: string): string {
  const dir = ticketsDir ?? findTicketsDir();
  // The parent of the .tickets/ directory
  const parentDir = path.dirname(dir);
  const dirName = path.basename(parentDir);

  // Extract prefix: first letter of each hyphen/underscore-delimited segment
  const segments = dirName.split(/[-_]/);
  let prefix = segments.map((s) => s.charAt(0)).join('');

  // Fallback if prefix is too short (single segment)
  if (prefix.length < 2) {
    prefix = dirName.slice(0, 3);
  }

  // 4-char random lowercase alphanumeric
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let hash = '';
  const bytes = crypto.randomBytes(4);
  for (let i = 0; i < 4; i++) {
    hash += chars[bytes[i] % chars.length];
  }

  return `${prefix}-${hash}`;
}

// ---------------------------------------------------------------------------
// serializeTicket — convert frontmatter + body back to CLI-compatible markdown
// ---------------------------------------------------------------------------

/**
 * Format a flow-style YAML array, e.g. `[item1, item2]`.
 * Matches the CLI's formatting convention.
 */
function flowArray(arr: string[]): string {
  if (arr.length === 0) return '[]';
  return `[${arr.join(', ')}]`;
}

/**
 * Serialize a ticket's frontmatter and body to a markdown string
 * that matches the CLI's output format.
 *
 * The CLI writes YAML fields in a specific order with flow-style arrays
 * for deps, links, and tags. We replicate that exactly.
 */
export function serializeTicket(ticket: Ticket): string {
  const lines: string[] = ['---'];

  lines.push(`id: ${ticket.id}`);
  lines.push(`status: ${ticket.status}`);
  lines.push(`deps: ${flowArray(ticket.deps)}`);
  lines.push(`links: ${flowArray(ticket.links)}`);
  // Strip milliseconds to match CLI format (e.g. .000Z -> Z)
  const created = ticket.created.replace(/\.\d{3}Z$/, 'Z');
  lines.push(`created: ${created}`);
  lines.push(`type: ${ticket.type}`);
  lines.push(`priority: ${ticket.priority}`);
  if (ticket.assignee) lines.push(`assignee: ${ticket.assignee}`);
  if (ticket.externalRef) lines.push(`external-ref: ${ticket.externalRef}`);
  if (ticket.parent) lines.push(`parent: ${ticket.parent}`);
  if (ticket.tags.length > 0) lines.push(`tags: ${flowArray(ticket.tags)}`);

  lines.push('---');

  // Append the body (which includes the title heading)
  // The body from parseTicketContent starts with a newline after the frontmatter
  lines.push(ticket.body);

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// writeTicket — atomically write a ticket file to disk
// ---------------------------------------------------------------------------

/**
 * Write a ticket to its `.md` file using atomic write (write to temp, then rename).
 * This prevents file corruption if the process is interrupted mid-write.
 */
export function writeTicket(ticket: Ticket, ticketsDir?: string): void {
  const dir = ticketsDir ?? findTicketsDir();
  const filePath = path.join(dir, `${ticket.id}.md`);
  const content = serializeTicket(ticket);

  // Atomic write: write to temp file, then rename
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, content, 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ---------------------------------------------------------------------------
// readTicketById — read a single ticket by ID from the tickets directory
// ---------------------------------------------------------------------------

/**
 * Read a single ticket by its ID.
 * Throws if the ticket file does not exist.
 */
export function readTicketById(id: string, ticketsDir?: string): Ticket {
  const dir = ticketsDir ?? findTicketsDir();
  const filePath = path.join(dir, `${id}.md`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Ticket "${id}" not found`);
  }
  return readTicket(filePath);
}
