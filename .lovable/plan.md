# AIPP Trust Refactor — Public/Private Split + Real Verification

Rebuild the AI-Indexed Profile system so public pages only show confirmed positive signals, all uncertainty moves to a private contractor cockpit, and trust badges reflect real validation (RBQ/NEQ/proofs).

## Architecture

```text
                  ┌─ aipp_profiles ──────────────────┐
                  │  + trust_level (1-4)             │
                  │  + visibility_rules (jsonb)      │
                  └──────────────┬───────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
  aipp_profile_validations  service_proofs        aipp_detected_methods
  (RBQ/NEQ/insurance,       (per-claim evidence,  (per-service materials
   verified flags)           url, confidence)      detected from sources)

  PUBLIC view (/ai-indexed-profiles/:slug)
    → reads only confirmed=true rows
    → hides any field without proof
    → renders trust badge from computed trust_level

  PRIVATE cockpit (/contractor/aipp-cockpit)
    → shows gaps, mismatches, "Non trouvé", action checklist
```

## Database (one migration)

1. **aipp_profiles** — add `trust_level smallint (1-4)`, `trust_label text`, `public_visibility jsonb` (per-field allow flags computed by trigger).
2. **service_proofs** — new table: `contractor_id, profile_id, service, method, material, proof_source (homepage|footer|jsonld|gmb|...), proof_url, snippet, confidence_score numeric, detected_at`. RLS: public read where `confidence_score >= 0.6`.
3. **aipp_detected_methods** — new table linking a service to validated methods/materials with proof refs.
4. **aipp_profile_validations** — add `insurance_status`, `insurance_verified_at`, `gmb_status`, `gmb_url`, `social_status`.
5. **Trigger** `recompute_aipp_trust()`: on insert/update of validations or proofs, recompute `trust_level`:
   - L1 site+services detected
   - L2 + phone/address coherent + GMB found
   - L3 + RBQ confirmed + NEQ confirmed + insurance
   - L4 + uploaded docs + history
6. **RLS**: public can SELECT only fields exposed via a `aipp_public_profiles` view (`security_invoker=on`) that strips unconfirmed columns. Base table public SELECT denied; contractor + admin can read full row.

## Edge functions

- **`aipp-import-website`** (extend): also extract phone/email/logo/favicon/socials/hours/zones from homepage + `/contact` + `/about` + JSON-LD + OpenGraph + sitemap. Write each finding into `service_proofs` with source URL + snippet. Never overwrite human-verified fields (Contractor Identity Resolution rule).
- **`aipp-verify-rbq`** (already exists): unchanged.
- **`aipp-verify-neq`** (new): scrape registreentreprises.gouv.qc.ca; same fuzzy match pattern as RBQ.
- **`aipp-detect-methods`** (new): given homepage markdown + services, call Gemini with strict tool schema returning `{service, method, material, evidence_snippet, confidence}[]`. Zero hallucination guardrail: must include verbatim snippet from source.
- **`aipp-recalc-score`** (extend): recompute trust_level and write `public_visibility` map.

## Public page rewrite (`PageAiIndexedProfile.tsx`)

- Replace hard-coded "Profil IA vérifié UNPRO" pill with dynamic `TrustBadge` driven by `trust_level` (1→"Profil analysé", 2→"Présence commerciale validée", 3→"Entreprise vérifiée", 4→"Entreprise certifiée UNPRO").
- Rename "Données vérifiées" → "Informations publiques analysées". Render only rows where `public_visibility[field] === true`. Remove all "Non trouvé" / "À confirmer" chips publicly.
- Replace generic material chips with **"Méthodes détectées"** section pulled from `aipp_detected_methods` (only `confidence >= 0.7`). ISR demo: shows "Fibre de verre soufflée, Ventilation des soffites, Scellant pare-air, Décontamination" — cellulose/uréthane removed because no proof.
- Glassmorphism, warm theme, Apple-level minimal (Stripe Identity reference).

## Private cockpit (`/contractor/aipp-cockpit`)

New page showing:
- AIPP score breakdown (citability, NAP, social, completeness, trust).
- Gap checklist (missing RBQ, missing insurance, no GMB, schema incomplete) with one-click actions.
- NAP mismatch alerts and source diff drawer.
- Re-run verification buttons.

## Admin

- Extend `/admin/aipp-profiles` with: trust_level column, "Vérifier NEQ" button, "Détecter méthodes" button, view proofs drawer.

## ISR demo seed

After deploy, run `aipp-import-website` + `aipp-detect-methods` + `aipp-verify-rbq` + `aipp-verify-neq` on isolation-solution-royal. Manually mark fibre-de-verre-soufflée / ventilation / décontamination as confirmed; ensure cellulose/uréthane absent from `aipp_detected_methods`.

## Out of scope (later phase)

- Document upload + L4 certification flow
- Social media (FB/IG/YT) deep scraping
- Citability score per AI engine (ChatGPT/Gemini) — keep current placeholders private only
- Storage of historical scrape snapshots

## Phasing

**Phase A (this build)**: migration + public/private view + trust badge rewrite + visibility filter + remove all "Non trouvé" publicly + ISR cleanup of methods + extend import for phone/email/logo proofs.

**Phase B (next)**: `aipp-verify-neq`, `aipp-detect-methods`, private cockpit page, admin proofs drawer.

Confirm Phase A scope, or request A+B in one build.