# Fiche Exterra + lien questionnaire sécurisé (sans compte)

Objectif : préparer la fiche entrepreneur **Exterra Construction / Groupes Exterra** avec les données publiques, puis produire un **lien réel** que vous pouvez envoyer immédiatement, ouvrable sans connexion, qui alimente directement le profil de compatibilité existant.

## État vérifié de la production

- Aucune fiche Exterra n'existe : recherche par nom, site et téléphone dans `contractors` = 0 résultat. Il faudra donc créer la fiche (pas de doublon possible aujourd'hui). La recherche sera refaite au moment de la création (nom, `exterrafondation.com`, 514 742-3665, RBQ 5679-7814-01) avant tout INSERT.
- Le questionnaire excavation/fondation existe déjà : `/pro/compatibilite`, `src/config/compatibilityExcavation.ts`, tables `contractor_compatibility_profiles` + `contractor_matching_rules`, fonctions `contractor-compatibility-save` / `-finalize` / `-infer`, panneau admin `CompatibilityAdminPanel` déjà branché dans `AdminContractorDetail`.
- Limite actuelle : ces fonctions exigent un JWT (entrepreneur connecté ou admin). Rien ne permet aujourd'hui à un entrepreneur non connecté de compléter sa fiche via un lien.
- `contractors.user_id` est NOT NULL ; le flux admin existant (`admin-create-contractor-manual`) crée déjà des fiches sans compte avec un UUID placeholder. On réutilise ce même mécanisme.

## Ce qui sera construit (aucune architecture parallèle)

1. **Fiche Exterra** créée dans `contractors` via le mécanisme admin existant : nom, site, téléphone, adresse Saint-Jérôme, RBQ **non vérifiée** (statut `not_provided` côté conformité UNPRO), catégorie « Fondation, coffrage et excavation », 17 services publics et 18 territoires préremplis. Non publiée, non « vérifiée UNPRO ».
2. **Provenance par champ** : nouvelle table légère `contractor_profile_facts` (champ, valeur, provenance `public_source` / `confirmed_by_company` / `verified_unpro`, url source, date de confirmation). Les données publiques entrent en `public_source`. La confirmation par Exterra passe à `confirmed_by_company`, jamais à `verified_unpro`.
3. **Lien sécurisé sans compte** : table `contractor_profile_invites` (token aléatoire 32 octets stocké haché, contractor_id, statut actif/révoqué, expiration, compteurs d'ouverture, dernier accès). Route publique `/profil-entrepreneur/:token`. Le token ne donne accès qu'à cette fiche : aucune autre fiche, aucun accès admin, propriétaires, rendez-vous, paiements.
4. **Deux fonctions edge publiques** dédiées au token : une pour résoudre le token et retourner uniquement le préremplissage d'Exterra, une pour enregistrer les réponses. Elles réutilisent la logique partagée existante (`_shared/contractorCompatibility.ts`) — pas de duplication de règles de matching.
5. **Parcours entrepreneur** (mobile-first, réutilise les composants du questionnaire existant) :
   - accueil personnalisé « Complétez votre profil Exterra Construction » + CTA « Commencer — environ 5 minutes » ;
   - étape 1 : confirmation bloc par bloc (nom, téléphone, site, services, territoires, clientèle) avec « Exact » / « Modifier » ;
   - puis le questionnaire conditionnel existant : services recherchés (Prioritaire / Accepté / Non recherché), projets Oui/Non/Ça dépend, montant plancher et projet idéal, territoires (Prioritaire / Accepté / Gros projets seulement / Ne pas envoyer, ajout/retrait de villes), capacité, préqualification requise ;
   - résumé final « Voici comment UNPRO comprend Exterra » + « Confirmer mon profil » et message de confirmation ;
   - réouverture du lien après soumission : mode « Mettre à jour mes projets recherchés ».
6. **Services à confirmer explicitement** : drain français, injection de fissures, imperméabilisation, membranes, puisards, inspection de drain sont présentés comme **non présumés**, à confirmer par Exterra. Ils s'ajoutent à la liste de services du pack excavation existant.
7. **Admin → Exterra** : bouton « Copier le lien questionnaire », plus révocation et régénération du token dans la fiche. Le panneau compatibilité existant affichera services, priorités, exclusions, territoires, budget minimum, projet idéal, capacité, qualification requise, date de complétion et source des données.

## Détails techniques

- Migration : `contractor_profile_invites` et `contractor_profile_facts` avec RLS (lecture/écriture admin uniquement ; accès entrepreneur uniquement via edge function service-role validant le token), GRANT explicites (`authenticated`, `service_role`, pas d'`anon`).
- Token : 32 octets aléatoires, exposé une seule fois, stocké en hash SHA-256 ; validation à chaque appel, refus si révoqué/expiré ; journalisation des ouvertures.
- Les réponses écrivent dans `contractor_compatibility_profiles` puis matérialisent `contractor_matching_rules` via la fonction `finalize` existante, avec `source = 'token_invite'` et `confirmed_by_contractor = true`.
- Tests : parcours logged-out complet (résolution du token → confirmation → questionnaire → fin → vérification en admin), réouverture du lien, rendu mobile 390 px, token invalide, token révoqué, et contrôle qu'aucune donnée d'un autre entrepreneur n'est atteignable via le token.

## Livrable

En fin d'exécution, je fournis en première ligne le lien réel à envoyer (`https://unpro.ca/profil-entrepreneur/<token>`), puis l'état : fiche créée/existante, données préremplies, questionnaire connecté, résultat des tests logged-out et mobile, blocages éventuels.
