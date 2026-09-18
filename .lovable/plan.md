# P1 — Raccorder les objets métier à la conversation Clara

L'autorité conversationnelle est figée : `alex_sessions` + `alex_messages`, pilotée par la fonction `clara-session`. Aucune nouvelle couche de session ne sera créée. P1 ne fait qu'ajouter des **références** (identifiants) dans la conversation existante et réutiliser les moteurs déjà en place.

## Raccords à livrer, dans l'ordre

1. **Conversation → projet**
   Après la création de projet (`create-project-unified`), enregistrer `active_project_id` et `active_lead_id` dans la conversation. Rejeu idempotent : une même création relancée après rafraîchissement ne crée pas un second projet ni une seconde référence.

2. **Conversation → Passeport Maison**
   Conserver `active_property_id` et le restaurer après authentification/rafraîchissement. Le serveur refuse toute propriété appartenant à un autre compte.

3. **Conversation → analyse de soumissions**
   Les identifiants d'analyse sont déjà référencés; compléter la réclamation après connexion pour qu'elle soit idempotente et couvre toutes les analyses de la conversation (aucune perdue, aucun doublon).

4. **Conversation → vérification entrepreneur**
   Conserver `verification_run_id` et réutiliser le mécanisme de rattachement anonyme existant, sans toucher à la provenance ni aux règles de conformité.

5. **Conversation → analyses visuelles / documents**
   Conserver les références déjà téléversées et ne les rattacher qu'aux objets dont le compte est réellement propriétaire.

6. **Conversation → jumelage**
   Le jumelage conserve explicitement le projet et la demande liés, via le moteur de jumelage existant. Aucune recommandation inventée, aucune nouvelle logique de score.

7. **Jumelage → rendez-vous**
   Conserver l'identifiant de jumelage, revalider le créneau côté serveur avant confirmation, et rattacher le rendez-vous au bon projet et au bon entrepreneur.

8. **Entrepreneur → plan personnalisé → paiement**
   Même entreprise, même devis personnalisé du début à la fin. Prix et périodicité déterminés côté serveur uniquement. Aucun recalcul côté navigateur, aucun paiement réel pendant les tests.

## Vérifications pour chaque raccord

Parcours testé : création → rafraîchissement → retour/avance navigateur → connexion → réouverture → second appareil du même compte → nouvelle tentative.
Contrôles : aucun identifiant inattendu, aucune duplication, aucun contexte perdu, aucune fuite entre comptes, règles d'accès intactes, console et réseau propres.

## Détails techniques

- Étendre `sanitizeContextPatch` dans `supabase/functions/clara-session/index.ts` avec la liste blanche complète : `active_project_id`, `active_lead_id`, `active_property_id`, `selected_match_id`, `appointment_id`, `contractor_id`, `pricing_quote_id`, `verification_run_ids`, `visual_analysis_ids`. Fusion par union pour les tableaux (idempotente).
- Étendre l'action `promote` : après rattachement de la session, réclamer de façon idempotente les analyses de soumissions (`claim-quote-analysis`), les vérifications (`verify-attach-anonymous`) et les analyses visuelles référencées. Chaque réclamation est refusée si l'artefact appartient déjà à un autre compte (aucun écrasement).
- Côté client : appeler `saveClaraContext` depuis `useCreateProject` (projet + lead), depuis la résolution de propriété/Passeport, depuis `useVerifyContractor`, depuis `visualAnalysisService`, depuis le jumelage et la confirmation de rendez-vous, et depuis le devis entrepreneur. Aucun nouveau store, aucune nouvelle table.
- Rendez-vous : la confirmation passe par la fonction serveur existante qui revalide la disponibilité; la conversation ne conserve que l'identifiant du rendez-vous.
- Paiement entrepreneur : `create-checkout-session` reste seul responsable du prix et de l'intervalle, à partir de `pricing_quote_id`. Aucune modification de configuration Stripe en production.
- Tests : étendre `src/services/clara/__tests__/claraSession.test.ts` et ajouter un test de continuité par raccord (référence conservée, rejeu idempotent, refus inter-comptes). Exécution `npm test`, `npm run typecheck`, `npm run lint:critical`, `npm run build`.

## Limites

Aucune migration destructive, aucun changement de schéma non réversible, aucun paiement réel, aucune publication automatique. En cas de conflit de propriété irréversible, l'exécution s'arrête et je vous préviens.

## Résultat attendu

Un rapport des raccords réellement testés, avec pour chacun le parcours exécuté et l'identifiant conservé. L'unification visuelle d'une seule boîte Clara ne commence qu'après ce rapport.
