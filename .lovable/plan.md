# AIPP MAX — Pipeline autonome (ISR comme template)

Portée énorme. Je découpe en **6 vagues livrables**. On exécute la **Vague 1 (72h golden win)** dès l'approbation; les vagues 2-6 sont planifiées et seront lancées sur ton "go" successifs.

---

## Vague 1 — Golden Template ISR (72h, livrable immédiat)

Objectif: profil ISR public AIPP MAX en ligne, scoré, AI-readable, branché Alex.

### 1.1 Schéma DB (1 migration)
Tables nouvelles (toutes en `public`, RLS + GRANTs):
- `contractor_services` (contractor_id, service, subservice, priority_score, seasonality, avg_project_value)
- `contractor_service_areas` (city, region, postal_prefix, priority_market_score)
- `contractor_proofs` (type, source, proof_score, verified, url, metadata)
- `contractor_media_assets` (asset_type, ai_tags jsonb, caption, llm_description, embedding vector(1536) — pgvector)
- `contractor_reviews_enriched` (raw, sentiment, pro/clean/speed/price/comm/trust scores, source)
- `contractor_ai_summaries` (summary, strengths, problem_matches, risks, recommendation_reason, version)
- `contractor_scores` (aipp_visibility, trust, conversion, media_authority, local_dominance jsonb par ville, computed_at)
- `contractor_verifications` (rbq_number, rbq_status, rbq_categories jsonb, rbq_expiration, rbq_last_checked, neq_status, neq_years_active)
- `contractor_geo_pages` (slug, city, service, content_md, jsonld jsonb, published_at)
- `contractor_embeddings` (chunk_type, chunk_text, embedding vector(1536), source_ref)
- `contractor_visibility_history` (score snapshots quotidiens)

Réutilise `contractors` existant (ajout colonnes manquantes: `founded_year`, `employees_estimated`, `slug` si absent).

### 1.2 Edge functions (Vague 1)
- `aipp-crawl-website` — Firecrawl sur isroyal.ca (homepage + sitemap, formats markdown + branding + links). Stocke chunks dans `contractor_embeddings`.
- `aipp-verify-rbq` — scrape RBQ public registry par numéro, parse statut/catégories/expiration.
- `aipp-import-gmb` — pour Vague 1: ingestion manuelle CSV reviews (Places API en Vague 2).
- `aipp-score-engine` — calcule les 5 scores depuis les signaux collectés (déterministe, pondéré, documenté).
- `aipp-generate-summary` — Lovable AI Gateway (`google/gemini-2.5-pro`) → AI summary, strengths, problem matches, risks, recommendation reasons.
- `aipp-build-embeddings` — `google/gemini-embedding-001` sur reviews + services + FAQs + médias.
- `aipp-generate-geo-pages` — 4 pages seed: `/terrebonne/isolation-entretoit`, `/laval/isolation-grenier`, `/blainville-ventilation-entretoit`, `/moisissure-entretoit-lanaudiere`. Contenu unique evidence-based + JSON-LD (LocalBusiness, Service, FAQ, Review, AggregateRating).

### 1.3 Pages publiques
- `src/pages/aipp/PageContractorAippProfile.tsx` — route `/pro/:slug` (ou `/entrepreneur/:slug` existante) en mode AIPP MAX:
  - Hero scientifique dark premium + score animé
  - Section AI Summary + Strengths
  - Service graph par ville (heatmap dominance locale)
  - Trust blocks dynamiques ("23 propriétaires à Laval cette semaine", RBQ vérifié badge, etc.)
  - Before/After viewer avec slider + annotations IA
  - Reviews enrichies (sentiment tags)
  - FAQ AI-readable + JSON-LD
  - CTA Alex (analyse symptômes → recommandation ISR)
- 4 pages geo générées (template `PageGeoServiceCity.tsx`)

### 1.4 Admin AIPP Control Center
- `src/pages/admin/PageAippControlCenter.tsx` — `/admin/aipp`
  - Health: complétude / fraîcheur / authority / trust / AI readiness
  - Missing assets list
  - Recommendations actionables
  - Bouton "Lancer pipeline" (déclenche les 7 edge functions en séquence)
  - Visibility report (snapshot scores + historique)

### 1.5 Alex integration
- Tool `recommend_contractor_aipp` dans `AlexVoiceContext`: query `contractor_embeddings` + `contractor_scores` filtrés ville+service, retourne top match avec **raison explicite** (proof density, review relevance, etc.) — pas générique.

### 1.6 SEO/AEO
- JSON-LD stack sur profil + pages geo (LocalBusiness, Service, FAQ, Review, AggregateRating, VideoObject, ImageObject)
- Sitemap dynamique étend `contractor_geo_pages`
- Meta + canonical + OG dynamiques

---

## Vagues 2-6 (post-Vague 1)

| Vague | Contenu | Effort |
|---|---|---|
| **V2 — Multimodal Intelligence** | Image AI engine (insulation depth, mold, soffits via Gemini vision), `before_after_score`, `attic_quality_score` | 2-3j |
| **V3 — Social Ingestion** | FB/IG/TikTok/YouTube import + engagement scoring | 2j |
| **V4 — Continuous Agents** | Cron quotidien: `review_agent`, `media_agent`, `authority_agent`, `trust_agent` | 2j |
| **V5 — Conversion Engine Premium** | Dynamic trust ticker live, before/after annotations IA interactives, savings estimator | 2-3j |
| **V6 — Monetization AIPP MAX** | Plan tier "AIPP MAX" via Stripe, competitor gap analysis, premium recommendation priority | 2j |

---

## Architecture technique

```
[Firecrawl] ──┐
[RBQ/NEQ]  ──┼──> aipp-ingest ──> contractor_* tables
[GMB CSV]  ──┘                          │
                                        ▼
                              aipp-score-engine
                                        │
                ┌───────────────────────┼───────────────────────┐
                ▼                       ▼                       ▼
        aipp-generate-summary   aipp-build-embeddings   aipp-generate-geo-pages
                │                       │                       │
                └──────────> contractor_ai_summaries / embeddings / geo_pages
                                        │
                                        ▼
                       Public profile + Alex recommendation tool
```

## Contraintes respectées
- Aucun score fake (gating `confidence_level` low/medium/high comme AIPP existant)
- Aucun placeholder; si donnée manquante → bloc caché + flag dans Admin
- Pas de duplication geo (template unique + données distinctes)
- RBQ marqué vérifié **uniquement** si scrape RBQ confirme statut actif

## Pré-requis à confirmer
1. **Firecrawl connector** — déjà connecté? (sinon je connecte en début de V1)
2. **Source reviews GMB** — Vague 1 via CSV upload OK, ou tu veux Google Places API direct (= secret à ajouter)?
3. **ISR contractor existant** — créer le record dans `contractors` avec slug `isolation-solution-royal` si absent, ou tu as déjà un ID?
4. **pgvector** — déjà activé sur ce projet? Je vérifie avant migration.

## Livrables Vague 1 (à valider avant build)
- 1 migration Supabase (11 nouvelles tables + RLS + GRANTs + pgvector si besoin)
- 7 edge functions
- 2 pages publiques (profil AIPP + template geo) + 4 pages geo générées
- 1 page admin cockpit
- Intégration Alex (1 tool)
- Profil ISR live sur `/pro/isolation-solution-royal` avec scores réels

---

Confirme **Vague 1 + réponses aux 4 pré-requis** et je passe en build immédiatement.
