
# Pipeline Acquisition UNPRO — Audit, Réparation & Complétion

Objectif : rendre le parcours **Prospect → Contact → Outreach → Onboarding → Paiement → Activation → Profil public → Matching → Alex** réellement opérationnel, sans système parallèle. On répare et complète ce qui existe déjà (`contractor_prospects`, `contractor_onboarding_sessions`, `outreach_*`, `admin-create-contractor-manual`, `admin_activate_contractor_finalize`, `contractor_matching_status`, `contractor_entitlements`, `stripe-webhook`, etc.).

Vu l'ampleur, je livre en **6 phases**. Chaque phase produit quelque chose de testable et passe l'audit correspondant.

---

## Phase 1 — Cockpit d'audit & moteur de test (foundation)

Rend visible où le pipeline casse avant de réparer quoi que ce soit.

**Backend**
- Migration : `system_audit_logs`, `stripe_webhook_events` (idempotence), `pipeline_audit_runs`, `pipeline_audit_steps`.
- Edge function `audit-contractor-acquisition-pipeline` : exécute les 27 étapes (`01_source_available` → `27_appointment_flow_available`), retourne `PipelineAuditStep[]`, écrit dans `pipeline_audit_steps`. Modes : `simulation | stripe_test | production_no_send | production_live` (défaut `allow_live_delivery=false`).
- Edge function `get-contractor-operational-status` : source de vérité unique (`prospect | contacted | onboarding | payment_pending | active | paused | suspended | expired | blocked` + `blockers[]`).
- Vue SQL `v_pipeline_funnel_counts` (Scraped → Recommendable, 12 étapes).

**Frontend**
- `/admin/acquisition/pipeline` : funnel cliquable, KPIs (SMS/Email/Stripe/Twilio/webhook errors), bouton **Tester tout le pipeline** (4 modes) avec résultat live par étape (✅/❌ + cause + fonction + action).
- `/admin/acquisition/errors` : erreurs groupées par catégorie (scraping, phone, sms, email, stripe, webhook, activation, matching, alex) avec boutons Réparer / Ignorer / Ouvrir.

---

## Phase 2 — Prospect, coordonnées, dédoublonnage, fusion

Un admin peut créer/éditer/fusionner un prospect proprement, un scraper aussi.

**Backend**
- Migration : `contractor_prospect_contacts` (value, type, is_primary, source, verified, verification_method, verified_at, added_by, historique conservé), `contractor_prospect_merges`.
- Edge functions : `prospect-upsert` (normalise phone E.164 + détecte mobile/fixe/VoIP via `phone_carrier_cache`, normalise email, détecte doublons sur phone/email/RBQ/nom+ville/domaine), `prospect-merge` (garde progression onboarding la plus avancée, paiement, contractor_id, logs).
- Sources supportées : `manual, kijiji, google_maps, rbq, referral, facebook, instagram, website, csv_import, phone_call, contractor_request, partner, other`.

**Frontend**
- `/admin/prospects/new`, `/admin/prospects/:id/edit` : formulaire complet (champs listés dans le brief) + mode rapide (Nom / Tel-Email / Ville / Catégorie).
- Boutons **+ Ajouter un entrepreneur** dans `/admin/acquisition`, `/admin/outreach`, `/admin/contractors`, `/admin/acquisition/pipeline`.
- Indicateurs live : `Mobile validé | Ligne fixe | VoIP | Courriel valide | Doublon possible | Aucune coordonnée exploitable`.
- Écran de fusion avec preview avant/après.
- Section **Ajouter une coordonnée** sur la fiche prospect (Tel mobile, Ligne fixe, Courriel, Site, Contact 2, Adresse, Ville desservie, RBQ, NEQ, Social).

---

## Phase 3 — Outreach, tracking, lien d'onboarding sécurisé

Chaque envoi laisse une trace, chaque clic ouvre un onboarding prérempli.

**Backend**
- Table `outreach_deliveries` complétée avec : `prospect_id, campaign_id, message_variant, channel, destination, provider_message_id, queued_at, sent_at, delivered_at, failed_at, clicked_at, onboarding_started_at, payment_completed_at`.
- Webhooks Twilio & Resend consolidés dans `outreach-webhook` (idempotent, respect STOP / unsubscribe, jamais de SMS vers ligne fixe).
- Edge function `onboarding-token-issue` + `onboarding-token-resolve` : token → `{ prospect_id, campaign_id, source, language, expires_at }`.
- Route `/onboarding/pro/:token` : si expiré → écran de renouvellement (OTP SMS/email, pas de redirect accueil).

**Frontend**
- Sur token valide : hook `usePrefillFromProspect` remplit nom, contact, tel, email, ville, catégorie, site, RBQ, territoire, langue, source (tous éditables). Aucune question déjà répondue n'est reposée.

---

## Phase 4 — Onboarding progressif, plan, checkout Stripe 1 $

Progression jamais perdue, paiement idempotent.

