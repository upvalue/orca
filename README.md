# orcastrator

This is an experiment in making a mostly automated agent orchestration flow
while keeping things pretty simple.

# Why?

Mostly just as an experiment.

# Design

The basic idea:

The issue tracker is the work queue.

Orchestrator agent handles spinning up agents to handle tasks from the work
queue. Active agents are limited by a global parallelism setting.

Any agent and the human can put tasks onto the work queue. 

The orchestrator stops when the work queue is empty (all issues are closed or
blocked).

That's it for now.

# Implementation

Orcastrator is a Go app. When you start orcastrator
