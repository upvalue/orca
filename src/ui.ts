import chalk from "chalk";
import type { Agent, Pool } from "./agent.ts";
import type { Ticket } from "./tickets.ts";

export function renderStatus(pool: Pool, openTickets: number, watching: boolean): string {
  const running = pool.runningCount();
  const max = pool.maxSize;
  const agents = chalk.blue(`agents: ${running}/${max}`);
  const tickets = chalk.blue(`tickets: ${openTickets}`);
  const watch = watching ? chalk.green("watching") : chalk.dim("watch off");
  const drain = pool.draining ? chalk.yellow("draining") : "";
  return [agents, tickets, watch, drain].filter(Boolean).join("  ");
}

export function renderPrompt(): string {
  return chalk.bold.cyan("> ");
}

export function printWelcome(): void {
  console.log();
  console.log(chalk.bold.magenta("  orca"));
  console.log(chalk.dim("  type 'help' for commands"));
  console.log();
}

export function printSuccess(msg: string): void {
  console.log(chalk.green(msg));
}

export function printError(msg: string): void {
  console.log(chalk.red(msg));
}

export function printHelp(): void {
  const lines = [
    "",
    chalk.dim("  tickets:"),
    chalk.dim("    t/list      ") + "list open tickets",
    chalk.dim("    t/poll      ") + "manual poll for changes",
    chalk.dim("    t/watch     ") + "toggle filesystem watcher on/off",
    "",
    chalk.dim("  agents:"),
    chalk.dim("    a/spawn <id>") + " create agent for ticket <id>",
    chalk.dim("    a/kill <id> ") + "stop an agent by id",
    chalk.dim("    a/status    ") + "list all agents",
    "",
    chalk.dim("  orchestrator:"),
    chalk.dim("    o/run       ") + "run orchestrator evaluation",
    chalk.dim("    o/drain     ") + "toggle drain mode (block new spawns)",
    "",
    chalk.dim("  general:"),
    chalk.dim("    help        ") + "show this message",
    chalk.dim("    exit        ") + "quit",
    "",
  ];
  console.log(lines.join("\n"));
}

export function printTicketList(tickets: Ticket[]): void {
  if (tickets.length === 0) {
    console.log(chalk.dim("  no open tickets"));
    return;
  }
  console.log();
  for (const ticket of tickets) {
    const id = chalk.yellow(ticket.id);
    const title = chalk.white(ticket.title);
    const prio = chalk.magenta(`P${ticket.priority}`);
    const type = ticket.type ? chalk.cyan(ticket.type) : "";
    const tags = ticket.tags.length
      ? chalk.dim(` [${ticket.tags.join(", ")}]`)
      : "";
    console.log(`  ${id}  ${prio} ${type} ${title}${tags}`);
    if (ticket.body) {
      const preview = ticket.body.split("\n")[0].slice(0, 80);
      console.log(chalk.dim(`      ${preview}`));
    }
  }
  console.log();
}

function formatElapsed(since: Date): string {
  const secs = Math.floor((Date.now() - since.getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function printAgentList(agents: Agent[]): void {
  if (agents.length === 0) {
    console.log(chalk.dim("  no agents"));
    return;
  }
  console.log();
  for (const agent of agents) {
    const indicator =
      agent.status === "running"
        ? chalk.green("\u25cf")
        : chalk.red("\u25cf");
    const id = chalk.bold(`#${agent.id}`);
    const status =
      agent.status === "running"
        ? chalk.green(agent.status)
        : chalk.red(agent.status);
    const ticket = agent.ticketId
      ? chalk.yellow(agent.ticketId) + " " + chalk.white(`"${agent.ticketTitle}"`)
      : chalk.dim("no ticket");
    const session = agent.sessionId ? chalk.dim(agent.sessionId) : "";
    const elapsed = chalk.dim(formatElapsed(agent.createdAt));
    console.log(`  ${indicator} ${id}  ${status}  ${ticket}  ${elapsed}`);
    if (session) console.log(chalk.dim(`       session: ${agent.sessionId}`));
  }
  console.log();
}
