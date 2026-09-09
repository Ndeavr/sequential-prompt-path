# Thème sombre par défaut et en-tête fixe animé

## Constat vérifié

- Le réglage global choisit déjà le thème sombre pour les nouveaux visiteurs, mais `/` et `/index` appliquent encore une apparence claire dédiée qui contourne ce choix.
- L’en-tête principal est déjà fixe en haut, mais il reste visuellement statique pendant le défilement.
- Le logo officiel actuellement affiché provient du composant UNPRO existant; il sera conservé exactement, sans nouvel asset ni nouvelle variante.

## Implémentation

1. **Rendre le sombre réellement prioritaire**
   - Retirer l’exception claire imposée à l’accueil afin que `/` et `/index` suivent le thème global sombre par défaut.
   - Conserver les choix explicites déjà enregistrés par les utilisateurs et le sélecteur clair/sombre existant.
   - Adapter la couleur du navigateur et les surfaces de l’accueil aux jetons sombres existants, sans dupliquer le système de thème.

2. **Animer l’en-tête fixe**
   - Conserver la même rangée, le même logo et les mêmes actions : notifications, code QR et menu.
   - Ajouter un état de défilement discret : hauteur légèrement réduite, fond sombre plus opaque, flou renforcé, bordure et ombre plus nettes.
   - Utiliser l’animation cinématique existante, sans saut de mise en page, avec prise en charge de `prefers-reduced-motion`.
   - Maintenir les zones tactiles actuelles et la lisibilité sur mobile.

3. **Cohérence des deux en-têtes existants**
   - Appliquer le même comportement à l’en-tête partagé et à l’en-tête local de l’accueil s’il demeure actif, afin d’éviter une différence entre `/index`, `/proprietaires` et les autres pages.
   - Garder le logo officiel actuel à l’identique dans chaque état.

## Vérification

- Vérifier sur mobile 384 × 714 et sur ordinateur : chargement initial sombre, en-tête visible en haut, transition au défilement, retour en haut et ouverture du menu.
- Vérifier l’absence de chevauchement avec le contenu et le menu inférieur.
- Exécuter les tests ciblés, la suite existante et confirmer une compilation propre.

## Limites

- Aucun changement de contenu, navigation, données, acquisition, paiement ou automatisation.
- Aucun remplacement ou retraitement du logo UNPRO.