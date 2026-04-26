# Alex Voice Reliability Layer

## Diagnostic confirmé (logs de la session courante)

```
23:07:35 Fetching signed URL...
23:07:48 Starting ElevenLabs (13s plus tard !)
23:07:58 ⏱️ Boot timeout — forcing error state
```

**Root cause identifiée :**
1. `voice-get-signed-url` met **9–13 s** à répondre (cold start + lookup `voice_configs` + appel ElevenLabs séquentiel) → on dépasse `BOOT_TIMEOUT_MS = 10s`.
2. Le prompt « Hive Mind » (~6 KB) est envoyé en override à chaque session → augmente le temps de boot agent côté ElevenLabs.
3. Aucun retry automatique côté client → un seul échec = mur « Alex ne parle pas ».
4. Pas de fallback chat fonctionnel : `handleFallbackChat` ferme juste l'overlay sans ouvrir de chat.
5. Pas de panneau debug admin pour voir où ça casse.

---

## Changements

### 1. Nouveau service central `src/services/alexVoiceService.ts`
Machine d'état unifiée + observable (subscribe/notify). États :
`idle → initializing → requesting_token → token_ready → connecting → connected → listening → thinking → speaking → reconnecting → failed → fallback_chat`.

Chaque transition produit `console.log("[ALEX VOICE] <state>")` et expose :
- `lastError`, `retryCount`, `latencyMs`, `tokenReceived`, `wsConnected`, `micPermission`, `audioUnlocked`.

### 2. Edge function `voice-get-signed-url` — accélération
- Lookup `voice_configs` et appel ElevenLabs en **parallèle** (`Promise.all`) avec config par défaut hardcodée.
- Cache mémoire in-process du `agent_id` actif (TTL 60s) pour éviter le cold-DB-hit à chaque appel.
- Retourne JSON même en cas d'erreur partielle avec `fallback: "chat"` quand l'API key est absente.
- Toutes réponses incluent `corsHeaders`.

### 3. Système de retry automatique (intégré au boot)
Dans `OverlayAlexVoiceFullScreen.tsx` (et propagé via `alexVoiceService`) :
- Tentative 1 : standard.
- Si pas de premier audio en **4 s** → retry silencieux (backoff 500 ms).
- Tentative 2 : nouveau token (backoff 1500 ms).
- Tentative 3 : reset complet session (backoff 3000 ms).
- Après 3 échecs → bascule automatique en `fallback_chat`.

`BOOT_TIMEOUT_MS` passe à **15 s** pour absorber le cold start initial.

### 4. Slim prompt pour ElevenLabs
Nouveau `src/features/alex/voice/alexCorePrompt.ts` :
- `ALEX_CORE_PROMPT` : version courte (~600 caractères) envoyée à ElevenLabs en override.
- `ALEX_STRATEGY_PROMPT` : reste l'actuel `ALEX_SYSTEM_PROMPT_V3`, conservé pour `alex-chat` (router app-side / fallback).
- `alexAgentOverrides.ts` utilise `ALEX_CORE_PROMPT` au lieu de V3.

### 5. Mobile audio unlock fortifié
- Avant chaque `start()`, dans `useLiveVoice` : `new AudioContext()` + `await ctx.resume()` + silent buffer (déjà partiellement présent dans `useGlobalAudioUnlock`).
- Bouton « Touchez pour activer la voix » affiché si `AudioContext.state === "suspended"` après tentative de reprise (état `audio_locked` exposé par le service).

### 6. Microphone permissions — non-bloquant
- Si `getUserMedia` rejette → service passe en `fallback_chat` directement, toast « Micro désactivé. Vous pouvez continuer par chat. », overlay vocal fermé, chat ouvert (cf. point 7).

### 7. Fallback chat fonctionnel
- Nouveau composant `src/components/voice/AlexChatFallbackPanel.tsx` (drawer plein écran réutilisant `useAlex()` → edge `alex-chat`).
- `handleFallbackChat` dans `OverlayAlexVoiceFullScreen` ouvre ce panel via un nouveau store `useAlexChatFallbackStore` au lieu de juste fermer l'overlay.
- Le contexte conversation (transcripts déjà capturés) est passé en seed.
- Message d'ouverture : « La voix d'Alex est temporairement indisponible. Je continue ici. »

### 8. Health watchdog amélioré (déjà partiellement présent)
Dans `OverlayAlexVoiceFullScreen.tsx`, ajout :
- Si `isActive && !isSpeaking && !isListening` pendant **8 s** → `reconnect`.
- Si `wsClose` non intentionnel → `reconnect` (1 fois, sinon fallback).
- Bouton « Réinitialiser Alex » : full teardown + clear timers + clear token + reset audio context + nouveau token + reconnect (déjà bien câblé via `executeHardReset`, mais on s'assure que `tokenReceived` et `wsConnected` sont reset dans le service).

### 9. Panneau debug admin
Nouveau composant `src/components/voice/AlexVoiceDebugPanel.tsx` :
- Visible uniquement si `useAuth().isAdmin === true`.
- Carré flottant bottom-left dans l'overlay vocal.
- Affiche : api_key_configured (depuis edge function /health), signed_url_received, websocket_connected, mic_permission, audio_unlocked, current_state, last_error, retry_count, latency_ms.

### 10. UI copy mise à jour
- Suppression du message « Alex ne parle pas. Réessayez ou passez au chat. »
- Pendant retry : « La voix d'Alex tarde à démarrer. Je réessaie automatiquement. »
- Après échec final : « La voix est temporairement indisponible. Alex continue par chat. » + ouverture chat.

---

## Fichiers touchés

| Fichier | Action |
|---|---|
| `src/services/alexVoiceService.ts` | **Nouveau** — machine d'état + observable |
| `src/features/alex/voice/alexCorePrompt.ts` | **Nouveau** — slim prompt 600 char |
| `src/features/alex/voice/alexAgentOverrides.ts` | Utiliser `ALEX_CORE_PROMPT` |
| `src/components/voice/OverlayAlexVoiceFullScreen.tsx` | Retry auto, copy, watchdog 8s, BOOT_TIMEOUT 15s, branchement fallback chat |
| `src/components/voice/AlexChatFallbackPanel.tsx` | **Nouveau** — chat plein écran |
| `src/components/voice/AlexVoiceDebugPanel.tsx` | **Nouveau** — debug admin |
| `src/stores/alexChatFallbackStore.ts` | **Nouveau** — Zustand store |
| `src/hooks/useLiveVoice.ts` | Reprise AudioContext + détection lock + 1ère retry inline |
| `supabase/functions/voice-get-signed-url/index.ts` | Parallélisation + cache 60s + retours `fallback` |

Aucune migration DB requise.

---

## Tests d'acceptation

1. ✅ Mobile : tap orb → voix démarre **< 4 s** (retry inclus si nécessaire).
2. ✅ Refus micro → chat fallback ouvert immédiatement.
3. ✅ Token absent (API key vide) → message clair + chat ouvert.
4. ✅ Refresh → reconnexion propre.
5. ✅ Bouton Réinitialiser → nouvelle session complète.
6. ✅ Plus jamais de dead-end « Alex ne parle pas ».
7. ✅ Panneau debug admin visible uniquement aux admins.
8. ✅ Logs `[ALEX VOICE] <state>` à chaque transition.
