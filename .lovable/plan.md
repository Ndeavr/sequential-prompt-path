# Module Affiliés UNPRO — CRM de recrutement complet

## Objectif
Transformer le module Affiliés actuel (~20% fonctionnel) en véritable CRM de recrutement où chaque affilié gère 25 prospects/jour avec SMS perso 1-clic, pipeline complet, commissions temps réel — et où l'admin pilote assignations, performance et paiements.

---

## Phase 1 — Fondations données & attribution

### DB migration
- `affiliates` : compléter avec `phone`, `email`, `primary_city`, `service_radius_km`, `allowed_categories[]`, `commission_pct`, `commission_flat_cents`, `status` (active/suspended/training), `admin_notes`.
- `affiliate_assignment_rules` (nouveau) : règles `city + category → affiliate_id` avec priorité et fallback round-robin.
- `contractor_leads` : garantir `assigned_affiliate_id`, `contact_status` enum (`to_contact`, `personal_sms_sent`, `unpro_sms_sent`, `email_sent`, `called`, `whatsapp_sent`, `opened`, `clicked`, `signup_started`, `account_created`, `trial_1dollar`, `subscribed`, `first_appointment`, `not_interested`, `callback_later`), `last_contacted_by`, `last_contacted_at`, `next_follow_up_at`, `personal_sms_sent_at`.
- `affiliate_lead_events` (nouveau) : journal typé (`personal_sms_opened`, `personal_sms_confirmed_sent`, `personal_sms_not_sent`, `call_initiated`, `unpro_sms_dispatched`, `email_sent`, `status_changed`, `note_added`) avec `affiliate_id`, `lead_id`, `payload jsonb`.
- `affiliate_message_templates` (nouveau) : variantes personnelles (directe / chaleureuse / suivi) + modèles enregistrés par affilié.
- `affiliate_commissions` : vérifier colonnes `plan_slug`, `sale_cents`, `commission_cents`, `state` (earned/approved/paid/pending), `stripe_payout_id`, `period`.
- `affiliate_applications` : formulaire candidature (nom, téléphone, région, expérience, références, `status` en_attente/accepté/refusé).

GRANT + RLS : affiliés voient uniquement leur périmètre ; admin voit tout ; `service_role` pour edge functions.

---

## Phase 2 — Assignation intelligente

- Edge function `assign-leads-to-affiliates` : batch quotidien qui matche `contractor_leads` non assignés selon `affiliate_assignment_rules` (ville → catégorie → langue → performance). Fallback round-robin.
- Bouton admin "Assigner 25 leads du jour" dans `/admin/affiliates`.
- Champ `daily_quota` par affilié (défaut 25).

---

## Phase 3 — War Room affilié (le cœur mobile)

### `/affiliate/war-room` — vue Aujourd'hui
- **Top bar** : "25 prospects à contacter · Semaine : 132 · Commissions du mois : 978 $" (chiffres réels).
- **Liste prospects** (cartes) triée par `next_follow_up_at` / priorité, chaque carte contient :
  - Entreprise, ville, catégorie, badge statut, commission potentielle.
  - **Boutons 1-clic** (mobile-first) :
    - `SMS perso` (principal, gros)
    - `Appeler`
    - `SMS UNPRO` (Twilio)
    - `Email`
    - `WhatsApp` (via `wa.me` deep link, pas Twilio)
    - `Copier numéro` · `Copier message`
  - Menu statut rapide : Pas intéressé / Rappeler / Inscrit / Payé 1$ / Premium.

### SMS perso — flux exact demandé
1. Clic ouvre `<PersonalSmsSheet>` (drawer léger) avec :
   - Aperçu message rempli avec vraies données (`{{prenom}}`, `{{affiliate_first_name}}`, `{{company_name}}`, `{{city}}`, `{{personal_activation_link}}`). Si donnée manquante → reformulation naturelle serveur, jamais de placeholder visible.
   - 3 variantes : Directe / Chaleureuse / Suivi.
   - Éditeur inline + compteur de caractères + validation du lien.
   - Bouton "Enregistrer comme modèle".
2. Clic "Ouvrir SMS" → log `personal_sms_opened` puis navigate `sms:+1XXXXXXXXXX?body=<encoded>`.
3. Retour appli → confirmation "Application SMS ouverte. Confirmez après l'envoi." avec `Envoyé` / `Non envoyé` / `Modifier`.
4. `Envoyé` → `contact_status = personal_sms_sent`, `last_contacted_by = affiliate_id`, `next_follow_up_at = now + 24h`, event `personal_sms_confirmed_sent`.
5. Jamais de statut "envoyé" sans confirmation humaine.

### Desktop
- Sur `sm+` : afficher QR code du deep link `sms:` pour scan sur téléphone + boutons "Copier numéro" et "Copier message" + option "Envoyer via UNPRO (Twilio)".

### FAB
- Bouton flottant `+ Prospect` (déjà en place) reste, plus filtre statut en haut.

---

## Phase 4 — Pipeline & vue entrepreneur

### `/affiliate/pipeline`
Colonnes Kanban : Nouveau → SMS envoyé → Ouvert → Cliqué → Inscription → Compte → Essai 1$ → Abonné → 1er rendez-vous. Drag mobile-friendly (menu statut si trop petit).

