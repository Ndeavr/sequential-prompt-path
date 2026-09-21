# Header UNPRO — transformation au défilement

## Résultat
Transformer le header canonique de l’accueil en deux états fluides : identité UNPRO complète au sommet, puis symbole officiel compact après le début du défilement. Préserver les contrôles existants, Clara et la position du contenu.

## Implémentation
- Modifier uniquement `SmartHeader` et ses styles d’accueil; ne créer aucun second header.
- Ajouter une sentinelle légère observée par `IntersectionObserver` pour basculer l’état compact autour de 70 px, sans rendu React à chaque pixel.
- Superposer le wordmark officiel et le symbole officiel dans un cadre de marque stable : fondu, légère réduction et translation du wordmark; symbole ancré sans saut.
- Faire varier la hauteur du shell du header entre l’état initial aéré et l’état compact, avec une transition de 200–350 ms et un easing naturel.
- Maintenir les contrôles langue, profil et menu sur une zone tactile d’au moins 44 × 44 px, dans les deux états.
- Conserver le header dans le flux sticky afin que Clara et le contenu restent sous sa hauteur réelle, sans compensation absolue ni saut de mise en page.
- Appliquer un changement d’état quasi instantané et un fondu court sous `prefers-reduced-motion`.

## Dimensions cibles
- Mobile initial : environ 96 px; compact : 60 px; symbole : 32 px.
- Bureau initial : environ 84 px; compact : 64 px, avec un mouvement plus subtil.
- Conserver les safe areas et les largeurs actuelles.

## Validation
- Vérifier 360, 390, 430, 1280 et 1440 px.
- Vérifier sommet, défilement lent/rapide, retour au sommet et rotation simulée.
- Vérifier menu, langue, profil et ouverture de Clara sans chevauchement ni déplacement de contenu.
- Vérifier `prefers-reduced-motion`, clavier mobile et absence d’erreurs console.
- Lancer les tests ciblés, les types, le lint critique et confirmer le build automatisé.

## Contraintes
- Réutiliser exclusivement les assets officiels et les composants de navigation existants.
- Ne modifier aucune route, donnée, session Clara, logique métier ou infrastructure.
- Ne pas publier sans demande explicite.
