# UNPRO — Architecture Index

> Central navigation hub for all architecture documentation.

## Documentation Structure

| # | Document | Purpose |
|---|----------|---------|
| 01 | [Master Context](./architecture/01_MASTER_CONTEXT.md) | Platform vision, data model, conceptual layers, and invariants |
| 02 | [Execution Plan](./architecture/02_EXECUTION_PLAN.md) | Phased build order with dependencies and deliverables |
| 03 | [Lovable Master Prompt](./architecture/03_LOVABLE_MASTER_PROMPT.md) | Canonical prompt for Lovable to execute each phase |
| 04 | [Phase Commands](./architecture/04_PHASE_COMMANDS.md) | Concrete per-phase instructions with SQL, components, and routes |
| 05 | [Self-QA & Acceptance](./architecture/05_SELF_QA_AND_ACCEPTANCE.md) | Automated verification rules and acceptance criteria |

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (Supabase) — Postgres, Edge Functions, Storage, Auth
- **Payments**: Stripe (contractor subscriptions, condo SaaS)
- **AI**: Lovable AI Gateway (Gemini, GPT-5) — no external API keys required
- **SEO**: Programmatic pages via Knowledge Graph topology

## Core Invariants

1. `auth.users` is identity source; `profiles` is application layer
2. `contractors` table is separate from `profiles` — linked via `user_id`
3. All property/document data is **private by default** (RLS enforced)
4. Roles stored in `user_roles` table — never on profiles
5. Storage buckets are private; use signed URLs for access
6. Database migrations are the canonical schema source — never edit `types.ts` manually

---

_Last updated: 2026-03-14_
