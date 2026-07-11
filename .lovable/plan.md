## Objectif

Transformer l'écran `/admin/contractors/create-manual` en activation réellement opérationnelle : un clic doit produire l'état complet d'un abonnement payé (Stripe ou manuel), avec profil publié, matching activé, Alex qui peut recommander, réservation directe possible, et audit complet.

## Diagnostic actuel

- L'edge function `admin-create-contractor-manual` existe et écrit déjà dans `contractors`, `contractor_subscriptions`, `admin_activation_overrides`, `manual_contractor_activations`, `contractor_public_pages`, `contractor_aipp_scores`. **Bases correctes** mais incomplètes.
- Manques critiques :
  1. Pas de `contractor_entitlements` ni de `contractor_matching_status` écrits → matching non garanti.
  2. `payment_status` / `payment_method` / `amount_paid_cents` non stockés sur `contractor_subscriptions` (champs à ajouter).
  3. Pas de recherche de doublons (téléphone/email/legal_name) → risque de doublons.
  4. Pas de rollback si une étape échoue → profils partiellement activés.
  5. AIPP figé côté client (68) au lieu d'être recalculé serveur post-insert.
  6. Toggles = visuels seulement, ne persistent pas de façon fiable.
  7. Pas de confirmation admin ni de résumé pré-activation, pas de bouton avec vérifications complètes.
  8. Écran de succès ne propose pas "Tester dans Alex", "Copier lien", "CRM".
  9. Pas de cron d'intégrité.
  10. Pas de tests E2E.

## Livrables

### A. Migration Supabase (une seule)

1. **`contractor_subscriptions`** — ajouter colonnes si absentes :
   - `payment_status` (`'unpaid'|'paid'|'refunded'`), `payment_method` (`'stripe'|'manual'`), `amount_paid_cents`, `currency`, `activated_by` (uuid admin), `activation_note`, `stripe_subscription_id` (déjà là), `auto_renew`.
2. **`contractor_entitlements`** (créer si absent) — `contractor_id` UNIQUE, `can_receive_appointments`, `can_be_matched`, `public_profile_enabled`, `priority_matching` (`normal|elevated|exclusive`), `verified_badge`, `premium_badge`, `appointment_quota`, `territory_limit`, `valid_until`.
3. **`contractor_matching_status`** (créer si absent) — `contractor_id` UNIQUE, `is_eligible`, `eligibility_reason`, `capacity_status`, `accepting_new_projects`, `last_evaluated_at`.
4. **`manual_payments`** (créer si absent, sinon réutiliser `manual_contractor_activations`) — enregistrement du paiement hors Stripe.
5. **`admin_activation_logs`** (créer si absent) — `contractor_id`, `admin_user_id`, `action`, `status`, `before_state jsonb`, `after_state jsonb`, `error_message`.
6. **Vue `v_contractor_alex_eligible`** — SQL déterministe pour Alex :
   ```
   subscription.status='active' AND payment_status='paid' AND expires_at>now()
   AND entitlements.can_be_matched=true
   AND matching_status.is_eligible=true
   AND contractors.account_status='active'
   ```
   → indépendante de `stripe_subscription_id`.
7. **Fonction SQL `recompute_contractor_aipp(contractor_id)`** — calcul serveur basé sur complétude réelle + retour du breakdown.
8. RLS + GRANT explicites pour toutes les nouvelles tables (`authenticated` read-own, `service_role` all).

### B. Edge function `admin-activate-contractor` (nouvelle, atomique)

Refonte de `admin-create-contractor-manual` sous nom neutre. Traite `contractor_id` optionnel (update-or-create).

Étapes séquentielles, avec **snapshot before / after** et rollback compensatoire en cas d'échec :

1. Vérifie rôle `admin`.
2. Valide payload (Zod).
3. Normalise phone→E.164, website, slug, catégories.
4. Recherche doublons : `phone_e164`, `email`, `legal_name`, `slug`, `business_name`.
5. Upsert `contractors` (status=active, onboarding_status=completed, activation_source=admin_manual).
6. Upsert `contractor_profiles` (public_status=published, published_at=now).
7. Écrit `contractor_service_areas` + `contractor_categories` (dédupliqués).
8. Upsert `contractor_subscriptions` (status=active, payment_status=paid, payment_method=manual, amount_paid_cents, starts_at, expires_at, activated_by, activation_note).
9. Insert `manual_payments` (source=admin_manual_activation, method=manual, status=paid).
10. Upsert `contractor_entitlements` selon plan + toggles réels.
11. Upsert `contractor_matching_status` (is_eligible=true si toggle+plan OK).
12. Appelle `recompute_contractor_aipp(contractor_id)` → écrit dans `contractor_aipp_scores` (jamais 68 forcé).
13. Écrit `contractor_public_pages`.
14. Insert `admin_activation_logs` avec before/after.
15. Retourne `{ ok, contractor_id, slug, public_url, expiry_date, aipp_score, entitlements, matching }`.

En cas d'erreur à toute étape : rollback des inserts précédents (via `contractor_id`), log erreur dans `admin_activation_logs`, réponse 500 explicite.

### C. UI `PageAdminCreateContractorManual` — refonte finale

