## UNPRO — AI Entity Profile System (Rebuild)

Sépare clairement la **page IA crawlable** (`/ai/:slug`) de la **page conversion humaine** (`/pro/:slug`). Objectif : devenir source citée par ChatGPT/Gemini/Perplexity sur les entrepreneurs résidentiels QC.

### 1. Database (migration unique)

Nouvelles tables :

- `ai_entities` — id, slug (unique), company_name, primary_service, primary_city, ai_summary, confidence_score, years_active, logo_url, website, phone, lat/lng, contractor_id (fk nullable), published, created_at, updated_at
- `ai_entity_sources` — entity_id, source_type (`gbp|website|rbq|neq|facebook|instagram|bbb|homestars|sitemap`), source_url, status (`pending|ok|failed|stale`), last_sync, raw_payload jsonb
- `ai_entity_reviews` — entity_id, source, rating, review_count, sentiment jsonb, themes text[], last_sync
- `ai_entity_images` — entity_id, image_url, type (`logo|photo|team|truck|before_after|jobsite`), source, ai_caption, sort_order
- `ai_entity_validations` — entity_id, rbq_status, rbq_number, neq_status, neq_number, insurance_status, google_verified, domain_https, last_checked
- `ai_entity_services` — entity_id, label, slug, frequency (`high|medium|low`), evidence_url, image_url
- `ai_entity_zones` — entity_id, city, region, detected_from (`gbp|website|citations|content`)
- `ai_entity_faq` — entity_id, question, answer, generated_from

Toutes : RLS public SELECT via vue `ai_entities_public` (filtre `published = true` + `confidence_score >= seuil`). Base tables : SELECT bloqué publiquement, service_role + admin only.

Trigger `recompute_confidence_score()` sur insert/update validations/reviews/sources.

### 2. États intelligents (interdiction d'inventer)

Centraliser dans `src/lib/aiEntityStatus.ts` :

| Champ | OK | En cours | Inconnu |
|---|---|---|---|
| RBQ | « RBQ validée #1234 » | « Validation RBQ en cours » | masqué |
| NEQ | « NEQ active » | « Vérification du registre en cours » | masqué |
| Assurance | « Assurance détectée » | « Validation en cours » | masqué |
| GBP | « Google Business vérifié » | « Synchronisation Google en cours » | masqué |
| HTTPS | « Site sécurisé HTTPS » | — | masqué |

Règle absolue : aucune affirmation non sourcée. Si validation ≠ `confirmed` → label « en cours » ou élément masqué.

### 3. Pipeline data engine (edge functions)

Nouvelles fonctions Deno (npm: imports, CORS, validation Zod) :

- `ai-entity-ingest` — orchestrateur : prend entity_id, lance sources en parallèle, met à jour `last_sync`/`status`.
- `ai-entity-scrape-website` — Firecrawl scrape homepage + /contact + /about + /services + sitemap → extrait phone, email, logo, zones, services, photos, social handles. Écrit dans `ai_entity_sources`, `ai_entity_images`, `ai_entity_zones`, `ai_entity_services` avec evidence_url.
- `ai-entity-gbp` — fetch Google Business (lien GBP existant), récupère rating, review_count, photos, hours, verified.
- `ai-entity-verify-rbq` — Firecrawl REQ + RBQ public registry, fuzzy match nom/NEQ.
- `ai-entity-verify-neq` — réutilise existant.
- `ai-entity-reviews-aggregate` — agrège Google + Facebook + BBB + HomeStars si disponibles.
- `ai-entity-sentiment` — Gemini 2.5 Flash sur reviews → themes[] + sentiment scores (rapidité, ponctualité, propreté, prix, etc.) avec evidence snippets.
- `ai-entity-summary` — Gemini génère `ai_summary` (3-4 phrases) + 5 FAQs à partir des données confirmées uniquement (no-hallucination guardrail : doit citer un champ source).
- `ai-entity-compute-score` — calcule `confidence_score` (0-100) selon validations + sources + reviews.

### 4. Routes & pages

**Nouvelle page `/ai/:slug` — `src/pages/ai/PageAiEntity.tsx`** (knowledge-first, zero funnel) :

