# UNPRO — Roadmap

## Profil public entrepreneur premium (2026-09-06) — EN COURS, non publié

- [ ] Consolider `/entrepreneur/:slug`, `/contractors/:id` et l’aperçu privé autour d’une fiche publique partagée, sans donnée de démonstration.
- [ ] Activer Aperçu, Services, Territoire, Réalisations, Vérifications et Avis; conserver uniquement « Planifier un rendez-vous » comme bouton public.
- [ ] Afficher le score de compatibilité réel du propriétaire/projet actif ou « — % » avec ouverture contextuelle de Clara.
- [ ] Séparer Avis UNPRO et Avis Google avec provenance explicite et aucune valeur inventée.
- [ ] Relier Modifier → formulaire prérempli → Enregistrer → aperçu avec confirmation, puis valider mobile/tablette/ordinateur.

## P0 — 6 régressions Project Monitoring (2026-09-08) — TERMINÉ, non publié

- [x] 1. Permissions RLS/helpers : EXECUTE rétabli sur `has_role(uuid, app_role)`, `is_admin()`, `is_syndicate_admin(uuid,uuid)` (authenticated/service_role seulement), `affiliate_entry_by_slug(text)`, `public_contractor_credentials(uuid)`. Vérifié via `pg_proc.proacl` + `has_function_privilege` en production.
- [x] 2. Entrée affiliée `/:slug` : erreur RPC journalisée (`affiliate_entry_lookup_failed`) + état d'erreur explicite avec réessai; `unpro_ref` n'est écrit que depuis une réponse valide. Testé avec le slug réel `yanis6s1` (affilié affiché) et un slug inconnu (repli, aucun affilié inventé).
- [x] 3. Activation `/activer/:slug` et `/activer/:slug/succes` : routes restaurées vers `PageActivationSprint`, `session_id` conservé et journalisé (`activation_checkout_return`), écran de confirmation de retour de paiement ajouté. Cause racine réelle : `v_sms_sprint_landing` (security_invoker) sur une table admin-only → tout lien public affichait « lien invalide ». Corrigé par grants colonne par colonne + politique de lecture limitée aux lignes portant un `tracking_slug`; téléphone/courriel restent inaccessibles.
- [x] 4. Booking transactions : `stripe_session_id` confirmé comme clé canonique unique (index unique complet, plus partiel), cohérent entre `create-booking-checkout`, `verify-booking-payment` et `stripe-webhook`; l'échec d'insert lève avant tout passage à `pending_payment`.
- [x] 5. Role intent : `readRoleIntent()` fait primer le dernier choix explicite et purge le meta contradictoire ou expiré; `AuthOverlayPremium` et `PageEmergencyReset` passent par la source unique. 4 tests ajoutés (propriétaire→entrepreneur, entrepreneur→propriétaire, meta obsolète, purge).
- [x] 6. Vérifications publiques : `get_contractor_public_profile(text)` renvoyait 401 en anonyme (page vidée) → EXECUTE rétabli. `public_contractor_credentials` expose désormais aussi les RBQ/NEQ inscrits au dossier, marqués « Déclaré / Non vérifié ». Erreur backend → « Vérification temporairement indisponible », jamais « aucun titre ».

## P0 — Incident revenu production (2026-09-04) — EN COURS, rien modifié encore

### Priorité active — parcours d’authentification entrepreneur
- [ ] Unifier et vérifier le parcours token/organique → authentification minimale → rôle/profil entrepreneur → reprise exacte, avec attribution complète, offre gratuite admissible et aucune étape de paiement avant activation.
- [ ] Exécuter les scénarios A–J, les contrôles sécurité/RLS et le rendu mobile 390 px sans communication ni paiement réel.

Contexte vérifié : 311 visiteurs / 85 % rebond, /login route la plus vue, 9 checkout_started → 0 conversion, 0 profil entrepreneur depuis le 13 juillet, pipelines d'acquisition arrêtés depuis le 24 août. Google Places reste STOPPÉ (incident coût). Aucun envoi réel, aucun paiement réel durant la réparation.