### `/affiliate/leads/:id`
Onglets :
- **Entreprise** : nom, site, téléphone, email, ville, RBQ, NEQ, Google rating, avis, source.
- **Acquisition** : timeline SMS/Email/Appels (dates, ouvert, cliqué), messages envoyés, historique complet des events.
- **Onboarding** : compte créé, paiement 1$, profil complété, plan actuel, MRR.
- **Notes** : notes affilié + rappels.
- **Commission** : plan projeté, commission estimée, statut earned/approved/paid.

---

## Phase 5 — Commissions & paiements

### `/affiliate/commissions`
- Tableau plans : Recrue 0 · Pro 349→70 · Premium 599→120 · Élite 999→200 · Signature 1799→360.
- Résumé mois : ventes, revenus, commissions.
- Liste par état : Gagnée / Approuvée / Payée / En attente.
- Export CSV, Stripe payout ref, format QuickBooks.

### `/admin/affiliates/payouts`
- Admin approuve, marque payé, lance payout Stripe Connect (stub si pas encore branché).

---

## Phase 6 — Documents, application, leaderboard

- `/affiliate/documents` : PDF présentation, scripts SMS/appel, FAQ, argumentaire (upload admin).
- `/affiliate/apply` (public) : formulaire candidature → `affiliate_applications`. Admin voit `/admin/affiliates/applications` (accepter/refuser).
- `/affiliate/leaderboard` : top affiliés du mois (opt-in privacy).
- `/affiliate/settings` : profil, préférences messages, disponibilité.

---

## Phase 7 — Admin cockpit `/admin/affiliates`

- KPI globaux : affiliés actifs, prospects assignés, SMS envoyés, conversions, revenus, commissions dues.
- Table affiliés avec toutes métriques (contactés, inscrits, payants, revenus, commission due).
- Actions : suspendre, réassigner leads, changer commission, envoyer message interne.
- Vue "Règles d'assignation" éditable.
- Vue "Applications" en attente.
- Vue "Payouts" à approuver.

---

## Détails techniques

### Composants clés (nouveaux)
- `src/features/affiliate/warRoom/LeadCard.tsx` (avec boutons 1-clic)
- `src/features/affiliate/warRoom/PersonalSmsSheet.tsx` (éditeur + variantes + QR desktop)
- `src/features/affiliate/warRoom/QuickStatusMenu.tsx`
- `src/features/affiliate/pipeline/PipelineBoard.tsx`
- `src/features/affiliate/leads/LeadDetailTabs.tsx`
- `src/features/affiliate/commissions/CommissionsTable.tsx`
- `src/features/affiliate/messages/messageBuilder.ts` (rendu message avec fallback si donnée manquante)
- `src/features/affiliate/messages/variants.ts` (directe / chaleureuse / suivi)

### Hooks
- `useAffiliateWarRoom(affiliateId)` — leads du jour, quotas, stats.
- `useLeadActions(leadId)` — mutations statut + logging events.
- `useCommissionsSummary(affiliateId, period)`.

### Edge functions
- `assign-leads-to-affiliates` (batch quotidien + on-demand admin).
- `affiliate-log-event` (event générique typé, sécurisé RLS + service role).
- `affiliate-send-unpro-sms` (Twilio, respecte consent + guardrails).
- `render-personal-sms` (compose message côté serveur avec vraies données, retourne texte final + lien).
- `affiliate-payout-approve` (admin).

### Reliability
- Tous les events passent par `reportOutcome()` (`achieved`, `blocked`, `partial`, `failed`) avec `FailureCode` (`MISSING_PHONE`, `MISSING_CONSENT`, `DUPLICATE_SEND_WINDOW`, `TWILIO_ERROR`, etc.).
- Aucune donnée fictive : si téléphone absent → SMS perso désactivé avec tooltip "Numéro manquant".
- Statut `personal_sms_sent` uniquement après confirmation humaine explicite.

### Attribution message
- `personal_activation_link` = URL courte `unpro.ca/e/:leadId?ref=:affiliateCode` avec tracking cookie 30j.
- Événements landing/signup rattachés à `assigned_affiliate_id` via referral code.

---

## Découpage livraison

**Sprint 1 (immédiat)** : Migration DB + War Room v2 avec SMS perso 1-clic complet (variantes, confirmation, events, QR desktop) + LeadCard boutons rapides. C'est le nerf de la guerre pour Lorraine.

**Sprint 2** : Pipeline Kanban + vue entrepreneur détaillée + assignation intelligente batch.

**Sprint 3** : Commissions/paiements + documents + application + leaderboard.

**Sprint 4** : Admin cockpit complet (métriques, règles, payouts, applications).

---

## Critères de succès
- Lorraine ouvre `/affiliate/war-room` sur mobile → voit 25 prospects du jour, appuie `SMS perso`, application SMS native s'ouvre avec bon numéro + message rempli, confirme envoi, statut mis à jour.
- Aucun placeholder `{{...}}` jamais envoyé.
- Aucun statut "envoyé" sans confirmation humaine.
- Admin sur `/admin/affiliates` voit temps réel : affiliés actifs, prospects assignés, SMS envoyés, conversions, revenus, commissions.
- Chaque affilié voit uniquement ses données (RLS strict).
- Cycle prospect complet traçable : assignation → SMS → clic → compte → 1$ → abonnement.
