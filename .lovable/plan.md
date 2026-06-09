
## Goal

Replace the static `QUICK_CHIPS` under the Alex input on `PageHomeUnicorn` with a live "Questions populaires en ce moment" rail driven by what users have actually asked Alex over the last 7 days. Falls back gracefully when traffic is too low.

## UX changes (PageHomeUnicorn AiInputCard)

- Add a small section label above the chip row: **"Questions populaires en ce moment"** (uppercase 11px, muted blue) + a tiny "↻" refresh button replacing the existing standalone one.
- Chips become the top 6 normalized questions returned by the API, sorted by 7d frequency with a recency boost (last 48h weighted 2×).
- Each chip carries `{ label, topic, intent }`. Clicking still calls `onTalk(topic)` → opens Alex with the right intent (reuses `detectAlexIntent`).
- Loading: render 6 skeleton chips (shimmer).
- Empty/low-signal (<3 questions in 7d): fall back to a **curated seasonal set** (June → humidity, AC, toiture, drain français…) so the UI is never empty. A `source: "trending" | "seasonal"` flag drives the label ("Questions populaires" vs "Suggestions de saison").
- Auto-refresh every 5 min while page is visible.

## Data + backend

New lightweight aggregation, no heavy schema churn:

1. **Migration** `popular_questions_*`:
   - `popular_question_events` (id, raw_text, normalized_label, topic, intent, role, lang, source, created_at). Insert-only.
     - RLS: `INSERT` allowed to `anon` + `authenticated` (no PII stored — only short normalized strings, max 120 chars, no emails/phones, sanitized server-side); `SELECT` to `service_role` only.
     - GRANTs per project rule.
   - `v_popular_questions_7d` view: aggregates `popular_question_events` over last 7 days, groups by `normalized_label`, counts, computes recency-weighted score, returns top 20. `SECURITY INVOKER`, `SELECT` granted to `anon`+`authenticated`.

2. **Capture points** (write to `popular_question_events` via fire-and-forget):
   - When user submits free text in the Alex input / chat composer.
   - When user taps a chip (so chip popularity reinforces itself but capped).
   - When a voice transcript first-user-utterance is finalized.
   - All go through one helper `src/services/popularQuestions.ts → logQuestion(raw, {role, lang, source})` that:
     - trims, lowercases, strips PII patterns (emails, phones, postal codes, addresses), truncates 120 chars
     - drops if <6 chars or matches a profanity/blocklist
     - derives `intent` via existing `detectAlexIntent`
     - upserts asynchronously (no await on UI path).

3. **Read path**: edge function `popular-questions` (public, no auth) returns:
   ```json
   { "source": "trending" | "seasonal", "items": [{ "label", "topic", "intent", "score" }] }
   ```
   - Reads `v_popular_questions_7d`. If fewer than 3 rows with score ≥ threshold → returns seasonal fallback for the current month (FR-CA).
   - Edge cached 60s (`Cache-Control: public, max-age=60`).
   - Maps each `normalized_label` to a `topic` string (used to seed Alex) via a small normalization table — falls back to the label itself.

4. **Seasonal fallback** lives in `src/data/seasonalPopularQuestions.ts` (12 months × 6 items, FR-CA), reused both client-side as last-resort and server-side.

## Frontend wiring

- New hook `src/hooks/usePopularQuestions.ts`:
  - Calls the edge function (`supabase.functions.invoke('popular-questions')`).
  - 5-min stale time, refresh on `visibilitychange`.
  - Returns `{ items, source, isLoading, refresh }`.
- `PageHomeUnicorn.tsx`:
  - Remove static `QUICK_CHIPS` constant.
  - `AiInputCard` consumes the hook; renders section header + chips + refresh button.
  - On chip click + on free-text submit, call `logQuestion(...)`.

## Admin (minimal, no new page)

- Add a tiny block to `/admin/alex-management` showing top 20 from `v_popular_questions_7d` with a "Hide" toggle that writes to a new `popular_question_blocklist` table (admin-only). The edge function excludes blocklisted labels. This keeps the surface safe without building a full cockpit.

## Files

Created
- `supabase/migrations/<ts>_popular_questions.sql`
- `supabase/functions/popular-questions/index.ts`
- `src/services/popularQuestions.ts`
- `src/hooks/usePopularQuestions.ts`
- `src/data/seasonalPopularQuestions.ts`

Edited
- `src/pages/PageHomeUnicorn.tsx` (AiInputCard chip rail + section label + logging on submit)
- `src/components/alex/...` (or wherever Alex chat composer sends user text) → call `logQuestion`
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` → log first user utterance
- `src/pages/admin/PageAlexManagement.tsx` (small "Top questions 7j" panel + blocklist)

## Non-goals

- No personalization per user yet (global trending only).
- No multilingual aggregation — fr-CA only for v1; en-CA bucket prepared in schema but not surfaced.
- No reliability/agents work, no changes to launch engine.

## Acceptance

- With <3 real questions logged: chips show seasonal fallback labelled "Suggestions de saison".
- After logging ≥3 distinct questions in last 7d: chips switch to "Questions populaires en ce moment" using real data, top by weighted frequency.
- Refreshing the rail shows updated counts within ≤60s of new submissions.
- No PII ever stored in `popular_question_events` (verified by sanitizer unit test).
