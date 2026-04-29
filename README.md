# KAIROS

> Persistent, proactive AI agent with continuous memory, observation, and autonomous action.

---

## Overview

KAIROS is an AI agent architecture designed to move beyond reactive assistants into **continuous, context-aware, and proactive systems**.

Unlike traditional assistants that require explicit prompts, KAIROS operates as a **background cognitive layer** — observing, recording, reasoning, and acting over time.

---

## Core Principles

* **Persistence over statelessness**
* **Observation over instruction**
* **Proactivity over reactivity**
* **Memory over context windows**

---

## Getting Started

### Requirements

* Node.js 20+
* pnpm 9+

### Install

```bash
pnpm install
```

### Build

```bash
pnpm build
```

### Run

```bash
# Start the main agent
node dist/main.js

# Start the MCP/API interface
node dist/interfaces/api.js

# Start the CLI interface
node dist/interfaces/cli.js
```

### Development (watch mode)

```bash
pnpm dev
```

### Tests

```bash
pnpm test           # integration tests
pnpm test:unit      # unit tests with coverage
```

---

## Mini SWE Agent (CLI)

Run the minimal SWE-style agent with local shell tools:

```bash
pnpm build:backend
node dist/interfaces/cli/index.js swe-agent run --objective "Refactor the logging utility" \
      --provider openai \
      --model gpt-4o-mini \
      --api-key $KAIROS_API_KEY
```

Optional environment variables:

```
KAIROS_PROVIDER=openai
KAIROS_MODEL=gpt-4o-mini
KAIROS_API_KEY=...
KAIROS_BASE_URL=https://api.openai.com
```

---

## Project Structure

```
kairos/
├── src/
│   ├── core/               # Agent loop, decision engine, action engine, scheduler
│   ├── memory/             # Memory manager, vector store, metadata store, summaries
│   ├── observation/        # Event bus, file watcher, observers (code, terminal, api)
│   ├── recall/             # Retriever, ranking, context builder
│   ├── sleep/              # Consolidator, summarizer, pruning
│   ├── actions/            # Base action, code, notification, system actions
│   ├── policies/           # Permissions, guardrails, approval flow
│   ├── config/             # Settings, feature flags
│   ├── interfaces/
│   │   ├── cli.ts          # CLI interface (Commander.js)
│   │   ├── api.ts          # MCP server interface
│   │   └── dashboard/      # VS Code extension
│   ├── utils/              # Logger, time, embeddings
│   └── main.ts             # Entry point
├── data/                   # Runtime persistence (outside src)
│   ├── logs/               # Append-only observation logs
│   ├── index/              # Vector and metadata indexes
│   └── summaries/          # Daily summaries from sleep cycle
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## Key Features

### 1. Append-Only Memory Logs

* Immutable daily logs of observations
* Full traceability of agent perception
* Time-based memory indexing

### 2. Continuous Observation

* Monitors environment (code, files, workflows)
* Detects changes and behavioral patterns
* Builds long-term contextual understanding

### 3. Proactive Execution

* Triggers actions without explicit prompts
* Suggests improvements and optimizations
* Alerts on anomalies, risks, or opportunities

### 4. Memory Consolidation (Sleep Cycle)

* Periodic background process (typically nightly)
* Summarizes and compresses daily logs
* Prunes irrelevant or redundant data
* Extracts patterns and long-term insights

### 5. Contextual Recall Engine

* Retrieves relevant memory across time
* Prioritizes high-signal information
* Enables continuity across sessions

### 6. Self-Optimization

* Continuously refines memory relevance
* Improves decision-making over time
* Adapts to user behavior and workflows

### 7. Background Runtime Layer

* Runs independently of user prompts
* Acts as a persistent cognitive daemon
* Maintains awareness even when idle

---

## Architecture

```
                ┌────────────────────┐
                │   Observation Layer│
                └────────┬───────────┘
                         │
                         ▼
                ┌────────────────────┐
                │  Append-Only Logs  │
                └────────┬───────────┘
                         │
                         ▼
                ┌────────────────────┐
                │ Memory Indexing    │
                └────────┬───────────┘
                         │
          ┌──────────────┴──────────────┐
          ▼                             ▼
┌────────────────────┐       ┌────────────────────┐
│ Recall Engine      │       │ Sleep Cycle Engine │
└────────┬───────────┘       └────────┬───────────┘
         │                            │
         ▼                            ▼
   ┌────────────────────────────────────────┐
   │        Decision & Action Layer         │
   └────────────────────────────────────────┘
```

---

## Safety & Control

KAIROS is designed with strict internal gating due to the implications of continuous observation and autonomous action.

Safeguards include:

* Feature flag restrictions (`src/config/featureFlags.ts`)
* Scoped observation boundaries
* Action approval layers (optional, via `src/policies/approvalFlow.ts`)
* Full audit logs of all decisions and actions

---

## Known Challenges

### Privacy

Continuous observation requires:

* Explicit user consent
* Clear data boundaries
* Secure storage

### Autonomy Control

Balancing:

* Helpfulness vs intrusiveness
* Automation vs user authority

### Memory Scaling

* Long-term storage costs
* Efficient retrieval mechanisms
* Avoiding memory bloat

### Trust & Interpretability

* Explaining why actions were taken
* Avoiding incorrect pattern inference

---

## Capability Summary

| Capability       | Traditional Assistants | KAIROS     |
| ---------------- | ---------------------- | ---------- |
| Memory           | Limited                | Persistent |
| Interaction      | Prompt-based           | Continuous |
| Behavior         | Reactive               | Proactive  |
| Context Handling | Session-based          | Long-term  |
| Execution        | On-demand              | Autonomous |

---

KAIROS is less of a tool and more of a **system layer** — one that challenges current assumptions about agency, control, and human–AI interaction.

---
