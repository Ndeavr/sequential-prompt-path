# Alex Premium Concierge — ElevenLabs Master Config V2

> **Goal**: Transform Alex into a 100M$-grade female premium concierge (ElevenLabs Conversational AI) — auto-starts in French 2.5s after homepage load, runs the V2 voice settings, follows the discovery flow, never asks contact info before login.

**Current state confirmed**:
- Agent `agent_5901kmg4ra2eee5bbp9r7ew5jcs7` with voice `UJCi4DDncuo0VJDSIegj` is active in `voice_configs` (env=prod)
- `useLiveVoice` already wires `@elevenlabs/react` `useConversation` to `voice-get-signed-url`
- `AlexVoiceContext.openAlex()` opens the locked full-screen overlay
- Copilot homepage (`PageHomeCopilot`) does NOT auto-start Alex — user must tap "Parler à Alex" or send a chip
- ElevenLabs voice settings (stability/similarity/style/speaker_boost) only live inside `alex-tts` (legacy TTS path), NOT inside the conversational agent overrides

---

## 1. Push V2 voice settings + system prompt to the conversational agent

**File**: `src/hooks/useLiveVoice.ts` + new `src/features/alex/voice/alexAgentOverrides.ts`

- Build a single `buildAlexAgentOverrides(language)` helper returning:
  ```ts
  {
    agent: {
      prompt: { prompt: ALEX_SYSTEM_PROMPT_V2 },
      firstMessage: openingFor(language, firstName),
      language,
    },
    tts: {
      voiceId: "UJCi4DDncuo0VJDSIegj",
      stability: 0.56,
      similarity_boost: 0.84,
      style: 0.14,
      use_speaker_boost: true,
    },
  }
  ```
- `ALEX_SYSTEM_PROMPT_V2` lives in `src/features/alex/voice/alexSystemPromptV2.ts` (canonical text from spec: identity, FR-first, one-question-at-a-time, discovery flow, forbidden phrases, closing lines, pronunciation map UNPRO/RBQ/NEQ).
- Pass `overrides` into `conversation.startSession({ signedUrl, overrides })` and gate behind a feature flag `alexVoiceV2Enabled` (default true).
- Memory: write `mem://ai/alex/voice-elevenlabs-v2` documenting voice settings, agent ID, and override contract (and remove the contradicting masculine memory `mem://ai/alex/voice-identity-and-behavior`).

> **Note**: Overrides MUST be enabled in the ElevenLabs dashboard for this agent (prompt, firstMessage, language, tts.voiceId, voice settings). The plan adds a clear console warning + admin notice if overrides are rejected by the agent.

---

## 2. Auto-start Alex 2.5s after Copilot homepage load

**Files**:
- `src/pages/PageHomeCopilot.tsx`
- new `src/hooks/useAlexAutoGreet.ts`

Behavior:
- 2.5s after mount, if (a) user has not interacted, (b) no other Alex session is open, (c) the device is not in reduced-motion / low-data mode, call `openAlex("home_copilot_autostart", "fr_first_greet")`.
- Pull `firstName` from `auth.user.user_metadata.first_name` → injected into agent overrides → ElevenLabs speaks:
  - With name: *"Bonjour {firstName}. Je suis Alex d'UNPRO. Que souhaitez-vous régler aujourd'hui?"*
  - Without: *"Bonjour. Je suis Alex d'UNPRO. Comment puis-je vous aider aujourd'hui?"*
- Cancel auto-greet immediately if user types in the hero textarea, taps a chip, or scrolls past 200px (avoid intrusive playback).
- Track `alex_autogreet_fired` / `alex_autogreet_skipped` via `trackCopilotEvent`.

---

## 3. Premium voice UX upgrades on the locked overlay

**File**: `src/components/voice/OverlayAlexVoiceFullScreen.tsx`

- Replace static greeting builder with the V2 first-message logic (rebonjour for returning users handled server-side by overrides).
- Visual states tied to `useLiveVoice` flags:
  - `idle` (subtle pulse) → `listening` (wider blue halo + glow ring) → `thinking` (rotating contour) → `speaking` (vibration + brightness boost). Wire to existing `AlexOrbPremium` which already supports these states.
- Live transcript fade: render last user utterance + Alex response with opacity transition (250ms), max 2 visible.
- Add subtle 1.2s intro chime via existing `audioEngine` only when `prefers-reduced-motion: no-preference`.

---

## 4. Silence + re-engage rules (max 1+1, then stop)

**File**: `src/hooks/useAlexSilenceControl.ts` already exists. Hook into the locked overlay:
- 1st silence (12s): contextual update *"Je suis là."*
- 2nd silence (15s): contextual update *"Je reste disponible quand vous serez prêt."*
- Then **stop** — no further prompts. Resume only on orb tap. (Aligns with `mem://ai/alex/silence-pause-resume-control`.)
- Forbid the phrases *"Avez-vous toujours besoin de moi?"* / *"Êtes-vous là?"* — already covered, just enforce via the V2 system prompt's "Forbidden Phrases" block.

---

## 5. Booking flow — never ask contact manually

