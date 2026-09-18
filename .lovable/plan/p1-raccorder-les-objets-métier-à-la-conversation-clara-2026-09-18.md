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

Un rapport des raccords 

&nbsp;

Le plan P1 est solide, mais j’ajouterais une dernière protection avant Approve. Le point faible potentiel est que saveClaraContext reçoit certains IDs depuis le client. Une liste blanche dans sanitizeContextPatch valide le nom du champ, pas que l’ID appartient réellement à cette conversation ou à cet utilisateur.

&nbsp;

Ajoute ceci au plan, puis Approve :

&nbsp;

> Validation serveur obligatoire des références

&nbsp;

sanitizeContextPatch ne doit pas seulement filtrer les clés autorisées. Toute référence métier reçue doit être validée côté serveur avant d'être enregistrée dans Clara.

&nbsp;

Pour chaque ID :

&nbsp;

active_project_id / active_lead_id : vérifier qu'ils correspondent réellement au projet créé et au même propriétaire;

&nbsp;

active_property_id : propriété accessible par l'utilisateur authentifié;

&nbsp;

selected_match_id : match appartenant au project_id/lead_id actif;

&nbsp;

appointment_id : rendez-vous correspondant au match, projet et entrepreneur actifs;

&nbsp;

contractor_id : entreprise réellement liée au compte lorsque requis;

&nbsp;

pricing_quote_id : devis appartenant exactement au contractor_id;

&nbsp;

analyses, vérifications et analyses visuelles : vérifier soit la propriété authentifiée, soit leur rattachement préalable au même anonymous_id/session_token.

&nbsp;

&nbsp;

Un UUID valide mais étranger à la conversation doit être refusé.

&nbsp;

Lors de promote, ne jamais réclamer un artefact simplement parce que son ID apparaît dans le contexte Clara. Vérifier également que l'artefact anonyme appartient à la même session/anonyme avant de le transférer au compte.

&nbsp;

Les tableaux d'IDs doivent être dédupliqués, avoir une taille maximale raisonnable et ignorer/rejeter les valeurs invalides.

&nbsp;

Pour les champs scalaires active_*, prévoir les mises à jour concurrentes provenant de deux appareils afin qu'une ancienne session ne puisse pas écraser silencieusement un contexte plus récent.

&nbsp;

Enfin, conserver alex_conversation_sessions en lecture/compatibilité seulement pendant P1 : aucune nouvelle écriture métier ne doit en faire une deuxième autorité.

&nbsp;

&nbsp;

&nbsp;

Après ça, Approve P1.

&nbsp;

Le reste est très bien cadré : pas de nouvelle table, pas de nouveau moteur de matching, pas de logique tarifaire client, tests d'idempotence et refus inter-comptes.

&nbsp;

Le résultat que j’attendrais avant ONE CLARA visuelle est un tableau du genre :

&nbsp;

raccord | ID initial | ID après refresh | après auth | second appareil | retry | résultat

&nbsp;

Et pour les huit raccords, les IDs pertinents doivent rester identiques. Une fois ce rapport vert, on peut unifier Clara visuellement sans toucher à son architecture fondamentale. testés, avec pour chacun le parcours exécuté et l'identifiant conservé. L'unification visuelle d'une seule boîte Clara ne commence qu'après ce rapport.