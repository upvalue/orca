import { parse } from "@std/toml";
import type { Ticket } from "./tickets.ts";

export interface StageMatch {
  status?: string;
  tag?: string | string[];
  type?: string;
}

export interface Stage {
  name: string;
  match: StageMatch;
  prompt?: string;
  inactionable?: boolean;
}

export interface Config {
  model?: string;
  stages: Stage[];
}

export function parseModel(spec: string): { providerID: string; modelID: string } {
  const slash = spec.indexOf("/");
  if (slash === -1) throw new Error(`invalid model spec "${spec}" — expected "provider/model"`);
  return { providerID: spec.slice(0, slash), modelID: spec.slice(slash + 1) };
}

export async function loadConfig(path = "orca.toml"): Promise<Config> {
  const text = await Deno.readTextFile(path);
  const raw = parse(text) as { model?: string; tickets?: Record<string, unknown>[] };
  const stages: Stage[] = (raw.tickets ?? []).map((t) => ({
    name: String(t.name ?? ""),
    match: t.match as StageMatch,
    prompt: t.prompt as string | undefined,
    inactionable: t.inactionable as boolean | undefined,
  }));
  return { model: raw.model, stages };
}

export function renderPrompt(template: string, ticket: Ticket): string {
  const meta = [
    `Ticket ${ticket.id}: ${ticket.title}`,
    ticket.type ? `Type: ${ticket.type}` : "",
    `Priority: ${ticket.priority}`,
    ticket.tags.length ? `Tags: ${ticket.tags.join(", ")}` : "",
    ticket.deps.length ? `Deps: ${ticket.deps.join(", ")}` : "",
    "",
    ticket.body,
  ]
    .filter(Boolean)
    .join("\n");

  return template.replace("{{Ticket}}", meta);
}
