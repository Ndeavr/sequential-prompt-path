
## Objective

Kill live web scraping / content generation on every profile render. Replace with two persistent caches:

1. **Reputation snapshots** — validated, entity-matched sources, refreshed every 30 days.
2. **Profile content** — bilingual AI-generated copy, stored permanently, regenerated only on demand.

Applies first to `/entrepreneur/isolation-solution-royal` (ISR), then generalizes to any contractor.

---

## 1. Reputation Engine V2

### Data model (new)

`contractor_reputation_snapshots`
- `contractor_id`, `slug`
- `scan_date`, `next_scan_date` (scan_date + 30d)
- `source_count`, `review_count`, `average_rating`
- `sources jsonb` — array of validated sources
- `raw_payload jsonb` — full Firecrawl output for audit
- `status` — `fresh` | `refreshing` | `failed`

Each source object:
```
{ url, domain, title, snippet, tier: 1|2|3, category,
  match: { name, phone, website, address, neq, rbq },
  confidence_score, approved: boolean, blocked_reason? }
```

RLS: public SELECT on snapshots (public profile), service_role write. GRANTs on the new table.

### Entity matching (server-side, in `fetch-contractor-intel`)

For every scraped result, compute a **confidence score (0-100)**:
- Domain match to canonical website → +40
- Normalized company name match (fuzzy ≥ 0.85) → +25
- Phone match (E.164 normalized against `identity.phones`) → +20
- Address / city match → +10
- NEQ / RBQ literal match → +15 (bonus, caps at 100)

Classify domain tier from a static allowlist:
- **Tier 1**: `isroyal.ca`, `isolationsolutionroyal.ca`, `google.com/*business*`, `facebook.com/*`, `bbb.org`, `rbq.gouv.qc.ca`, `registreentreprises.gouv.qc.ca`, `opc.gouv.qc.ca`, `youtube.com/@*` official
- **Tier 2**: `birdeye.com`, `homestars.com`, `trustedpros.ca`, `pagesjaunes.ca`, `yelp.*`
- **Tier 3**: any other domain
- **Tier 4 (blocked)**: results with confidence < 85 OR containing competitor names on a per-contractor blocklist (`isolation toit`, `isolation grand montréal`, etc.)

Only sources with `tier ≤ 3 AND confidence_score ≥ 85` are marked `approved: true`. Aggregate rating/review_count only from approved Tier 1/2 sources.

### Refresh policy

- Edge function `fetch-contractor-intel` returns latest snapshot from DB by default. **No Firecrawl call on render.**
- Scan runs only if: `force=1` AND (`isAdmin` OR contractor owner) OR `now() > next_scan_date` on a nightly cron.
- New endpoint `reputation-refresh` (POST, auth required) → sets `status='refreshing'`, runs scan in background (EdgeRuntime.waitUntil), updates snapshot, sets `next_scan_date = now + 30 days`.

### UI (`PageContractorPublicProfileISR.tsx`)

- Read snapshot only. Never call `fetchContractorIntel({force:true})` from `useEffect`/render.
- "Présence et avis en ligne" section shows only `sources.filter(s => s.approved)`.
- Under the section:
  - `Dernière mise à jour : 11 juillet 2026`
  - `Prochaine mise à jour : 10 août 2026`
  - Button `Actualiser les données` (visible to admin / owner) — calls `reputation-refresh`, optimistic status pill "Actualisation en cours…", non-blocking.
- Empty state if 0 approved sources: `Aucune source vérifiée pour le moment.` (no fallback to unverified listings).

---

## 2. Contractor Profile Content V2

### Data model (new)

`contractor_profile_content`
- `contractor_id`, `slug` (unique)
- Bilingual fields (all `text`):
  `company_description_fr/en`, `services_fr/en`, `specialties_fr/en`,
  `faq_fr/en` (jsonb), `tagline_fr/en`, `trust_summary_fr/en`
