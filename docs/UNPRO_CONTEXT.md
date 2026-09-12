# UNPRO project context

_Last updated: 2026-09-12. This file contains public-safe, durable context only._

## Purpose

UNPRO is a Quebec property-intelligence and contractor-matching platform. It connects property information, building needs, solutions, qualified contractors, and locations to help people make better maintenance and renovation decisions.

The experience should recommend one best-fit contractor, or a tightly justified top three, rather than distribute a request as a shared lead.

## Product principles

- Begin with the property and the homeowner's real problem.
- Ask useful questions one at a time and explain why a recommendation fits.
- Give contractors qualified, compatible appointment opportunities.
- Keep eligibility, matching, entitlements, and payment truth in the backend.
- Keep private property and document data private by default.
- Use public-safe views for contractor, service, location, and educational pages.
- Never let commercial pressure override licence or compliance requirements.
- Keep quality/compatibility scoring separate from contractor risk assessment.
- Prefer evidence and current system state over assumptions inherited from an old conversation.

## Main product areas

- Conversational homeowner qualification and recommendation
- Contractor profiles, verification, compatibility, and appointments
- Property history and Home Passport
- Condo/building governance and Law 16 workflows
- Quote and document analysis
- Contractor AI-visibility audit
- Programmatic service, city, problem, and solution content
- Scheduling that accounts for availability and travel

## Technology

- React 18, Vite, and TypeScript
- Tailwind CSS and shadcn/ui
- Supabase Postgres, Auth, Storage, and Edge Functions
- Stripe
- Vitest and Playwright
- Programmatic SEO and a modular property knowledge graph

## Architecture invariants

1. `auth.users` is the identity source.
2. `profiles` is the application profile layer.
3. Contractors and other business entities remain separate from profiles.
4. Roles live in `user_roles`.
5. Property and document data are private by default.
6. Storage is private by default and uses signed access when needed.
7. Backend logic is authoritative for eligibility and matching.
8. Database migrations are the canonical schema source.
9. Existing canonical flows should be extended rather than duplicated.

## Working sources

Before changing a core model, consult:

- [Architecture index](architecture.md)
- [Master build pack](UNPRO_Master_Build_Pack.md)
- [Repository roadmap](../roadmap.md)
- [Launch checklist](../LAUNCH_CHECKLIST.md)
- [CTO agent contract](agents/cto_agent.md)

Historical chat context can explain intent, but it is not proof that a feature is deployed or that a remote operation succeeded. Verify the branch, tests, deployment status, provider receipts, and database metadata.

## Private context

Do not commit private customer information, credentials, migration targets, backup inventories, access-control findings, acquisition performance, or confidential operating details here.

When those details are necessary, use an imported Codex conversation or a local untracked file under `.codex-private/`.
