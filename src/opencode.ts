import { createOpencodeClient, type OpencodeClient } from "@opencode-ai/sdk";
import type { Ticket } from "./tickets.ts";

let client: OpencodeClient | null = null;

function getClient(): OpencodeClient {
  if (!client) {
    const baseUrl = Deno.env.get("OPENCODE_URL") || "http://localhost:4096";
    const password = Deno.env.get("OPENCODE_SERVER_PASSWORD");
    const username = Deno.env.get("OPENCODE_SERVER_USERNAME") || "opencode";
    client = createOpencodeClient({
      baseUrl,
      ...(password && {
        headers: {
          Authorization: `Basic ${btoa(`${username}:${password}`)}`,
        },
      }),
    });
  }
  return client;
}

export interface SessionModel {
  providerID: string;
  modelID: string;
}

export async function createSession(
  ticket: Ticket,
  prompt?: string,
  title?: string,
  model?: SessionModel,
): Promise<string> {
  const c = getClient();
  const session = await c.session.create({
    ...(title && { body: { title } }),
  });
  if (!session.data) throw new Error(`failed to create session`);

  if (!prompt) {
    const meta = [
      ticket.type ? `Type: ${ticket.type}` : "",
      ticket.priority !== undefined ? `Priority: ${ticket.priority}` : "",
      ticket.tags.length ? `Tags: ${ticket.tags.join(", ")}` : "",
      ticket.deps.length ? `Deps: ${ticket.deps.join(", ")}` : "",
    ].filter(Boolean);

    prompt = [
      `Resolve the following ticket.`,
      ``,
      `Ticket ${ticket.id}: ${ticket.title}`,
      ...meta,
      ``,
      ticket.body,
    ]
      .filter(Boolean)
      .join("\n");
  }

  await c.session.promptAsync({
    path: { id: session.data.id },
    body: {
      parts: [{ type: "text", text: prompt }],
      ...(model && { model }),
    },
  });

  return session.data.id;
}

export async function abortSession(sessionId: string): Promise<void> {
  const c = getClient();
  await c.session.abort({ path: { id: sessionId } });
}

export interface SessionEvent {
  type: string;
  sessionId: string;
  delta?: string;
  toolName?: string;
  toolState?: string;
}

export async function subscribeSession(
  sessionId: string,
  onEvent: (event: SessionEvent) => void,
): Promise<void> {
  const c = getClient();
  const result = await c.event.subscribe();
  for await (const event of result.stream) {
    if (event.type === "message.part.updated") {
      const { part, delta } = event.properties;
      if (part.sessionID !== sessionId) continue;
      if (part.type === "text" && delta) {
        onEvent({ type: "text", sessionId, delta });
      } else if (part.type === "tool") {
        onEvent({
          type: "tool",
          sessionId,
          toolName: part.tool,
          toolState: typeof part.state === "string" ? part.state : part.state?.status,
        });
      }
    }
    if (event.type === "session.idle") {
      const props = event.properties as { sessionID: string };
      if (props.sessionID === sessionId) {
        onEvent({ type: "session.idle", sessionId });
        break;
      }
    }
    if (event.type === "session.error") {
      const props = event.properties as { sessionID?: string };
      if (props.sessionID === sessionId) {
        onEvent({ type: "session.error", sessionId });
        break;
      }
    }
    if (event.type === "session.deleted") {
      const props = event.properties as { info: { id: string } };
      if (props.info.id === sessionId) {
        onEvent({ type: "session.deleted", sessionId });
        break;
      }
    }
  }
}
