# Clara : le micro continue la conversation, il n'en crée jamais une nouvelle

## Ce qui se passe aujourd'hui (vérifié dans le code)

La continuité existe déjà en partie : au démarrage vocal, Clara charge la conversation
canonique (`clara-session`, action `brief`), construit un contexte de reprise et
enregistre chaque tour parlé dans le même fil (`recordClaraVoiceTurn`).

Trois causes réelles font quand même repartir Clara à zéro :

1. Le contexte de reprise est envoyé **après** la connexion, alors que l'agent vocal a
   déjà commencé à parler. Le premier message envoyé à l'agent quand une conversation
   est en cours est une chaîne vide, ce que le fournisseur remplace par son message
   d'accueil par défaut (« Bonjour, comment puis-je vous aider ? »).
2. La parole de secours (quand la voix temps réel échoue) rejoue toujours un accueil
   complet, même si une conversation est en cours.
3. Si l'utilisateur touche le micro avant que la conversation serveur existe, la voix
   démarre sans conversation de référence.

## Ce qui sera corrigé

**Continuité (cause architecturale)**
- Garantir la conversation canonique **avant** d'ouvrir le micro : même identifiant,
  même étape, même contexte, jamais de nouvelle session.
- Transmettre le contexte de reprise et la consigne « tu poursuis une conversation
  déjà commencée, ne te présente pas, ne redemande rien » dès l'ouverture de la session
  vocale, plus seulement après connexion.
- Remplacer le message d'ouverture vide par une continuation explicite, pour que le
  message d'accueil par défaut du fournisseur ne puisse plus s'imposer.
- Si Clara vient de poser une question, la première phrase dite est traitée comme la
  réponse à cette question.
- Parole de secours : aucune salutation quand une conversation est en cours, Clara
  passe directement en écoute.
- Le micro devient un **mode** (texte ↔ voix), jamais une création de session.

**Interface**
- Toucher 🎤 transforme le composeur en mode écoute **dans la même carte** : l'historique
  reste visible, aucun plein écran.
- Léger halo bleu « respirant » autour du micro quand la voix serait plus simple
  (question ouverte, description d'un problème, guidage en plusieurs étapes, longs
  messages, hésitation). Jamais pour un courriel, un téléphone, une adresse, un code,
  un montant, un oui/non, pendant un envoi de fichier ou quand la voix est active.
- Une seule petite infobulle par session (« Plus simple à expliquer à voix haute »),
  halo qui s'efface après ~10 s, puis période de repos.

## Détails techniques

- `src/services/clara/claraVoiceBridge.ts` : garantir la session canonique avant la
  voix, enrichir le contexte de reprise (dernière question, données déjà recueillies,
  étape et action en cours), fournir une continuation non vide.
- `src/hooks/useLiveVoice.ts` : injecter le contexte de reprise dans les overrides
  d'ouverture de session (en plus de l'envoi post-connexion), ne jamais laisser le
  message d'accueil par défaut s'appliquer sur une conversation en cours.
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (fichier protégé — modification
  vocale explicitement demandée) : parole de secours sans salutation si conversation
  en cours.
- `src/components/home-light/ClaraConversationBox.tsx` : calcul contextuel de
  `voiceRecommended`, halo + infobulle, état d'écoute inline du composeur.
- `src/index.css` : halo bleu (`0 0 0 4px rgba(20,130,255,0.08)`, `0 0 16px
  rgba(20,130,255,0.28)`, `0 0 28px rgba(20,130,255,0.12)`), animation 3 s très douce,
  désactivée en mouvement réduit; style du composeur en écoute.
- `src/utils/trackCopilotEvent.ts` : `clara_voice_suggested`, `clara_voice_suggestion_dismissed`.
- Tests A–G (texte→voix, voix→texte, alternance même session, aucune redemande,
  aucun nouveau « Bonjour », fil chronologique unique, reprise après rechargement)
  plus tests du halo et du mode écoute.

Aucune nouvelle table, route, fonction serveur ni architecture parallèle.
Rien n'est publié : vérification par tests, typecheck et compilation.
