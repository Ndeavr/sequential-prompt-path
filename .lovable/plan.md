# Contractor Profile Generator V2

Fix the generator, not ISR. Every current + future contractor page routes through one schema-locked pipeline with hard publish gates.

## 1. Schema-locked page types

New file `src/features/contractorProfile/generator/pageTypes.ts` defines three exclusive templates — never mixed at render time:

- `contractor_registry` — official public profile (`/pro/:slug`, `/entrepreneur/:slug`)
- `contractor_recommendation` — Alex / matching output card + page
- `contractor_reasoning` — "why this pro" explanation surface

Each type gets a strict TypeScript `ContractorPageSchema` (Zod) + a single React template component under `src/features/contractorProfile/templates/{Registry,Recommendation,Reasoning}Template.tsx`. AI is never allowed to emit JSX — only schema-valid JSON.

## 2. Logo rule (highest-leverage fix)

New `src/features/contractorProfile/logo/LogoResolver.tsx`:

```
if contractor.logo_url && verified → render <SafeImage> above fold
else → render <MonogramBadge initials={ISR-style}> in premium glass card
```

Never render broken/empty. Used by: profile hero, `/recommandation`, search cards, Alex recommendation cards, homeowner-facing pro cards. Enforced by ESLint rule forbidding raw `<img src={contractor.logo}` outside `LogoResolver`.

Backing table `contractor_logos` (url, source, verified_at, monogram_bg, monogram_fg, initials).

## 3. Image minimum + categories

`src/features/contractorProfile/media/mediaContract.ts` — every profile must resolve ≥6 images across categories: `logo`, `team`, `vehicle`, `completed_project`, `before_after`, `service`. Missing slots → `IntelligentPlaceholder` (branded, category-specific SVG), never empty container. `contractor_media` table adds `category` enum + `verified` flag.

## 4. Language engine

`src/features/contractorProfile/lang/detectPageLanguage.ts` runs at build/render time. Hashes visible strings; if mixed FR/EN detected in header/body/CTA/FAQ → throws in dev, sets `status='draft'` in prod. Contractor rows carry `content_language: 'fr' | 'en'`; template refuses to render mismatched blocks.

## 5. Publish validator

`src/features/contractorProfile/validation/validatePublicPage.ts`:

```
checks = [logo, hero, gallery(≥6), description, faq, schema, cta, canonical, language, images]
```

Returns `{ passed, failed[], score }`. Wired into:
- Edge function `contractor-profile-publish` (blocks publish if any fail)
- Admin cockpit `/admin/contractor-generator-health`
- Nightly cron re-validates all published profiles → auto-demote to draft on regression

## 6. Canonical brand engine (extend existing)

Extend `src/lib/brand/canonicalContractor.ts`:
- Move aliases to `contractor_canonical_names` table (editable via `/admin/canonical-brands`)
- Normalizer runs in ingestion pipeline (`aipp-pipeline-run`, GMB import, scraping)
- Runtime guard already exists — extend `assertNoPlaceholderTokens` to also fail on blocked aliases in visible copy

## 7. AEO enforcement

`src/seo/components/ContractorSchemaStack.tsx` — always injects the full set on every contractor page: `LocalBusiness`, `Organization`, `Service`, `Review`, `FAQPage`, `BreadcrumbList`. Validator check #6 fails publish if any missing.

## 8. Hero image priority rules

`src/features/contractorProfile/media/heroSelector.ts` — deterministic priority per trade category. For insulation/roofing/service trades: `completed_work → team → vehicle → project`. Explicit denylist for stock tropes (handshake, generic office, smiling family) matched via image tags from Gemini vision tagging in ingestion.

## 9. Scoring gate (0-100, publish ≥90)

`src/features/contractorProfile/scoring/profileScore.ts` computes 4 sub-scores:

| Score | Signals |
|---|---|
| Visibility (25) | logo, images≥6, CTA visible |
| Trust (25) | company legal name, territory, phone, website, reviews |
| AEO (25) | schema complete, FAQ ≥5, entity mapping, service_area |
| Conversion (25) | book_appointment, alex_cta, evaluation_cta present |

Stored in `contractor_profile_scores` (updated on every ingestion/edit). `status='published'` requires `total_score ≥ 90`. Below → `draft` with actionable diff shown in cockpit.

## 10. Admin cockpit

New route `/admin/contractor-generator-health`:
- Table of all contractor profiles: score, failed checks, publish status, last validated
- Bulk re-validate button
- Per-profile drawer: shows exact failed checks + one-click fix suggestions (regen logo monogram, fetch missing images, translate mismatched block, add missing schema)

## Technical layout

```
src/features/contractorProfile/
├── generator/pageTypes.ts               # zod schemas, page_type enum
├── templates/{Registry,Recommendation,Reasoning}Template.tsx
├── logo/{LogoResolver,MonogramBadge}.tsx
├── media/{mediaContract,heroSelector,IntelligentPlaceholder}.ts(x)
├── lang/detectPageLanguage.ts
├── validation/validatePublicPage.ts
├── scoring/profileScore.ts
└── index.ts

supabase/migrations/*_contractor_generator_v2.sql
  - contractor_logos, contractor_media(+category), contractor_canonical_names
  - contractor_profile_scores, contractor_publish_audits
  - GRANT + RLS for each

supabase/functions/
  - contractor-profile-publish/    # runs validator, sets status
  - contractor-profile-validate-cron/  # nightly re-check
```

## Rollout

1. Ship schema + validator + logo resolver + monogram (blocks new bad pages immediately)
2. Backfill: run validator on all existing contractors → auto-draft anything <90, populate cockpit worklist
3. Migrate `/pro/:slug` (ISR + others) to Registry template
4. Wire recommendation + reasoning surfaces
5. Enable nightly re-validation cron

## Out of scope

- Redesigning ISR page visuals (V2 template will render it correctly automatically)
- New AI copywriting model — reuses existing `aipp-pipeline-run` outputs, only adds structural + validation layer
