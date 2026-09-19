# A — PROMPT LOVABLE FINAL

## 1. CONTEXT
Optimiser le flux mobile existant de Clara sur `/` sans nouvelle architecture. Conserver `alex_sessions` + `alex_messages`, `clara-session`, la file média existante, le moteur Voice existant et tous les parcours métier actuels.

Constats vérifiés :
- aucun état `isConversationActive` ne relie actuellement la carte, le hero et l’en-tête;
- la carte mobile reste limitée à `64dvh`, puis soustrait un décalage clavier calculé avec `innerHeight`, ce qui réduit excessivement l’historique;
- le composer réserve actuellement environ 100 px à vide et le textarea au moins 98 px;
- les réponses rapides acceptent jusqu’à six choix et le prompt serveur autorise également 2 à 6 choix;
- la file média valide l’image originale à 10 Mo avant d’exécuter la compression existante;
- les noms de fichiers bruts sont affichés dans l’état média;
- un échec réel de stockage authentifié peut actuellement être transformé en succès local, ce qui doit devenir un échec visible et réessayable;
- Voice est déjà rendu dans `home-clara-voice-slot` et utilise la session canonique : cette intégration doit être préservée.

## 2. OBJECTIVE
Créer deux états visuels cohérents :

```text
Avant interaction
Header normal → titre + sous-titre → carte Clara

Après interaction significative
Header mobile compact → carte Clara prioritaire
                         ├─ historique défilable
                         ├─ état média/Voice compact
                         └─ composer compact au-dessus du clavier
```

Garantir que le dernier échange utile et le composer restent visibles avec le clavier mobile ouvert.

## 3. USERS
- Propriétaires sur Chrome Android et Samsung Internet en priorité.
- Utilisateurs iPhone/Safari et petits écrans mobiles.
- Utilisateurs bureau, sans régression de mise en page ni de fonctions.

## 4. DELIVERABLES
- Mode conversation mobile activé après texte, réponse rapide, média ou Voice.
- Hero replié avec animation courte et mouvement réduit respecté.
- En-tête mobile compact uniquement lorsque la conversation est active.
- Carte Clara dimensionnée par la hauteur réellement visible.
- Composer 1 ligne, croissance progressive jusqu’à 4–5 lignes, puis défilement interne.
- Réponses rapides temporaires, pertinentes et non redondantes.
- Images volumineuses optimisées avant validation finale et envoi.
- Pièces jointes et erreurs affichées de façon compacte et humaine.
- Reprise automatique de Clara après un média explicitement demandé.
- Autoscroll respectueux de la position de lecture avec retour au dernier message.
- Instrumentation demandée, sans contenu utilisateur ni donnée sensible.
- Tests ciblés et validation responsive.

## 5. LOGIC
1. Déduire `isConversationActive` de la première interaction significative et le transmettre au hero et à l’en-tête par un signal UI local réversible; ne jamais le persister comme donnée métier.
2. Réinitialiser cet état uniquement lors de « Nouvelle conversation » explicite.
3. Mesurer `visualViewport.height`, `offsetTop` et le bas visible; exposer des variables CSS dédiées, écouter `resize` et `scroll`, nettoyer tous les listeners et fournir un fallback sans `visualViewport`.
4. Utiliser cette hauteur réelle pour la carte active; conserver un seul défilement dans l’historique et le scroll naturel de page hors conversation.
5. Limiter les choix fermés à l’action suivante. Pour une demande de photo, normaliser vers deux actions maximum : « Ajouter une photo » et « Continuer sans photo ».
6. Retirer immédiatement les choix après sélection et envoyer le choix utile comme message utilisateur canonique.
7. Prétraiter toute image avant la limite de 10 Mo : orientation navigateur, redimensionnement vers 2048–2560 px, compression JPEG/WebP appropriée, puis validation de la sortie. Ne jamais appliquer ce traitement aux PDF/documents.
8. Conserver les limites backend; refuser proprement une image encore trop lourde après optimisation.
9. Ne jamais convertir un échec de stockage authentifié en succès. Garder l’élément en erreur compacte avec reprise ciblée.
10. Après analyse réussie d’un média demandé, réutiliser le tour Clara existant pour poursuivre automatiquement, sans « voilà », double message ni nouvelle session.
11. Conserver le comportement actuel du Voice inline et la synchronisation texte/voix/média dans la même chronologie.

## 6. DATA
- Conserver l’autorité `alex_sessions` + `alex_messages` via `clara-session`.
- Conserver les références existantes de session, propriété, projet, analyses, jumelage et rendez-vous.
- Conserver le bucket privé et les règles d’accès existants.
- Ne créer aucune table, migration, route, fonction serveur, bucket ou stockage conversationnel parallèle.
- Ne journaliser que l’état technique agrégé : jamais le texte, le nom de fichier, l’image, le téléphone ou l’adresse.

