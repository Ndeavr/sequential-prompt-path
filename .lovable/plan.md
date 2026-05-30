
## Contexte (état réel constaté)

- `contractor_prospects` (80 lignes) a déjà **exactement** les colonnes du brief (`enrichment_status`, `aipp_status` via `contractor_aipp_scores`, `outreach_status`, `onboarding_status`, `payment_status`, `activation_status`) → **table canonique**.
- 30+ edge functions déjà déployées : `autonomous-acquisition-engine`, `run-live-acquisition`, `enrich-prospect`, `edge-generate-aipp-preview`, `mission-generate-outreach`, `send-outreach-direct`, `send-sms-prospect`, `stripe-webhook`, `create-stripe-checkout-session`.
- 20+ pages admin existent (`PageAdminAcquisition`, `PageAdminWarRoom`, `PageAdminPipelineProspects`, `PageSniperPipeline`, `PageOutboundOpsCenter`…) → fragmenté, pas de vue **unique** scrape→paiement.
- Secrets tous présents : `GOOGLE_PLACES_API_KEY`, `RESEND_API_KEY`, `TWILIO_*`, `STRIPE_SECRET_KEY`, `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`.

Décision (validée) : **consolider sur l'existant**, livraison **tout en une fois**, source de vérité = `contractor_prospects`. Aucune nouvelle table métier — uniquement 3 tables de cockpit (runs, logs, health). Aucune duplication.

---

## Livrables

### 1. Migration Supabase — 3 nouvelles tables cockpit

- `acquisition_pipeline_runs` (id, run_type[scrape|enrich|aipp|outreach|payment|full_test], status, total/succeeded/failed/blocked counts, timings, triggered_by, error_summary)
- `acquisition_pipeline_logs` (id, run_id, prospect_id?, step, status, message, metadata jsonb)
- `system_config_health` (service_name PK, status[connected|missing|invalid|limited], required_for[], last_checked_at, error_message)

Plus colonnes manquantes sur `contractor_prospects` si absentes (`aipp_status` text, `blocked_reason` text). RLS admin-only. GRANTs explicites.

### 2. Edge functions — créer / consolider

| Fonction | Action |
|---|---|
| `acq-health-check` | **NEW** — ping Google Places, Resend, Twilio, Stripe, Gemini, Firecrawl, webhook Stripe, cron. Écrit `system_config_health`. |
| `acq-scrape-contractors` | **NEW** wrapper unifié → délègue à `fn-scrape-google-results` (Google Places). Insère dans `contractor_prospects` avec dédup (neq/website/phone). |
| `acq-enrich-prospect` | wrapper → `enrich-prospect` existante, normalise sortie, log. |
| `acq-generate-aipp` | wrapper → `aipp-real-scan` + `aipp-recalc-score`, écrit `contractor_aipp_scores` + `public_slug`. |
| `acq-generate-outreach` | wrapper → `mission-generate-outreach` (email + SMS), status `draft` par défaut. |
| `acq-send-outreach` | wrapper → `send-outreach-direct` (email) / `send-sms-prospect`. **Mode draft par défaut**, flag `live=true` requis. |
| `acq-create-checkout` | **NEW** — Stripe Checkout `mode=subscription`, metadata `{prospect_id, plan_id, source:'acquisition_pipeline'}`, retourne URL. 5 plans (Recrue 149, Pro 349, Premium 599, Élite 999, Signature 1799). |
| `stripe-webhook` | **PATCH** — sur `checkout.session.completed` avec `metadata.source=acquisition_pipeline` : crée contractor account, lie `prospect.contractor_id`, set `payment_status=paid`, `activation_status=active`, log. |
| `acq-full-test` | **NEW** — crée prospect test → enrich → AIPP → outreach draft → Stripe **test** checkout → vérifie webhook readiness → rapporte chaque étape (working/blocked/missing config). |

Toutes les fonctions logguent dans `acquisition_pipeline_logs` et créent une `acquisition_pipeline_runs`.

### 3. Cockpit admin — `/admin/acquisition` (page unique)

