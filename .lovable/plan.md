Plan de correction prioritaire pour rendre Alex impossible à bloquer.

Constat principal

Le problème est très probablement une combinaison de deux blocages :

1. Le TTS classique reçoit un fallback JSON `{ fallback: true }`, mais le flux actuel le traite comme une fin “réussie” dans certains chemins. Résultat : `autoplay_success` peut être loggé même si aucune voix n’a joué.
2. L’overlay vocal plein écran bloque volontairement la fermeture pendant la stabilisation. Or les chemins `boot_timeout`, `permission_denied`, `no_first_audio_final`, `voice_error_pre_audio` appellent `closeVoiceSession(reason)` avec des raisons qui ne sont pas autorisées pendant cette fenêtre. Résultat possible : fallback chat ouvert, mais overlay/loader vocal reste verrouillé par-dessus.

Objectif de l’implémentation

Alex ne doit jamais rester en spinner ou en “connecting voice”. À chaque échec voix, elle doit :

- arrêter toutes les requêtes/audio/micro/timers,
- resetter les états de loading,
- afficher le mode chat immédiatement,
- laisser l’utilisateur fermer, relancer ou continuer sans refresh.

Étapes de build

1. Ajouter une couche centrale de récupération Alex

Créer un module dédié, par exemple `src/features/alex/services/alexHardRecovery.ts`, avec :

- `TTS_TIMEOUT_MS = 8000`
- `TTS_SLOW_MS = 6000`
- `ALEX_FROZEN_MS = 10000`
- `MAX_TTS_RETRIES = 1`
- `VOICE_ERROR_WINDOW_MS = 120000`
- `VOICE_DISABLED_MS = 600000`

Fonctions exposées :

- `hardResetAlexSession(reason)`
- `switchAlexToChatFallback(reason, message?)`
- `recordVoiceFailure(reason)`
- `isVoiceTemporarilyDisabled()`
- `clearAlexRecoveryTimers()`

Cette couche appellera :

- arrêt audio ElevenLabs TTS,
- arrêt STT,
- reset Zustand Alex,
- fermeture ou fallback de l’overlay vocal,
- dispatch `alex-voice-force-kill` et `alex-voice-cleanup`,
- reset des flags `hasActiveTTSRequest`, `hasActivePlayback`, `hasActiveSTTSession`, `isMicOpen`, `isUserSpeaking`, `audioUnlockRequired`, etc.

2. Étendre le store Alex pour supporter le recovery complet

Dans `src/features/alex/state/alexStore.ts` :

- ajouter `lastTTSActivityAt`, `voiceErrorTimestamps`, `voiceDisabledUntil`, `voiceUnavailableReason`, `recoveryNotice`, `ttsRetryCount`.
- ajouter actions :
  - `markTTSActivity()`
  - `markVoiceUnavailable(reason)`
  - `hardReset(reason)`
  - `setChatOnlyUntil(timestamp, reason)`
  - `clearRecoveryNotice()`

Le reset devra forcer :

```ts
mode = "fallback_text" ou "ready"
hasActivePlayback = false
hasActiveTTSRequest = false
hasActiveSTTSession = false
isMicOpen = false
isUserSpeaking = false
isBackgroundNoise = false
hasLowConfidenceAudio = false
softPromptText = null
ttsRetryCount = 0
```

3. Rendre `elevenlabsService.speak()` cancellable et impossible à figer

Dans `src/features/alex/services/elevenlabsService.ts` :

- ajouter un `AbortController` global par requête TTS.
- remplacer `supabase.functions.invoke("alex-tts")` si nécessaire par un `fetch()` direct vers la fonction pour supporter un vrai abort et récupérer proprement JSON/audio.
- imposer un hard timeout de 8 secondes.
- logger :
  - `[ALEX_TTS_START]`
  - `[ALEX_TTS_SUCCESS]`
  - `[ALEX_TTS_TIMEOUT]`
  - `[ALEX_TTS_ABORT]`
  - `[ALEX_TTS_FALLBACK]`
  - `[ALEX_HARD_RESET]`
- si la réponse contient `{ fallback: true }`, ne pas résoudre comme succès audio. Retourner un résultat typé `fallback` ou lancer une erreur contrôlée `TTS_FALLBACK`.
- dans tous les chemins `catch` et `finally`, garantir `cleanup()` et reset des flags loading.

4. Corriger `useAlexVoice` et `useAlexBootstrap`

Dans `src/features/alex/hooks/useAlexVoice.ts` :

- entourer chaque `speak()` avec timeout + fallback.
- en cas d’erreur TTS :
  - ne pas retry en boucle,
  - appeler `markVoiceUnavailable`,
  - injecter une seule fois : “La voix d’Alex est temporairement indisponible. Je continue ici.”,
  - passer en `fallback_text` ou `ready`,
  - laisser l’input chat actif.
- exposer `recoverAlex()` pour le bouton “Relancer Alex”.

Dans `src/features/alex/hooks/useAlexBootstrap.ts` :

