# P0 — Stabiliser le chat Clara et l’affichage mobile

## Résultat
Rendre le chat partagé utilisable avec le clavier mobile, sans disparition ni rejeu des réponses, tout en conservant la même conversation lors des passages texte, voix et parcours entrepreneur.

## Correctifs
1. **Un seul cadre mobile stable**
   - Utiliser la hauteur visible publiée par le gestionnaire global `visualViewport`, les safe areas et la hauteur réellement mesurée du composeur.
   - Garder le fil comme unique zone défilable; placer voix, médias, saisie et commandes hors de ce défilement.
   - Réduire la barre d’outils et les espaces verticaux sur petit écran; garantir que messages, cartes entrepreneur et choix restent au-dessus de la saisie et du clavier.
   - Appliquer ce cadre à la conversation principale et à son parcours entrepreneur intégré, sans créer un autre chat.

2. **Message assistant permanent**
   - Créer chaque tour avec un identifiant client stable et conserver ce même objet pendant respiration, diffusion, animation, sauvegarde et restauration.
   - Remplacer les suppressions/réinjections par des mises à jour d’état (`pending`, `streaming`, `complete`, `failed`) qui gardent le texte déjà reçu.
   - Réconcilier le retour serveur et la fermeture de la voix par identifiant stable, sans remplacer tout l’historique visible ni dupliquer le dernier tour.
   - Empêcher tout remontage, restauration ou retour de canal de relancer l’animation d’un message déjà révélé.

3. **Texte, animation et voix unifiés**
   - Conserver une seule révélation progressive pour les réponses texte non diffusées; les réponses diffusées s’affichent directement dans le même message à mesure des fragments reçus.
   - Faire évoluer le pont vocal pour mettre à jour un tour utilisateur ou Clara en direct, puis le finaliser une seule fois dans l’historique canonique.
   - Exploiter les événements réellement disponibles du fournisseur pour distinguer fragments et fin de tour; ne pas enregistrer chaque fragment comme un nouveau message.
   - Sur pause, interruption, erreur ou changement texte/voix, figer le texte déjà révélé, arrêter l’animation courante et reprendre au même endroit sans rejeu.

4. **Suivi du dernier message sans scroll forcé**
   - Centraliser le suivi dans le composant partagé de conversation.
   - Suivre la dernière ligne pendant croissance seulement si l’utilisateur était près du bas.
   - Recalculer après clavier, rotation, redimensionnement du composeur, apparition des médias/cartes/choix et reprise vocale.
   - Préserver la lecture manuelle de l’historique et garder le bouton accessible « Revenir au dernier message ».

## Validation obligatoire
- Ajouter des tests ciblés sur : identité stable, réponse temporaire→persistée, échec sans disparition, aucun rejeu après remontage/rechargement, fragments vocaux consolidés, pause/reprise et changements texte↔voix.
- Étendre le test mobile du DOM à 360×740 et 390×844 : réponse longue diffusée, choix multiples, clavier simulé ouvert/fermé, scroll manuel, retour au dernier message, rotation et restauration.
- Tester le parcours entrepreneur intégré afin que ses cartes et choix restent accessibles dans le même fil.
- Exécuter les tests ciblés, le contrôle des types, le lint critique et la compilation; vérifier ensuite le journal de compilation.
- Exécuter une QA navigateur mobile avec captures et mesures. Un clavier Android matériel sera rapporté séparément comme **testé** seulement si un appareil réel est accessible; sinon il restera explicitement **non vérifié**, sans assimiler l’émulation à un appareil réel.

## Garde-fous
- Réutiliser `ClaraConversationBox`, les AI Elements installés, `ClaraContractorFlow`, `claraVoiceBridge`, `useLiveVoice` et la session Clara canonique.
- Aucun nouveau moteur de chat/voix, aucune table, migration, fonction serveur ou changement paiement, acquisition, sécurité ou publication.
- Préserver médias, historique, dossier maison, qualification entrepreneur, intention/rôle et curseurs de reprise.
- Ne déclarer le correctif terminé qu’après preuve visuelle et comportementale, pas seulement après compilation.