- `last_ai_generation_date`
- `locked boolean` (per-locale lock: `locked_fr`, `locked_en`) — when true, only admin edits allowed
- `updated_by`, `updated_at`

RLS: public SELECT; UPDATE restricted to admin or contractor owner via `has_role`. Explicit GRANTs.

Seed ISR row with the current hand-written FR copy from the page, mark `locked_fr = true` and `locked_en = true`.

### Rendering rule

Public profile reads `contractor_profile_content` by slug + locale.
- FR locale → `company_description_fr`, etc.
- EN locale → `company_description_en`.
- Missing locale → show other locale + badge `Traduction non disponible` / `Translation unavailable`.
- **No AI, no translation, no scrape at render time.**

Remove/replace all live `payload.summary` usage in `PageContractorPublicProfileISR.tsx` with content from the new table.

### Regeneration flow

New button `Régénérer le contenu` in the admin cockpit drawer (already gated on `isAdmin`) and on contractor's own dashboard. Hidden otherwise.

New edge function `contractor-content-generate` (auth required, admin OR owner):
1. Refuses if `locked_{locale}` and caller is not admin.
2. Generates FR then EN via Lovable AI Gateway (`google/gemini-2.5-flash`) using latest reputation snapshot + identity as context.
3. Writes fields + `last_ai_generation_date`, never touches locked locales.

Monthly cron `contractor-content-monthly-refresh` runs generation only for rows where `locked_fr = false AND locked_en = false` AND `last_ai_generation_date < now - 30 days`.

### ISR lock

Migration sets `locked_fr = true`, `locked_en = true` for `slug = 'isolation-solution-royal'`. Guarantees no drift.

---

## 3. Files

### New
- `supabase/migrations/<ts>_reputation_v2_and_profile_content.sql` — both tables + GRANTs + RLS + policies + ISR seed.
- `supabase/functions/reputation-refresh/index.ts` — auth'd refresh trigger.
- `supabase/functions/contractor-content-generate/index.ts` — AI regeneration.
- `supabase/functions/contractor-content-monthly-refresh/index.ts` — cron.
- `src/hooks/useContractorReputation.ts` — reads snapshot only.
- `src/hooks/useContractorProfileContent.ts` — reads content by slug + locale.
- `src/features/contractorProfile/reputation/entityMatch.ts` — shared confidence-scoring (used by edge functions via copy or import).

### Edited
- `supabase/functions/fetch-contractor-intel/index.ts` — becomes read-only by default; move Firecrawl + entity-match into `reputation-refresh`. Adds domain tier list + blocklist per slug.
- `src/pages/entrepreneur/PageContractorPublicProfileISR.tsx` — swap live intel for snapshot + content hooks, add "Dernière/Prochaine mise à jour" + `Actualiser` button (admin/owner only), remove auto-refresh.
- `src/hooks/useContractorIntel.ts` — deprecate `force` on client render; keep only for admin cockpit.

---

## 4. Success

- Page load hits DB only. Zero Firecrawl calls at render.
- ISR profile shows only isroyal.ca / isolationsolutionroyal.ca / Google / Birdeye ISR. `Isolation Toit` and `Isolation Grand Montréal` disappear.
- FR/EN descriptions load from DB, identical across reloads.
- Admin sees "Cockpit" + `Actualiser` + `Régénérer contenu`; public users see stable data and last/next scan dates.
- 30-day default cache; manual refresh works and is non-blocking.

## 5. Task order

1. Migration (tables, GRANTs, RLS, ISR seed with locks + hand-written FR copy).
2. Refactor `fetch-contractor-intel` to read-only snapshot fetch.
3. New `reputation-refresh` function with entity matching + tier logic.
4. New `contractor-content-generate` function.
5. New hooks + wire into `PageContractorPublicProfileISR.tsx`.
6. UI: last/next update timestamps + `Actualiser` + `Régénérer` buttons.
7. Monthly cron job.
