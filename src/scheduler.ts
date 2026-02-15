import chalk from "chalk";
import type { Pool } from "./agent.ts";
import type { TicketChange } from "./tickets.ts";
import { orchestrate } from "./orchestrator.ts";
import type { Config } from "./config.ts";

const DEBOUNCE_MS = 500;

let pool: Pool;
let config: Config;
let onComplete: (() => void) | undefined;
let debounceTimer: number | undefined;
let running = false;
let pendingRerun = false;

export function initScheduler(p: Pool, c: Config, cb?: () => void): void {
  pool = p;
  config = c;
  onComplete = cb;
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

async function run(source: string, detail: string): Promise<void> {
  running = true;
  console.log(chalk.dim(`  [scheduler] triggering orchestrator (source: ${source}${detail})`));
  try {
    await orchestrate(pool, config);
  } catch (err) {
    console.log(chalk.red(`  orchestrator: ${(err as Error).message}`));
  } finally {
    running = false;
    if (pendingRerun) {
      pendingRerun = false;
      console.log(chalk.dim(`  [scheduler] processing queued rerun`));
      await run("queued", "");
    } else {
      onComplete?.();
    }
  }
}

/** Signal a state change. The scheduler will debounce and queue if busy. */
export function signal(source: string, changes?: TicketChange[]): void {
  const detail = changes ? `: ${formatChanges(changes)}` : "";
  console.log(chalk.dim(`  [scheduler] signal received: ${source}${detail}`));

  if (running) {
    pendingRerun = true;
    console.log(chalk.dim(`  [scheduler] queued (orchestrator busy)`));
    return;
  }

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => run(source, detail), DEBOUNCE_MS);
}