```text
HERO
  Logo + Nom + Métier principal • Ville
  Sous-titre: "Entreprise analysée par UNPRO AI"
  Score IA + années activité

BADGES (vrais uniquement)
RATINGS (Google/FB/BBB/HomeStars si présents)
RÉSUMÉ IA (texte factuel)
SERVICES DÉTECTÉS (tags + images + fréquence + villes)
ZONES DESSERVIES
GALERIE (logo, photos, équipe, chantier, avant/après)
ANALYSE DES AVIS (thèmes IA + evidence)
FAQ IA
JSON-LD: LocalBusiness + Contractor + Service[] + FAQPage + AggregateRating + GeoCoordinates + sameAs + Review[] + Organization
```

Rules UI : pas de bouton « Vérifier cette entreprise », pas de « Analyser mes soumissions », pas d'Alex, pas d'auth overlay. Lien discret en bas : « Prendre rendez-vous » → `/pro/:slug`.

**Page `/pro/:slug`** (déjà existante `PageAiIndexedProfile.tsx` ou similaire) : conserver pour conversion (Alex, booking, avant/après, urgences). Audit séparé hors scope de ce build.

Router : ajouter `/ai/:slug` dans `src/app/router.tsx` + `ROUTES.AI_ENTITY` dans `routesConfig.ts`.

### 5. SEO infrastructure

- `public/ai-sitemap.xml` généré par script `scripts/generate-ai-sitemap.ts` (predev + prebuild) : query `ai_entities_public` → 1 entrée par slug avec `lastmod = updated_at`.
- Référencer `ai-sitemap.xml` dans `public/robots.txt` et `public/sitemap.xml` (sitemapindex).
- `index.html` reste sitewide ; per-page meta via `react-helmet-async` (déjà présent) sur `/ai/:slug` : title, description, canonical `https://unpro.ca/ai/:slug`, og:*.
- JSON-LD injecté inline via `<script type="application/ld+json">` (pas useEffect) pour garantir présence au premier render — important pour crawlers non-JS.
- Prerender server (existant Lovable) servira `/ai/*` aux user-agents bots.
- Ajouter `/ai/*` à `llms.txt`.

### 6. Admin

Page `/admin/ai-entities` :
- Liste avec score, validations status, last_sync par source.
- Actions : « Lancer ingestion », « Refaire RBQ », « Refaire NEQ », « Régénérer résumé IA », « Publier/Dépublier ».
- Drawer evidence : voir snippets sources par champ.

### 7. Seed démo

Lancer pipeline complet sur `isolation-solution-royal` :
- scrape site, GBP, RBQ, NEQ, reviews, sentiment, résumé, FAQ.
- Vérifier rendu `/ai/isolation-solution-royal` : badges réels, services avec evidence, JSON-LD validé via Schema.org validator (mental check).

### Détails techniques

- **Edge functions** : `import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'`, CORS via `npm:@supabase/supabase-js@2/cors`, Zod validation, service role pour writes.
- **Sécurité** : vues `SECURITY INVOKER`, base tables denied publiquement, validations PII (téléphone, email) seulement si confirmé via source publique.
- **Confidence score** : 100 = RBQ+NEQ+GBP+HTTPS+5 reviews+sentiment OK ; <40 = `published = false` (pas exposé sur `/ai/*`).
- **No-hallucination** : `ai-entity-summary` et `ai-entity-faq` reçoivent uniquement les champs `confirmed` ; tool schema strict ; si données manquantes → phrase « en cours d'analyse ».

### Hors scope (phases suivantes)

- Embeddings vectoriels pour search IA interne.
- Refonte UX `/pro/:slug` (déjà existant, traité séparément).
- Crawl Instagram/TikTok.
- Multi-langue EN.

### Tâches

1. Migration Supabase (8 tables + vue publique + RLS + trigger score).
2. `src/lib/aiEntityStatus.ts` (labels intelligents).
3. 9 edge functions du pipeline.
4. Page `/ai/:slug` + route + helmet + JSON-LD inline.
5. `scripts/generate-ai-sitemap.ts` + hooks predev/prebuild + robots/sitemap refs.
6. Admin `/admin/ai-entities`.
7. Seed démo ISR + QA visuelle.

**Confirme ce plan pour build, ou indique ce qu'il faut couper/ajouter.**