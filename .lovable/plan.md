
# UNPRO AI Trust Layer — Foundation + Onboarding

Build en 2 phases livrables dos-à-dos. Phase 1 = couche de données + edge functions + pages internes. Phase 2 = onboarding cinématique qui *est* la démo produit.

---

## PHASE 1 — FOUNDATION (Prompt 1)

### 1.1 Database (migration Supabase, RLS + GRANTs)

Tables créées dans `public`:

- `contractors_trust` (extension, ne touche pas la table `contractors` existante)
  - company_name, website, phone, city, primary_specialty, desired_specialty, territory_cluster, ai_trust_position (enum), source_contractor_id
- `contractor_ai_interpretation` — detected_identity, desired_identity, semantic_gap_score, ai_summary, confidence_score
- `contractor_semantic_entities` — entity_name, entity_type, confidence_score, evidence_sources (jsonb)
- `contractor_review_entities` — entity_name, sentiment (enum: positive/neutral/negative), frequency, confidence
- `ai_recommendation_signals` — citation_score, semantic_clarity_score, homeowner_trust_score, specialization_score, local_authority_score
- `territory_slots` — city, specialty, max_slots, active_slots, waitlist_count (unique sur city+specialty)

Enums:
- `ai_trust_position`: invisible | weak | emerging | trusted | dominant | category_authority
- `recommendation_gap_severity`: low | medium | high | severe

RLS: lecture publique sur `territory_slots` (UI scarcity), reste limité à `service_role` + admin via `has_role`. GRANTs explicites pour `anon`/`authenticated`/`service_role` selon le scope.

### 1.2 Edge functions

- `api_detect_ai_identity` — scrape site + GBP + reviews (Firecrawl déjà utilisé), Gemini 2.5 Flash extrait identité détectée + confiance + entités sémantiques. Écrit dans `contractor_ai_interpretation` + `contractor_semantic_entities`.
- `api_semantic_gap_analysis` — compare desired vs detected, calcule `semantic_gap_score` + severity. Écrit dans `contractor_recommendation_gaps`.
- `api_review_intelligence` — Gemini classe reviews en Good / Bad / Ugly + entités sentiment. Écrit dans `contractor_review_entities`.
- `api_ai_trust_position` — agrège les 5 signaux → position finale (invisible…category_authority). Met à jour `contractors_trust.ai_trust_position`.

Toutes utilisent `LOVABLE_API_KEY` (Lovable AI Gateway), import `https://esm.sh/@supabase/supabase-js@2.49.1`, CORS, `verify_jwt = false` pour le flow onboarding public.

### 1.3 Pages admin/internes (squelette dark cinématique)

- `/admin/ai-trust/audit` — AI Trust Audit dashboard (queue + résultats par contractor)
- `/admin/ai-trust/interpretation/:id` — AI Interpretation Engine
- `/admin/ai-trust/reviews/:id` — Review Intelligence
- `/admin/ai-trust/territory` — Territory Authority (carte slots dispo / city × specialty)
- `/admin/ai-trust/gaps/:id` — Recommendation Gap Analysis
- `/admin/ai-trust/partnership/:id` — Contractor Partnership Fit
- `/case-study/:slug` — ISR Public Case Study (page publique SEO/AEO)

Composants partagés: `TrustPositionBadge`, `ConfidenceBar`, `SemanticEntityChip`, `ReviewSentimentColumn`, `TerritoryScarcityCard`.

### 1.4 Design system (dark bronze + black + electric blue)

Ajout tokens dans `index.css` + `tailwind.config.ts`:
- `--intel-base: 220 20% 4%`
- `--intel-bronze: 28 60% 45%`
- `--intel-electric: 210 100% 55%`
- `--intel-glow: 210 100% 55% / 0.35`
- typo: condensed oversized headlines (Bebas/Archivo Black via fontPair existant ou nouveau)
- glassmorphism utility class `.glass-intel` (blur 24px + bronze stroke 1px)

Aucune couleur hardcodée — tout via tokens HSL.

### 1.5 Copy guardrails

Lint léger côté contenu: bannir mots `SEO, backlink, keyword, leads, listing`. Toujours utiliser `AI trust, recommendation confidence, semantic authority, contractor intelligence, homeowner trust layer, specialization clarity, territory authority, operational proof`.

