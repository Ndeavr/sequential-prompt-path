# Clara Voice = même conversation que Clara texte

## Constat vérifié dans le code

- La boîte texte de `/` écrit déjà dans la conversation canonique (`clara-session` → `alex_sessions` + `alex_messages`).
- L'overlay vocal (`OverlayAlexVoiceFullScreen` + `useLiveVoice`) démarre une session ElevenLabs **indépendante** : salutation construite localement (`buildAlexOpening`, `firstMessage` = « Bonjour… »), mémoire séparée dans `sessionStorage` (`alexSessionMemory`), transcriptions gardées seulement dans l'état local du composant.
- Résultat exact de la capture : la voix ne connaît ni le projet « refaire balcon », ni la réponse « Étage », et rien de ce qui est dit en voix ne revient dans le chat.

## Objectif

Une seule conversation. La voix devient un canal d'entrée/sortie de la conversation canonique : même `conversation_id`, même étape, même contexte, aucun doublon.

## Ce qui sera construit

### 1. Reprise d'état à l'ouverture de la voix
- Nouvelle action `brief` dans la fonction `clara-session` existante (aucune nouvelle table, aucune nouvelle couche de session) : renvoie l'état compact de la conversation active — étape courante, intention, derniers tours pertinents (6 max), question en attente, et les références métier déjà enregistrées (propriété, projet, lead, devis, vérification).
- Un service client `claraVoiceBridge` appelle ce brief **avant** l'ouverture de la session vocale.
- Le brief est injecté à l'agent de deux façons complémentaires : dans les surcharges de session au démarrage, puis par une mise à jour contextuelle immédiate à la connexion (ce second chemin fonctionne même si les surcharges sont refusées côté agent).
- Aucun historique brut complet n'est envoyé : résumé + derniers tours + question en attente seulement.

### 2. Pas de nouveau « Bonjour » quand une conversation existe
- Conversation active avec question en attente → la voix ne parle pas d'abord : l'orbe passe directement en écoute et attend la réponse affichée à l'écran.
- Conversation active sans question en attente → une relance courte de continuité (ex. « Parfait, à l'étage. Le balcon est en bois, en béton ou en fibre de verre ? »), jamais une salutation d'accueil.
- Aucune conversation active → la salutation actuelle est conservée, et la première interaction crée/utilise immédiatement la conversation canonique.

### 3. Synchronisation bidirectionnelle
- Chaque transcription utilisateur et chaque réponse de Clara en voix est écrite dans la conversation canonique via l'écriture idempotente existante (identifiant de message déterministe → aucun doublon si la connexion se rétablit ou si l'écran se relance).
- À la fermeture de l'overlay, la boîte texte recharge l'état serveur : la transcription et la réponse apparaissent dans le fil, à la bonne place, même `conversation_id`, même étape.
- Texte → voix → texte → voix, autant de fois que voulu, sans perte.

### 4. Réponses rapides et voix équivalentes
- Les options affichées (Bois | Béton | Fibre de verre | Je ne sais pas) restent valides pendant la voix : toucher l'option ou la dire produit le même message utilisateur dans la même conversation et la même suite de flux.

### 5. Fin de la mémoire vocale parallèle
- La mémoire `sessionStorage` de la voix cesse d'être une source de vérité : le contexte vient du serveur. Le fichier reste en place comme pont de compatibilité, sans autorité.

## Détails techniques

- Fichiers touchés : `supabase/functions/clara-session/index.ts` (action additive `brief`), nouveau `src/services/clara/claraVoiceBridge.ts`, `src/hooks/useLiveVoice.ts` (surcharges + première prise de parole conditionnelle + rappels de transcription), `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (chargement du brief, persistance des tours, fermeture propre), `src/components/home-light/ClaraConversationBox.tsx` (rechargement après fermeture de la voix).
- Aucune nouvelle table, aucune migration, aucun changement Stripe, aucun envoi automatique de message.
- Si les surcharges d'agent sont refusées côté fournisseur vocal, le chemin « mise à jour contextuelle à la connexion » prend le relais; si le brief est indisponible, la voix affiche l'état réel et continue sans inventer de contexte.

## Tests exécutés avant livraison

Scénario d'acceptation complet :

```text
TEXTE : Refaire balcon
CLARA : Rez-de-chaussée ou étage ?
TEXTE : Étage
OUVERTURE VOIX  → aucune salutation, poursuite à la bonne question
VOIX : Bois
FERMETURE VOIX  → le chat affiche Étage → question → Bois → suite
```

Vérifications supplémentaires : même identifiant de conversation du début à la fin, aucun doublon, ouverture puis fermeture de la voix sans répondre, réouverture, rafraîchissement, verrouillage/déverrouillage du téléphone, perte puis retour réseau, second appareil avec le même compte, et tests de régression ajoutés. Aucune publication automatique.
