# Refonte glossy de la page d’accueil UNPRO

## 1. CONTEXTE

La route `/` sert actuellement `PageHomeLight`, avec un thème clair, une barre supérieure chargée, une bande d’annonce et une grande photo sous le module Clara. Le module Clara actuel envoie déjà les messages vers le flux existant et ouvre la voix, mais il n’expose pas la pièce jointe. Le projet possède déjà le logo officiel, un décor architectural bleu, un calque blueprint, la logique réelle de téléversement et les états Clara.

## 2. OBJECTIF

Transformer uniquement l’interface de la page d’accueil existante en expérience concierge IA bleu nuit, glossy, sobre et fidèle à la référence fournie, sans créer de route, de système parallèle ni modifier le backend.

## 3. UTILISATEURS

- Propriétaires qui veulent expliquer rapidement un projet ou un problème.
- Visiteurs qui doivent comprendre immédiatement qu’UNPRO recommande un entrepreneur compatible, sans modèle de trois soumissions.
- Utilisateurs mobiles qui doivent écrire, joindre un document, parler et envoyer d’une seule main.

## 4. LIVRABLES

- Barre supérieure dédiée à l’accueil : logo officiel blanc/bleu, FR/EN, profil, menu; aucun autre lien visible.
- Hero plein écran navy/noir avec reflets cobalt, profondeur vitrée, maison contemporaine secondaire et blueprint discret.
- Titres et sous-titre exacts demandés.
- Module Clara central fonctionnel avec avatar abstrait, conversation, pièce jointe, micro et envoi.
- Carte de confiance « Rendez-vous exclusifs ».
- Sections existantes pertinentes conservées sous le hero et harmonisées sans nouveau claim.
- Traductions FR/EN des nouveaux libellés de l’accueil.

## 5. LOGIQUE

- Conserver la route `/`, `HomeWithFeatureFlag`, l’authentification, le contexte de langue et les flux Clara existants.
- Réutiliser l’envoi de message existant, la voix existante et la logique réelle d’analyse de fichier déjà présente.
- Faire continuer toute action vers la conversation Clara canonique; ne créer aucun faux contrôle ni parcours parallèle.
- Conserver les états réels : prêt, envoi, réponse en cours, désactivé et erreur lisible.
- Ne modifier aucune donnée, règle métier, offre, paiement, messagerie ou fonction distante.

## 6. DONNÉES

- Aucune nouvelle donnée et aucun contenu simulé.
- Réutiliser uniquement les assets existants : logo officiel via le composant canonique, scène architecturale existante et blueprint existant.
- Traiter l’image fournie comme référence visuelle seulement, sans l’intégrer comme asset de production.

## 7. UI/UX

- Appliquer une portée sombre propre à l’accueil avec les tokens sémantiques UNPRO; aucune couleur brute dans les composants.
- Construire une composition centrée : titre, sous-titre, module Clara, preuve de confiance.
- Garder le décor architectural secondaire par obscurcissement, cadrage et diffusion; préserver le contraste du texte.
- Desktop : hero utile dans la hauteur initiale et conversation visible sans défilement.
- Mobile 390 px : logo compact, contrôles de 44 px minimum, champ confortable, aucun débordement et contenu essentiel visible.
- Ajouter seulement des apparitions douces et une respiration lumineuse lente, désactivées avec `prefers-reduced-motion`.
- Préserver les focus visibles, labels accessibles, navigation clavier et contrastes WCAG AA.

## 8. COMPOSANTS

- Adapter `PageHomeLight` pour retirer la bande promotionnelle du premier écran et activer la nouvelle surface sombre.
- Recomposer `HeroHomeownerLight` autour du décor architectural existant et des textes exacts.
- Refactoriser `ClaraConversationBox` avec les composants AI Elements officiels `Conversation`, `Message`, `PromptInput` et `Shimmer`, tout en gardant les appels et états réels existants.
- Brancher le bouton pièce jointe sur le gestionnaire canonique de téléversement Clara.
- Ajouter un avatar/halo Clara abstrait local et léger, sans visage ni logo générique d’IA.
- Simplifier la variante accueil de `SmartHeader` sans altérer les autres pages : FR/EN, profil/connexion et hamburger restent fonctionnels.
- Harmoniser les sections sous le hero avec la même portée sombre, sans cartes ou textes redondants dans le premier viewport.

## 9. ACTIONS

- Message : envoyer le texte saisi dans le flux Clara existant et afficher la réponse réelle.
- Micro : ouvrir le mode voix existant seulement après action utilisateur.
- Pièce jointe : ouvrir le sélecteur existant et transmettre le fichier à l’analyse Clara existante.
- Profil : conserver la destination et l’état connecté/invité existants.
- Menu : conserver le tiroir existant.
- Langue : conserver la préférence persistée et afficher les libellés d’accueil correspondants.

## 10. CONTRAINTES

- Modifier uniquement l’accueil et sa présentation partagée strictement nécessaire.
- Ne créer ni route, backend, table, migration, secret, intégration ou produit.
- Ne pas modifier Stripe, Twilio, Lovable Cloud, les données ou les règles de matching.
- Ne pas recréer le logo; utiliser exclusivement le composant et les assets officiels.
- Ne pas introduire de faux avis, scores, statistiques, villes, prix, rareté ou promesse garantie.
- Ne pas conserver la photo claire actuelle dans le hero.

## 11. SUCCÈS

- La page correspond visuellement à la direction glossy validée sans dériver vers le gaming, la crypto ou une esthétique IA générique.
- Les trois textes principaux et « Rendez-vous exclusifs » sont exacts.
- Message, micro, pièce jointe, FR/EN, profil et menu fonctionnent réellement.
- Aucun débordement horizontal à 390 px ni sur desktop.
- Les états focus, chargement, erreur et désactivation sont visibles et accessibles.
- Aucun changement backend ni régression des routes ou flux existants.

## 12. TÂCHES

1. Installer uniquement les primitives AI Elements requises et vérifier leurs exports locaux.
2. Ajouter les tokens visuels dédiés à la portée sombre de l’accueil.
3. Simplifier la barre supérieure uniquement sur `/` et `/index`.
4. Recomposer le hero et le module Clara avec les textes exacts et les vrais assets existants.
5. Relier la pièce jointe, le micro et l’envoi aux fonctions canoniques existantes.
6. Harmoniser les sections sous le hero sans ajouter de contenu ni de promesse.
7. Ajouter des tests ciblés pour le rendu, les textes, les contrôles et les actions critiques.
8. Valider avec tests automatisés, vérification des types, compilation, audit d’accessibilité et parcours Playwright à 390 px et 1280 px.
