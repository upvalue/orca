import { parse } from "@std/toml";
import type { Ticket } from "./tickets.ts";

export interface StageMatch {
  status?: string;
  tag?: string | string[];
  type?: string | string[];
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

function formatMatch(m: StageMatch): string {
  const parts: string[] = [];
  if (m.status) parts.push(`status=${m.status}`);
  if (m.tag) {
    const tags = Array.isArray(m.tag) ? m.tag : [m.tag];
    parts.push(tags.length === 1 ? `tag=${tags[0]}` : `tag=[${tags.join(",")}]`);
  }
  if (m.type) {
    const types = Array.isArray(m.type) ? m.type : [m.type];
    parts.push(types.length === 1 ? `type=${types[0]}` : `type=[${types.join(",")}]`);
  }
  return parts.join(" ");
}

export function formatRules(config: Config): string {
  const lines: string[] = [];
  if (config.model) lines.push(`  model: ${config.model}`);
  lines.push(`  stages:`);
  for (const s of config.stages) {
    const action = s.inactionable ? "skip" : s.prompt ? "spawn" : "skip";
    lines.push(`    ${s.name}  ${formatMatch(s.match)}  → ${action}`);
  }
  return lines.join("\n");
}
