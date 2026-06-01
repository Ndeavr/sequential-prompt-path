## Contexte

L'infrastructure d'acquisition entrepreneur existe déjà à 80%. Inventaire détecté :

**Tables existantes réutilisables**
- `contractor_prospects` (+ enrichment, scores, contacts)
- `prospect_aipp_scores`, `prospect_aipp_factors`, `prospect_aipp_snapshots`
- `outreach_messages`, `outreach_recipients`, `outreach_*_events` (open/click/reply/delivery)
- `prospect_email_campaigns`, `prospect_email_sequences`, `prospect_email_messages`
- `contractor_activation_events`, `contractor_activation_funnel`
- `acq_contractors`, `acq_contractor_scores`, `acq_contractor_services`, `acq_contractor_media`, `acq_contractor_objectives`
- `contractor_pricing_quotes` (pricing engine déjà branché à Stripe via `quote_id`)

**Edge functions existantes**
- `acq-scrape-contractors`, `acq-enrich-contractor`, `acq-enrich-prospect`, `acq-generate-aipp`, `acq-generate-outreach`, `acq-send-outreach`
- `aipp-real-scan`, `aipp-recommend`, `aipp-v2-analyze`, `aipp-pipeline-run`, `aipp-verify-neq`, `aipp-verify-rbq`
- `compute-pricing-quote`, `create-contractor-checkout`, `activate-contractor-plan`, `contractor-activation-enrich`
- `execute-prospect-pipeline`, `enrich-prospect`, `dispatch-outreach-batch`

**Pages admin existantes** : `/admin/acquisition`, `/admin/sniper`, `/admin/outbound/*` (~40 pages), `/admin/pricing-intelligence`

**Décisions confirmées**
- Unifier sous `/admin/acquisition-machine` (cockpit orchestrateur, pas de duplication backend)
- Réutiliser et étendre les tables existantes (pas de doublons)
- Scraping cascade : Google Places (base structurée) → Firecrawl (enrichissement website)

---

## Ce que je vais construire

### 1. Cockpit unifié `/admin/acquisition-machine`

Nouvelle page React unique avec 4 panneaux orchestrant les fonctions existantes :

- **Pipeline Control** : boutons `Force scrape` · `Extract data` · `Score AIPP` · `Generate messages` · `Send test email/SMS` · `Launch outreach` · `Pause`
- **Prospect Table** : colonnes company, trade, city, phone, email, AIPP score, recommended plan, status, last/next action. Actions par ligne : view profile · view extracted · generate messages · send test · propose plan · checkout link · block
- **Message Testing Panel** : 5 variants email + 5 SMS par prospect, avec angle, ton, CTA, score prédit, bouton "Approuver" et "Envoyer test à moi"
- **Plan Proposal Panel** : plan recommandé, raison, revenu mensuel potentiel, quota RDV, territoire, bouton Stripe checkout

Le cockpit s'appuie 100% sur les tables/functions existantes. Aucune logique métier n'est dupliquée.

### 2. Source de scraping en cascade

- **Nouvelle edge function `acq-scrape-google-places`** : appel Google Places Text Search + Place Details (nécessite `GOOGLE_PLACES_API_KEY` — je demanderai la clé avant build)
- **Modification de `acq-scrape-contractors`** : devient orchestrateur qui appelle d'abord Google Places, puis enrichit chaque résultat via Firecrawl (website metadata, branding, RBQ/NEQ detection)
- Dédoublonnage strict sur `(company_name, city)` + `phone` + `website_url` (déjà partiellement en place, à durcir)

### 3. Extension légère du schéma

Ajouter sur `contractor_prospects` les colonnes manquantes uniquement si absentes :
- `recommended_plan`, `recommended_plan_reason`, `estimated_capacity`, `estimated_monthly_value`
- `scrape_status`, `enrichment_status`, `outreach_status` (enum unifié pour la pipeline)

Créer **une seule** nouvelle table : `contractor_outreach_tests` (variants A/B générés, scores prédits, statut admin approval) — il n'y a pas d'équivalent direct dans `outreach_messages` qui gère les envois réels.

Aucune autre table créée — `contractor_plan_recommendations` est remplacée par `contractor_pricing_quotes` existante.

### 4. Landing entrepreneur `/contractor/ai-score/:prospectId`

