export interface Agent {
  id: number;
  status: "running" | "stopped";
  createdAt: Date;
  ticketId?: string;
  ticketTitle?: string;
  sessionId?: string;
}

export class Pool {
  private agents: Map<number, Agent> = new Map();
  private nextId = 1;
  readonly maxSize: number;
  draining = false;

  constructor(maxSize = 5) {
    this.maxSize = maxSize;
  }

  spawn(ticketId?: string, ticketTitle?: string, sessionId?: string): Agent {
    if (this.runningCount() >= this.maxSize) {
      throw new Error(`Pool at capacity (${this.maxSize})`);
    }
    const agent: Agent = {
      id: this.nextId++,
      status: "running",
      createdAt: new Date(),
      ticketId,
      ticketTitle,
      sessionId,
    };
    this.agents.set(agent.id, agent);
    return agent;
  }

  kill(id: number): Agent {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }
    if (agent.status === "stopped") {
      throw new Error(`Agent ${id} already stopped`);
    }
    agent.status = "stopped";
    return agent;
  }

  get(id: number): Agent | undefined {
    return this.agents.get(id);
  }

  runningCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.status === "running") count++;
    }
    return count;
  }

  getByTicket(ticketId: string): Agent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.ticketId === ticketId && agent.status === "running") {
        return agent;
      }
    }
    return undefined;
  }

  list(): Agent[] {
    return [...this.agents.values()].sort((a, b) => a.id - b.id);
  }
}
