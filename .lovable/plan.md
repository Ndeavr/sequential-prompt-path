
# UNPRO Growth Operating System — v1

Objectif: moteur de croissance autonome bi-faces. Chaque entrepreneur activé devient source de revenus, données, croissance et recommandations. Métrique nord: **EAG** (Exclusive Appointments Generated par entrepreneur actif par mois).

L'ampleur est trop large pour un seul build. Je propose 4 phases livrables incrémentalement. Phase 1 est le socle obligatoire avant tout.

---

## Phase 1 — Socle (à livrer en premier)

### 1.1 Base de données (migration unique)
4 tables avec GRANT + RLS:
- `contractor_growth_campaigns` (id, contractor_id, trade, city, status, targets_found, emails_sent, sms_sent, replies, appointments, activations, timestamps)
- `contractor_competitors` (id, contractor_id, competitor_name, trade, city, website, phone, email, google_rating, review_count, aipp_score, status, created_at)
- `homeowner_intents` (id, city, problem, service, source, intent_score, status, recommended_contractor_id, created_at)
- `growth_tasks` (id, type, priority, status, payload jsonb, started_at, completed_at)

Statuts strictement contrôlés: `queued | running | waiting_review | approved | sent | replied | booked | activated | failed`. Pas de `completed` sauf action réelle.

### 1.2 Trigger d'activation → Expansion Agent
Edge function `growth-expansion-agent`:
- Déclenchée quand `contractors.status` passe à `active` (DB trigger → `growth_tasks` queue)
- Scan Google Maps + RBQ + NEQ + site → ~50 concurrents même métier/ville
- Calcule score AIPP par concurrent (réutilise le moteur AIPP existant)
- Insère dans `contractor_competitors`
- Crée page d'audit privée `/ai-score/:slug`

### 1.3 Outreach Agent (limites quotidiennes)
Edge function `growth-outreach-agent` (cron toutes les 15 min):
- Quotas globaux admin-configurables: 50 SMS / 25 emails / 5 activations par jour
- Réutilise la séquence SMS "Visibilité IA" déjà active
- File `waiting_review` → admin approuve dans `/admin/growth-engine`
- Met à jour `contractor_growth_campaigns` à chaque envoi/réponse/booking

### 1.4 Cockpits
- `/admin/growth-engine` — cards: Contractors Active, Expansion Jobs Running, Pages Generated Today, Appointments Created, Revenue Influenced, Conversion Rate, Activation Rate
- `/entrepreneur/growth` — cards: Competitors Discovered, AI Visibility Score, Pages Generated, Leads Qualified, Appointments Booked, Revenue Generated, Ranking Position

### 1.5 EAG metric
Vue SQL `v_contractor_eag_monthly` agrégeant rendez-vous exclusifs / entrepreneur actif / mois. Exposée dans les deux cockpits.

---

## Phase 2 — Homeowner Demand Engine
- Générateur nocturne (cron) de pages `/probleme/:problem/:city` (réutilise `aeo_problem_pages` existant)
- Intent Detection Agent: agrège signaux (GSC, forms, Alex, uploads, articles vus, quote comparisons) → `homeowner_intents.intent_score` (0-100)
- Auto Match Engine: déclenché quand `intent_score > 60`, ranking 30/10/15/10/15/20 (trade/distance/availability/reviews/AIPP/specialization)

## Phase 3 — Appointment + Referral
- Flow appointment-first explicite (jamais "lead"), branché sur le booking engine existant
- Referral Engine post-projet: QR code personnel, tracking visits/signups/bookings/revenue

## Phase 4 — Ad & AEO Agents (priorité 70% AEO / 20% acquisition / 10% Ads)
- Campaign Builder, Landing Page Generator, Performance Analyzer, Ad Asset Generator
- Renforcement AEO/GEO du graphe entrepreneur pour citation ChatGPT/Gemini/Claude/Perplexity

---

## Détails techniques (Phase 1)

Fichiers:
- `supabase/migrations/<ts>_growth_os_phase1.sql` (4 tables + GRANT + RLS + trigger + vue EAG)
- `supabase/functions/growth-expansion-agent/index.ts`
- `supabase/functions/growth-outreach-agent/index.ts`
- `supabase/functions/growth-task-dispatcher/index.ts` (cron */5min, lit `growth_tasks`)
- Cron via `pg_cron` + `pg_net` (insert tool, pas migration)
- `src/pages/admin/AdminGrowthEngine.tsx`
- `src/pages/entrepreneur/EntrepreneurGrowth.tsx`
- Routes ajoutées dans le router admin/entrepreneur existant
- Composants `CardGrowthMetric`, `TableGrowthCampaigns`, `TableCompetitors`, `DrawerCampaignDetail`

Réutilise:
- AIPP scoring engine (`compute-aipp-score`)
- Séquence SMS "Visibilité IA" déjà active (memory: outbound)
- Système de quotas/autopilot existant
- Pages AEO `aeo_problem_pages`

Conformité memory:
- `production-reliability-framework`: chaque agent appelle `reportOutcome()` + `FailureCode` canonique
- `ui-readability-rule`: cockpits wrappés `.admin-theme`, tokens `--text-*`
- Edge functions: import `https://esm.sh/@supabase/supabase-js@2.49.1`
- Pas de "completed" sauf succès business réel

---

## Questions de cadrage avant build

1. **Portée du premier livrable** — confirmes-tu qu'on commence par **Phase 1 uniquement** (socle DB + Expansion Agent + Outreach Agent + cockpits + EAG) et qu'on planifie Phases 2/3/4 ensuite? Ou tu veux que je tente plus dans cette itération (risque: rien de stable)?

2. **Source de vérité "contractor actif"** — `contractors.status = 'active'` est-il le bon trigger, ou tu préfères `contractor_subscriptions.status = 'active'` (paiement réel reçu)?

3. **Approbation outreach** — par défaut `waiting_review` (admin approuve chaque envoi) OU auto-approve dans les quotas avec opt-out manuel?

Dis-moi et je passe en build sur la Phase 1.
