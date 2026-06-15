# Atlas OS — v1 (the spine)

A Personal Operating System that answers, from your real data: **what should I do next, what's at risk, am I on track, what am I neglecting.**

This is the deliberately-scoped v1: the **outcome spine** — Goals → Projects → Tasks, tagged to life domains and planning horizons, run through a transparent **decision engine**, a **capacity engine**, and a **recommendation engine**, with a daily/weekly **review loop**. Everything else from the full vision (knowledge graph, finance OS, meeting intelligence, automation, predictive AI) is intentionally deferred until there's real usage data to power it.

## Stack

- **Next.js 14** (App Router, Server Components, Server Actions) — UI + backend in one runnable app
- **Prisma + SQLite** for local dev — swap `DATABASE_URL` + the datasource provider to Postgres for production, no code changes
- **Tailwind CSS** — light / dark, keyboard-friendly, responsive

## Run it

```bash
cd atlas
npm install
npm run setup     # generate client + create DB + seed demo data
npm run dev       # http://localhost:3000
```

`npm run setup` is idempotent — re-running keeps your data and only re-seeds demo content into an empty workspace.

## How the intelligence works

| Engine | File | What it does |
| --- | --- | --- |
| **Decision** | `src/lib/scoring.ts` | A transparent 0–100 priority score from weighted factors (impact 30%, urgency 30%, alignment 25%, leverage 15%). Urgency is amplified by due-date proximity; orphan tasks (no goal/project link) are flagged. Every score returns its factor breakdown so the recommendation is explainable. |
| **Capacity** | `src/lib/capacity.ts` | Sums remaining effort of open/due tasks and compares against deep-work hours × remaining workdays. Flags overload before it becomes a missed deadline. |
| **Recommendation** | `src/lib/recommendation.ts` | Ties it together into the dashboard: the single next action, the focus list, the risk list (overdue, due-soon, capacity, goal-pace, project), goal pace vs. expected, and neglected domains. |

## What's here

- **Dashboard** — quick capture, the one "do this next" recommendation with its reasoning, focus list, capacity meters, risks, on-track summary, neglected domains.
- **Tasks** — full create form, priority-ranked list with explainable scores, orphan flags.
- **Projects** — finite outcomes with success criteria and health.
- **Goals** — measurable outcomes laddered across horizons, with pace tracking (a marker shows where you *should* be).
- **Life Balance** — attention across all 13 domains; surfaces neglect.
- **Review** — daily/weekly reflection loop with a 7-day summary.
- **Capacity** — your real available hours, which the capacity engine plans against.

## Migrating to Postgres

In `prisma/schema.prisma` change `provider = "sqlite"` to `provider = "postgresql"`, set `DATABASE_URL` to your Postgres URL, then `npx prisma migrate dev`. Application code is untouched.
