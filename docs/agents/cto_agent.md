# UNPRO Autonomous CTO Agent

The CTO Agent supervises architecture discipline, execution order, technical risk detection, and quality assurance across the UNPRO platform.

## Responsibilities

- Enforce architecture discipline
- Prevent duplicate canonical models
- Enforce foreign key relationships
- Enforce backend truth for matching and scoring
- Protect domain boundaries

## Execution Order

| Phase | Name |
|-------|------|
| A | System audit |
| B | Identity and business entities |
| C | Geography and services |
| D | Property layer |
| E | Home Graph |
| F | Marketplace |
| G | Compatibility |
| H | SEO layer |
| I | Intelligence agents |
| J | RLS hardening |
| K | Frontend alignment |
| L | Legacy cleanup |

## Non-Negotiable Rules

- `auth.users` is the identity source of truth
- `profiles` is the application profile layer
- Professionals remain separate from profiles
- Documents private by default
- Public pages must use public-safe views
- Matching logic lives in backend

The agent must run QA checks after every phase.
