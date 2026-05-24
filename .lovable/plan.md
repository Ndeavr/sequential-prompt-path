
# Plan — UNPRO Painting Calculator + Programmatic City SEO

## Scope
Build a premium painting estimator funnel for homeowners, gated behind login + address, with a programmatic SEO/AEO city engine generating thousands of unique localized landing pages.

## Phase 1 — Calculator Core (MVP, ship first)

### Routes
- `/peinture/calculateur` — canonical national page
- `/:city/peinture/calculateur` — city variant (same component, city-aware)

### Database (new migrations)
- `painting_estimates` — id, user_id (nullable for guest draft), address_id, project_type, room_count, surface_sqft, ceiling_height, wall_condition, paint_quality, coats, photos jsonb, estimated_paint_cost, estimated_labour_cost, estimated_total_min, estimated_total_max, urgency, city, status, created_at
- `painting_photos` — id, estimate_id, user_id, image_url, ai_notes, created_at
- `contractor_matches` — id, estimate_id, contractor_id, score, reason, created_at
- Storage bucket: `painting-photos` (private, RLS by user_id)
- RLS: owner read/write; admins read all; anonymous can insert a `draft` row keyed by a session token (column `guest_token`) and claim it on login.

### Calculator UX (step-by-step, mobile-first)
Single page with progressive disclosure cards on Cinematic Dark base (already in design system):
1. Project type chips (7 options from brief)
2. Photo upload (multi, thumbnails, Lovable AI vision pre-analysis → `ai_notes`)
3. Surface inputs (rooms, dims, ceiling height, walls condition, current/new color, ceilings/trim/doors toggles, urgency)
4. Live teaser: surface estimée + complexity badge (locked total)
5. **Gate 1 — Login** (Google + email; uses existing `lovable.auth.signInWithOAuth`)
6. **Gate 2 — Address** (existing `useAddressAutocomplete`, validates city/sector)
7. **Result card** — full breakdown + UNPRO painter matches + CTA "Trouver un peintre" / "Réserver une estimation" / "Parler à Alex"

### Calculation engine (`src/features/paintingCalculator/engine.ts`)
Transparent ranges, not fake precision:
```
surface = wall_area + ceiling_area + trim_adjustments
paint_qty = surface / coverage_per_gallon × coats
paint_cost = paint_qty × paint_price[quality]
labour_cost = surface × labour_rate[city] × condition_modifier
prep_cost = f(wall_condition, repairs)
total_min/max = (paint + labour + prep) × complexity_band × urgency_modifier × ±15%
```
Inputs driving price: wall condition, coats, ceiling height, dark→light, furniture moving, repairs, exterior difficulty, urgency, occupied home.

### Painter matching
Reuse existing matching infra. Query contractors where `category = peinture` and `service_regions` contains city, rank by score/availability/distance. Show 3 cards using existing `ContractorCard`. Fallback copy when 0 matches (from brief).

### Files
- `src/pages/painting/PaintingCalculatorPage.tsx`
- `src/features/paintingCalculator/` — engine, hooks, components (StepProjectType, StepPhotos, StepSurfaces, EstimateTeaser, LoginGate, AddressGate, ResultCard, PainterMatches)
- Wire route in `src/config/routesConfig.ts`

## Phase 2 — City Programmatic SEO/AEO Engine

### Database
- `cities` — slug, name, province, population, avg_labour_rate, avg_home_size, seo_priority, geo_coordinates, boroughs jsonb, local_keywords jsonb (already partial — extend)
- `city_service_pages` — city_id, service_slug, title, meta_description, intro_content, faq_content jsonb, localized_sections jsonb, schema_json jsonb, content_hash, updated_at
- `painting_city_pricing` — city_id, service_type, min_rate_sqft, max_rate_sqft, prep_multiplier, urgency_multiplier
- Seed 7 priority cities first: Montréal, Laval, Terrebonne, Longueuil, Québec, Brossard, Blainville

### Routes (dynamic)
- `/:city/peinture/calculateur`
- `/:city/peinture-interieure`
- `/:city/peinture-exterieure`
- `/:city/peintre-residentiel`
- `/:city/estimation-peinture`
- `/:city/cout-peinture-maison`
- `/:city/cout-peinture-condo`
- `/:city/peintre-plafond`
- `/:city/peinture-cuisine`
- `/:city/peinture-apres-degat`

Single React route handler `CityServicePage` loads `city_service_pages` by `(city_slug, service_slug)`, renders unique intro/H1/FAQ/pricing/borough mentions/JSON-LD.

### AI content generation (edge function)
`supabase/functions/generate-city-service-page/index.ts` (Lovable AI Gateway, `google/gemini-2.5-flash`):
- Input: city, service_slug
- Output: unique intro (200-300 words), 6 FAQ pairs, 4 localized sections, borough mentions, pricing narrative
- Stored with `content_hash` to avoid duplicate gen
- Admin trigger + batch orchestrator (cron-style)

### SEO/AEO injection (per page)
- `<Helmet>` per route: title, meta description, canonical
- JSON-LD stack: `LocalBusiness`, `Service`, `FAQPage`, `BreadcrumbList`, geo
- Reuse `src/seo/components/SchemaStack.tsx`, `SeoHead.tsx`
- Internal links to 3-5 nearby cities + 4 related services (computed by geo distance)
- Sitemap generator extended (`scripts/generate-sitemap.ts`) — emits all city × service combinations from DB

### Pricing differentiation
`painting_city_pricing` table drives ranges per city. Labour rate × city modifier × seasonality (QC winter +5-10%).

## Phase 3 — Polish & Scale Hooks
- Alex orb pre-wired on the page (uses existing `OverlayAlexVoiceFullScreen`) with context = "painting_calculator"
- Trust copy block (anti-3-quotes), confidence badge on result
- Admin page `/admin/painting-content` — list city pages, regenerate, view content_hash
- Guest draft → claim-on-login flow

## Technical notes
- Cinematic Dark tokens already exist (`#050816`, glass cards, Inter -0.04em).
- Auth: existing `useAuth` + Google OAuth via `lovable.auth.signInWithOAuth`.
- Address: existing `useAddressAutocomplete` + `addressNormalizer`.
- AI: Lovable AI Gateway, no API keys needed.
- Photo upload → Supabase Storage `painting-photos` bucket → Gemini 2.5 Flash for `ai_notes`.
- Respect memory rules: French-first fr-CA, Alex copy never instructional, no "3 quotes" model, edge functions use `esm.sh/@supabase/supabase-js@2.49.1`.

## Build order (proposed)
1. Migrations: `painting_estimates`, `painting_photos`, `contractor_matches`, storage bucket + RLS
2. Calculator engine + page at `/peinture/calculateur` (national, no city)
3. Login + address gates wired
4. Painter matching + result card
5. Migrations: `cities` (extend), `city_service_pages`, `painting_city_pricing` + seed 7 cities
6. Dynamic route `/:city/peinture/calculateur` + city-aware pricing
7. Edge function `generate-city-service-page` + seed content for 7 cities × 10 services = 70 pages
8. Remaining service routes + JSON-LD + sitemap generator
9. Admin regen panel

## Open questions before I build
1. Should the **guest draft** persist (anon insert with `guest_token`) so users don't lose their work if they bail at the login gate? Recommended: yes.
2. For the first batch of programmatic pages, confirm 7 cities × 10 services = 70 pages, or start narrower (Montréal/Laval/Québec × 3 services = 9 pages) and expand after we see indexation?
3. Photo AI analysis — do it **inline** (slower step, better estimate) or **async after submit** (faster UX, estimate refines on result card)? Recommended: async.
