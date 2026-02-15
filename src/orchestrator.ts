import chalk from "chalk";
import type { Pool } from "./agent.ts";
import { listOpenTickets, type Ticket } from "./tickets.ts";
import { createSession, subscribeSession } from "./opencode.ts";
import { type Config, type Stage, formatRules, loadConfig, parseModel, renderPrompt } from "./config.ts";
import { signal } from "./scheduler.ts";

export type Decision = {
  action: "spawn";
  ticketId: string;
  title: string;
  stage: string;
  prompt: string;
  reason: string;
};

function matchStage(ticket: Ticket, stage: Stage): boolean {
  const m = stage.match;
  if (m.status && ticket.status !== m.status) return false;
  if (m.tag) {
    // AND: ticket must have all specified tags
    const tags = Array.isArray(m.tag) ? m.tag : [m.tag];
    if (!tags.every((t) => ticket.tags.includes(t))) return false;
  }
  if (m.type) {
    // OR: ticket type must be one of the specified types
    const types = Array.isArray(m.type) ? m.type : [m.type];
    if (!types.includes(ticket.type)) return false;
  }
  // at least one field must be specified
  return !!(m.status || m.tag || m.type);
}

/**
 * Pure rule-based planner. No I/O — takes pool state, tickets, and config
 * stages, returns an array of spawn decisions.
 *
 * For each ticket (sorted by priority asc), walks stages in config order;
 * first match wins. Inactionable stages are skipped. Tickets with open deps
 * or running agents are skipped.
 */
export function planDecisions(
  pool: Pool,
  tickets: Ticket[],
  stages: Stage[],
): Decision[] {
  if (pool.draining) return [];

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

    // walk stages in config order, first match wins
    let matched: Stage | undefined;
    for (const stage of stages) {
      if (matchStage(ticket, stage)) {
        matched = stage;
        break;
      }
    }

    if (!matched) continue;
    if (matched.inactionable) continue;
    if (!matched.prompt) continue;

    const prompt = renderPrompt(matched.prompt, ticket);

    decisions.push({
      action: "spawn",
      ticketId: ticket.id,
      title: ticket.title,
      stage: matched.name,
      prompt,
      reason: `P${ticket.priority}, stage: ${matched.name}`,
    });
  }

  return decisions;
}

let lastRulesSnapshot = "";
let consecutiveFailures = 0;
let backoffUntil = 0;

function backoffMs(): number {
  // 5s, 10s, 20s, 40s, capped at 60s
  return Math.min(5_000 * Math.pow(2, consecutiveFailures - 1), 60_000);
}

export async function orchestrate(pool: Pool, config: Config): Promise<void> {
  // hot-reload config; fall back to passed-in config on error
  try {
    config = await loadConfig();
  } catch {
    // use existing config
  }

  const rules = formatRules(config);
  if (rules !== lastRulesSnapshot) {
    lastRulesSnapshot = rules;
    console.log(chalk.cyan("\n  config reloaded:"));
    console.log(chalk.dim(rules));
  }

  let tickets: Ticket[];
  try {
    tickets = await listOpenTickets();
  } catch {
    tickets = [];
  }

  console.log(chalk.dim(`\n  orchestrator: ${pool.draining ? "draining — skipping new work" : "planning"}...`));

  if (Date.now() < backoffUntil) {
    const remaining = Math.ceil((backoffUntil - Date.now()) / 1000);
    console.log(chalk.dim(`  backing off (${remaining}s remaining, ${consecutiveFailures} consecutive failures)`));
    console.log();
    return;
  }

  const decisions = planDecisions(pool, tickets, config.stages);

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

    try {
      const title = `[${decision.stage}] ${decision.ticketId}: ${decision.title}`;
      const model = config.model ? parseModel(config.model) : undefined;
      const sessionId = await createSession(
        tickets.find((t) => t.id === decision.ticketId)!,
        decision.prompt,
        title,
        model,
      );

      consecutiveFailures = 0;
      backoffUntil = 0;

      const agent = pool.spawn(decision.ticketId, decision.title, sessionId);

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
          signal("session-done");
        }
      }).catch((err) => {
        console.error(
          chalk.red(
            `  error subscribing to session ${sessionId}: ${err.message}`,
          ),
        );
      });
    } catch (err) {
      consecutiveFailures++;
      const wait = backoffMs();
      backoffUntil = Date.now() + wait;
      console.log(
        chalk.red(
          `  error spawning agent: ${err instanceof Error ? err.message : String(err)}`,
        ) + chalk.dim(` (backing off ${wait / 1000}s)`),
      );
      break;
    }
  }

  console.log();
}
