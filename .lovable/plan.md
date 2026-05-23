
# Alex — One Voice, One Pipeline (Female, Sophia)

## Decision

- **Female voice = Sophia** `YxrwjAKoUKULGd0g8K9Y` (currently `ALEX_VOICE_BASE`).
- **Conversational engine kept = ElevenLabs Conversational Agent** (`useLiveVoice` + `@elevenlabs/react`).  
  This is the pipeline with the best VAD, turn-taking, interruption and pacing. The legacy `alex-tts` / browser `speechSynthesis` paths only handle one-shot playback or fallback — they will be removed from the live conversation surfaces.
- The current "male voice" you hear comes from the ElevenLabs agent's default voice winning when our client-side overrides are dropped (per the voice-connection-stability rule, overrides are not applied in `startSession`). We will force the female voice **server-side** via a signed URL with `conversation_config_override`, so the agent can never speak with another voice.

## Scope

Touch only Alex voice plumbing. Do not touch business logic, layouts, or auth.

## 1. Central config (single source of truth)

`src/config/alexVoiceConfig.ts`

- Add hard flags:
  ```
  ALEX_VOICE_MODE = "female_only"
  ALEX_TTS_PROVIDER = "elevenlabs"
  ALEX_VOICE_ID = "YxrwjAKoUKULGd0g8K9Y"  // Sophia
  ALEX_DISABLE_BROWSER_TTS = true
  ALEX_DISABLE_MALE_FALLBACK = true
  ```
- Make `ALEX_VOICE_BACKUP.voiceId` = same Sophia ID (no different fallback voice — only retry).
- Export a helper `getAlexFemaleVoiceId()` used everywhere.
- Keep `PROTECTED FILE — ALEX VOICE CORE` header.

## 2. Server-side voice lock (signed URL)

`supabase/functions/voice-get-signed-url/index.ts` and `alex-conversation-token/index.ts`

- When requesting the signed URL / conversation token from ElevenLabs, append `conversation_config_override` payload pinning:
  - `tts.voice_id = Sophia`
  - `tts.model_id = eleven_multilingual_v2`
  - `tts.output_format = mp3_44100_128`
  - `agent.language = "fr"`
- This guarantees the agent speaks Sophia even if client overrides are ignored.
- Add a server log line `voice_lock_applied=female_only voice_id=Sophia`.
- Mirror on `pro-landing-tts` / `alex-voice-test`: replace any other voice IDs with `getAlexFemaleVoiceId()` (Charlotte references in `pro-landing-tts/index.ts`, `alex-voice-test/index.ts`, and the seed migration string become Sophia).

## 3. Personalized greeting

`src/features/alex/voice/alexSystemPromptV2.ts` (`buildAlexFirstMessage`) + `useLiveVoice` start flow.

- New canonical first message when authenticated:
  ```
  Bonjour {firstName}. Je vous écoute.
  ```
- When no first name: `Bonjour. Je vous écoute.`
- Prompt instruction added to `ALEX_CORE_PROMPT`:
  > Après le message d'accueil, tu écoutes. Tu ne poses pas de question avant que l'utilisateur parle.
- `useLiveVoice.start()` reads `firstName` from `useAuth().user.user_metadata.first_name` and passes it to overrides (used for prompt context only; the *server* still owns the spoken first message via override).

## 4. Silence behavior

`src/hooks/useAlexConversationControl.ts` + reminder copy.

- Replace the two reminders with:
  - Reminder 1 (after long silence, only once): `"Je reste disponible quand vous êtes prêt."`
  - Reminder 2: **none** — switch to passive listen state, no auto-close question.
- Remove any "êtes-vous encore là ?" string from FR reminders and from Alex prompt examples.

## 5. Kill all browser TTS + male/duplicate playback

- `src/services/alexVoiceAbstraction.ts`: remove `window.speechSynthesis.speak/cancel` calls and the `speak()` method in `HybridVoiceProvider`. Replace TTS path with a no-op that logs `blocked_browser_tts` and emits an error so callers don't think audio played. Keep STT (recognition) for fallback transcript only.
- Search-and-remove every `new SpeechSynthesisUtterance` and `speechSynthesis.` usage across `src/`.
- `OverlayAlexVoiceFullScreen.tsx` + `useAlexBootstrap.ts` + `useAlexVoice.ts`: when live conversation (`useLiveVoice`) is active, the legacy `elevenlabsService.speak()` one-shot path must be suppressed (guard via `if (liveVoiceActive) return`) so we never get a second audio stream over the agent's audio.
- Ensure `elevenlabsService.ts` always reads `getAlexFemaleVoiceId()` (already does, but lock it through the new constant).

## 6. Smoke test update

`src/lib/voiceSmokeTest.ts` + `scripts/pre-deploy-voice-guard.mjs`

- `primary_tts_returns_audio` and `fallback_tts_returns_audio` both target Sophia.
- New assertion: `no_browser_tts_calls` — fails if `window.speechSynthesis` is invoked during the smoke run (instrument by stubbing).
- New assertion: `signed_url_includes_voice_override` — calls the edge function, checks the override payload echoed back.

## 7. Manual QA on `/decrire-mon-projet`

After deploy, open on mobile (Chrome Android + Safari iOS), logged in as Yanick:

- Tap orb → exactly one female voice says `Bonjour Yanick. Je vous écoute.`
- Alex stops, mic indicator listening.
- No male voice intro, no echo, no `speechSynthesis` warning in console.
- Stay silent 30s → one calm `"Je reste disponible quand vous êtes prêt."` and Alex stays open.

## Technical notes

- ElevenLabs override must also be enabled in the agent dashboard (Security → Overrides) for `tts.voice_id`, `agent.firstMessage`, `agent.language` — otherwise the server `conversation_config_override` is ignored. If it is not enabled, the signed-URL approach is mandatory and we will document a one-time toggle in `docs/voice-health.md`.
- All edge functions use `https://esm.sh/@supabase/supabase-js@2.49.1` (project rule).
- No DB migration required unless we want to seed the new `ALEX_VOICE_ID` row; if needed, an insert into `voice_profiles` is added.

## Out of scope

- New UI components, new admin pages.
- Visual/orb styling.
- Auth flows, routing.
- Multi-voice/multi-language voice picking.
