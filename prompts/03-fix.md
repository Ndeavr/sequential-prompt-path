# Prompt 03 — Fix

> This prompt is used only if issues are found after running 01-foundation or 02-build.

## When To Use

- Build errors or TypeScript compilation failures
- RLS policy issues blocking data access
- Authentication flow not working correctly
- UI rendering bugs or broken layouts
- Missing or incorrect database relations
- Edge function errors

## How To Use

1. Identify the specific error (console logs, network errors, build output)
2. Reference the relevant checklist (`/checklists/verification-checklist.md`)
3. Provide the error context to this prompt for targeted fixes

## Fix Categories

- **Schema Fixes** — Missing columns, incorrect types, broken relations
- **RLS Fixes** — Policies too restrictive or too permissive
- **Auth Fixes** — Login/signup flow issues, role assignment problems
- **UI Fixes** — Component rendering, responsive layout, styling issues
- **Integration Fixes** — Stripe, Google Calendar, AI service connectivity

---

_Only run this prompt if verification reveals issues. Not required if 01 and 02 complete cleanly._
