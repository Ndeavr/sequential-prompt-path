

# Alex V7 — Identity + Voice + Language Lock

## Critical Bugs Found

1. **Fake "Alex parle..." state**: `startSpeaking()` sets `mode: "speaking"` immediately when TTS request is sent, not when audio actually plays. The `onStart` callback in `elevenlabsService.speak()` fires right before `audio.play()` but `startSpeaking()` is called even earlier in the voice hook.

2. **Client/Edge function body mismatch**: `elevenlabsService.ts` sends `{ text, voiceId, modelId, voiceSettings }` but `alex-tts` edge function expects `{ text, voice_session_id, settings }`. The voice settings are silently ignored.

3. **No verified user name**: `useAlexBootstrap.ts` reads `localStorage` auth token directly for the name — no verification against current auth session. Stale tokens from other users could leak names.

4. **Session restore can override language**: `useAlexSessionRestore.ts` restores `activeLanguage` from snapshot before bootstrap locks it to `fr-CA`.

5. **No voice ID lock**: Client sends a voice ID to the edge function, but the edge function ignores it and uses its hardcoded `PRIMARY_VOICE_ID`. However, there's no client-side guard preventing a wrong voice from being used if the service is modified.

## Fixes

### 1. Fix speaking state — only set when audio actually starts

**File: `src/features/alex/state/alexStore.ts`**
- Add `connecting_voice` to the mode type (if not already present)
- Add `startConnectingVoice()` action that sets `mode: "connecting_voice"` without setting `hasActivePlayback`
- Change `startSpeaking()` to only be called when audio playback actually begins

**File: `src/features/alex/types/alex.types.ts`**
- Add `"connecting_voice"` to the `AlexMode` union type

**File: `src/features/alex/state/alexSelectors.ts`**
- Add `connecting_voice` label: `{ fr: "Connexion…", en: "Connecting…" }`

### 2. Fix voice hook — real playback state + voice ID lock

**File: `src/features/alex/hooks/useAlexVoice.ts`**
- In `speak()` and `speakGreetingNow()`: call `startConnectingVoice()` first, then only call `startSpeaking()` inside the `onStart` callback of `elevenlabsService.speak()`
- If voice fails, never fallback to browser speech — set `mode: "ready"` and log `BROWSER_VOICE_FALLBACK_BLOCKED`

### 3. Fix elevenlabs service — match edge function contract + voice ID lock

**File: `src/features/alex/services/elevenlabsService.ts`**
- Change `speak()` body to send `{ text, settings: VOICE_SETTINGS }` matching what the edge function expects
- Remove `voiceId` and `modelId` from the body (edge function uses hardcoded values)
- Add `ALEX_PRIMARY_VOICE_ID` constant and log if mismatched
- Move `onStart?.()` call to fire only after `audio.play()` resolves (not before)

### 4. Fix bootstrap — verified user name + forced fr-CA

**File: `src/features/alex/hooks/useAlexBootstrap.ts`**
- Replace `buildGreeting()` localStorage parsing with `getVerifiedGreetingName()` that uses the Supabase client's `getSession()` to get the current auth user
- Make bootstrap async-safe: inject greeting with "Bonjour." immediately, then if auth resolves with a first name within 500ms, update the greeting text
- Force `activeLanguage: "fr-CA"` and log `OPENING_LANGUAGE_LOCKED_FR_CA`
- Log `USER_NAME_VERIFIED` or `USER_NAME_MISMATCH_BLOCKED`

### 5. Fix session restore — prevent identity/language contamination

**File: `src/features/alex/hooks/useAlexSessionRestore.ts`**
- Remove `activeLanguage` from restored fields — bootstrap locks it to `fr-CA`
- Add auth user ID check: if restored session has messages from a different user context, discard identity fields and log `SESSION_IDENTITY_DISCARDED`

### 6. Fix AlexOrb — add connecting_voice visual state

**File: `src/features/alex/AlexOrb.tsx`**
- Add `connecting_voice` to `MODE_STYLES` with a subtle loading animation (pulsing ring, slightly smaller scale)

### 7. Update debug panel — V7 fields

**File: `src/features/alex/AlexDebugPanel.tsx`**
- Add rows: `verifiedName`, `voiceId`, `voiceLocked`, `playbackStarted`, `connectingVoice`

### 8. Update mode labels

**File: `src/features/alex/state/alexSelectors.ts`**
- `connecting_voice`: `{ fr: "Connexion…", en: "Connecting…" }`
- Keep `speaking` label as `{ fr: "Alex parle…", en: "Alex speaking…" }` — now only shown when audio is truly playing

## Files Modified

| Action | File |
|---|---|
| Modify | `src/features/alex/types/alex.types.ts` — add `connecting_voice` mode |
| Modify | `src/features/alex/state/alexStore.ts` — add `startConnectingVoice()` action |
| Modify | `src/features/alex/state/alexSelectors.ts` — add `connecting_voice` label |
| Modify | `src/features/alex/services/elevenlabsService.ts` — fix body contract, move onStart after play |
| Modify | `src/features/alex/hooks/useAlexVoice.ts` — use connecting_voice, real playback state |
| Modify | `src/features/alex/hooks/useAlexBootstrap.ts` — verified auth name, forced fr-CA |
| Modify | `src/features/alex/hooks/useAlexSessionRestore.ts` — prevent language/identity override |
| Modify | `src/features/alex/AlexOrb.tsx` — add connecting_voice style |
| Modify | `src/features/alex/AlexDebugPanel.tsx` — add V7 debug fields |

