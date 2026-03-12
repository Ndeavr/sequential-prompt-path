# Lovable Import Guide

> Instructions for importing and structuring the UNPRO project inside Lovable.

## Import Order

1. Create a new Lovable project
2. Connect to GitHub repository
3. Apply database migrations in order (001 → 004)
4. Run seed data
5. Deploy edge functions
6. Verify auth and RLS policies

## Key Rules

- Never edit `src/integrations/supabase/client.ts` or `types.ts` — these are auto-generated
- Never edit `supabase/config.toml` — managed by Lovable Cloud
- Never edit `.env` — managed automatically
- Use `supabase/migrations/` for all schema changes via the migration tool

## File Structure

| Path | Purpose |
|------|---------|
| `/docs` | Architecture and build documentation |
| `/prompts` | Lovable master prompts |
| `/supabase/migrations` | Database migrations (ordered) |
| `/supabase/seeds` | Seed data files |
| `/supabase/functions` | Edge functions |
| `/scripts` | Deployment and migration helpers |

---

_Refer to `docs/UNPRO_Master_Build_Pack.md` for build phase details._
