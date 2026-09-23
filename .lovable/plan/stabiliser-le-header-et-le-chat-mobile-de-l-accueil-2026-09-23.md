# Stabiliser le header et le chat mobile de l’accueil

## Résultat
Conserver un header d’accueil fixe en hauteur, semi-transparent et sans aucune transition de logo, puis limiter le défilement actif au seul fil de messages lorsque Clara est engagée.

## Implémentation
- Retirer de `SmartHeader` la sentinelle, l’état compact, l’observation du défilement, le symbole alternatif et les classes d’animation du logo d’accueil.
- Garder le logo officiel et les actions Alertes, QR et menu à leur position actuelle dans un header de hauteur constante avec fond sombre translucide et flou léger.
- Stabiliser la surface Clara avec une hauteur mobile basée sur le viewport visible, sans faire défiler la page lors de l’ouverture du clavier.
- Supprimer les appels et écouteurs qui repositionnent le grand conteneur; conserver un seul conteneur vertical pour les messages et le composeur hors de ce défilement.
- Préserver le suivi intelligent du dernier message seulement lorsque l’utilisateur est déjà près du bas.

## Validation
- Tester à 390 px : plusieurs messages, conversation longue, défilement haut/bas, clavier simulé ouvert/fermé, menu ouvert/fermé et continuité texte/voix.
- Vérifier absence de débordement horizontal, stabilité du logo/header/compositeur et absence de second défilement de page.
- Exécuter les tests ciblés et confirmer le build automatisé.

## Contraintes
- Aucun changement au Dossier maison, à la facturation, aux routes, aux données ou à la logique de Clara.
- Aucun nouveau chat ou header.
- Ne pas publier.