Composants :
- **HeaderCards** : Prospects, AIPP, Messages envoyés, Landing visits, Onboarding, Payments, Blocked steps.
- **PipelineFlow visuel** : Scraping → Enrichment → AIPP → Outreach → Landing → Onboarding → Stripe → Activation. Chaque étape : vert/jaune/rouge/gris (depuis `system_config_health` + comptes de `contractor_prospects`).
- **ConfigHealthPanel** : liste des services avec statut + message clair (« SMS bloqué : TWILIO_API_KEY manquant »).
- **ProspectsTable** : business_name, trade, city, AIPP score, outreach_status, landing visited?, plan, payment, activation. Actions inline : Enrich, AIPP, Preview landing, Generate outreach, Send test (admin), Send live, Create checkout, Activate manually, Retry, View logs.
- **RunsTimeline** + **LogsDrawer** (jsonb metadata pretty-printed).
- **Bouton « Run Full Pipeline Test »** → appelle `acq-full-test`, affiche rapport étape par étape (Working / Partial / Blocked / Missing config / Next action).

Route : `/admin/acquisition` (la page existante `PageAdminAcquisition` sera **remplacée**, pas dupliquée). Anciennes pages (`PageAdminPipelineProspects`, `PageAdminWarRoom`) restent accessibles mais marquées « legacy ».

### 4. Landing publique `/pro/:slug`

Déjà existante (mem `nuclear-close-landing`). **Vérifier** branchement sur `contractor_aipp_scores.public_slug` et que le CTA « Activer mes rendez-vous exclusifs » route vers le **nouvel onboarding** ci-dessous.

### 5. Onboarding contractor — 7 écrans

`/pro/onboarding/:prospect_id` : Confirm business → Capacity/mois → Territoire → Services → Plan (recommandation auto selon capacité : <3 RDV→Recrue, 3-5→Pro, 6-10→Premium, 11-25→Élite, 25+→Signature) → Stripe Checkout (via `acq-create-checkout`) → Confirmation. Tracking `contractor_landing_sessions` (vue sur tables existantes).

---

## Logique critique

- **Aucun silent fail** : chaque erreur → row `acquisition_pipeline_logs` + maj `contractor_prospects.blocked_reason`.
- **Mode draft par défaut** pour outreach. Envoi live requiert clic explicite admin.
- **Stripe en mode live** (clé existante) mais bouton « Test checkout » force `mode=test` via Price IDs test.
- **Dédup scraping** : skip si (neq) OR (website_url normalisé) OR (phone E.164) déjà présent.
- **Health gating** : si `GOOGLE_PLACES_API_KEY` absent → bouton Scraping désactivé + badge rouge (jamais d'erreur masquée). Idem chaque service.
- **Recommandation plan** dérivée de capacité_mensuelle dans onboarding ; storable dans `contractor_prospect_scores` existante.

---

## Tâches d'exécution (ordre)

1. Migration : 3 tables cockpit + colonnes manquantes + RLS + GRANTs + index.
2. Edge function `acq-health-check` + déploiement + seed initial.
3. Edge functions wrappers (`acq-scrape`, `acq-enrich`, `acq-generate-aipp`, `acq-generate-outreach`, `acq-send-outreach`).
4. Edge function `acq-create-checkout` + patch `stripe-webhook` activation auto.
5. Edge function `acq-full-test`.
6. Page `/admin/acquisition` (remplace PageAdminAcquisition) + composants Header/Flow/Health/Table/Timeline/Drawer.
7. Onboarding `/pro/onboarding/:prospect_id` (7 écrans).
8. Vérif landing `/pro/:slug` branchée sur nouveau flow.
9. Run E2E manuel via bouton Full Test → corriger ce qui apparaît rouge.
10. Mettre à jour `mem://features/` avec le nouveau cockpit canonique.

---

## Hors périmètre

- Pas de refonte des 20 autres pages admin (gel, marquées legacy).
- Pas de nouveau scraper RBQ (utilise `scrape-rbq-leads` existant via wrapper futur).
- Pas de migration des tables `prospects`/`war_prospects`/`contractors_prospects` legacy — accès via vues si nécessaire plus tard.

## Critères de succès

Validés quand le bouton **Run Full Pipeline Test** affiche tous verts ET qu'un vrai prospect peut être scrapé → enrichi → AIPP → outreach draft → checkout Stripe → paiement test → contractor activé automatiquement, chaque étape traçable dans `/admin/acquisition`.
