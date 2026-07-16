# PHASE 2 — System Integrity Engine

Objectif : UNPRO s'auto-audite en permanence et n'affiche que des états vérifiés. Identifier exactement où le tunnel se bloque entre Scraping → SMS → Clic → Compte → Paiement 1 $ → Activation → Rendez-vous.

---

## 1. Verification Status Engine

Table `contractor_verification_status` (une ligne par entrepreneur) avec pour chaque dimension un statut `verified | partial | missing` + `last_checked_at` + `evidence jsonb` :

- `identity` — nom légal vs saisi
- `rbq` — API Régie du bâtiment (active / expire < 60j / invalide)
- `neq` — Registraire des entreprises (confirmé / introuvable / invalide)
- `website` — HTTP 200 + contenu scrappé
- `google_business` — Place ID + rating + reviews
- `reviews_imported` — count vs source
- `photos` — count ≥ 10 / 1-9 / 0
- `insurance` — document uploadé + validé humain

Edge function `verification-status-refresh` (cron horaire + on-demand) recalcule chaque dimension à partir de sources réelles. Aucun fallback simulé — si la source échoue, statut reste `unknown` avec `FailureCode.SOURCE_UNAVAILABLE`.

Composant `<VerificationBadgeStack contractorId>` remplace toutes les pastilles "Vérifié" hardcodées dans le profil entrepreneur, l'admin et l'affichage propriétaire.

## 2. Business Analysis Engine

Edge function `business-analysis` appelée par Alex et par le refresh :

Calcule 7 signaux (présence web, réputation, complétude profil, cohérence données, couverture géo, qualité contenu, ancienneté) → stocke dans `contractor_business_analysis` avec `found[]`, `missing[]`, `recommended_actions[]`.

Component `<BusinessAnalysisPanel>` affiche uniquement les champs réellement calculés. Si donnée absente → « Non disponible » (jamais de placeholder).

## 3. System Integrity Monitor — `/admin/system-integrity`

Nouvelle page admin avec 6 cartes temps réel alimentées par des vues SQL sur `platform_operation_outcomes` (dernières 24 h) :

- **Scraping** — trouvées / rejetées / validées
- **SMS** — envoyés / livrés / échoués / taux
- **Email** — envoyés / ouverts / cliqués / échecs
- **Onboarding** — visites / comptes / essais 1 $ / conversions
- **Stripe** — paiements OK/KO, webhooks reçus vs attendus
- **Matching** — demandes / compatibles / rendez-vous créés

Chaque carte a un état `healthy | degraded | down` basé sur seuils configurables (`system_integrity_thresholds`).

## 4. Global Health Score

Vue `v_system_health_score` : moyenne pondérée des 6 cartes → 0-100.

- 90-100 vert · 70-89 jaune · 0-69 rouge

Widget `<SystemHealthBadge>` en header admin. Historique 30 j dans `system_health_snapshots` (cron horaire).

## 5. Auto-Repair Engine

Edge function `auto-repair-tick` (cron `0 * * * *`) :

- Ping Twilio, Resend, Stripe, edge functions clés, cron jobs
- Sur échec → tentative réparation via `withRetry` (déjà en place)
- Journalise dans `auto_repair_attempts` (succès / échec / raison)
- Si irréparable → insert dans `automation_blockers` + SMS admin (via `admin_sms_recipients` déjà créé)

Cockpit dans `/admin/system-integrity` liste les tentatives et blockers ouverts.

## 6. First 1 $ Tracker

Widget permanent en haut de `/admin/system-integrity` et `/admin/launch-war-room` :

Étapes suivies via `platform_operation_outcomes` filtrées par première conversion :

```text
[ ] Prospect identifié
[ ] SMS livré
[ ] Clic
[ ] Compte créé
[ ] Paiement 1 $
[ ] Profil activé
[ ] Première demande compatible
[ ] Premier rendez-vous
```

Chaque étape affiche l'ID du premier lead qui l'a atteinte et l'horodatage (America/Toronto). Étape bloquante mise en évidence avec la `FailureCode` la plus fréquente.

## 7. No Fake Data Policy

Ajout d'un lint `content-guard/no-fake-verified.ts` qui interdit les chaînes hardcodées "Vérifié", "Analysé", "Compatible" dans les composants d'affichage entrepreneur/propriétaire hors du `<VerificationBadgeStack>`. Scan CI → `ui_accessibility_audit`-style table `content_integrity_audit`.

Tous les composants existants affichant un statut sans source réelle sont convertis :
- `EntrepreneurProfileHeader` → utilise `contractor_verification_status`
- `SmartRecommendationCard` (compat) → n'affiche score que si `compatibility_memory` a du signal réel
- Cartes appointments → « Aucun rendez-vous disponible » si `bookings` vide

---

## Détails techniques

**Migrations** (une seule) :
- Tables : `contractor_verification_status`, `contractor_business_analysis`, `system_integrity_thresholds`, `system_health_snapshots`, `auto_repair_attempts`, `content_integrity_audit`
- Vues : `v_pipeline_scraping_health`, `v_pipeline_sms_health`, `v_pipeline_email_health`, `v_pipeline_onboarding_health`, `v_pipeline_stripe_health`, `v_pipeline_matching_health`, `v_system_health_score`, `v_first_paid_contractor_funnel`
- GRANT authenticated (via `has_role(admin)`) + service_role
- RLS : admin only pour tables integrity ; contractor peut lire son propre `verification_status`

**Edge functions** :
- `verification-status-refresh` (cron 0 * * * * + on-demand)
- `business-analysis` (on-demand par Alex/admin)
- `auto-repair-tick` (cron 0 * * * *)
- `system-integrity-snapshot` (cron 0 * * * *)

Toutes utilisent `_shared/reliability.ts` (FailureCode, reportOutcome) et `_shared/timezone.ts` pour les timestamps.

**Frontend** :
- `src/pages/admin/PageAdminSystemIntegrity.tsx`
- `src/features/systemIntegrity/` : `VerificationBadgeStack`, `BusinessAnalysisPanel`, `SystemHealthBadge`, `First1DollarTracker`, `AutoRepairFeed`, `IntegrityCard`
- Hook `useSystemIntegrity()` (React Query, 30 s refetch + Realtime sur `platform_operation_outcomes`)
- Entrée dans `src/config/adminNav.ts` sous cluster "System"

**Politique No-Fake** : nouveau règle `content-guard/rules.ts` — CI bloque les libellés interdits hors composants whitelistés.

---

## Critères de succès

- `/admin/system-integrity` charge en < 2 s et reflète les 6 pipelines en temps réel
- Aucun composant public n'affiche « Vérifié » sans ligne correspondante dans `contractor_verification_status` avec `status = 'verified'`
- Le tracker Premier 1 $ montre l'étape actuelle de blocage avec la `FailureCode` dominante
- `auto-repair-tick` produit au moins une tentative journalisée par heure ; un incident Twilio/Stripe simulé déclenche un blocker + SMS admin
- Lint CI échoue sur toute nouvelle chaîne hardcodée "Vérifié / Analysé / Compatible" hors whitelist
- Score `v_system_health_score` visible en header admin, code couleur exact

## Hors périmètre (phases suivantes)

- Import automatique documents assurance (OCR) — Phase 3
- Analyse concurrentielle des sites web (SEO comparatif) — Phase 3
- Auto-répartition intelligente des rendez-vous — Phase 4
