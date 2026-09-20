# P0 — Chat mobile professionnel et continuité Clara Voice

## A — PROMPT LOVABLE FINAL

### 1. CONTEXT
La boîte Clara utilise déjà les composants AI Elements `Conversation`, `Message` et `PromptInput`, ainsi que la conversation canonique `alex_sessions` + `alex_messages`. La capture mobile confirme que la barre d’actions recouvre le champ. Le code confirme deux causes : actions positionnées en absolu dans le champ et hauteur minimale de 360 px lorsque le clavier réduit l’écran. La voix écrit déjà ses tours dans le fil canonique, mais la saisie texte ne met pas encore explicitement le transport vocal en pause. La télémétrie signale aussi un `session_start_failed` réel à diagnostiquer; sa cause précise n’est pas confirmée par les journaux disponibles.

### 2. OBJECTIVE
Construire un composer mobile de messagerie stable où le texte, les pièces jointes et le curseur restent visibles au-dessus du clavier, puis garantir que texte, voix et médias poursuivent exactement la même conversation Clara.

### 3. USERS
- Propriétaire mobile sur Chrome Android ou Safari iPhone.
- Utilisateur qui alterne texte, voix, photo, vidéo et document dans un même dossier.
- Utilisateur avec permission micro refusée, réseau instable ou envoi échoué.

### 4. DELIVERABLES
- Composer auto-extensible de 1 à environ 5 lignes, avec défilement interne au-delà.
- Barre d’actions séparée sous le texte, sans bouton superposé.
- Fil recalculé avec `100dvh`, `visualViewport`, hauteur réelle du composer et safe area.
- Suggestions visibles uniquement quand le champ est vide, non focalisé et clavier fermé.
- Continuité texte ↔ voix ↔ médias sur le même identifiant canonique.
- États accessibles : Clara travaille, hors ligne, micro refusé/indisponible, upload échoué, conversation vide.
- Tests automatisés et validation mobile à 390 px.

### 5. LOGIC
1. Mesurer le clavier et le composer avec `visualViewport` et `ResizeObserver`.
2. Calculer l’espace du fil à partir de la hauteur visible réelle, sans minimum supérieur au viewport.
3. Garder le bas du fil visible à chaque saisie, croissance du textarea, nouveau message ou changement de clavier; maintenir le caret dans la zone visible.
4. Masquer les suggestions au focus, à l’ouverture du clavier ou dès que le texte n’est plus vide; les restaurer seulement quand ces trois conditions sont inversées.
5. Avant chaque action texte/voix/média, garantir la session canonique active; ne créer une nouvelle conversation que par l’action explicite « Nouvelle conversation ».
6. Au focus ou à la frappe pendant Clara Voice, mettre le transport vocal en pause sans fermer ni recréer la conversation; une reprise vocale recharge le contexte du même fil sans salutation.
7. Afficher immédiatement le message utilisateur, vider le champ après acceptation, conserver le focus et maintenir l’ordre chronologique.
8. Diagnostiquer `session_start_failed`, préserver l’usage local si le service est temporairement indisponible et resynchroniser sans doublon au retour.

### 6. DATA
- Conserver `alex_sessions` et `alex_messages` comme seules autorités conversationnelles.
- Conserver le jeton de session existant pour texte, voix, photo, vidéo et document.
- Utiliser les identifiants de message existants pour l’idempotence et la déduplication.
- Ne créer aucune table, route, session vocale parallèle ni nouveau moteur d’upload.
- Ne journaliser aucun texte, fichier ou donnée privée dans l’analytique.

### 7. UI/UX
- Textarea pleine largeur, 16 px minimum, hauteur automatique plafonnée à cinq lignes.
- Barre inférieure distincte : `+`, photo, micro à gauche; envoyer à droite.
- Bouton envoyer de taille stable, désactivé sans texte ni pièce jointe.
- Composer fixé au bas de la zone visible sur mobile, avec safe area; historique seul défilable.
- Suggestions conservées : « Je suis entrepreneur », « Analyser 3 soumissions », « Vérifier un entrepreneur ».
- Focus visible, cibles tactiles d’au moins 44 px et mouvement réduit respecté.

### 8. COMPONENTS
- Refactorer `ClaraConversationBox` autour des AI Elements déjà installés.
- Ajuster uniquement les styles de la surface `home-light` et les primitives locales si leur contrat empêche la structure directe textarea + footer.
- Relier la saisie au store vocal existant pour pause/reprise.
- Consolider `claraSession` et `claraVoiceBridge` seulement là où la continuité ou la reprise échoue réellement.

### 9. ACTIONS
- Envoyer texte et pièces jointes dans la session active.
- Ouvrir photo/vidéo/document sans réinitialiser le fil.
- Mettre la voix en pause lors d’une saisie écrite; reprendre sur demande dans le même contexte.
- Réessayer un upload échoué sans dupliquer le message ni changer de dossier.
- Bloquer l’envoi hors ligne avec un message utile, puis permettre une reprise explicite.

### 10. CONSTRAINTS
- Clara reste la seule identité publique.
- Aucun nouveau funnel, moteur vocal, historique, table ou route.
- Aucun envoi automatique SMS, courriel, push ou appel.
- Aucun faux succès, aucune donnée inventée, aucun détail technique exposé à l’utilisateur.
- Préserver les parcours entrepreneur, analyse de soumissions, vérification, audit et onboarding existants.

### 11. SUCCESS
- À 390 px, toucher « Que voulez-vous faire ? » ouvre le clavier sans masquer le champ.
- Les dernières lignes et le caret restent visibles pour 1, 5 et 10 lignes.
- Aucun texte ne passe sous les icônes ou le bouton envoyer.
- Les suggestions disparaissent pendant la saisie et reviennent uniquement champ vide + clavier fermé.
- Texte → voix → texte et voix → texte → voix conservent le même `session_id`, le même ordre et aucun « Bonjour » rejoué.
- Une photo envoyée pendant la conversation reste dans le même fil après rafraîchissement.
- Les erreurs micro, permission, upload, hors ligne et session indisponible offrent une continuation réelle.

### 12. TASKS
1. Refactorer le composer et supprimer toute superposition d’actions.
2. Implémenter mesure dynamique clavier/composer, scroll bas et visibilité du caret.
3. Piloter correctement les suggestions par focus, contenu et clavier.
4. Connecter saisie texte à la pause vocale et fiabiliser la reprise du même fil.
5. Rattacher toutes les pièces jointes à la session active et corriger les états d’échec.
6. Diagnostiquer et corriger la cause réelle de `session_start_failed` sans migration non justifiée.
7. Ajouter les tests de régression unitaires/intégration.
8. Exécuter Playwright en mobile 390 px pour clavier simulé, 1/5/10 lignes, texte↔voix, upload et rafraîchissement; tester aussi les dimensions iPhone Safari via WebKit si disponible et documenter la limite matérielle réelle.
9. Exécuter tests, types, lint critique et build; vérifier les journaux runtime et réseau avant de conclure.
