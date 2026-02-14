import chalk from "chalk";
import type { Pool } from "./agent.ts";
import type { TicketChange } from "./tickets.ts";
import { orchestrate } from "./orchestrator.ts";

const COOLDOWN_MS = 10_000;
const DEBOUNCE_MS = 500;

let pool: Pool;
let lastAutoRun = 0;
let debounceTimer: number | undefined;
let running = false;

export function initScheduler(p: Pool): void {
  pool = p;
}

function formatChanges(changes: TicketChange[]): string {
  return changes.map((c) => {
    const tag = c.ticket.id;
    switch (c.kind) {
      case "opened": return `${tag} opened`;
      case "closed": return `${tag} closed`;
      case "reopened": return `${tag} reopened`;
      case "updated": return `${tag} updated`;
    }
  }).join(", ");
}

/** Signal a state change. The scheduler will debounce and respect the cooldown. */
export function signal(source: string, changes?: TicketChange[]): void {
  const detail = changes ? `: ${formatChanges(changes)}` : "";
  console.log(chalk.dim(`  [scheduler] signal received: ${source}${detail}`));
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    if (running) {
      console.log(chalk.dim(`  [scheduler] skipped (already running)`));
      return;
    }
    const now = Date.now();
    const elapsed = now - lastAutoRun;
    if (elapsed < COOLDOWN_MS) {
      console.log(chalk.dim(`  [scheduler] skipped (cooldown ${Math.round((COOLDOWN_MS - elapsed) / 1000)}s remaining)`));
      return;
    }
    lastAutoRun = now;
    running = true;
    console.log(chalk.dim(`  [scheduler] triggering orchestrator (source: ${source}${detail})`));
    try {
      await orchestrate(pool);
    } catch (err) {
      console.log(chalk.red(`  orchestrator: ${(err as Error).message}`));
    } finally {
      running = false;
    }
  }, DEBOUNCE_MS);
}
