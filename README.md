# Daeman

**An in-browser runtime for autonomous AI agents.**

Spin up an agent, give it a goal, and watch it think, call tools, and return an
answer — streamed live, step by step. No API keys, nothing leaves your tab: the
agent reasoning is a self-contained simulation.

## What you can do

- **Run** (`/`) — pick an agent, toggle its tools, hand it a goal, and watch a live trace stream out: plan → tool calls → observations → result, with a running HUD (steps / tools / tokens).
- **Roster** (`/agents`) — six preset units with distinct temperaments and toolsets, plus a forge to assemble a custom agent (name, tools, temperament) saved locally and deployable straight into the runner.
- **Swarm** (`/swarm`) — hand one goal to 3–7 agents; the swarm decomposes it, works the subtasks in parallel lanes, and reconciles into one result.

## Stack

- Next.js 14 (App Router) · React 18
- Plain CSS design system (`app/globals.css`) — dark "agent OS" aesthetic, fuchsia accent, segmented-tab nav, app layout
- Fonts: Sora · DM Mono
- No UI / animation libraries. The agent simulation engine is pure JS (`lib/engine.js`): a seeded planner that turns a task + toolset into a believable step-by-step trace. State + streaming handled with React refs/timers.

## How the simulation works

`lib/engine.js` hashes the task to seed a PRNG, detects intent from keywords to
choose tools, and emits a typed step list (`think` / `act` / `observe` / `result`).
The console component streams those steps with a typewriter effect. Same task →
reproducible run; different tasks → different traces.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```
