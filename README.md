# UNPRO — Property Intelligence Platform

UNPRO is a property intelligence and contractor-matching platform built on Supabase and a modular knowledge graph.

The system connects property data, building problems, solutions, contractors, and cities to help property owners make better decisions about maintenance and renovations.

The platform is built with:

- Supabase (database, auth, storage, edge functions)
- React / Vite / shadcn UI
- Modular knowledge graph
- AI document analysis
- Programmatic SEO

---

# Architecture

UNPRO is built as four layers.

## 1. Property Intelligence Layer

Source of truth for:

- properties
- documents
- property events
- maintenance history
- scores
- risk indicators

## 2. Decision Layer

Determines:

- recommended repairs
- cost ranges
- risk levels
- timing of work

## 3. Marketplace Layer

Connects projects to contractors.

Includes:

- contractor profiles
- contractor scores
- project matching
- quote analysis

## 4. Public Authority Layer

Public layer that generates:

- contractor pages
- SEO pages
- answer engine pages

---

# Repository Structure

`/docs` — architecture and build documentation

`/prompts` — Lovable master prompts

`/supabase` — database migrations and seed data

`/functions` — edge functions

`/scripts` — deployment and migration helpers

---

# Core Product Rules

- `auth.users` is the identity source.
- `profiles` is the application layer.
- `contractors` must remain separate from profiles.
- Property data must remain private by default.
- Public contractor pages and SEO pages must be derived from the private core.
- Personal accounts are limited to 3 properties.
- Accounts managing more than 500 addresses must route to Enterprise contact.

---

# Build Phases

**V1 Core** — Profiles, properties, documents, projects.

**V2 Syndicates** — Condo / building governance, reserve fund tracking, votes.

**V3 Ingestion** — Document analysis and property intelligence extraction.

**V4 Knowledge Graph + SEO** — Public knowledge graph and SEO generation.
