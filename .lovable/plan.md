# Étape « Vos services » — aucune invention quand rien n'est prouvé

Objectif : quand la détection ne donne rien, l'écran reste honnête et vide, et l'entrepreneur amorce lui-même avec son service principal. Quand le métier est connu mais qu'aucun sous-service n'est prouvé, les services vont dans une zone « À classer » plutôt que dans « Prioritaire ».

## Ce qui change à l'écran

1. **Aucune donnée détectée** — les trois colonnes s'affichent vides, avec le message :
   « Nous n'avons pas encore pu confirmer vos services. Ajoutez votre service principal pour commencer. »
   Aucun métier supposé, aucun service préclassé, aucune puce affichée.

2. **Amorçage par le service principal** — l'entrepreneur écrit son service principal dans le champ et appuie sur Entrée. La puce est créée telle qu'il l'a écrite (marquée « Déclaré », en attente de révision si elle n'existe pas au catalogue).
   Une fois ce service principal connu, UNPRO propose uniquement les sous-services réellement liés à ce métier — dans la zone « À classer », jamais classés d'office. Aucune suggestion hors contexte.

3. **Nouvelle zone « À classer »** — première zone de l'écran, sous-titre : « Les services à confirmer : glissez-les dans la bonne colonne. »
   Elle reçoit : les suggestions de sous-services, et les services détectés quand le métier est reconnu mais qu'aucun sous-service précis n'est prouvé.
   Tant qu'un service reste « À classer », il n'influence ni les rendez-vous, ni la priorité, ni l'exclusion.

4. **Préremplissage resserré** — « Prioritaire » n'est plus rempli automatiquement. Un service ne va en Prioritaire que s'il est marqué principal avec une provenance forte (Vérifié ou Google). Tout le reste part en « À classer ». Rien ne va jamais en « Non recherché » sans geste explicite.

5. **Progression** — l'étape ne peut être validée que si au moins un service est en Prioritaire ou en Accepté. Un message discret indique ce qu'il reste à faire si tout est encore « À classer ».

## Détails techniques

- `ServiceTriageBoard.tsx` : ajout du statut `unsorted` (4e colonne, placée en premier), nouveau message d'état vide, champ d'ajout conservé dans chaque colonne. Le glisser-déposer, la sauvegarde immédiate et les badges de provenance restent identiques.
- `PageContractorCompatibility.tsx` : logique de préremplissage revue (principal + provenance forte → `priority`, reste → `unsorted`, aucun préremplissage si la détection est vide) ; garde de progression à l'étape 1.
- Suggestions de sous-services : dérivées du pack de métier existant (`getCompatPack`) filtré par le service principal saisi — pas de nouvelle source de données, pas d'appel réseau supplémentaire.
- Persistance : `contractor_service_preferences.preference` accepte `unsorted` (aucune contrainte à modifier). `sanitizeAnswers` accepte le nouveau statut ; `materialize` n'écrit **aucune** règle de matching pour `unsorted` — ni boost, ni exclusion. Déploiement de `contractor-compatibility-save` et `contractor-compatibility-finalize`.
- Tests : état vide et message exact, absence de préremplissage sans détection, placement en « À classer » quand le sous-service n'est pas prouvé, suggestions limitées au métier saisi, `unsorted` sans effet sur le matching, plus la suite existante, types, lint et compilation.

## Hors périmètre

Aucun changement aux autres étapes du questionnaire, au moteur de matching, aux routes, aux données de production, ni aux envois SMS/courriel.
