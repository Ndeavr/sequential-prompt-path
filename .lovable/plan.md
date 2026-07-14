# Conversion Truth Sprint — Premier Entrepreneur Payé 1$

Objectif unique : identifier et éliminer le point exact qui bloque la première activation payée. Aucune nouvelle fonctionnalité, aucun redesign.

## Ce qui existe déjà (à réutiliser, pas recréer)
- `/admin/funnel-debug` + `funnel-debug-leads` + `funnel-debug-run-test` → agrégation lead-par-lead + test E2E.
- Tables : `launch_leads`, `sms_events_v2`, `contractor_funnel_events`, `platform_operation_outcomes`, `funnel_debug_runs`.
- Edge `acq-sms-send` (Twilio), `launch-agent-checkout-sender`, `launch-agent-activation`.

## Livrables (8 étapes)

### 1. Page `/admin/conversion-truth`
Vue verticale "vérité brute" par lead avec les 17 étapes demandées. Chaque cellule = timestamp + session_id + device + source, colorée VERT/ROUGE/GRIS. Réutilise `funnel-debug-leads` — on étend la fonction pour retourner aussi `landing_visible_3s`, `cta_clicked`, `signup_started`, `signup_completed`, `stripe_success` (déjà dans `contractor_funnel_events` ou `platform_operation_outcomes`).

### 2. Bandeau "CURRENT BLOCKER" en haut
Calcul serveur : sur les 30 derniers jours, l'étape avec le plus gros drop-off (leads entrants − leads sortants / leads entrants). Un seul texte, exemple : *"Blocage principal : Lien jamais cliqué (92% des SMS livrés)"*. Rafraîchi à chaque chargement.

### 3. Audit tracking clics (STEP 2)
Nouvel edge `conversion-tracking-audit` qui compare :
- `sms_events_v2.status='delivered'` vs `contractor_funnel_events` type `link_clicked`
- `link_clicked` vs `landing_view`
Retourne les incohérences (`landing_view` sans `link_clicked` → `TRACKING_MISMATCH`). Affiché en carte rouge sur le dashboard.

Correction ciblée : vérifier que `/pro/:slug` (page landing SMS) émet bien `link_clicked` **avant** `landing_view` via `contractor_funnel_events`. Si l'événement manque dans le code de la page, l'ajouter (1 ligne d'insert).

### 4. Table `lead_funnel_sessions`
Migration : `id, lead_id, session_id, ip_hash, user_agent, opened_at, time_on_page, scroll_depth, cta_clicked, alex_started, signup_started, created_at`. RLS admin lecture, service_role écriture, `authenticated` insert scoped par session.

Instrumentation minimale sur la landing SMS existante (`/pro/:slug` ou `/entrepreneur/...`) : insert au mount, update périodique (scroll + time), update sur CTA. Aucun changement de design.

### 5. Prefill landing (STEP 4)
Vérifier la landing SMS actuelle. Si le token/slug ne préremplit pas Company/Category/City/Phone, câbler la lecture depuis `launch_leads` (via edge publique déjà en place ou nouveau `get-lead-preview`). Bloc d'accueil personnalisé : "Bonjour {Company} — profil préparé — 1$/7j". Pas de refonte, juste injection des champs.

### 6. Table `sms_templates` + A/B (STEP 5)
Migration : `sms_templates(id, variant, body, active, created_at)` avec seeds A et B. `acq-sms-send` sélectionne aléatoirement `active=true`, journalise le `variant_id` dans `sms_events_v2.metadata`. 

Vue `v_sms_variant_stats` : delivery_rate, click_rate, landing_rate, activation_rate par variant. Affichage sur dashboard. Aucune UI d'édition — modif via SQL suffit pour ce sprint.

### 7. Bouton "Tester Funnel Réel" (STEP 6)
Déjà présent via `funnel-debug-run-test`. On étend :
- Après SMS envoyé, la fonction polle 5 min les `contractor_funnel_events` du lead test.
- Retourne `first_failure_point` explicite : `SMS | LINK | LANDING | ALEX | SIGNUP | CHECKOUT | STRIPE | ACTIVATION`.
- Bouton exposé aussi sur `/admin/conversion-truth` (pas seulement `/admin/funnel-debug`).

### 8. Cartes KPI focus activation (STEP 8)
En haut du dashboard, 7 chiffres 30j : Leads / SMS Delivered / Landing Visits / Alex Starts / Signups / Checkouts / **Paid Activations** (mis en évidence). Source unique = `funnel-debug-leads` agrégé.

## Corrections automatiques (quand possible)
Dans le dashboard, pour chaque `first_break` détecté par lead, bouton "Corriger" :
- `sms_queued` >10min → requeue via `acq-sms-send`.
- `signup_completed` sans `checkout_opened` → relance `launch-agent-checkout-sender`.
- `payment_completed` sans `account_activated` → relance `launch-agent-activation`.
Chaque action journalisée dans `platform_operation_outcomes`.

## Fichiers

**Nouveaux**
- `supabase/migrations/*_conversion_truth.sql` — `lead_funnel_sessions` + `sms_templates` + view `v_sms_variant_stats`.
- `supabase/functions/conversion-truth-dashboard/index.ts` — agrège leads + KPIs + blocker principal + variant stats.
- `supabase/functions/conversion-tracking-audit/index.ts` — détection `TRACKING_MISMATCH`.
- `supabase/functions/get-lead-preview/index.ts` (si nécessaire pour prefill public).
- `src/pages/admin/AdminConversionTruth.tsx` + `src/hooks/useConversionTruth.ts`.
- `src/components/admin/conversion/` : `BlockerBanner`, `KpiRow`, `LeadTruthRow`, `TrackingMismatchCard`, `VariantStatsCard`, `AutoFixButton`.

**Édités**
- `supabase/functions/acq-sms-send/index.ts` — sélection variant + log variant_id.
- Landing SMS existante (`/pro/:slug` ou équivalent) — instrumentation `lead_funnel_sessions` + émission explicite `link_clicked` / `landing_view` / `cta_clicked` si manquants + bloc prefill.
- `supabase/functions/funnel-debug-run-test/index.ts` — retour `first_failure_point` normalisé.
- `src/app/router.tsx` — route `/admin/conversion-truth` (guard admin).

## Critère de succès
1. Le bandeau montre un blocker unique et actionnable.
2. Le test "Tester Funnel Réel" désigne l'étape exacte qui casse.
3. Après correction, un vrai entrepreneur atteint `account_activated` payé 1$.

## Hors périmètre
Aucune modif d'UI publique au-delà de l'instrumentation. Pas de nouveau design admin (réutilise composants shadcn existants). Pas d'IA supplémentaire.
