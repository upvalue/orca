# orca

An attempt at a simple agent orchestrator, using
[ticket](https://github.com/wedow/ticket/) and [opencode](https://opencode.ai).

The basic idea:

When state changes, kick off agents.

Right now, state is purely the contents of `.tickets`. Ticket lifecycle and
prompts are encoded in Orca's config.toml; while nothing is hardcoded, the basic idea
is that prompts instruct agents to shepherd tickets from open to closed. Tags,
ticket types and statuses can all be used to select which prompts will be
applied to a ticket, so for example you can encode:

- tickets tagged with 'epic' receive a detailed plan and human review of that
  plan, then are broken down into task tickets

- task tickets have a planning agent, execution agent and review agent, and
  task tickets tagged with 'frontend' will have the agent instructed to use
  playwright-cli to test that they work.

When there are no more actionable tickets (no rules match, or they are
explicitly marked as inactionable) Orca does nothing.

There currently is not an LLM at the core of the loop; it's purely based on
these rules.

Opencode is the backing service because it includes a web UI and some session
management, so it's easy to see what each agent is doing without needing to
build additional opinionated UI into Orca.

## Configuration

Orca is configured via `orca.toml` in the project root. The file is
hot-reloaded on each orchestrator run.

### Global settings

```toml
model = "openai/gpt-5.3-codex"
```

`model` sets the LLM used for all spawned sessions, as `provider/model`.

### Ticket stages

Stages are defined as `[[tickets]]` entries. Order matters — first match wins.

```toml
[[tickets]]
name = "ready-for-review"
match = { tag = "ready-for-review" }
prompt = """
You are a reviewing agent. Determine whether the following ticket is complete.

{{Ticket}}

If complete, close the ticket. Otherwise, tag it with 'ready-for-work'.
"""
```

Each stage has:

| Field          | Description                                                      |
|----------------|------------------------------------------------------------------|
| `name`         | Label for logging/diagnostics                                    |
| `match`        | Conditions to match a ticket (all specified fields must match)   |
| `prompt`       | Template string sent to the agent. `{{Ticket}}` is replaced with ticket metadata |
| `inactionable` | If `true`, the ticket is recognized but no agent is spawned      |

### Match fields

| Field    | Type               | Matches against        | Array semantics |
|----------|--------------------|------------------------|-----------------|
| `status` | string             | `ticket.status`        | —               |
| `tag`    | string or string[] | `ticket.tags`          | AND (all required) |
| `type`   | string or string[] | `ticket.type`          | OR (any matches)  |

All specified fields must match (AND). Arrays behave differently per field:

```toml
# tag is AND: ticket must have both tags
match = { tag = ["ready-for-review", "frontend"] }

# type is OR: ticket type can be any of these
match = { status = "open", type = ["task", "chore"] }
```

Stages are evaluated in order, so put specific matches before broad ones:

```toml
# specific: epics get a different planning prompt
[[tickets]]
name = "plan-epic"
match = { status = "open", type = "epic" }
prompt = """..."""

# catch-all: everything else that's open
[[tickets]]
name = "plan"
match = { status = "open" }
prompt = """..."""
```
