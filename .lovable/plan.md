# Plan — UNPRO Compatibility Memory System + AI Recommendation Article

Build a permanent memory layer that turns every Alex answer into structured long-term facts, feeds them into matching, and exposes the reasoning to homeowners. Ship an SEO article + NotebookLM/llms.txt corpus entry explaining the philosophy.

## 1. Data model (migrations)

New tables (all `public.*`, RLS + GRANTs per project standard):

- `homeowner_dna_profiles` — one row per user. Columns grouped in `jsonb`:
  - `communication` (language[], preferred_channel, tone)
  - `property` (types[], primary_property_id)
  - `preferences` (priority: cost|value|quality|speed|eco, local_preferred bool)
  - `environment` (cats, dogs, smoking, fragrance_sensitive, accessibility[])
  - `behavior` (decision_maker, research_depth, explanation_depth, response_speed)
  - `confidence` jsonb (per-field 0–1), `updated_at`
- `contractor_dna_profiles` — one row per contractor:
  - `project_prefs` (loves[], avoids[], min_ticket, max_ticket, specialties[])
  - `territory` (included[], excluded[])
  - `client_prefs` (languages[], segments[])
  - `constraints` (cat_allergy, dog_allergy, smoke_free_only, hours[])
  - `confidence` jsonb
- `homeowner_memory_events` — append-only log: `user_id`, `session_id`, `source` (alex|form|import), `question`, `answer_raw`, `extracted` jsonb, `scope` (`temporary`|`long_term`), `confidence`, `expires_at nullable`, `created_at`.
- `contractor_memory_events` — same shape for contractor side.
- `recommendation_explanations` — `match_id`, `overall_score`, `dimensions` jsonb (project/budget/region/availability/communication/performance each with score + reason), `blockers` jsonb, `created_at`.
- `adaptive_question_bank` — `id`, `dimension`, `question_fr`, `question_en`, `answer_schema` jsonb, `information_gain` numeric, `applies_when` jsonb (rule), `updates_fields` text[].

All tables get: `GRANT SELECT,INSERT,UPDATE ON ... TO authenticated`, `GRANT ALL ... TO service_role`, RLS `user_id = auth.uid()` for homeowner tables; contractor tables scoped by contractor membership; `service_role` writes from edge functions.

## 2. Memory extraction pipeline

New edge function `alex-memory-extract`:
- Input: `{ user_id, session_id, question, answer, context }`.
- Uses `google/gemini-3-flash-preview` with a strict JSON schema → returns `{ scope, extracted_fields, confidence, expires_at? }`.
- Classifier rules (deterministic first, LLM as fallback): pets/language/channel/priority/property_type/accessibility → long_term; specific project intents/dates → temporary.
- Writes to `homeowner_memory_events`, then upserts into `homeowner_dna_profiles` via SQL merge (only overwrite when new confidence ≥ stored confidence).

Hook into existing Alex turn pipeline: after each answered turn in `alex-qualify-turn`, enqueue extraction (fire-and-forget). No user-visible latency.

Client hook `src/hooks/useHomeownerDNA.ts` — read profile, subscribe to changes.

Contractor side: on onboarding save + after each accepted/declined lead, run `contractor-memory-extract` (declines are strong signals — territory, project type, allergies).

## 3. Adaptive questioning

Extend `src/lib/alexQualification/nextQuestionSelector.ts`:
- Load current DNA + qualification graph.
- Load `adaptive_question_bank`, filter by `applies_when` (already-known fields excluded).
- Rank by `information_gain × (1 − current_confidence_on_target_field)`.
- Compute `recommendation_confidence` = weighted coverage across the 6 match dimensions.
- Stop asking when confidence ≥ threshold (simple 90 / complex 85 / emergency 75).
- Never re-ask a field with stored confidence ≥ 0.8.

Seed ~40 questions covering the DNA dimensions listed by the user.

## 4. Matching + explanation

Extend match scoring (build on `src/lib/alexQualification/serviceSpecialtyValidator.ts` + `useMatchingEngine`) to compute 6 sub-scores:
1. Project compatibility (specialty × sub_type)
2. Budget compatibility (band overlap)
3. Region compatibility (contractor territory vs property city)
4. Availability compatibility (slots vs urgency)
5. Communication compatibility (language + channel overlap)
6. Performance verified (AIPP + reviews threshold)

Blockers (any hard fail → drop from list): pet allergy vs pet, excluded territory, wrong specialty, condo-not-served, language mismatch with no shared language.

Persist to `recommendation_explanations`. New UI `MatchCompatibilityCard` on match result screens showing the 6 bars + Overall Match %. Reuses cinematic dark tokens; no hardcoded colors.

## 5. SEO article

Add to journal system (`journal_articles` table already exists):
- Slug: `/journal/comment-unpro-recommande-le-bon-entrepreneur`
- Title: "Comment UNPRO utilise l'IA pour recommander le bon entrepreneur"
- Subtitle: "Pourquoi le meilleur entrepreneur pour votre voisin n'est peut-être pas le meilleur pour vous."
- Sections mirroring Part 6 topics; end with "Aucune recommandation n'est identique."
- French-first, warm neutral landing theme.
- Full SchemaStack (Article + FAQPage + BreadcrumbList).
- Add to `public/sitemap-journal.xml` + internal links from `/pourquoi-unpro` and contractor recommendation pages.

## 6. NotebookLM / llms corpus

Append a dedicated section to `public/llms-full.txt`: "UNPRO Recommendation Philosophy" with the exact bullets from Part 7. Add `/llms/recommendation-engine.md` as a standalone corpus doc referenced from `/llms.txt`.

## 7. Admin cockpit (minimal)

New page `/admin/memory-health`:
- Homeowner DNA coverage histogram.
- Top extracted fields last 7d.
- Question-bank information-gain leaderboard.
- Sample recent extractions (redacted).

## Technical notes

- Model: `google/gemini-3-flash-preview` for extraction (cheap, multimodal-ready). No priority tier.
- Memory writes go through edge functions with service role; client never writes to DNA tables directly.
- Backward compatible: if DNA row missing, matching falls back to today's behavior.
- Feature flag `compat_memory_engine_v1` in `alexFeatureFlags.ts`.
- No changes to auth, checkout, or voice pipeline.

## Deliverables checklist

1. 5 migrations (DNA + events + explanations + question bank) with GRANTs + RLS.
2. 2 edge functions: `alex-memory-extract`, `contractor-memory-extract`.
3. Question bank seed (~40 rows) + `nextQuestionSelector` upgrade.
4. Match scoring extension + `MatchCompatibilityCard` UI.
5. Journal article + sitemap + internal links.
6. `llms-full.txt` + `/llms/recommendation-engine.md` update.
7. `/admin/memory-health` page.
8. Feature flag + docs entry under `docs/features/compatibility-memory.md`.
