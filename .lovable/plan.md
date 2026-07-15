# Acquisition Pipeline — Visibilité totale + Worker qui ne s'arrête jamais

## Diagnostic

La capture confirme : `Verified = 1` (Réno-Toit), `Ready = 0`. Le système ne montre ni combien d'entreprises sont scrapées, ni pourquoi elles échouent. Le worker s'arrête dès qu'il n'y a rien à envoyer. Résultat : aucune visibilité, aucun débit.

## Objectif

1. Voir en temps réel chaque étape du funnel d'acquisition (source → scraped → enriched → verified → ready → contacted → activated).
2. Voir *pourquoi* chaque prospect est rejeté.
3. Worker qui continue à scraper tant que `verified < 100` par (catégorie × région), et non tant qu'il y a un lot SMS à envoyer.

## Périmètre

Uniquement admin/acquisition. Aucun changement à Alex, Stripe, landing, matching, scoring homeowner.

---

## 1. Backend — pipeline_events + rejections

**Migration** :
- Nouvelle table `acquisition_pipeline_events` (source, stage `scraped|enriching|verified|ready_sms|ready_email|contacted|clicked|activated|rejected|duplicate`, prospect_id, reason_code, reason_text, city, category, created_at). Un event à chaque transition.
- Ajouter colonnes sur `verified_contractor_prospects` si absentes : `source` (`google_business|rbq|website|facebook|manual`), `rejection_reason_code`, `rejection_reason_text`, `last_action_at`.
- Vue `v_acquisition_funnel_daily` : compte par stage × source × city × category sur 24h.
- Vue `v_acquisition_coverage` : count `verified` par (category, city) → montre où on est <100.
- RLS admin-only. GRANTs `authenticated` + `service_role`.

**Instrumenter** les edge functions existantes (`enrich-contractor-from-official-site`, `validate-contractor-phone`, `send-verified-batch`, `acquisition-queue-worker`) pour émettre un event à chaque décision (accept/reject + reason_code canonique : `phone_invalid`, `no_email`, `quality_below_80`, `duplicate_neq`, `duplicate_phone`, `outside_target_zone`, `category_unknown`, `enrichment_failed`, `sms_not_eligible`, `landline_only`, etc.).

## 2. Worker — mode "coverage 100"

Refactorer `acquisition-queue-worker` :
- Config `TARGET_COVERAGE_PER_CELL = 100`, `TARGET_CATEGORIES = ['toiture','isolation','plomberie','peinture','electricite','renovation']`, `TARGET_CITIES = ['Montreal','Laval','Terrebonne','Repentigny','Longueuil','Saint-Jerome','Blainville','Boisbriand']`.
- Boucle : pour chaque cellule (cat × ville) où `verified_count < 100`, lancer scraping (Google Places + RBQ public + sites web via Firecrawl) jusqu'à atteindre le seuil ou épuiser la source.
- Ne s'arrête PAS si `ready_batch = 0` — continue à scraper.
- Émet un event `scraped` par entreprise trouvée, même si rejetée ensuite.
- Rapport de fin de cycle (JSON logué + inséré dans `acquisition_pipeline_events` type `worker_cycle`) : found, enriched, verified, ready_sms, ready_email, rejected par reason, duplicates.

## 3. Frontend — /admin/acquisition-pipeline

Nouvelle page `PageAdminAcquisitionPipeline.tsx` (dark admin theme, mobile-first) :

**Bloc Sources (5 cards)** : Google Business, RBQ, Sites web, Facebook, Import manuel → count 24h + total.

**Bloc Statistiques (7 tuiles)** : Trouvées, Enrichies, Validées, Prêtes SMS, Prêtes Email, Rejetées, Doublons.

**Bloc Couverture** : grille catégorie × ville, cellule verte si ≥100 vérifiées, orange si 20-99, rouge si <20. Clic → filtre la liste.

**Bloc Rejets** : top 10 raisons de rejet 24h (reason_code → count) — révèle si c'est `phone_invalid` (99%) ou `no_email` (99%) etc.

**Liste complète** : table paginée (React Query, filtres source/stage/city/category/reason). Colonnes : Entreprise, Ville, Catégorie, Téléphone, Email, Source, Score, Statut (badge), Dernière action (relative time). Ligne rouge pour `rejected` avec tooltip reason_text.

**Timeline live** : dernier 50 events (auto-refresh 10s) — voir le funnel bouger en direct.

Hook `useAcquisitionPipeline()` qui interroge `v_acquisition_funnel_daily`, `v_acquisition_coverage`, `acquisition_pipeline_events`, `verified_contractor_prospects`.

Route ajoutée dans `router.tsx` sous `/admin/acquisition-pipeline`, lien dans le sidebar admin.

## 4. Critère d'arrêt

- Page `/admin/acquisition-pipeline` affiche des compteurs non-nuls pour Trouvées / Enrichies / Rejetées.
- Un cycle du worker autonome produit au moins 20 events `scraped` par cellule.
- Le top des raisons de rejet est visible → on sait quoi corriger ensuite.

## Détails techniques (dev only)

- Nouveaux fichiers : `supabase/migrations/<ts>_acquisition_pipeline.sql`, `src/pages/admin/PageAdminAcquisitionPipeline.tsx`, `src/hooks/useAcquisitionPipeline.ts`, `src/components/admin/acquisition/*` (SourceCard, FunnelStats, CoverageGrid, RejectionReasons, EventTimeline, ProspectPipelineTable).
- Modifiés : 4 edge functions (émettre events), `router.tsx`, sidebar admin.
- Reason codes centralisés dans `supabase/functions/_shared/acquisitionReasons.ts` + miroir dans `src/config/acquisitionReasons.ts`.
- Pas de nouvelle dépendance externe. Firecrawl/RBQ scraping utilise les connecteurs déjà en place.