Nouvelle page publique (pas d'auth requise) :

```text
┌──────────────────────────────────────┐
│  [Logo entreprise détecté]           │
│  AIPP Score: 67/100  ▓▓▓▓▓▓▓░░░     │
│                                       │
│  Top 3 forces · Top 3 faiblesses     │
│                                       │
│  → Quel est votre objectif ?         │
│    ○ Plus de rendez-vous             │
│    ○ Meilleur territoire             │
│    ○ Remplir mon agenda              │
│    ○ Être recommandé par l'IA        │
│                                       │
│  → Capacité mensuelle: [slider]      │
│                                       │
│  💡 Plan recommandé: Pro 349$/mo     │
│     5 RDV exclusifs/mois             │
│                                       │
│  [Activer mes rendez-vous exclusifs] │
└──────────────────────────────────────┘
```

- Pré-rempli depuis `contractor_prospects` + `prospect_aipp_scores`
- Alex auto-démarre (Sophia FR voice config existante) avec greeting contextuel : *"Bonjour, je suis Alex d'UNPRO. J'ai analysé [Nom entreprise] et je vois une opportunité concrète…"*
- Réutilise `compute-pricing-quote` pour la reco plan
- Stripe checkout via `create-contractor-checkout` existant avec `prospect_id` en metadata
- Copy 100% conforme : "rendez-vous exclusifs", "visibilité IA", "territoire", "capacité" — jamais "leads"

### 5. Garde-fous outreach

- Mode `dry_run` par défaut sur `acq-send-outreach`
- Limite quotidienne par mailbox (déjà en place dans `outreach_rate_limits`)
- Unsubscribe + suppression (déjà géré par `outbound_suppression_center`)
- Bouton "Admin approval required" avant tout batch live > 10 prospects

### 6. Alex contextuel sur la landing

Système prompt enrichi avec le contexte prospect :
- Score AIPP réel + facteurs
- Plan recommandé + raison
- Règle stricte : **jamais downsell** si l'objectif sélectionné implique un plan supérieur
- Gère objections : prix, exclusivité territoire, garantie RDV
- Push payment via inline Stripe (pattern `voice-sales-checkout` existant)

---

## Détails techniques

**Nouveaux fichiers**
- `src/pages/admin/acquisition/PageAdminAcquisitionMachine.tsx` (cockpit unifié)
- `src/pages/contractor-funnel/PageContractorAIScoreLanding.tsx` (landing /contractor/ai-score/:prospectId)
- `src/components/admin/acquisition/PipelineControlBar.tsx`
- `src/components/admin/acquisition/ProspectMasterTable.tsx`
- `src/components/admin/acquisition/MessageTestingPanel.tsx`
- `src/components/admin/acquisition/PlanProposalPanel.tsx`
- `supabase/functions/acq-scrape-google-places/index.ts`
- `supabase/functions/acq-cascade-scrape/index.ts` (orchestrateur Google Places → Firecrawl)
- `supabase/functions/acq-generate-test-variants/index.ts` (5+5 variants avec score prédit Gemini)

**Modifications**
- `src/app/router.tsx` : ajouter les 2 routes
- `supabase/functions/acq-send-outreach/index.ts` : ajouter `dry_run` + approval gate
- `supabase/functions/create-contractor-checkout/index.ts` : accepter `prospect_id` en metadata (en plus de `quote_id`)

**Migration unique**
- `ALTER TABLE contractor_prospects ADD COLUMN IF NOT EXISTS recommended_plan TEXT, recommended_plan_reason TEXT, estimated_capacity INT, estimated_monthly_value NUMERIC, outreach_status TEXT;`
- `CREATE TABLE contractor_outreach_tests (...)` + GRANT + RLS admin-only
- Pas de DROP. Pas de modification des tables existantes utilisées en prod.

**Secrets requis**
- `GOOGLE_PLACES_API_KEY` — je te demanderai de l'ajouter avant build
- Firecrawl déjà configuré

---

## Hors scope (existe déjà, ne pas reconstruire)

- `/admin/sniper` reste actif (pipeline alternative)
- `/admin/outbound/*` reste actif (gestion deliverability mailboxes)
- AIPP scoring engine (37 signaux) — réutilisé tel quel via `aipp-real-scan`
- Voice config Sophia + Charlotte — verrouillé
- Stripe Payment Element + `compute-pricing-quote` — réutilisé tel quel
- Outbound approval gate `/admin/outbound/approvals` — peut être consolidé plus tard

---

## Critères de succès

1. Admin force scrape Google Places + Firecrawl sans intervention
2. AIPP score réel généré par `aipp-real-scan` (jamais de mock)
3. 5 email + 5 SMS variants visibles avec score prédit, approval admin avant batch live
4. Landing `/contractor/ai-score/:prospectId` charge avec données réelles + Alex parle
5. Plan recommandé dynamique via `compute-pricing-quote`, jamais de downsell
6. Stripe checkout déclenche `activate-contractor-plan` post-paiement
7. Aucune copy interdite ("leads partagés", "soumissions") n'apparaît côté entrepreneur
8. Tous les échecs logués dans `contractor_activation_events` + visibles dans le cockpit

---

## Phasing si trop gros pour un seul build

**Phase 1 (recommandé pour démarrer)** : Cockpit unifié + landing `/contractor/ai-score/:prospectId` + Alex contextuel + Stripe wiring (utilise les `acq-*` functions existantes telles quelles)

**Phase 2** : `acq-scrape-google-places` + cascade Firecrawl + dédoublonnage durci

**Phase 3** : `acq-generate-test-variants` + Message Testing Panel + approval gate

Dis-moi si tu veux que je build tout d'un coup ou si on commence par Phase 1.