
# Tunnel SMS → Vente 1 $ — Câblage complet

Objectif : un prospect scrapé passe scraping → SMS → clic → page personnalisée → édition → checkout 1 $ → webhook → profil activé → recommandable, sans intervention manuelle et sans page morte.

Base existante réutilisée (aucun doublon créé) :
- Tables : `prospects` (source), `outreach_campaigns`, `outreach_recipients`, `outreach_messages`, `outreach_click_events`, `outreach_page_events`, `outreach_sms_events`, `contractor_activation_funnel`, `contractor_activation_events`, `contractor_activation_ledger`, `contractors`
- Edge functions : `acq-send-outreach`, `track-outreach-click`, `create-activation-checkout`, `activation-confirm`, `stripe-webhook`, `outreach-repair-messaging`, `solicitation-track`

## 1. Migration — colonnes et statuts manquants

Ajout ciblé, sans nouvelle table :

- `prospects` : `landing_token text unique`, `funnel_status text default 'scraped'`, `funnel_status_updated_at timestamptz`, `contractor_id uuid references contractors(id)`, `activation_paid_at timestamptz`, `recommendable boolean default false`
- `outreach_messages` : `short_link_token text unique`, `clicked_at timestamptz`, `landing_viewed_at timestamptz`
- Nouvelle table légère `prospect_status_transitions` (audit append-only) : `prospect_id`, `contractor_id`, `campaign_id`, `message_id`, `previous_status`, `new_status`, `source`, `metadata jsonb`, `created_at`
- Trigger sur `prospects.funnel_status` → insertion automatique dans `prospect_status_transitions`
- Backfill `landing_token = encode(gen_random_bytes(12),'base64url')` sur prospects existants sans token
- GRANTs + RLS : lecture admin seulement ; insertion par service_role via edge functions
- Enum applicatif (TypeScript) `ProspectStatus` dans `src/types/outreachFunnel.ts` — pas de type Postgres pour rester flexible

## 2. Lien SMS et redirection courte