**Backend**
- `contractor_onboarding_sessions` complétée : statuts `not_started | link_opened | identity_confirmed | business_completed | services_completed | territory_completed | verification_completed | plan_selected | checkout_started | payment_pending | paid | activated | abandoned | blocked`, `completion_percent`, `last_activity_at`, `checkout_session_id`.
- Sauvegarde autosave à chaque étape (debounce 500 ms).
- `stripe-webhook` durci : signature vérifiée, écrit `stripe_webhook_events` avant traitement, statut `received | processing | processed | failed`, retraitement possible. Événements gérés : `checkout.session.completed, payment_intent.succeeded, invoice.paid, customer.subscription.{created,updated,deleted}, charge.refunded, payment_intent.payment_failed`.
- Bouton admin **Retraiter le webhook** sur `/admin/acquisition/errors`.

---

## Phase 5 — Activation (Stripe + manuelle) unifiée & profil public

Activation manuelle = activation Stripe côté opérations, `payment_source` explicite.

**Backend**
- Extension de `admin_activate_contractor_finalize` déjà en place :
  - `manual_payment_status: not_required | paid_cash | paid_transfer | paid_card | stripe_verified | complimentary`
  - `manual_payment_amount, manual_payment_reference, activation_reason, activation_expires_at`
  - Jamais de fausse transaction Stripe ; `payment_source=manual` clairement marqué.
- Alex ne lit **jamais** Stripe directement : uniquement `contractor_entitlements.matching_enabled && contractor_matching_status.recommendation_status='eligible'`.
- Test automatique de publication du profil public : HTTP 200 + absence de `{nom_entreprise}, undefined, null, connect calendar, OAuth, token expired, admin, placeholder`.

**Frontend**
- Écran succès activation avec **Copier lien public, Voir fiche CRM, Tester avec Alex** (déjà partiellement fait, on complète le "Tester avec Alex").

---

## Phase 6 — Matching, test Alex, réparation automatique

**Backend**
- `contractor_matching_profiles` (ou extension de `contractor_matching_status`) : `primary_category, service_categories, service_cities, service_radius_km, languages, availability_status, min/max_project_value, home_types, commercial_allowed, emergency_available, rbq_status, insurance_status, performance_score, compatibility_score, recommendation_status`.
- Statuts recommandation : `eligible | limited | waiting_verification | paused | suspended | ineligible`.
- Edge function `admin-test-alex-recommendation` : entrée (ville, catégorie, type projet, budget, urgence, langue, type propriété) → sortie (entrepreneur trouvé, score compat, raison, éléments manquants, blocage réel — territoire, catégorie, dispo, RBQ, capacité, score, données).
- Edge function `repair-stuck-contractor-pipeline` : détecte + répare chaque cas listé (paiement OK mais pas actif, activé mais profil absent, actif mais matching absent, onboarding OK mais checkout absent, clic sans session, SMS livré mais outreach non MàJ, webhook reçu non traité, prospect sans score, mobile non validé, plan sans plan_id, etc.). Chaque réparation → `system_audit_logs`.
- Cron `*/15 * * * *` : intégrité (paiement sans activation, activation sans matching).

**Frontend**
- Bouton **Tester avec Alex** sur fiche entrepreneur + résultat détaillé.
- Bouton **Réparer** par erreur dans `/admin/acquisition/errors`.

---

## Détails techniques transverses

**Permissions** : Admin (créer/modifier/fusionner/outreach/activer/marquer payé/retraiter/réparer/tester), Entrepreneur (son profil, onboarding, plan, paiement, dispos, statut), Public (profils publiés uniquement, aucune donnée privée/scraping/outreach).

**Audit obligatoire** dans `system_audit_logs` : `prospect_created, contact_added, contact_validated, prospect_merged, outreach_queued, outreach_sent, link_opened, onboarding_started, onboarding_completed, checkout_created, payment_confirmed, manual_payment_recorded, contractor_activated, profile_published, matching_enabled, alex_test_completed, pipeline_repaired`.

**Idempotence garantie** : `stripe_webhook_events` (unique sur `stripe_event_id`), `outreach_deliveries` (unique sur `provider_message_id`), `contractor_prospect_merges` (log immuable).

**Sécurité** : RLS sur toutes les nouvelles tables + GRANT `service_role` + GRANT admin authenticated via `has_role`. Aucune donnée PII exposée aux anon.

**Défauts** : `allow_live_delivery=false` partout tant que non explicitement activé.

---

## Ordre d'exécution proposé

```text
Phase 1  → cockpit + moteur d'audit + logs        (visibilité)
Phase 2  → prospect + coordonnées + fusion         (données propres)
Phase 3  → outreach + tokens sécurisés             (canaux)
Phase 4  → onboarding + Stripe idempotent          (conversion)
Phase 5  → activation unifiée + profil public      (revenu)
Phase 6  → matching + Alex + réparation auto       (recommandation)
```

À chaque fin de phase, on relance **Tester tout le pipeline** — la phase n'est terminée que si toutes ses étapes de l'audit passent au vert.

---

## Critère d'arrêt

Le travail est terminé quand `audit-contractor-acquisition-pipeline` en mode `stripe_test` retourne les 27 étapes en `success`, que le bouton "Tester tout" affiche le pipeline complet vert, que `/admin/acquisition/errors` est vide sur un prospect fraîchement créé, et qu'Alex peut recommander l'entrepreneur test avec un score de compatibilité et une raison lisibles.

---

**Confirmes-tu qu'on démarre par la Phase 1 (cockpit d'audit + moteur de test) ?** Ou tu préfères que j'attaque directement une phase spécifique (ex. Phase 4 Stripe/onboarding si c'est le blocage revenu le plus critique) ?
