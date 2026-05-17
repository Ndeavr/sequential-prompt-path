## Problème confirmé

Alex affiche le message, mais ne parle pas et n’écoute pas parce que le démarrage live ElevenLabs bloque jusqu’au timeout 12s. Ensuite, le fallback TTS se déclenche deux fois et s’auto-annule :

- `Connection timeout — voice unavailable` dans `useLiveVoice.ts`
- `AbortError: signal is aborted without reason` dans `elevenlabsService.speak()`
- puis `play() can only be initiated by a user gesture` parce que le deuxième fallback audio arrive hors geste utilisateur
- `Boot already in progress — ignoring` empêche le redémarrage propre

Le backend répond correctement : `voice-get-signed-url` retourne `signedUrl`, `conversationToken`, `agentId`, `voiceId`. Le TTS `alex-tts` retourne aussi un MP3 valide. Le problème est donc côté orchestration client, pas côté clé/endpoint.

## Objectif

Rendre le bouton orb voice-first fiable : au tap utilisateur, Alex doit immédiatement parler via le chemin audio qui fonctionne déjà, puis passer en écoute. Le live ElevenLabs peut rester disponible comme moteur principal, mais il ne doit plus bloquer la voix ni tuer le fallback.

## Correctif minimal protégé

Modifier uniquement les fichiers voice explicitement concernés :

1. `src/components/voice/OverlayAlexVoiceFullScreen.tsx`
   - Remplacer les bails automatiques `bailToChat("no_first_audio")` par `playTtsFallbackGreeting("no_first_audio")`.
   - Empêcher le double appel TTS fallback avec un verrou `ttsFallbackInProgressRef`.
   - Ne plus appeler `stop()` juste avant `playTtsFallbackGreeting()`, car ce stop déclenche `onDisconnect`, relance le fallback, puis annule le premier fetch audio.
   - Garder l’overlay ouvert après fallback TTS.
   - Après la fin du TTS fallback, passer à `awaiting_user` puis `listening` au lieu de fermer vers chat.
   - Conserver le bouton chat comme option utilisateur, pas comme sortie automatique.

2. `src/features/alex/services/elevenlabsService.ts`
   - Ajouter un mode de lecture TTS résilient au contexte mobile : si `audio.play()` échoue faute de geste utilisateur, exposer l’erreur sans déclencher une fermeture automatique.
   - Ne pas aborter une requête TTS déjà en cours si le même greeting est déjà en lecture/démarrage.
   - Préserver voice ID, endpoint, tuning et headers protégés.

3. `src/hooks/useLiveVoice.ts`
   - Libérer `bootInProgressRef` quand le timeout interne se déclenche, sinon les taps suivants restent ignorés.
   - Ne pas déclencher `onError` puis `onDisconnect` comme deux chemins de fallback concurrents pour le même timeout.
   - Conserver WebRTC/WebSocket existants, sans changer agent ID, voice ID, permissions, routes ou clés.

4. `src/lib/voiceSmokeTest.ts`
   - Étendre le test pour détecter précisément ce bug : un timeout live ne doit pas fermer l’overlay avant que le TTS fallback ait eu une chance de parler.
   - Garder le contrôle credentials + TTS existant.

## Validation

- Vérifier dans les logs que les erreurs suivantes disparaissent :
  - `signal is aborted without reason`
  - `play() can only be initiated by a user gesture` comme cause de fermeture
  - double fallback `disconnect_pre_audio` + `voice_error_pre_audio`
  - `Boot already in progress — ignoring` après timeout
- Vérifier que `voice-get-signed-url` reste 200.
- Vérifier que `alex-tts` reste 200 et retourne bien audio MP3.
- Vérifier que l’overlay ne bascule plus automatiquement en chat comme première réponse.

## Contraintes

- Ne pas modifier les clés ElevenLabs.
- Ne pas modifier les voice IDs.
- Ne pas modifier les routes qui montent Alex.
- Ne pas modifier l’ordre d’initialisation global.
- Ne pas supprimer, renommer ou déplacer les fichiers voice.
- Ne pas toucher aux fichiers non-voice.

## Résultat attendu

Au tap sur l’orb : Alex parle réellement. Si le live ElevenLabs ne connecte pas assez vite, le TTS de secours parle quand même et l’interface reste en mode voix/écoute au lieu de fermer vers chat.