- Template SMS unique via `acq-send-outreach` : URL courte `https://unpro.ca/r/{short_link_token}` (générée à l'insertion de `outreach_messages`)
- Nouvelle route publique `/r/:token` (page React légère) qui appelle une nouvelle edge `outreach-shortlink-resolve` :
  - Vérifie le token, log `outreach_click_events` + `clicked_at` sur le message, met le prospect en `sms_clicked` s'il ne l'est pas déjà
  - Retourne `{ landing_token }` → redirection 302 côté client vers `/invitation/:landing_token`
- Blocage : tout SMS sortant sans `short_link_token` est refusé par `acq-send-outreach`

## 3. Page `/invitation/:token`

Nouvelle page publique `src/pages/invitation/PageInvitationLanding.tsx` (route publique, pas de guard) :

- Charge le prospect via edge `invitation-resolve` (lit `prospects` par `landing_token`)
- Log `landing_viewed` dans `outreach_page_events` + `prospects.funnel_status = 'landing_viewed'`
- Rend une fiche préremplie : nom, catégorie, ville, téléphone, site web, territoires, source, statut vérification
- Bloc valeur (« rendez-vous exclusifs, pas de leads partagés »)
- CTA principal : `Activer ma fiche pour 1 $` → `/invitation/:token/activate`
- CTA secondaire : `Vérifier mes informations` → `/invitation/:token/edit`
- Token invalide → page 410 dédiée, jamais de redirection vers `/`

## 4. Page `/invitation/:token/edit`

- Formulaire prérempli (nom entreprise, responsable, mobile, email, site, catégorie, services, villes, rayon, RBQ + case « non fournie »/« non requise », années, photos, logo, disponibilités)
- Sauvegarde progressive (debounce 800 ms) via edge `invitation-save-draft` → écrit dans `prospects` et miroir dans `contractor_activation_funnel`
- Passe `funnel_status = 'profile_started'` au premier champ modifié
- Réutilise composants existants (`AutocompleteInput`, upload) — pas de nouveau design

## 5. Page `/invitation/:token/activate` + retour Stripe

- Récap : entreprise, plan d'essai, 1,00 $ CAD, 7 jours, prix après essai (dyn depuis `contractor_plan_definitions`), taxes edge-calculées, prochaine date de prélèvement, annulation
- CTA `Activer maintenant pour 1 $` appelle `create-activation-checkout` avec :
  ```
  metadata: { prospect_id, contractor_id, campaign_id, landing_token, source: "sms_outreach" }
  success_url: /activation/success?session_id={CHECKOUT_SESSION_ID}
  cancel_url:  /invitation/{landing_token}/activate?cancelled=true
  ```
- Statut → `checkout_started`
- Nouvelle page `/activation/success` (nouvelle : `PageActivationSuccess.tsx`) : lit `session_id`, appelle `activation-confirm`, affiche confirmation + checklist + CTA « Compléter mon profil » / « Ajouter mes disponibilités ». Aucun retour vers `/`.

## 6. Webhook Stripe — source de vérité

Étendre `supabase/functions/stripe-webhook/index.ts` :

- Vérifie signature (existant)
- Sur `checkout.session.completed` avec `metadata.source = 'sms_outreach'` :
  1. Récupère prospect via `landing_token`
  2. Crée ou lie `contractor_id` (upsert `contractors` avec données du prospect)
  3. Écrit `paid_1_dollar`, `activated_at`, `contractor_activation_ledger` + `contractor_activation_events`
  4. Applique la règle « recommendable » (voir §7)
  5. Envoie SMS + email de confirmation via `agent-send-outreach`
  6. Log transition dans `prospect_status_transitions`
- Gère aussi `payment_intent.succeeded`, `invoice.payment_succeeded/failed`, `customer.subscription.updated/deleted` pour maintenir le statut

## 7. Règle « recommendable »

Fonction pure `src/lib/outreach/isRecommendable.ts` appliquée par le webhook :

```
paymentConfirmed && businessNamePresent && categoryPresent &&
(validMobile || validEmail) && atLeastOneServiceArea &&
serviceCategoryMapped && profileIsPublic && !suspended
```

- RBQ jamais bloquante si `rbq_not_required` ou `rbq_not_provided`
- Statuts vérification : `verified | verification_pending | rbq_not_provided | rbq_not_required | suspended` (colonne `contractors.verification_status`)

## 8. Dédup + relances

- Dédup avant envoi (extension `acq-send-outreach`) : `dedupeKey = normalizedPhone + category + campaignId` ; refus si SMS livré < 7 j, prospect payé/activé, mobile invalide, fixe, opt-out, suspendu
- Cron `daily-outreach-orchestrator` (existant) étendu avec 3 relances max sur 7 j :
  - +4 h après clic sans paiement
  - +24 h après vue sans checkout
  - +2 h après checkout abandonné (lien `resume_checkout_link` = session Stripe existante ou `/invitation/:token/activate`)
- Aucune relance après `paid_1_dollar`

## 9. Repair automatique

Étendre `outreach-repair-messaging` (existant) — planifié via `cron.schedule` toutes les 6 h :

- Prospects sans `landing_token` → génération + backfill
- Messages sans `short_link_token` → génération
- Détection ancien domaine / URL sans token dans `outreach_messages.body_rendered`
- Checkout sans metadata `landing_token` → alerte
- Paiement sans activation → re-run `activation-confirm`
- Prospect bloqué > 48 h dans un statut intermédiaire → alerte

## 10. Dashboard admin `/admin/outreach-funnel`

Nouvelle page `src/pages/admin/PageOutreachFunnel.tsx` (distincte de `PageOutreachCommandCenter`) :

- KPIs (13) alimentés par une vue SQL `v_outreach_funnel_kpis`
- Vue pipeline horizontale, chaque étape cliquable → filtre la table
- Table prospects avec colonnes demandées + filtres (campagne, ville, catégorie, statut, source, date, variante SMS)
- Bouton `Tester le tunnel complet` → appelle nouvelle edge `outreach-e2e-test` qui simule scrap → SMS test (numéro interne env `OUTREACH_TEST_PHONE`) → clic → landing → checkout Stripe test → webhook → activation. Retourne PASS/FAIL par étape + cause.
- Bandeau alertes rouges (livraison < 70 %, aucun SMS < 24 h, checkout sans activation, webhook en échec, page 404, lien générique détecté, > 10 prospects bloqués même statut)

## 11. Routing App.tsx

Ajouts dans `src/app/App.tsx` (routes publiques) :
- `/r/:token` → `PageShortLinkRedirect`
- `/invitation/:token` → `PageInvitationLanding`
- `/invitation/:token/edit` → `PageInvitationEdit`
- `/invitation/:token/activate` → `PageInvitationActivate`
- `/activation/success` → `PageActivationSuccess`
- `/admin/outreach-funnel` → `PageOutreachFunnel` (admin guard)

## Ordre d'exécution

1. Migration (tokens, transitions, backfill, GRANTs)
2. Edges : `outreach-shortlink-resolve`, `invitation-resolve`, `invitation-save-draft`, extension `create-activation-checkout` (metadata), extension `stripe-webhook` (activation + recommendable), extension `acq-send-outreach` (short-link + dédup), `outreach-e2e-test`
3. Pages : `/r/:token`, `/invitation/:token`, `/edit`, `/activate`, `/activation/success`
4. Repair : extension `outreach-repair-messaging` + cron
5. Relances : extension `daily-outreach-orchestrator`
6. Dashboard `/admin/outreach-funnel` + vue SQL KPIs
7. Test E2E interne (bouton admin) sur un numéro réel avant activation en volume

## Critères de succès

Un prospect scrapé reçoit un SMS avec lien court unique → ouvre `/invitation/:token` préremplie → édite → paie 1 $ → webhook active → statut `recommendable` → visible dans `/admin/outreach-funnel`. Zéro redirection vers `/`, zéro page morte, zéro action manuelle.