1. **Séparer les dimensions** : Catégories métier (Peinture, Plâtrage, Gypse, Après sinistre) vs. Types de clientèle (Résidentiel, Commercial, Condo refresh) — deux champs distincts.
2. **Section "Paiement manuel"** : montant réellement payé (input), devise (CAD), date paiement, durée accordée (1 mois / 3 mois / 6 mois / 1 an), date expiration calculée, note.
3. **Toggle "Priorité matching"** remplace "Prioritaire matching" par select `normal|elevated|exclusive`.
4. **Vérification obligatoire** : checkbox `"Je confirme que le paiement a été reçu et que les informations ont été vérifiées."` — désactive le bouton tant que non cochée.
5. **Bouton final unique** : `Activer et publier l'entrepreneur`. Désactivé si champs requis manquants (nom, phone E.164 valide, ville, ≥1 catégorie, plan, expiration, confirmation cochée).
6. **Modale de résumé pré-activation** avec toutes les valeurs finales avant appel edge function.
7. Appelle `admin-activate-contractor` (remplace `admin-create-contractor-manual`).
8. **Écran de succès enrichi** :
   - Statuts : profil publié, abonnement payé, plan, expiration, matching admissible, RDV activés, Alex peut recommander.
   - Actions : Voir profil public · **Tester dans Alex** (ouvre `/admin/alex-test?contractor=<id>&city=<city>&category=<cat>`) · Voir fiche CRM · Copier lien public · Envoyer accès (envoi email/SMS à l'entrepreneur).
9. AIPP live (client) reste un **estimé** — remplacé par la valeur serveur au retour.

### D. Alex — moteur de recommandation

- Remplacer tout filtre implicite `stripe_subscription_id IS NOT NULL` par la vue `v_contractor_alex_eligible` (audit rapide : la codebase actuelle ne filtre pas sur Stripe directement, mais on sécurise via la vue).
- Ajouter un edge function `admin-test-alex-recommendation` : entrée `{contractor_id, city, category, project_type}` → renvoie inclusion/exclusion + raison (score, capacité, langue, disponibilité, vérification).

### E. Réservation directe

- Après activation, si aucun `appointment_slot` : proposer dans l'UI admin un bouton "Générer 4 semaines de disponibilité (Lun–Ven 9h–17h)" pour amorcer.
- Si aucun slot au moment où homeowner réserve : créer `appointment_request_pending` (table existante ou nouvelle) et notifier l'entrepreneur — jamais renvoyer vers "parler avec UNPRO".

### F. Cron `verify-contractor-activation-integrity`

Edge function schedulée quotidiennement via `pg_cron` + `pg_net` (via `supabase--insert`, pas migration). Détections + réparations documentées :

- abonnement payé + entrepreneur inactif → réactive.
- profil public activé mais page absente → régénère.
- droits incohérents avec plan → aligne.
- expiration dépassée + matching actif → désactive matching + badge.
- paiement manuel sans audit → log alerte.
- doublons slug/phone → alerte admin.

Insertions dans `admin_activation_logs` + notifications critiques dans `admin_notifications`.

### G. Tests E2E (Playwright)

Fichier `tests/admin-activation.spec.ts` :

1. Nouvelle activation Jean Edouard Fanfan → vérifie 6 tables.
2. Ré-activation même téléphone → pas de doublon.
3. Aucun appel Stripe fait.
4. Alex retourne le contractor comme candidat.
5. Réservation d'un créneau → `appointments` inséré.
6. Simuler `expires_at` passé → job cron désactive matching.
7. Injecter erreur à l'étape 8 → rollback des étapes 5-7.

## Détails techniques

- La transaction "atomique" côté edge = séquence avec table de rollback compensatoire (les fonctions Deno ne peuvent pas ouvrir de transaction PG multi-statements sans SQL function). Alternative : envelopper toutes les écritures dans une **fonction plpgsql `admin_activate_contractor(payload jsonb)`** appelée depuis l'edge → transaction PG native. **Décision : plpgsql pour l'atomicité vraie.**
- Edge function ne fait que : auth admin + validation Zod + `supabase.rpc('admin_activate_contractor', {payload})` + retour formaté.
- Toutes tables nouvelles suivent le contrat `CREATE TABLE → GRANT → ENABLE RLS → CREATE POLICY`.
- Aucun secret client. `SUPABASE_SERVICE_ROLE_KEY` reste serveur.

## Critère de succès

Scénario complet reproductible :
1. Remplir Jean Edouard Fanfan → cocher confirmation → cliquer "Activer et publier".
2. Modale résumé → confirmer.
3. Écran succès affiche 6 vérifications vertes.
4. `/pro/jean-edouard-fanfan` accessible publiquement.
5. `admin-test-alex-recommendation` avec `{city: "Montréal", category: "peinture"}` → renvoie Jean Edouard avec raison.
6. Homeowner peut réserver un créneau → `appointments` récupérable.
7. `admin_activation_logs` contient before/after complet.

## Hors scope

- Refonte du dashboard `/admin/contractors` (liste).
- UI mobile de l'entrepreneur activé.
- Envoi automatique Stripe pour renouvellement post-expiration.