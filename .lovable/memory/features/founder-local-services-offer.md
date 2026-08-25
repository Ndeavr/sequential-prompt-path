---
name: Founder Local Services Offer
description: 12-months-free Founder membership for local services & professionals (10/city public cap, internal city×category allocation), renewal 350$/an with consent — separate from contractor Audit IA model
type: feature
---

# Founder Offer — Services locaux & professionnels

- Public route: `/fondateurs` (`src/pages/founder/PageFounderLocalServices.tsx`). Homepage third path card in `SectionTwoPaths` (`src/components/home-light/HomeLightSections.tsx`).
- Public copy says ONLY « 10 premiers membres par ville » + « Offre de lancement réservée aux premiers membres admissibles de chaque ville. Certaines conditions s'appliquent. » NEVER expose internal per-category caps; no fabricated scarcity/countdowns.
- Commercial logic: 12 months = 0 $ (no Stripe charge), then 350 $/an. Renewal requires explicit consent via existing billing flow — never auto-charge. Mises en relation unlimited, no per-lead fee.
- Schema: `public.founder_eligible_categories` (slug, name_fr, group_type local_service|professional, `internal_cap_per_city` default 3) + `public.founder_memberships` (status pipeline founder_eligible → … → founder_activated → first_referral → renewal_due → renewed/expired; founder_start/founder_end, renewal_price_cents=35000, renewal_cadence='year', attribution jsonb, prospect_id).
- Server gating: RPC `check_founder_eligibility(city, category_slug)` (returns city_remaining from REAL activated memberships only; internal category cap exhaustion surfaces as generic `city_full`) and `founder_public_signup(...)` ($0, atomic eligibility + unique lower(email)/city/category). Both SECURITY DEFINER, granted to anon+authenticated.
- Eligible categories seeded: entretien-menager, lavage-de-vitres, entretien-gazon, abris-temporaires, nettoyage-conduits, entretien-preventif-domicile, agent-courtier-immobilier, courtier-hypothecaire, notaire, evaluateur-immobilier, inspecteur-batiment, arpenteur-geometre. Renovation contractors stay on Audit IA → 350 $ pack flow.
- Admin: `/admin/founder-pipeline` (`PageAdminFounderPipeline.tsx`), nav tab "Fondateurs" under Acquisition.
- Outreach templates (never sent automatically): `founderFirstTouchSms`, `founderEmailSubject`, `founderEmailHtml`, `FOUNDER_OFFER` in `supabase/functions/_shared/offerCopy.ts`. Canonical CASL/opt-out/frequency gates still apply in send workers.
- QA proven: 3-per-category internal cap blocks 4th (generic reason), 10-per-city cap blocks 11th, duplicate blocked, $0 activation returns founder_end +12 months.
