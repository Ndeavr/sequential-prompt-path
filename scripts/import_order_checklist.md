# UNPRO — Import Order Checklist

Use this checklist when setting up or resetting the UNPRO project.

## Database Migrations

- [ ] `001_v1_core.sql` — Profiles, properties, documents, projects
- [ ] `002_v2_syndicates.sql` — Condo governance, reserve funds, votes
- [ ] `003_v3_ingestion.sql` — Document analysis, RAG pipeline
- [ ] `004_v4_knowledge_seo.sql` — Knowledge graph, SEO tables

## Seed Data

- [ ] `seed_minimal_v4.sql` — Minimal seed for development

## Edge Functions

- [ ] Deploy all functions in `/supabase/functions/`

## Verification

- [ ] Auth working (signup, login, email verification)
- [ ] RLS policies active on all tables
- [ ] Profiles created on signup
- [ ] Contractor flow separate from homeowner flow
- [ ] Public SEO pages rendering