---

## PHASE 2 — ONBOARDING = LIVE AI REVEAL (Prompt 2)

Route principale: `/entrepreneur/ai-trust-audit` (overrides l'entrée actuelle `/entrepreneur/join` quand feature flag actif — non destructif).

### 2.1 Tables additionnelles

- `onboarding_sessions` — contractor_id, onboarding_step, ai_gap_detected, trust_position, completion_percentage, started_at, last_active_at
- `contractor_opportunity_analysis` — estimated_pipeline_min/max, territory_pressure, semantic_gap, homeowner_trust_density
- `contractor_recommendation_gaps` — gap_type, severity, ai_confidence_impact, narrative (text)

### 2.2 Steps (mobile-first, plein écran, transitions cinéma)

1. **Find Business** — autocomplete unifié (nom / site / GBP / téléphone) → live result card (identité détectée, confiance, trust density, specialization clarity, confusion risk).
2. **Live AI Analysis** — overlay 6-12s, 8 états animés en cascade, glow + scan lines. Lance les 4 edges en parallèle.
3. **AI Interpretation Reveal** — main card identity + confidence bars empilées (général vs spécialités), gap severity badge, copy émotionnelle.
4. **Review Intelligence** — 3 colonnes Good/Bad/Ugly + module "What AI Learns From Your Reviews" (strong vs weak associations).
5. **Territory Authority** — scarcity card (X/N slots), demand level, pipeline projeté $/mois.
6. **AI Trust Position** — badge état (Invisible → Category Authority) + raison narrative.
7. **Biggest Recommendation Gap** — un seul énoncé impactant.
8. **Recommended Growth Objective** — dynamique (nb rdv/mois, territoire, spécialité, pression, trust gap). Pas de pricing.
9. **Partnership Qualification** — 3 CTA: Apply For Territory Position / Request AI Trust Consultation / Reserve Specialty Position. Soumet `partnership_applications` (table existante ou créée si manquante).

Persistance: chaque step écrit dans `onboarding_sessions`. Reprise au refresh via `last_active_at`.

### 2.3 Admin priority outbound

Vue admin `/admin/ai-trust/priority-targets`: auto-flag contractors avec `homeowner_trust_score >= 70 AND semantic_clarity_score <= 40 AND territory_pressure >= high`. Liste triée + actions (export, lancer séquence outbound existante).

### 2.4 Outbound templates (FR, déjà fournis)

5 templates sujet/préheader injectés dans le système outbound existant (`outbound_*` tables) avec variables `{{FirstName}}`, `{{CompanyName}}`, `{{City}}`. Variante A/B sur subject.

---

## ORDRE D'EXÉCUTION

1. Migration foundation (tables + enums + GRANTs + RLS)
2. Tokens design system + composants partagés
3. Edge functions × 4 (parallélisables)
4. Pages admin squelette
5. Migration onboarding (sessions + opportunity + gaps)
6. Onboarding 9 steps + flow persistance
7. Admin priority outbound + templates FR

---

## CONTRAINTES RESPECTÉES

- Pas de toucher à `src/integrations/supabase/{client,types}.ts` ni `.env`
- N'écrase pas la table `contractors` existante (utilise `contractors_trust` lié via `source_contractor_id`)
- Tous nouveaux GRANTs + RLS dans la même migration
- Edge functions sur `esm.sh` Supabase + `verify_jwt=false` quand exposées au flow public
- Copy FR-CA, vocabulaire AI Trust uniquement, jamais SEO

---

## QUESTIONS AVANT BUILD

1. **Contractors table**: créer `contractors_trust` séparé ou étendre la table `contractors` existante via ALTER ADD COLUMN? (Recommandé: séparé pour ne rien casser.)
2. **Route onboarding**: remplacer `/entrepreneur/join` actuel par le nouveau flow AI Trust, ou créer `/entrepreneur/ai-trust-audit` en parallèle + feature flag?
3. **Phase de livraison**: livrer Phase 1 (foundation + edges + admin) en un seul build puis Phase 2 (onboarding) en second build — confirmé?
