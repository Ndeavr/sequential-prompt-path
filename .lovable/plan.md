## Problème

L'auditeur actuel conclut "Aucune fuite détectée" alors qu'il n'y a aucune donnée. Logiquement faux : *absence de données ≠ absence de fuites*. On doit basculer vers un modèle de **confiance + télémétrie**.

## Refonte — 3 livrables

### 1. Edge function `acquisition-pipeline-audit` v2

Avant d'évaluer les fuites, exécuter une **Data Availability Check** :

- Compter les rows + `MAX(created_at)`/`updated_at` sur : `contractors`, `contractor_leads`, `contractor_prospects`, `companies`, `contractor_outreach_logs`, `campaign_send_log`, `outreach_campaigns`, `profiles`, `acquisition_funnel_state`.
- Compter les événements par stage : SCRAPED, CONTACTED, DELIVERED, OPENED, CLICKED, REGISTERED, ONBOARDED, PAID, ACTIVE (via `contractor_leads.pipeline_status` + `contractor_outreach_logs.status` + `campaign_send_log.status`).
- Calculer un **confidence_score 0-100** :
  - 0 contractors + 0 events → score 0 → statut `UNKNOWN / CRITICAL`
  - Données partielles → 50-94 → `PARTIAL`
  - Données complètes + activité → 95-100 → `VERIFIED`
- Détecter **silent failures** :
  - `SCRAPER_STALLED` — 0 contractors ajoutés en 24h
  - `SMS_DELIVERY_FAILURE` — sms_queued > 0 ET delivered = 0
  - `EMAIL_DELIVERY_FAILURE` — email sent > 0 ET delivered = 0
  - `TRACKING_PIPELINE_FAILURE` — outreach sent > 0 ET clicks = 0
  - `STRIPE_WEBHOOK_FAILURE` — payments > 0 ET active subscriptions = 0 (skip si tables absentes)
- Toujours produire au moins 1 finding quand `confidence < 50` : `acquisition_telemetry_unavailable` (severity critical, action recommandée explicite).
- Étendre `acquisition_audit_runs` avec : `confidence_score`, `data_availability` (jsonb), `system_status` (`healthy|warning|critical|unknown`), `silent_failures` (jsonb[]).

### 2. Migration DB

```sql
ALTER TABLE public.acquisition_audit_runs
  ADD COLUMN IF NOT EXISTS confidence_score int,
  ADD COLUMN IF NOT EXISTS system_status text,
  ADD COLUMN IF NOT EXISTS data_availability jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS silent_failures jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS event_counts jsonb DEFAULT '{}'::jsonb;
```

Pas de nouvelle table — on réutilise `acquisition_findings` pour les findings télémétrie.

### 3. UI — page `/admin/revenue-intelligence` (nouvelle) + upgrade `/admin/acquisition-funnel`

**Bannière de statut en haut** (couleur dynamique) :
- `VERIFIED` vert · `PARTIAL` ambre · `CRITICAL/UNKNOWN` rouge
- Affiche `confidence_score %` + phrase explicite ("Acquisition telemetry unavailable — …")

**Section "Funnel Integrity"** :
- Cards Data Sources : Contractors / Twilio / Stripe / Resend / Lead Events / Tracking — chacune `✓ Connected` ou `✗ No Events Detected`.
- Table "Event Validation" : 9 stages × (Total Events · Last Event · Status).
- Table "Data Availability" : rows + last update + status par table.
- Section "Silent Failures" : liste des alertes détectées.
- Section "Findings" inchangée mais inclut les nouveaux findings télémétrie.

Nouvelle route `/admin/revenue-intelligence` ajoutée au router admin, lien depuis `/admin/acquisition-funnel`.

## Hors scope

- Pas d'intégration directe Twilio/Stripe/Resend API live (on lit l'état via tables internes existantes) — les statuts "Connected" reflètent la présence de secrets + rows récentes, pas un ping API live. Phase 2 si demandé.
- Pas de modification de la logique de scraping/outreach existante.

## Détails techniques

- Edge function reste publique (`verify_jwt = false` par défaut Lovable).
- Tous les comptages dans une seule passe SQL via `Promise.all` pour rester < 1s.
- Le toast d'erreur frontend déjà amélioré au tour précédent reste en place.
- Migration ALTER additive only → zéro risque pour les runs existants.
