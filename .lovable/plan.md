# CRM — Liste « À contacter manuellement »

Objectif : pouvoir aujourd'hui sélectionner les meilleurs prospects réels, les appeler nous-mêmes ou les déléguer à un affilié, et fermer le premier 1 $. Extension minimale de la console CRM existante — aucun CRM parallèle.

## 1. Ce qui existe déjà et sera réutilisé

- `v_crm_prospects` / `v_crm_next_action` : source unique par prospect (entreprise, ville, catégorie, téléphone E164, courriel, site, RBQ, GBP, étape funnel, score de priorité, santé, probabilité d'activation, valeur estimée, `next_best_action`, `blocked_reason`, `opted_out`, historique SMS/courriel, clics, paiement).
- `verified_contractor_prospects` : table de vérité des prospects qualifiés (statut d'outreach, éligibilité téléphone/CASL).
- `crm_action_log` (audit idempotent), `crm_prospect_notes`, `crm_prospect_tags`.
- Edge function `crm-recovery-action` : dispatcher unique déjà branché sur les envois existants (retry_sms, second_sms, send_email, payment_email, resume_checkout / new_checkout, schedule_followup, pause, archive, tag, note) avec garde d'idempotence et respect des opt-out.
- `affiliates` (quotas, territoires, catégories permises, compteurs de performance), `affiliate_assignments` (affiliate_id, prospect_id, status, priority, assigned_at, last_activity_at, won_at, lost_reason, recommended_plan_slug) avec RLS déjà correcte : admin = tout, affilié = `is_affiliate_owner(affiliate_id)` en lecture/écriture de ses lignes uniquement.
- `affiliate_activation_links` (attribution d'activation par affilié) et `affiliate_commissions` / `affiliate_conversions` pour la commission future.
- UI : `/admin/crm` (`PageAdminCRM` + `CrmProspectDrawer` + `useCrmOperations`), `/admin/affiliates/assign`, `/affiliate` (War Room).
- Automatisation existante (`crm-automation-tick`, `send-verified-batch`, garde 24 h anti-doublon) : inchangée.

## 2. Changements de schéma (minimum strict)

Une seule migration, aucune table CRM nouvelle en double :

1. `affiliate_assignments` — colonnes ajoutées :
   - `owner_user_id uuid` (assignation à un admin/soi-même ; `affiliate_id` devient nullable)
   - `queue text default 'manual_contact'`
   - `next_action text`, `due_at timestamptz`, `attempts int default 0`
   - `last_outcome text`, `last_outcome_at timestamptz`, `objection text`
   - Index unique partiel : un seul assignement actif par prospect
     `unique (prospect_id) where status in ('assigned','in_progress')` → empêche la double assignation simultanée.
   - Contrainte : `affiliate_id is not null or owner_user_id is not null`.
2. Nouvelle table `crm_contact_outcomes` (journal d'appel structuré, une ligne par tentative) : `assignment_id`, `prospect_id`, `actor_id`, `channel` (call/sms/email/other), `outcome` (enum textuel ci-dessous), `objection`, `note`, `next_action`, `due_at`, `created_at`. GRANT authenticated/service_role ; RLS : admin tout, affilié uniquement sur ses assignements.
   - Outcomes : `interested`, `follow_up`, `not_now`, `no_value_understanding`, `no_trust`, `price_objection`, `wants_guaranteed_appointments`, `buys_leads_elsewhere`, `checkout_issue`, `activated`, `not_interested`, `invalid_contact`.
   - Terminaux : `activated`, `not_interested`, `invalid_contact` → clôturent l'assignement. Tous les autres exigent `next_action` + `due_at` (contrainte CHECK) → exactement une prochaine action par prospect non terminal.
3. Vue `v_manual_contact_queue` : jointure `v_crm_next_action` × `affiliate_assignments` (actif) × dernier outcome + éligibilité CASL/contact et liens calculés (profil `/pro/:slug`, activation `/unpro/activate/:token` si un token existe déjà). Aucun envoi déclenché par la vue.
4. Vue `v_affiliate_workload` : par affilié — assignés, en cours, en retard (`due_at < now()`), contactés, activations, revenu attribué.
5. RLS lecture affilié sur les prospects : fonction `security definer` `affiliate_can_see_prospect(uuid)` + politique de lecture sur `v_manual_contact_queue` exposée via une fonction RPC `manual_queue_for_me()` (l'affilié ne voit que ses lignes assignées ; aucune vue publique de tous les prospects).

## 3. Routes / composants / fonctions à modifier

- `/admin/crm` : nouvel onglet « À contacter manuellement » dans `PageAdminCRM` (pas de nouvelle page admin) :
  - Table triée par score de priorité × valeur estimée, filtres (ville, métier, étape, éligibilité CASL, propriétaire, en retard, sans propriétaire), recherche.
  - Sélection multiple → **Assigner à moi** / **Assigner à un affilié** (liste filtrée par territoire + catégories permises + quota restant).
  - Colonnes demandées : entreprise, contact, téléphone, courriel, métier, ville, score, source, éligibilité CASL, dernier contact, étape, plan recommandé, lien profil, lien 1 $, propriétaire, prochaine action, échéance, tentatives, dernier résultat.
  - Panneau « Charge & performance affiliés » (`v_affiliate_workload`) + bouton **Récupérer les prospects en retard**.
- `CrmProspectDrawer` : bloc « Contact manuel » — boutons **APPELER** (`tel:`), **SMS**, **COURRIEL**, **OUVRIR PROFIL**, **ENVOYER LIEN 1 $** ; formulaire de résultat structuré (outcome, objection, note, prochaine action, échéance).
- Nouveau composant partagé `ManualContactPanel` réutilisé par l'admin et l'affilié (aucune duplication).
- `/affiliate` (War Room) : onglet « Mes prospects » alimenté par `manual_queue_for_me()`, mêmes actions, mêmes journaux.
- Edge function : **extension** de `crm-recovery-action` avec les actions `assign`, `reassign`, `unassign`, `log_outcome`, `manual_sms`, `manual_email`, `send_activation_link`. Les envois passent par les chemins existants (mêmes gates CASL, opt-out, garde 24 h). Toute action écrit dans `crm_action_log` (`source: 'manual_admin' | 'manual_affiliate'`).
- Notification d'assignation : réutilise l'infrastructure courriel sortante existante (un courriel à l'affilié à l'assignation, `source: 'assignment_notification'`).
- Attribution : à l'activation 1 $, le webhook Stripe existant lie déjà le prospect ; on ajoute la copie de `affiliate_id` de l'assignement actif vers `affiliate_conversions` / `affiliate_commissions` (structures existantes) — aucune logique de paiement nouvelle.

## 4. Migration / backfill

- Migration unique (colonnes + table outcomes + vues + RLS + GRANTs).
- Backfill : aucun prospect fictif. Remplissage initial de la file par requête sur données réelles — prospects avec téléphone valide ou courriel, non opt-out, non payés, `priority_score` élevé (cliqué non payé, livré sans clic, courriel livré), limité aux 100 meilleurs, insérés comme `status='unassigned'` dans la file (assignement créé seulement au moment de l'assignation réelle).
- Aucune modification des crons ni de `send-verified-batch`.

## 5. Tests bout en bout

1. Admin ouvre `/admin/crm` → onglet manuel affiche des prospects réels triés par priorité, avec éligibilité CASL correcte.
2. Assignation à soi puis à un affilié → une seule ligne active ; tentative de double assignation refusée par l'index unique.
3. Affilié se connecte → voit uniquement ses prospects ; tentative de lecture d'un prospect non assigné refusée par RLS.
4. Appel → journalisation d'un outcome `follow_up` → prochaine action + échéance obligatoires ; tentatives incrémentées.
5. Outcome terminal `not_interested` → assignement clos, prospect sort de la file.
6. **Envoyer lien 1 $** → réutilise `create-activation-checkout`, produit un lien réel cliquable ; second clic le même jour → ignoré (idempotence), consigné.
7. Prospect en retard → bouton admin de récupération réassigne et notifie.
8. Régression : `crm-automation-tick` et la garde 24 h envoient exactement comme avant (vérification des logs avant/après).

## 6. Critères de complétion

- File « À contacter manuellement » alimentée par de vraies données de production, triée par valeur.
- Admin peut assigner/réassigner/récupérer ; affilié voit et travaille uniquement ses prospects.
- Les cinq actions un clic fonctionnent et sont journalisées, sans contourner CASL/opt-out.
- Chaque prospect non terminal a exactement une prochaine action et une échéance.
- Zéro double assignation, zéro double envoi.
- Attribution d'une activation 1 $ à l'affilié visible dans le tableau de charge.
