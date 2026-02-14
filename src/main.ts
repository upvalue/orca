import { parseArgs } from "@std/cli/parse-args";
import { Pool } from "./agent.ts";
import { getTicketById, listOpenTickets, openTicketCount, ticketsWatching, unwatchTickets, watchTickets } from "./tickets.ts";
import { abortSession, createSession, subscribeSession } from "./opencode.ts";
import chalk from "chalk";
import { orchestrate, planDecisions } from "./orchestrator.ts";
import { initScheduler, signal } from "./scheduler.ts";
import {
  printAgentList,
  printError,
  printHelp,
  printTicketList,
  printSuccess,
  printWelcome,
  renderPrompt,
  renderStatus,
} from "./ui.ts";

const args = parseArgs(Deno.args, {
  boolean: ["watch", "help"],
  default: { watch: true },
  negatable: ["watch"],
  stopEarly: true,
});

if (args.help) {
  console.log(`Usage: orcastrator [options] [command]

Commands:
  plan         Show what the orchestrator would do (no agents spawned)

Options:
  --no-watch   Disable the ticket filesystem watcher
  --help       Show this help message`);
  Deno.exit(0);
}

const subcommand = args._[0] as string | undefined;

if (subcommand === "plan") {
  const tickets = await listOpenTickets();
  const pool = new Pool(5);
  const decisions = planDecisions(pool, tickets);

  if (decisions.length === 0) {
    console.log("nothing to do");
  } else {
    for (const d of decisions) {
      console.log(`spawn ${d.ticketId}  ${d.title}  (P${tickets.find((t) => t.id === d.ticketId)?.priority ?? "?"}, ${d.reason})`);
    }
  }

  Deno.exit(0);
}

const pool = new Pool(5);

async function* readLines(): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  const reader = Deno.stdin.readable.getReader();
  let buf = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      if (buf.length > 0) yield buf;
      return;
    }
    buf += decoder.decode(value, { stream: true });
    let idx = buf.indexOf("\n");
    while (idx !== -1) {
      yield buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      idx = buf.indexOf("\n");
    }
  }
}

async function writePrompt(): Promise<void> {
  let tickets = 0;
  try {
    tickets = await openTicketCount();
  } catch { /* ticket cli not available */ }
  const status = renderStatus(pool, tickets, ticketsWatching());
  const prompt = renderPrompt();
  Deno.stdout.writeSync(new TextEncoder().encode(`${status}\n${prompt}`));
}

async function handleCommand(input: string): Promise<boolean> {
  const trimmed = input.trim();
  if (!trimmed) return false;

  const [cmd, ...args] = trimmed.split(/\s+/);

  switch (cmd) {
    case "help":
      printHelp();
      break;

    // --- tickets ---

    case "t/list": {
      try {
        const tickets = await listOpenTickets();
        printTicketList(tickets);
      } catch (err) {
        printError((err as Error).message);
      }
      break;
    }

    case "t/poll": {
      try {
        const tickets = await listOpenTickets();
        printTicketList(tickets);
      } catch (err) {
        printError((err as Error).message);
      }
      break;
    }

    case "t/watch": {
      if (ticketsWatching()) {
        unwatchTickets();
      } else {
        watchTickets((changes) => signal("tickets", changes));
      }
      break;
    }

    // --- agents ---

    case "a/spawn": {
      const ticketId = args[0];
      if (!ticketId) {
        printError("usage: a/spawn <ticket-id>");
        break;
      }
      try {
        const ticket = await getTicketById(ticketId);
        if (pool.getByTicket(ticket.id)) {
          printError(`agent already running for ticket ${ticket.id}`);
          break;
        }
        const sessionId = await createSession(ticket);
        const agent = pool.spawn(ticket.id, ticket.title, sessionId);
        printSuccess(`spawned agent #${agent.id} on ticket ${ticket.id} "${ticket.title}" (session ${sessionId})`);
        // stream events in background
        subscribeSession(sessionId, (event) => {
          if (event.type === "session.error") {
            printError(`\nagent #${agent.id}: session error`);
            agent.status = "stopped";
          }
          if (event.type === "session.idle") {
            printSuccess(`\nagent #${agent.id}: session complete`);
            agent.status = "stopped";
          }
        }).catch((err) => {
          printError(`agent #${agent.id} event stream: ${(err as Error).message}`);
        });
      } catch (err) {
        printError((err as Error).message);
      }
      break;
    }

    case "a/kill": {
      const id = parseInt(args[0]);
      if (isNaN(id)) {
        printError("usage: a/kill <id>");
        break;
      }
      try {
        const agent = pool.get(id);
        if (agent?.sessionId) {
          await abortSession(agent.sessionId).catch(() => {});
        }
        pool.kill(id);
        printSuccess(`killed agent #${id}`);
      } catch (err) {
        printError((err as Error).message);
      }
      break;
    }

    case "a/status":
      printAgentList(pool.list());
      break;

    // --- orchestrator ---

    case "o/run": {
      try {
        await orchestrate(pool);
      } catch (err) {
        printError(`orchestrator: ${(err as Error).message}`);
      }
      break;
    }

    case "exit":
    case "quit":
      return true;

    default:
      printError(`unknown command: ${cmd}`);
      break;
  }

  return false;
}

async function main(): Promise<void> {
  printWelcome();
  initScheduler(pool);
  if (args.watch) {
    watchTickets((changes) => signal("tickets", changes));
  }

  const lines = readLines();
  await writePrompt();

  for await (const line of lines) {
    const shouldExit = await handleCommand(line);
    if (shouldExit) break;
    await writePrompt();
  }

  console.log();
  printSuccess("goodbye");
  Deno.exit(0);
}

Deno.addSignalListener("SIGINT", () => {
  console.log();
  printSuccess("goodbye");
  Deno.exit(0);
});

main();