Already enforced for the chat sheet. Extend to voice:
- When the conversational agent reaches booking intent (handled via `client tool call` `request_booking`), the client tool implementation calls `useProfileCompletionGate` → if not logged in, voice says: *"Connectez-vous en quelques secondes. UNPRO remplira vos coordonnées automatiquement."* and the locked overlay surfaces the existing `BookingLoginPromptBlock` action card.
- Never speak name/phone/address questions. Add to the V2 system prompt explicit "Do NOT ask for contact info; tell the user to log in." rule.

**Files**:
- `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — register client tools `request_booking`, `start_login_redirect`, `analyze_quote`, `analyze_image`.
- `src/components/alex-copilot/SheetBookingMobile.tsx` — already correct; no changes.

---

## 6. Session memory (city / project / urgency / language / last step)

**File**: new `src/features/alex/voice/alexSessionMemory.ts`
- Persist a small JSON in `sessionStorage` under `unpro:alex:session_memory`.
- On every `user_transcript` and `agent_response`, run regex extractors: `city` (Quebec city list), `urgency` ("urgent", "ce soir", "demain"), `projectType` (toiture/humidité/plomberie/etc.), `language`.
- Push memory to ElevenLabs via `sendContextualUpdate` only when a NEW field is captured (avoid spam). Format:
  *"Contexte mis à jour: ville={Laval}, projet={humidité}, urgence={non}. N'a pas redemandé."*
- Consumed by `useAlexAutoGreet` on next session: pass to overrides as `agent.prompt` extra system message *"Tu reprends une conversation. Ville: …, Projet: …"*.

---

## 7. Admin tuning panel

**File**: `src/pages/admin/AdminVoiceControlPage.tsx` (extend)
- Add "Voice V2 Settings" card with sliders:
  - Stability (default 56), Similarity (84), Style (14), Speaker Boost (toggle).
  - Live "Test phrase" button → calls `test-alex-voice` edge function with current sliders + standard FR test sentence ("Bonjour, je suis Alex d'UNPRO. RBQ valide à Montréal.") to validate pronunciation.
  - "Save as active" → writes to `voice_configs` (new columns `stability`, `similarity`, `style`, `speaker_boost`).
- Migration: add 4 columns to `voice_configs` (numeric/boolean, defaults matching V2). `voice-get-signed-url` returns them; `useLiveVoice` injects them into overrides.

---

## 8. Forbidden / Closing phrases enforcement (server-side)

**File**: `supabase/functions/_shared/alex-french-voice.ts` (extend `rewriteAlexToSpokenFrench`)
- Strip forbidden patterns post-AI: "Veuillez patienter", "Cliquez pour commencer", "Je suis une intelligence artificielle", "Désolé je ne comprends pas", "Remplissez ce formulaire", repeated "Avez-vous toujours besoin de moi".
- Used by the legacy TTS path (`alex-tts`) and any non-conversational fallback. The conversational agent honors them via the V2 system prompt directly.

---

## 9. Memory updates

- Write `mem://ai/alex/voice-elevenlabs-v2`: agent ID, voice ID, stability/similarity/style values, override contract, auto-greet 2.5s rule, forbidden phrases.
- Update `mem://index.md`: replace masculine voice entry with the new V2 entry; bump core rule:
  > Alex voice: ElevenLabs agent `agent_5901kmg4ra2eee5bbp9r7ew5jcs7`, voice Charlotte FR `UJCi4DDncuo0VJDSIegj`, V2 settings (56/84/14, speaker_boost ON). Auto-greets 2.5s after Copilot homepage load. FR first; never start in EN.
- Delete `mem://ai/alex/voice-persona-male` and `mem://ai/alex/voice-identity-and-behavior` (contradict V2).

---

## 10. Tracking

`trackCopilotEvent` events to add:
- `alex_autogreet_fired`
- `alex_autogreet_skipped` (with reason)
- `alex_voice_first_audio_ms` (latency to first audible word)
- `alex_voice_silence_prompt_1` / `_2`
- `alex_voice_booking_login_prompt`

---

## 11. Out of scope (explicitly NOT touched)

- Public landing pages (`unpro.ca` warm theme) — Alex stays opt-in there.
- Contractor onboarding voice flow — already covered by `mem://features/contractor-onboarding-landing`.
- Logo/favicon — finalized in earlier message.
- The 3-quote anti-pattern — already removed in Copilot store.

---

## Deliverables checklist

1. New: `src/features/alex/voice/alexSystemPromptV2.ts`, `alexAgentOverrides.ts`, `alexSessionMemory.ts`
2. New: `src/hooks/useAlexAutoGreet.ts`
3. Edited: `src/hooks/useLiveVoice.ts` (overrides + voice settings injection)
4. Edited: `src/pages/PageHomeCopilot.tsx` (auto-greet hook)
5. Edited: `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (client tools, transcript fade, intro chime)
6. Edited: `supabase/functions/_shared/alex-french-voice.ts` (forbidden phrase scrubber)
7. Edited: `supabase/functions/voice-get-signed-url/index.ts` (return V2 voice settings)
8. Migration: add `stability`, `similarity`, `style`, `speaker_boost` columns to `voice_configs`
9. Edited: `src/pages/admin/AdminVoiceControlPage.tsx` (V2 sliders + live test)
10. Memory: write V2 file, update index, delete obsolete masculine entries
11. Tracking events wired through `trackCopilotEvent`

Build verified with `tsc --noEmit` and a manual smoke test of `/` (homepage auto-greet) + `/alex` (locked overlay).
