# P0 — Clara mobile : grand chat, envoi fiable et intentions utiles

## 1. CONTEXTE
Le diagnostic du code confirme trois causes distinctes :
- la carte initiale est plafonnée à `64dvh`, puis sa hauteur active dépend directement de la hauteur visible du clavier;
- les trois suggestions initiales sont codées en dur comme des phrases artificielles;
- le champ local est réinitialisé avant la fin du traitement asynchrone, tandis que le bouton ne tient pas compte d’un champ réellement vide.

L’architecture canonique existe déjà : même session `alex_sessions` / `alex_messages`, même routeur d’intentions, mêmes parcours, même Voice et même file média.

## 2. OBJECTIF
Construire Clara comme interface principale de la home mobile : grande carte immédiatement visible, historique utile au-dessus du clavier, envoi déterministe, intentions réelles et continuité texte ↔ voix.

## 3. UTILISATEURS
Optimiser d’abord les visiteurs mobiles 360–430 px, sans régression bureau ni rupture pour les conversations restaurées.

## 4. LIVRABLES
- Agrandir la carte Clara avant et après la première interaction.
- Stabiliser la hauteur avec clavier ouvert sans double défilement.
- Garder le champ vide et utiliser seulement un placeholder contextuel.
- Rendre le bouton envoyer actif uniquement quand un texte ou un fichier peut réellement partir.
- Remplacer les exemples arbitraires par des intentions contextualisées, tendances vérifiées ou repli par défaut.
- Déclencher les parcours existants directement depuis chaque suggestion.

## 5. LOGIQUE
Créer dans le composant existant une résolution pure des suggestions :
1. réponses rapides contextuelles émises par Clara;
2. tendances seulement lorsque la source existante répond `trending` avec au moins trois résultats;
3. sinon repli exact : `Je suis entrepreneur`, `Analyser 3 soumissions`, `Vérifier un entrepreneur`.

Après la première interaction, retirer le repli générique. Afficher les réponses contextuelles ou aucune suggestion.

## 6. DATA
Réutiliser `usePopularQuestions` et la fonction existante `popular-questions`. Ne créer aucune table, fonction ou collecte. Ne jamais présenter le repli saisonnier comme une tendance réelle.

## 7. UI/UX
- Largeur mobile proche de `calc(100vw - 24px)`.
- Hauteur initiale de 55–65dvh, avec historique réellement visible.
- En mode conversation, utiliser l’espace disponible sous le header compact.
- Avec clavier ouvert, préserver au minimum une zone utile transcript + composer, garder le composer entier et faire défiler uniquement l’historique.
- Garder le composer dans la carte, avec une ligne initiale et croissance jusqu’à environ cinq lignes.
- Afficher les intentions en rail horizontal naturel sur petit écran.
- Préserver le halo Voice contextuel et l’écoute dans la même carte.

## 8. COMPOSANTS
Modifier uniquement les composants existants :
- `ClaraConversationBox` pour l’envoi, les intentions, le clavier et l’état du composer;
- les règles home de `index.css` pour les hauteurs, le défilement et l’espace mobile;
- `SmartHeader` seulement si la mesure finale exige un ajustement de sa hauteur existante;
- les tests Clara existants.

## 9. ACTIONS
- `Je suis entrepreneur` déclenche l’intention canonique `contractor_onboarding` et ouvre le parcours existant.
- `Analyser 3 soumissions` déclenche `quote_comparison` et ouvre le parcours réel d’ajout/analyse.
- `Vérifier un entrepreneur` déclenche `contractor_verification` et ouvre le parcours réel de vérification.
- Une tendance déclenche son intention via le même routeur, sans copier artificiellement une phrase dans le champ.

## 10. CONTRAINTES
- Aucun nouveau chat, stockage, parcours, écran, route, table ou fonction serveur.
- Aucun changement Stripe, OTP, matching, onboarding, calendrier ou règles métier.
- Aucun résultat simulé et aucune tendance non vérifiée.
- Voice reste un mode de la conversation canonique actuelle.
- Préserver uploads, pièces jointes, provenance, identifiants et reprise après rechargement.

## 11. SUCCÈS
Valider :
- grande carte visible à l’ouverture;
- clavier ouvert sans chat écrasé ni bouton coupé;
- champ vide avec placeholder distinct;
- envoi tactile immédiat, message optimiste, champ vidé, réponse et persistance;
- trois intentions ouvrant leurs parcours réels;
- suggestions génériques retirées après démarrage;
- texte → voix → texte dans le même fil;
- aucun débordement horizontal ni double scroll.

## 12. TÂCHES
1. Refactorer l’état contrôlé du composer afin de lier texte, bouton, composition clavier et soumission.
2. Corriger les calculs `visualViewport`, la hauteur minimale et le défilement au dernier message.
3. Brancher la hiérarchie contextual / trending / default sur les sources existantes.
4. Raccorder chaque intention au routeur et à la même fonction d’ouverture canonique.
5. Étendre les tests de régression mobile et conversationnelle.
6. Vérifier 360×800, 390×844 et 430×932 avec clavier simulé, puis bureau.
7. Exécuter les tests, le contrôle des types et la compilation; documenter le blocage matériel Android/Samsung/iPhone réel si ces appareils restent indisponibles.
