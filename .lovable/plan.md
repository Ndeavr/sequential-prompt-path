# Objectif
Alex doit ouvrir la conversation **en voix**. Aujourd'hui, sur mobile (et au premier chargement), l'overlay s'ouvre directement en "Mode chat — La voix d'Alex est temporairement indisponible".

# Diagnostic

1. **Cause #1 — Autoplay bloqué traité comme une panne définitive.**
   `useAlexBootstrap.ts` (ligne ~168) appelle `elevenlabsService.speak(greeting)` ~immédiatement après le boot, **sans geste utilisateur**. Sur mobile, `audio.play()` est rejeté par le navigateur → `TTS_ERROR play_failed` → `markVoiceUnavailable("boot_autoplay_failed", "La voix d'Alex est temporairement indisponible…")`. L'UI bascule en chat avant même que l'utilisateur touche l'écran.

2. **Cause #2 — Voix verrouillée non utilisée par l'edge function.**
   La mémoire produit verrouille `or4EV8aZq78KWcXw48wd` (source unique : `src/config/alexVoiceConfig.ts`).
   Mais `supabase/functions/alex-tts/index.ts` est encore codé en dur sur Charlotte (`XB0fDUnXU5powFXDhCwa`) et ignore tout `voice_id` envoyé par le client. Donc même quand la voix démarre, ce n'est pas la bonne.

3. **Cause #3 — Aucun "tap pour activer la voix".**
   Quand l'autoplay échoue, on devrait demander un geste, pas tomber en chat. Le flag `audioUnlockRequired` existe (`useAlexVoice.unlockAudio` + `speakGreetingNow`) mais l'overlay n'affiche pas de CTA d'unlock — il montre directement le panneau de fallback chat.

# Plan d'implémentation

### 1. Bootstrap : ne plus marquer la voix indisponible quand c'est juste l'autoplay
Fichier : `src/features/alex/hooks/useAlexBootstrap.ts`
- Avant d'appeler `speak(greeting)`, vérifier `isAudioUnlocked`.
- Si **pas** unlocké → ne **pas** tenter `speak`. Mettre l'état :
  ```
  audioUnlockRequired: true
  shouldSpeakGreetingOnUnlock: true
  pendingGreetingText: greetingText
  mode: "ready"
  ```
  et logger `boot:awaiting_user_unlock`. **Ne pas** appeler `markVoiceUnavailable`.
- Si unlocké et que `speak` échoue avec `TTS_FALLBACK` (vrai signal serveur d'indisponibilité) → garder le comportement actuel (`markVoiceUnavailable`).
- Pour les autres erreurs (`TTS_ERROR play_failed`, `TTS_TIMEOUT`) → repasser à `audioUnlockRequired: true` + `shouldSpeakGreetingOnUnlock: true`, sans marquer indisponible. Compteur de retry max 1 avant vrai fallback.

### 2. Overlay voix : afficher un CTA "Activer la voix" au lieu du fallback chat
Fichier : composant overlay full-screen (`OverlayAlexVoiceFullScreen` / `AlexChatFallbackPanel`).
- Tant que `isVoiceAvailable === true && audioUnlockRequired === true` → afficher l'orbe + un gros bouton "Touchez pour parler à Alex".
- Au tap → appeler `useAlexVoice.unlockAudio()` (qui resume l'AudioContext puis appelle `speakGreetingNow`).
- Le panneau "Mode chat" ne s'affiche **que** si `isVoiceAvailable === false` (vraie panne TTS).

### 3. Edge function : utiliser la voix verrouillée
Fichier : `supabase/functions/alex-tts/index.ts`
- Remplacer `PRIMARY_VOICE_ID = "XB0fDUnXU5powFXDhCwa"` par `or4EV8aZq78KWcXw48wd` (voix concierge verrouillée).
- Accepter optionnellement `voice_id` dans le body et l'utiliser si présent (validé contre une whitelist d'IDs UNPRO).
- Conserver les voice_settings (`stability 0.48`, `similarity_boost 0.78`, `style 0.28`, `use_speaker_boost true`, `speed 1.05`) en valeurs par défaut, alignées sur `alexVoiceConfig.ts`.
- Garder le header `X-Alex-Voice-Id` pour observabilité.

### 4. Service client : envoyer la voix verrouillée + bons settings
Fichier : `src/features/alex/services/elevenlabsService.ts`
- Importer la config depuis `src/config/alexVoiceConfig.ts` (source unique) et envoyer `voice_id` + `settings` dans le body de `supabase.functions.invoke("alex-tts", …)`.
- Supprimer la constante `ALEX_PRIMARY_VOICE_ID` codée en dur (ou la faire pointer vers la config).

### 5. Vérification
- Tester `alex-tts` via curl edge → header doit retourner `X-Alex-Voice-Id: or4EV8aZq78KWcXw48wd`.
- Sur preview mobile (384×709) : à l'ouverture, l'orbe doit apparaître avec "Touchez pour parler à Alex" — au tap, la voix démarre avec le greeting "Bonjour. Je suis Alex d'UNPRO. Quel problème puis-je vous aider à régler aujourd'hui ?".
- Sur desktop : si autoplay autorisé, la voix démarre seule. Sinon même CTA.
- Confirmer dans la console : plus de log `boot:v7:autoplay_blocked_fallback` au premier chargement.

# Ce qui n'est PAS modifié
- Pas de changement aux flux orchestrator, matching, booking.
- Pas de modification du prompt Alex ni de la logique conversationnelle.
- Pas de touche au store global, juste à `useAlexBootstrap` et à l'overlay.