- corriger le faux `boot:v7:autoplay_success` quand le TTS retourne fallback.
- si l’autoplay échoue ou timeout, ne pas laisser `shouldSpeakGreetingOnUnlock` bloquer en boucle.
- afficher la valeur texte immédiatement et garder la voix désactivée temporairement si 3 erreurs en 2 minutes.

5. Ajouter un watchdog anti-freeze global

Créer un hook `useAlexRecoveryWatchdog()` monté dans `AlexProvider`.

Toutes les 3 secondes :

- si `hasActiveTTSRequest` ou `mode === "connecting_voice"` depuis plus de 10 secondes :
  - log `ALEX FROZEN — AUTO RECOVERY`,
  - `hardResetAlexSession("tts_watchdog_frozen")`,
  - fallback chat.
- si `mode === "thinking"` ou `analyzing_image` trop longtemps après erreur réseau, revenir à l’input.
- si `document.visibilitychange` revient à visible sur mobile/Android et qu’un état audio est actif mais cassé : stop audio + reset + chat fallback.

6. Corriger le verrou de l’overlay vocal plein écran

Dans `src/stores/alexVoiceLockedStore.ts` :

- ajouter `forceCloseVoiceSession(reason)` qui bypass la fenêtre de stabilisation.
- ou autoriser explicitement les raisons fallback critiques :
  - `boot_timeout`
  - `permission_denied`
  - `boot_failed`
  - `disconnect_pre_audio`
  - `voice_error_pre_audio`
  - `no_first_audio_final`
  - `retry_no_audio`
  - `recovery_fallback_chat`
  - `fallback_to_chat`

Dans `OverlayAlexVoiceFullScreen.tsx` :

- remplacer les fermetures fallback par `forceCloseVoiceSession`.
- garantir que `bailToChat()` efface tous les timers, stoppe `useLiveVoice`, unlock runtime et ferme l’overlay avant/après ouverture du chat.
- après 6 secondes de boot lent, afficher :
  “Connexion vocale lente… Je continue par message pendant la reconnexion.”
  puis activer le bouton chat et retirer le spinner bloquant.

7. Renforcer `useLiveVoice`

Dans `src/hooks/useLiveVoice.ts` :

- ajouter un AbortController logique pour la demande `voice-get-signed-url` si possible.
- garantir qu’un timeout de connexion appelle toujours `setIsConnecting(false)` et `onError` une seule fois.
- éviter double `onError` + `onDisconnect` après un stop intentionnel.
- ajouter écoute `alex-voice-force-kill` pour terminer la session SDK, reset local et clear timeout.
- si micro refusé : fallback chat immédiat, pas d’écran bloqué.

8. Ajouter un `AlexErrorBoundary`

Créer `src/features/alex/AlexErrorBoundary.tsx` et entourer :

- `AlexAssistant` / `AlexPanel`,
- `OverlayAlexVoiceFullScreen`,
- `AlexChatFallbackPanel`.

En cas d’erreur React dans Alex seulement :

- ne pas déclencher la page blanche globale,
- afficher une carte compacte :
  - “Alex a été réinitialisée.”
  - bouton “Relancer Alex”
  - bouton “Continuer par chat”
  - bouton “Fermer”

9. Ajouter les contrôles UX visibles

Dans `AlexPanel.tsx` :

- afficher un bandeau premium quand voix indisponible :
  “La voix d’Alex est temporairement indisponible. Je continue ici.”
- ajouter bouton “Relancer Alex” si `voiceUnavailableReason` ou `voiceDisabledUntil` actif.
- ajouter bouton “Fermer”/minimiser toujours accessible.
- garder `AlexInput` actif en permanence.

Dans `AlexMessageList.tsx` :

- le loader `thinking` ne doit jamais apparaître indéfiniment.
- si recovery notice actif, afficher un message système plutôt qu’un spinner.

10. Corriger la fonction backend `alex-tts`

Dans `supabase/functions/alex-tts/index.ts` :

- utiliser l’import Deno standard du projet : `https://esm.sh/@supabase/supabase-js@2.49.1`.
- ajouter timeout autour du fetch ElevenLabs.
- en cas d’erreur ou de timeout, retourner `200` avec `{ fallback: true, error: "tts_unavailable" }` plutôt qu’un 500/503.
- ne jamais bloquer sur les logs database.

11. Vérification ciblée

Après implémentation, vérifier les scénarios :

- ElevenLabs TTS indisponible : aucun spinner, chat disponible.
- `alex-tts` retourne `{ fallback: true }` : pas de faux succès audio.
- timeout TTS > 8s : abort + fallback.
- overlay vocal ouvert puis aucun audio : fermeture forcée + chat.
- permission micro refusée : chat immédiat.
- retour Android foreground : reset audio propre.
- 3 erreurs voix en 2 minutes : mode chat-only 10 minutes.
- bouton “Relancer Alex” : hard reset puis réinitialisation propre.

Résultat attendu

Alex restera utilisable même si toute la couche vocale échoue. Plus de page blanche, plus de spinner infini, plus de session lockée, plus de refresh obligatoire.

<lov-actions>
<lov-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</lov-link>
</lov-actions>