- [x] 1. Inventaire des entrées entrepreneur actives (accueil « Je suis entrepreneur », /entrepreneurs, /contractor/join, /unpro/activate/:token, liens personnalisés, /signup, retour /login) + trafic réel par route (analytics). Consolider tous les CTA vers UN chemin canonique d'activation sans paiement en préservant token/affilié/UTM. Ne pas supprimer les routes legacy — rediriger leurs CTA primaires.
- [x] 2. Persistance du rôle (OTP téléphone + OAuth) : stocker role=contractor (enum `app_role`) + returnPath AVANT l'auth; après callback, upsert idempotent `profiles.account_type` / `user_roles`; reprendre la route exacte. Jamais de repli homeowner pour une intention entrepreneur. Tests de régression : OTP, callback OAuth, refresh, utilisateur existant.
- [x] 3. Retirer toute mention « 350 $ / paiement unique » au-dessus du pli sur les routes d'acquisition actives (dont `PageContractorJoinLive.tsx`). Remplacer par l'offre « Vos 3 premiers rendez-vous sont gratuits. Ensuite, vous décidez quel plan choisir. » + rareté 10/ville basée sur les quotas territoriaux réels (sinon « selon disponibilité », sans chiffre).
- [x] 4. Activation par token : CTA « Activer gratuitement mon profil » / « Réclamer mon profil gratuitement » (jamais checkout). Capture minimale : nom d'entreprise (prérempli), nom du contact, mobile/courriel, ville, métier, consentement → création/reprise du compte entrepreneur + onboarding. Le paiement ne bloque jamais la création de compte ni la complétion du profil.
- [x] 5. Télémétrie de conversion unifiée : landing_view, cta_click, auth_started, otp_sent, otp_verified/auth_completed, contractor_account_created, profile_started, profile_completed, offer_eligible, checkout_started, paid — écrites dans les tables/vues canoniques existantes avec attribution prospect/token/affilié/UTM. Exclure les enregistrements QA/test de la production.
- [x] 6. Réparer le scheduler/queue d'acquisition avec les fonctions et tables existantes uniquement (crons configurés, dry-run possible). Téléphones inconnus/non-mobiles → courriel vérifié si disponible, sinon revue manuelle. Aucun SMS vers inconnu/fixe/VOIP. Portes CASL/consentement et opt-outs préservés. Aucun envoi réel ce tour.
- [ ] 7. QA golden path strict avec un seul enregistrement « QA GOLDEN PATH — NE PAS CONTACTER » : landing → sélection entrepreneur → intention conservée → OTP/auth test → compte entrepreneur → profil → admissibilité offre gratuite → checkout test-mode optionnel après activation. Retourner IDs/horodatages/statuts avant-après. Jamais de faux PASS. **Partiel vérifié** : dossier `2ba87812-5b96-4ef2-839e-ad368c88335f`, jeton `qagoldenpath20260824`, fiche réelle résolue en preview et CTA gratuit relié au gate canonique; OTP/auth/compte non simulés sans identité QA authentifiable.
- [ ] 8. Build, typecheck, tests, scan sécurité/RLS. Aucune donnée privée entrepreneur exposée.
- [ ] 9. Publier si tout est vert; sinon donner le SHA prêt.

### Notes d'exécution (2026-09-06)
- Nouveau `src/config/contractorFunnel.ts` : chemin canonique `/join` + `/join/profile`, `buildContractorEntryUrl` préservant token/aff/UTM.
- Nouveau `src/lib/copy/contractorOffer.ts` : source unique de l'offre 3 RDV gratuits + rareté 10/ville (aucun chiffre sans donnée réelle).
- `src/services/auth/roleIntent.ts` branché dans Signup, AuthCallbackPage, AuthReturnRouter, /join/profile.
- CTA token (`/join/:token`) : « Réclamer mon profil gratuitement » → `/join/profile`, plus aucun checkout avant activation.

### Notes d'exécution — item 5 (télémétrie unifiée)
- Migration additive sur `contractor_funnel_events` : `prospect_id`, `token`, `affiliate_code`, `utm_source/medium/campaign`, `is_test` + index. Vue `v_contractor_funnel_canonical` (security_invoker) excluant `is_test`.
- `logFunnelEvent` = logger canonique unique : attribution première-touche (`getFunnelAttribution`) + détection session QA (`?qa=1`). `trackFunnelEvent` (legacy) délègue désormais au logger canonique.
- Événements canoniques ajoutés : `cta_click`, `auth_started`, `otp_sent`, `otp_verified`, `auth_completed`, `contractor_account_created`, `offer_eligible`, `paid`.
- Instrumentation : `PhoneOtpForm` (auth_started/otp_sent/otp_verified/auth_completed), `OAuthButtons` (auth_started), `roleIntent.applyRoleIntent` (contractor_account_created), `/join/:token` (landing_view, offer_eligible, cta_click).

### Notes d'exécution — item 6 (routage/queue, dry-run)
- `supabase/functions/acq-queue-repair` étendu (aucune nouvelle fonction) : routage déterministe par prospect, **dry-run par défaut**, n'envoie jamais rien.
- Règles : SMS uniquement si `phone_type='mobile'` + E.164 valide + `sms_disabled` faux + pas d'opt-out/DNC; sinon courriel **vérifié** (`email_trust_state`/`email_status`); sinon revue manuelle (`compliance_review_required`).
- Diagnostic réel (2026-09-06, dry-run) : 221 prospects contactables → SMS 0, courriel 0, revue manuelle 221 (117 « email_not_verified », 104 « phone_unknown_no_email »), bloqués 0, `ready_for_contact` 151 avant/après.
- Cause racine confirmée : aucune vérification de ligne téléphonique ni de courriel n'a tourné (248/248 `phone_type` inconnu, 0 courriel vérifié) → le pipeline n'a rien à envoyer légitimement. Prochaine action sûre : lancer la vérification de contacts (`contact-verification-enqueue`) avant tout envoi.

## Suivi antérieur
- [x] Issue « Booking payments: transaction record not saved » (grants + webhook idempotent) — SHA d1fd6882
- [x] Issue « no verified credentials » (RPC `public_contractor_credentials`) — SHA d1fd6882
- [x] Corriger les erreurs typecheck/build du preview
