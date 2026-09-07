# Plan — Landing /fondateurs : retirer la section mémoire et ajouter un bouton Continuer

## Objectif
Sur la page `/fondateurs` (offre membre fondateur services résidentiels) :
1. Retirer la section « Votre maison se souvient » qui apparaît actuellement en bas de page via `MainLayout`.
2. Remplacer l'affichage automatique du formulaire d'entreprise par un bouton « Continuer » qui n'apparaît qu'après avoir choisi un service et une ville admissibles.

## Fichiers concernés
- `src/layouts/MainLayout.tsx` — ajouter une prop optionnelle pour masquer `SectionMemoireMaison`.
- `src/pages/founder/PageFounderLocalServices.tsx` — activer la prop et ajouter l'étape « Continuer ».

## Implémentation

### 1. Masquer la section mémoire sur /fondateurs
- Ajouter à `MainLayout` une prop optionnelle `hideMemorySection?: boolean`.
- Conditionner le rendu de `<SectionMemoireMaison />` à `!hideMemorySection`.
- Sur `PageFounderLocalServices`, passer `<MainLayout hideMemorySection>`.

### 2. Bouton Continuer après choix de ville
- Ajouter un état local `showBusinessForm` (booléen, défaut `false`).
- Réinitialiser `showBusinessForm` à `false` quand la catégorie ou la ville change.
- Après le retour d'admissibilité positive (`eligibility.state === "eligible"`), afficher un bouton « Continuer » au lieu du formulaire.
- Au clic sur « Continuer », passer `showBusinessForm` à `true` et révéler le formulaire d'entreprise avec une animation `motion.div`.
- Le bouton « Continuer » doit être désactivé pendant la vérification d'admissibilité.
- Le texte du bouton peut indiquer l'urgence restante quand `cityRemaining <= 3`.

## UI / UX
- Garder le style existant : bouton pleine largeur, arrondi `rounded-2xl`, ombre `shadow-primary/25`, icône `ArrowRight`.
- Le formulaire d'entreprise reste identique ; seul le déclencheur change.
- Aucun impact sur les autres pages utilisant `MainLayout`.

## Données et logique
- Aucune modification de base de données, d'edge function, d'authentification ou d'automation.
- La logique d'admissibilité (`check_founder_eligibility`) reste inchangée.
- Aucune donnée utilisateur n'est créée, modifiée ou supprimée.

## Validation
- Vérifier que la section « Votre maison se souvient » n'apparaît plus sur `/fondateurs`.
- Vérifier qu'elle est toujours présente sur les autres pages publiques utilisant `MainLayout`.
- Vérifier que le bouton « Continuer » s'affiche après une ville admissible et révèle le formulaire.
- Vérifier que changer de ville/catégorie réinitialise l'étape.
- Build et tests passent.

## Livrables
- Commit unique avec les deux fichiers modifiés.
- Pas de migration, pas de nouvelle route, pas de nouvelle dépendance.
