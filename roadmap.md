# UNPRO — Roadmap

## P0 — Incident revenu production (2026-09-04) — EN COURS, rien modifié encore

Contexte vérifié : 311 visiteurs / 85 % rebond, /login route la plus vue, 9 checkout_started → 0 conversion, 0 profil entrepreneur depuis le 13 juillet, pipelines d'acquisition arrêtés depuis le 24 août. Google Places reste STOPPÉ (incident coût). Aucun envoi réel, aucun paiement réel durant la réparation.

- [x] 1. Inventaire des entrées entrepreneur actives (accueil « Je suis entrepreneur », /entrepreneurs, /contractor/join, /unpro/activate/:token, liens personnalisés, /signup, retour /login) + trafic réel par route (analytics). Consolider tous les CTA vers UN chemin canonique d'activation sans paiement en préservant token/affilié/UTM. Ne pas supprimer les routes legacy — rediriger leurs CTA primaires.
- [x] 2. Persistance du rôle (OTP téléphone + OAuth) : stocker role=contractor (enum `app_role`) + returnPath AVANT l'auth; après callback, upsert idempotent `profiles.account_type` / `user_roles`; reprendre la route exacte. Jamais de repli homeowner pour une intention entrepreneur. Tests de régression : OTP, callback OAuth, refresh, utilisateur existant.
- [x] 3. Retirer toute mention « 350 $ / paiement unique » au-dessus du pli sur les routes d'acquisition actives (dont `PageContractorJoinLive.tsx`). Remplacer par l'offre « Vos 3 premiers rendez-vous sont gratuits. Ensuite, vous décidez quel plan choisir. » + rareté 10/ville basée sur les quotas territoriaux réels (sinon « selon disponibilité », sans chiffre).
- [x] 4. Activation par token : CTA « Activer gratuitement mon profil » / « Réclamer mon profil gratuitement » (jamais checkout). Capture minimale : nom d'entreprise (prérempli), nom du contact, mobile/courriel, ville, métier, consentement → création/reprise du compte entrepreneur + onboarding. Le paiement ne bloque jamais la création de compte ni la complétion du profil.
- [ ] 5. Télémétrie de conversion unifiée : landing_view, cta_click, auth_started, otp_sent, otp_verified/auth_completed, contractor_account_created, profile_started, profile_completed, offer_eligible, checkout_started, paid — écrites dans les tables/vues canoniques existantes avec attribution prospect/token/affilié/UTM. Exclure les enregistrements QA/test de la production.
- [ ] 6. Réparer le scheduler/queue d'acquisition avec les fonctions et tables existantes uniquement (crons configurés, dry-run possible). Téléphones inconnus/non-mobiles → courriel vérifié si disponible, sinon revue manuelle. Aucun SMS vers inconnu/fixe/VOIP. Portes CASL/consentement et opt-outs préservés. Aucun envoi réel ce tour.
- [ ] 7. QA golden path strict avec un seul enregistrement « QA GOLDEN PATH — NE PAS CONTACTER » : landing → sélection entrepreneur → intention conservée → OTP/auth test → compte entrepreneur → profil → admissibilité offre gratuite → checkout test-mode optionnel après activation. Retourner IDs/horodatages/statuts avant-après. Jamais de faux PASS.
- [ ] 8. Build, typecheck, tests, scan sécurité/RLS. Aucune donnée privée entrepreneur exposée.
- [ ] 9. Publier si tout est vert; sinon donner le SHA prêt.

### Notes d'exécution (2026-09-06)
- Nouveau `src/config/contractorFunnel.ts` : chemin canonique `/join` + `/join/profile`, `buildContractorEntryUrl` préservant token/aff/UTM.
- Nouveau `src/lib/copy/contractorOffer.ts` : source unique de l'offre 3 RDV gratuits + rareté 10/ville (aucun chiffre sans donnée réelle).
- `src/services/auth/roleIntent.ts` branché dans Signup, AuthCallbackPage, AuthReturnRouter, /join/profile.
- CTA token (`/join/:token`) : « Réclamer mon profil gratuitement » → `/join/profile`, plus aucun checkout avant activation.

## Suivi antérieur
- [x] Issue « Booking payments: transaction record not saved » (grants + webhook idempotent) — SHA d1fd6882
- [x] Issue « no verified credentials » (RPC `public_contractor_credentials`) — SHA d1fd6882
- [x] Corriger les erreurs typecheck/build du preview
