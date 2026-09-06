# Profil public entrepreneur — refonte fidèle à la référence

## Résultat livré

- Transformer la fiche publique existante en expérience premium sombre, riche et mobile-first, avec navigation active entre Aperçu, Services, Territoire, Réalisations, Vérifications et Avis.
- Réutiliser exactement la même fiche interactive dans l’aperçu privé entrepreneur, présentée dans un appareil incliné et surélevé avec profondeur et ombres.
- Conserver un seul bouton public : « Planifier un rendez-vous ».

## Parcours public

- Afficher l’identité, les preuves réelles et les médias existants sans donnée de démonstration ni valeur inventée.
- Afficher une seule carte de compatibilité : pourcentage réel lorsqu’un jumelage existe pour le propriétaire et son projet actif; sinon « — % » et « Appuyez pour afficher votre score ».
- Ouvrir Clara depuis toute la carte de score inconnu, avec le contexte de l’entrepreneur, afin de recueillir uniquement les renseignements manquants.
- Séparer les avis en « Avis UNPRO » et « Avis Google », afficher leur provenance et masquer toute note, quantité ou citation absente des données réelles.
- Relier chaque onglet à sa section réelle et rendre le changement visible, accessible et utilisable au clavier.

## Aperçu privé entrepreneur

- Remplacer l’ancien aperçu isolé par la fiche publique partagée dans un cadre d’appareil premium incliné sur ordinateur et tablette, stable et lisible sur mobile.
- Garder Modifier et Plein écran comme petites icônes discrètes hors de l’écran public.
- Modifier renvoie au formulaire existant prérempli; Enregistrer revient automatiquement à l’aperçu et affiche « Modifications enregistrées ».

## Détails techniques

- Extraire la présentation actuelle dans des composants partagés, sans ajouter de route, table ou système concurrent.
- Étendre les hooks publics existants pour lire les évaluations de jumelage autorisées de l’utilisateur connecté, les avis UNPRO publiés et les sources Google existantes.
- Préserver les contrôles d’accès actuels : le score personnalisé reste limité au propriétaire concerné; aucune donnée privée n’est ajoutée à la lecture publique.
- Retirer les données de démonstration du chemin public et ne rendre que les sections soutenues par des données existantes.
- Utiliser les jetons visuels UNPRO existants; ajouter seulement les styles structurels nécessaires au cadre d’appareil et à la scène premium.

## Validation

- Tester les six onglets, le score connu/inconnu, l’ouverture de Clara, les deux sources d’avis, le rendez-vous, Modifier → formulaire prérempli → Enregistrer → aperçu.
- Vérifier les profils avec et sans médias, avis, réalisations et vérifications.
- Vérifier les rendus à 390 px, tablette et ordinateur, puis exécuter typecheck, lint ciblé, tests et build.
- Ne pas publier automatiquement.