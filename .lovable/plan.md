## Acquisition Machine — End-to-End Critical Path Audit

Objectif: valider chaque étape du tunnel d'acquisition entrepreneur avec des **chiffres réels**, identifier les fuites, et exécuter un test live "prospect réel" de bout en bout. Aucun changement de messaging tant que la machine n'est pas prouvée fonctionnelle.

---

### Phase 1 — Audit Données (lecture seule, ~10 min)

Pour chaque étape, requête SQL réelle sur la prod + capture du chiffre dans un nouveau cockpit admin `/admin/critical-path-audit`.

**Étape 1 — Prospect Found**
- `contractor_prospects` 7j: total scrappés, % avec RBQ valide, NEQ valide, téléphone valide (mobile vs fixe via `phone_carrier_cache`), email valide, % déjà contactés (`contractor_outreach_logs`).
- Sortie: tableau `scraped → enriched → validated → contactable`.

**Étape 2 — SMS / Email Sent (24h)**
- `contractor_outreach_logs` + `contractor_curiosity_sms_events` + `evenements_sms`: queued / sent / delivered / failed / landline_detected / email_fallback_sent.
- Identifier les SMS partis vers des fixes (Twilio error 30006).

**Étape 3 — Link Clicked**
- `outreach_open_events`, `outreach_click_events`, `pro_landing_views`, `landing_visits`: ratio délivré → ouvert → cliqué → page vue.
- Diagnostic: si clics ~0 → problème message. Si clics OK mais pas de "Alex started" → problème landing.

**Étape 4 — Alex Auto-Start**
- `alex_conversation_sessions` filtrés par `entry_surface = contractor_landing`: % sessions démarrées dans les 2s après `pro_landing_views`.
- Vérifier dans le code `src/pages/pro/...` que `auto_start_enabled` est ON pour le slug landing.

**Étape 5 — Analysis Completes (100%)**
- `contractor_aipp_jobs`: % terminés à 100% vs 95/90/échec silencieux par sous-étape (company_search, website, reviews, RBQ, profile_generation).
- Lister les `failure_code` les plus fréquents via `platform_operation_outcomes`.

**Étape 6 — Payment Works**
- `pricing_checkout_sessions` + `pricing_payment_events` + `contractor_profiles.is_active`: pour chaque `paid`, vérifier (a) profile activated (b) status changé (c) email envoyé (d) dashboard accessible.
- Lister les paiements "orphelins" (payé mais non activé).

**Étape 7 — Immediate Reward (60s)**
- `contractor_aipp_scores`: % de profils payés ayant un score affiché < 60s après activation.
- Vérifier que la page post-paiement montre score + blocage principal + estimation rendez-vous.

---

### Phase 2 — Cockpit `/admin/critical-path-audit`

Page admin unique, mobile-first, dark theme, 7 cartes verticales (une par étape). Chaque carte:
- Chiffre principal (ex: 92/100 délivrés)
- Conversion vers l'étape suivante (%)
- Top 3 raisons d'échec (failure_code)
- Bouton "Drill down" → drawer avec 20 derniers événements

En-tête: funnel global compact `Scrapés → Validés → Envoyés → Cliqués → Alex → Analyse 100% → Payés → Activés` avec taux de conversion entre chaque.

Alerte rouge automatique si une étape < 50% de conversion.

---

### Phase 3 — Live Walkthrough (test prospect réel)

Edge function `critical-path-live-test` qui exécute et logue chaque étape avec timestamps:

1. Crée un prospect de test (RBQ + NEQ + mon numéro mobile réel fourni)
2. Déclenche l'envoi SMS via la séquence Curiosité (step 1 uniquement)
3. Capture: `sent_at`, `delivered_at` (webhook Twilio), URL générée
4. Attend le clic réel (humain) → logue `clicked_at`, `landing_viewed_at`
5. Vérifie Alex auto-start dans les 2s → `alex_started_at`
6. Suit l'analyse → `analysis_completed_at` + % atteint
7. Stripe test mode $1 → `paid_at`, `activated_at`, `dashboard_unlocked_at`, `email_sent_at`
8. Vérifie score affiché < 60s

Résultat stocké dans nouvelle table `critical_path_test_runs` (timestamps + status par étape + screenshots des erreurs).

UI: bouton **"Lancer un test live"** sur le cockpit, qui demande téléphone + email du testeur, puis affiche la timeline en temps réel.

---

### Phase 4 — Rapport & Décisions

À la fin du test, le cockpit affiche:
- ✅ / ❌ par étape avec latence mesurée
- Liste priorisée des **bloqueurs critiques** (toute étape < 100% pour le test live)
- Recommandation: corriger bloqueurs avant de toucher au messaging

---

### Détails techniques

**Nouvelles tables**
```sql
critical_path_metrics_snapshot (id, captured_at, stage, value, conversion_rate, top_failures jsonb)
critical_path_test_runs (id, tester_phone, tester_email, started_at, current_stage, stage_timestamps jsonb, errors jsonb, final_status)
```

**Nouvelles edge functions**
- `critical-path-snapshot` (cron 15min): agrège les 7 étapes dans `critical_path_metrics_snapshot`
- `critical-path-live-test`: orchestre le test live, écoute webhooks Twilio/Stripe pour mettre à jour la run

**Nouveaux fichiers UI**
- `src/pages/admin/PageAdminCriticalPathAudit.tsx`
- `src/features/criticalPath/components/StageCard.tsx`
- `src/features/criticalPath/components/FunnelHeader.tsx`
- `src/features/criticalPath/components/LiveTestRunner.tsx`
- `src/features/criticalPath/hooks/useCriticalPathSnapshot.ts`
- `src/features/criticalPath/hooks/useLiveTestRun.ts`

**Webhooks vérifiés**
- Twilio status callback déjà branché? Sinon ajouter dans `sms-curiosity-tick` la mise à jour de `delivered_at`.
- Stripe webhook → `pricing_payment_events` → trigger d'activation déjà en place? À auditer.

**Sécurité**: admin only, RLS via `has_role(auth.uid(),'admin')`, GRANT explicites sur les 2 nouvelles tables.

---

### Hors scope (pour l'instant)
- Aucun changement aux templates SMS Curiosité 12
- Aucun changement aux landing pages ou à Alex
- Aucun changement au pricing ou à Stripe

Le but est de **mesurer avant de modifier**. Toute correction sera proposée dans un plan séparé une fois les fuites identifiées.