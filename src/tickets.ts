import chalk from "chalk";

export interface Ticket {
  id: string;
  title: string;
  body: string;
  status: string;
  priority: number;
  type: string;
  tags: string[];
  assignee: string;
  deps: string[];
  createdAt: string;
}

export interface TicketChange {
  ticket: Ticket;
  kind: "opened" | "closed" | "reopened" | "updated";
}

const DEBOUNCE_MS = 500;

let watcher: Deno.FsWatcher | null = null;
let lastTickets: Map<string, Ticket> | null = null;

/** Parse a .tickets/*.md file into title + body (everything after frontmatter). */
function parseTicketMarkdown(content: string): { title: string; body: string } {
  // Strip YAML frontmatter (between --- delimiters)
  const fmEnd = content.indexOf("\n---", 3);
  const markdown = fmEnd !== -1 ? content.slice(fmEnd + 4).trim() : content.trim();

  // Title is the first # heading line
  const lines = markdown.split("\n");
  let title = "";
  const bodyLines: string[] = [];
  let pastTitle = false;
  for (const line of lines) {
    if (!pastTitle && line.startsWith("# ")) {
      title = line.slice(2).trim();
      pastTitle = true;
    } else if (pastTitle || line.trim() !== "") {
      pastTitle = true;
      bodyLines.push(line);
    }
  }
  return { title, body: bodyLines.join("\n").trim() };
}

async function runTicketQuery(): Promise<Ticket[]> {
  const cmd = new Deno.Command("ticket", {
    args: ["query", "."],
    stdout: "piped",
    stderr: "piped",
  });

  const { success, stdout, stderr } = await cmd.output();
  if (!success) {
    const msg = new TextDecoder().decode(stderr).trim();
    throw new Error(msg || "ticket query failed");
  }

  const output = new TextDecoder().decode(stdout).trim();
  if (!output) return [];

  // ticket query outputs NDJSON (one JSON object per line)
  const tickets: Ticket[] = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    // deno-lint-ignore no-explicit-any
    const t: any = JSON.parse(line);

    // Read the markdown file to get title and body
    let title = "";
    let body = "";
    try {
      const content = await Deno.readTextFile(`.tickets/${t.id}.md`);
      ({ title, body } = parseTicketMarkdown(content));
    } catch {
      // file might not exist yet during race conditions
    }

    tickets.push({
      id: t.id ?? "",
      title,
      body,
      status: t.status ?? "open",
      priority: parseInt(String(t.priority ?? "999"), 10),
      type: t.type ?? "",
      tags: t.tags ?? [],
      assignee: t.assignee ?? "",
      deps: t.deps ?? [],
      createdAt: t.created ?? t.created_at ?? t.createdAt ?? "",
    });
  }

  return tickets;
}

function toMap(tickets: Ticket[]): Map<string, Ticket> {
  return new Map(tickets.map((t) => [t.id, t]));
}

function diffTickets(prev: Map<string, Ticket>, curr: Map<string, Ticket>): TicketChange[] {
  const changes: TicketChange[] = [];

  for (const [id, ticket] of curr) {
    const old = prev.get(id);
    if (!old) {
      changes.push({ ticket, kind: "opened" });
    } else {
      const changed =
        old.title !== ticket.title ||
        old.body !== ticket.body ||
        old.status !== ticket.status ||
        old.priority !== ticket.priority ||
        old.tags.join(",") !== ticket.tags.join(",") ||
        old.assignee !== ticket.assignee;
      if (changed) {
        changes.push({ ticket, kind: "updated" });
      }
    }
  }

  for (const [id, ticket] of prev) {
    if (!curr.has(id)) {
      changes.push({ ticket, kind: "closed" });
    }
  }

  return changes;
}

export async function listOpenTickets(): Promise<Ticket[]> {
  const all = await runTicketQuery();
  return all.filter((t) => t.status === "open");
}

export async function getTicketById(id: string): Promise<Ticket> {
  const all = await runTicketQuery();
  // support partial ID matching
  const ticket = all.find((t) => t.id === id || t.id.startsWith(id));
  if (!ticket) throw new Error(`ticket ${id} not found`);
  return ticket;
}

export async function openTicketCount(): Promise<number> {
  const tickets = await listOpenTickets();
  return tickets.length;
}

export function watchTickets(onchange: (changes: TicketChange[]) => void): void {
  if (watcher) return;

  console.log(chalk.dim(`  tickets: watching .tickets/ for changes`));

  // set baseline
  runTicketQuery().then((tickets) => {
    lastTickets = toMap(tickets.filter((t) => t.status === "open"));
    console.log(chalk.dim(`  tickets: baseline set (${lastTickets.size} open tickets)`));
  }).catch((err) => {
    console.log(chalk.red(`  tickets: initial query failed: ${(err as Error).message}`));
  });

  let debounceTimer: number | undefined;

  watcher = Deno.watchFs(".tickets/");

  // process events in background
  (async () => {
    for await (const _event of watcher!) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const tickets = await runTicketQuery();
          const curr = toMap(tickets.filter((t) => t.status === "open"));
          if (lastTickets) {
            const changes = diffTickets(lastTickets, curr);
            if (changes.length > 0) {
              onchange(changes);
            }
          }
          lastTickets = curr;
        } catch (err) {
          console.log(chalk.red(`  tickets: watch error: ${(err as Error).message}`));
        }
      }, DEBOUNCE_MS);
    }
  })();
}

export function unwatchTickets(): void {
  if (!watcher) return;
  watcher.close();
  watcher = null;
  console.log(chalk.dim("  tickets: watcher stopped"));
}

export function ticketsWatching(): boolean {
  return watcher !== null;
}
