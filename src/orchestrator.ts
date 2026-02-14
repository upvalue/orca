import chalk from "chalk";
import type { Pool } from "./agent.ts";
import { listOpenTickets, type Ticket } from "./tickets.ts";
import { createSession, subscribeSession } from "./opencode.ts";

export type Decision = {
  action: "spawn";
  ticketId: string;
  title: string;
  reason: string;
};

/**
 * Pure rule-based planner. No I/O — takes pool state and tickets, returns
 * an array of spawn decisions.
 *
 * Rules:
 *  1. Sort open tickets by priority (ascending, 0 = highest)
 *  2. Skip tickets whose deps are still in the open ticket list (blocked)
 *  3. Skip tickets that already have a running agent
 *  4. Fill available pool slots with next highest-priority tickets
 */
export function planDecisions(pool: Pool, tickets: Ticket[]): Decision[] {
  const openIds = new Set(tickets.map((t) => t.id));

  const sorted = [...tickets].sort((a, b) => a.priority - b.priority);

  const available = pool.maxSize - pool.runningCount();
  const decisions: Decision[] = [];

  for (const ticket of sorted) {
    if (decisions.length >= available) break;

    // blocked: has a dep that is still open
    const blockedDep = ticket.deps.find((d) => openIds.has(d));
    if (blockedDep) continue;

    // already has a running agent
    if (pool.getByTicket(ticket.id)) continue;

    decisions.push({
      action: "spawn",
      ticketId: ticket.id,
      title: ticket.title,
      reason: `highest priority unblocked ticket (P${ticket.priority})`,
    });
  }

  return decisions;
}

export async function orchestrate(pool: Pool): Promise<void> {
  let tickets: Ticket[];
  try {
    tickets = await listOpenTickets();
  } catch {
    tickets = [];
  }

  console.log(chalk.dim("\n  orchestrator: planning..."));

  const decisions = planDecisions(pool, tickets);

  if (decisions.length === 0) {
    console.log(chalk.dim("  nothing to do"));
    console.log();
    return;
  }

  for (const decision of decisions) {
    console.log(
      chalk.yellow(`  spawn ${decision.ticketId}`) +
        chalk.dim(`  ${decision.title}  (${decision.reason})`),
    );

    const ticket = tickets.find((t) => t.id === decision.ticketId)!;

    try {
      const sessionId = await createSession(ticket);
      const agent = pool.spawn(ticket.id, ticket.title, sessionId);

      console.log(
        chalk.green(`  ✓ spawned agent ${agent.id}`) +
          chalk.dim(` (session ${sessionId})`),
      );

      subscribeSession(sessionId, (event) => {
        if (
          event.type === "session.idle" ||
          event.type === "session.error" ||
          event.type === "session.deleted"
        ) {
          agent.status = "stopped";
          console.log(
            chalk.dim(
              `\n  agent ${agent.id} finished (ticket ${agent.ticketId})`,
            ),
          );
        }
      }).catch((err) => {
        console.error(
          chalk.red(
            `  error subscribing to session ${sessionId}: ${err.message}`,
          ),
        );
      });
    } catch (err) {
      console.log(
        chalk.red(
          `  error spawning agent: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
    }
  }

  console.log();
}