## 7. UI/UX
- Réduire puis masquer le titre et le sous-titre après activation sur mobile; restaurer uniquement après une nouvelle conversation explicite.
- Maintenir le header actif entre 52 et 64 px, safe area comprise, sans changer le desktop.
- Donner à la carte la majorité de la hauteur utile et garder le composer ancré dans sa colonne, non fixé au viewport.
- Réduire le composer vide à environ 68–88 px avec cibles tactiles accessibles.
- Afficher une miniature et « Photo ajoutée ✓ »; afficher le vrai nom seulement pour un document fiable.
- Afficher les erreurs sur une ligne compacte avec « Réessayer » ou « Choisir un autre fichier » et fermeture.
- Afficher une flèche accessible « Nouveau message » uniquement lorsque l’utilisateur n’est plus près du bas.
- Préserver contraste, focus visible, lecteurs d’écran, safe areas et `prefers-reduced-motion`.

## 8. COMPONENTS
Refactorer uniquement les éléments existants nécessaires :
- `HeroHomeownerLight` pour piloter le mode initial/conversation;
- `ClaraConversationBox` pour activation, viewport, médias, réponses rapides et instrumentation;
- `SmartHeader` pour le mode compact mobile;
- `Conversation` pour le comportement de retour au dernier message;
- `PromptInput` seulement si son auto-grow partagé doit être corrigé sans régression;
- `claraMedia`, `claraMediaQueue` et `alexUploadService` pour optimiser avant validation et échouer honnêtement;
- styles homepage existants;
- règles de réponses rapides de `alex-chat` uniquement si le plafond global ne peut pas être assuré côté rendu, avec déploiement de cette seule fonction après test.

## 9. ACTIONS
- Ajouter les événements : `clara_conversation_activated`, `clara_hero_collapsed`, `clara_keyboard_viewport_adjusted`, `clara_quick_reply_selected`, `clara_attachment_selected`, `clara_image_compressed`, `clara_attachment_uploaded`, `clara_attachment_failed`, en préservant `clara_voice_started`.
- Dédupliquer les anciens événements équivalents plutôt que doubler les mesures.
- Nettoyer les URL temporaires des aperçus au retrait, à la nouvelle conversation et au démontage.
- Maintenir le focus et le scroll au dernier échange après envoi, sans forcer le scroll quand l’utilisateur consulte l’historique.

## 10. CONSTRAINTS
- Ne pas redessiner la home ni ajouter de section promotionnelle.
- Ne pas modifier Stripe, OTP, calendrier, onboarding, matching, admissibilité, RBQ ou données de production.
- Ne pas créer de résultat, entrepreneur, disponibilité, analyse ou succès d’upload simulé.
- Ne pas ouvrir Voice en plein écran sur la home.
- Ne pas relancer Voice automatiquement.
- Ne pas ajouter de second store ou de seconde session Clara.
- Préserver le fonctionnement desktop et les neuf correctifs antérieurs.

## 11. SUCCESS
- Les tests A–J passent sur 360×800, 390×844, 412×915, 430×932 et bureau.
- Le clavier simulé via `visualViewport` conserve le dernier message et le composer dans la zone visible.
- Une image de plus de 10 Mo est optimisée avant validation, puis envoyée ou refusée honnêtement après optimisation.
- Les choix photo sont limités à deux et disparaissent après sélection.
- Un historique long ne subit aucun retour forcé lorsqu’il est consulté.
- Texte → Voice → photo → texte → document → Voice conserve une seule session et une seule chronologie.
- Les tests ciblés, la suite automatisée, les types, le lint critique et le build passent.
- Les validations matérielles Android/Samsung/iPhone sont rapportées comme vérifiées uniquement si un appareil réel est disponible; sinon, le blocage externe exact est documenté.

## 12. TASKS
1. Ajouter les tests de régression du mode conversation, du viewport clavier, du composer, du scroll et des réponses rapides.
2. Implémenter l’état UI partagé et le repli hero/header mobile.
3. Corriger la géométrie flex, la hauteur visible, les safe areas et le composer auto-grow.
4. Normaliser les réponses rapides et leur retrait après action.
5. Déplacer l’optimisation image avant validation, renforcer le résultat d’upload et humaniser les états de fichiers.
6. Brancher la continuation automatique après média demandé sur le tour Clara existant.
7. Ajouter l’instrumentation sans données sensibles.
8. Vérifier Voice inline et la continuité canonique multimodale.
9. Exécuter les tests automatisés et les scénarios Playwright aux dimensions demandées, clavier fermé/ouvert, historique court/long, upload réussi/échoué et Voice inline.
10. Corriger toute régression trouvée, puis produire le rapport des résultats et des limites matérielles réelles.
