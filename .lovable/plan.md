# Onboarding SMS — « Être recommandé » repositioning

Replace the 5 lead-oriented sprint SMS with the 6 new Passeport-first "Être recommandé" variants + a champion A/B variant.

## Changes

**`src/lib/outbound/isolationSprintCopy.ts`** — rewrite in place:

- Rename type: `SprintVariant = "curiosity" | "ai" | "competitor" | "opportunity" | "founder" | "passport" | "champion"`.
- Extend `SprintCopyContext` with `prenom?: string` (fallback: "") and keep `company`, `city`, `category?`.
- Landing target stays `/isolation-qc` (the existing sprint funnel), UTM `camp` = variant key. Kept as-is so tracking dashboard doesn't break.
- Each template exports `name`, `angle`, and `build(ctx)` returning the exact FR copy from the brief, with `{{prenom}}`, `{{categorie}}`, `{{lien}}` interpolated. Champion variant appended with `STOP = retrait.` suffix.
- Update `SPRINT_VARIANTS` array to the new 7 keys.

## Out of scope

- No changes to landing page, checkout, or sprint dashboard.
- Attribution schema unchanged (still `src=sms`, `camp=<variant>`, `city`, `company`).
- No new backend fields; `prenom` is optional and defaults to empty (SMS opens with just "Bonjour," if missing — acceptable).

## Success criteria

- All 6 brief SMS + the champion A/B render exactly as pasted, with placeholders filled from `SprintCopyContext`.
- No other file broken (only reference lives in this module).
