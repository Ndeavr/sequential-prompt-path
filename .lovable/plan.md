# Alex Voice — Diagnostic + Rebuild Plan

## Root causes identified (from logs + code audit)

1. **Token timeout too aggressive (6s)** in `useLiveVoice.ts` → on cold-start, edge function `voice-get-signed-url` + ElevenLabs handshake exceeds 6s and triggers fallback chat. Logs confirm: `VOICE_TOKEN_TIMEOUT { ms: 6000 }` followed immediately by `Connexion vocale lente. Mode chat activé`.
2. **Voice consistency**: intro voice differs from rest because ElevenLabs only honors `tts.voiceId` + voice settings overrides if they are explicitly enabled in the agent dashboard. When disabled, intro uses agent's saved voice and the rest can drift if the session reconnects with a different config.
3. **No retry chain** before fallback (spec asks for: silent retry → ws reinit → session rebuild → only then fallback). Current code does single attempt → fallback.
4. **Auto-start race**: `OverlayHydrationGuard` watchdog fires `closeVoiceSession` during boot (`hydration_watchdog` warning in logs) then immediately re-opens, killing nascent session.
5. **No central voice config**: defaults live in `alexAgentOverrides.ts`, edge function reads `voice_configs` table, hooks read `voice-get-config` — three sources of truth, drift possible between intro and reconnect.
6. **Entrepreneur mode**: no per-context voice tuning — same neutral settings for homeowner and contractor flows.
7. **No realtime diagnostics** beyond admin-only `AlexVoiceDebugPanel`. No `?alexdebug=true` query trigger, no per-session log table.

## What we will build

### 1. Single source of truth — `src/config/alexVoiceConfig.ts`
- One file exporting `ALEX_VOICE_CONFIG` (voice_id, model_id, voice_settings) + `getVoiceConfigFor(mode)` returning per-mode tuning:
  - `homeowner`: stability 0.56, similarity 0.84, style 0.14, speed 1.00
  - `contractor` / `entrepreneur`: stability 0.42, similarity 0.82, style 0.32, speed 1.10 (more energetic)
  - Voice id locked to `UJCi4DDncuo0VJDSIegj` (Charlotte FR) as today
- All clients (overrides builder, edge function response merge, recovery) read from here.
- Replace `ALEX_VOICE_DEFAULTS` in `alexAgentOverrides.ts` with import from this file.

### 2. Fix premature fallback (`useLiveVoice.ts`)
- Raise `TOKEN_TIMEOUT_MS` from 6s → 12s.
- Add retry chain inside `start()`:
  - Attempt 1: silent retry on token failure (1.5s backoff).
  - Attempt 2: rebuild ElevenLabs session (`endSession()` then re-`startSession`).
  - Attempt 3: only then surface error to caller (`onError`) and let overlay decide fallback.
- Remove the immediate "instant disconnect" hard fail at line 162; treat as retry-eligible.
- Persist `currentVoiceId` ref; if reconnect occurs, force-reuse same `voiceId` (no re-fetch from edge).

### 3. Auto-start reliability
- Move auto-start trigger out of `OverlayHydrationGuard` watchdog path — guard must NOT call `closeVoiceSession` during `stabilizing` or `opening_session` states (already partly done; tighten to never close until `first_audio_frame` or 25s real timeout).
- New hook `useAlexAutoStart(mode)` mounted at page level (Hero, contractor landing) that:
  - Waits for first user gesture OR 800ms after page idle.
  - Pre-warms audio context, mic permission, signed URL request in parallel.
  - Calls `openAlex(feature, hint)` only once per route.

### 4. Entrepreneur mode personality
- `buildAlexAgentOverrides({ mode: "contractor" })` injects:
  - Higher-energy first message ("Bonjour. Je suis Alex d'UNPRO. Voyons comment faire évoluer votre entreprise.")
  - Speed 1.10, style 0.32, stability 0.42.
  - System prompt section appended: "Tu es conseillère stratégique de croissance. Énergie confiante, optimiste, premium. Pas vendeuse, pas robotique."
- `useLiveVoice.start({ mode })` plumbs mode through to overrides builder.

### 5. Diagnostics
- New page-level component `AlexVoiceDiagnosticsPanel` shown when URL contains `?alexdebug=true` (any user, no auth gate). Fields: mic, audio context, websocket, EL connection, transcript status, voice_id, model_id, playback state, buffer health, reconnect count, startup duration ms, latency, fallback triggers, active session id.
- New table `alex_voice_logs` (migration): id, session_id, user_id, page, voice_id, model_id, startup_status, websocket_status, error_message, fallback_triggered, reconnect_attempts, latency_ms, created_at. RLS: insert open, select admin-only.
- New edge function `alex-voice-log` writing to that table; called from `useLiveVoice` at key lifecycle events.

### 6. UI polish — kill ugly fallback banner
- Replace red error banner in overlay with subtle pulse label near orb: "Connexion…", "Reconnexion…", "Optimisation audio…". Only show "Mode chat" toggle after retry chain truly exhausted (≥3 failures).

### 7. Stream / mobile hardening
- In `useLiveVoice`, guard against duplicate `startSession` calls with a `bootInProgressRef` lock.
- On Android: ensure AudioContext resume happens inside the user-gesture handler (already present in `useGlobalAudioUnlock` — verify it runs before any voice page mount and reuse the singleton ctx instead of creating a new one in `start()`).

### 8. Centralized services (light refactor, no big rewrite)
Create thin wrappers re-exporting existing logic so future work has clean entry points:
- `AlexVoiceEngine` → wraps `useLiveVoice`
- `AlexVoiceSessionManager` → wraps `alexVoiceLockedStore`
- `AlexVoiceDiagnostics` → new
- `AlexVoiceRecoveryManager` → wraps `useAlexVoiceRecovery` + new retry chain
- `AlexVoiceConfig` → the new config module from step 1

## Files touched

- create `src/config/alexVoiceConfig.ts`
- create `src/hooks/useAlexAutoStart.ts`
- create `src/components/voice/AlexVoiceDiagnosticsPanel.tsx`
- create `supabase/functions/alex-voice-log/index.ts`
- migration: `alex_voice_logs` table + RLS
- edit `src/features/alex/voice/alexAgentOverrides.ts` (read from new config, accept `mode`)
- edit `src/hooks/useLiveVoice.ts` (retry chain, longer timeout, reuse voice id, mode plumbing, no instant-disconnect fail)
- edit `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (subtle pulse states, kill big error banner, plumb mode)
- edit `src/components/system/OverlayHydrationGuard.tsx` (don't close during boot states)
- edit `src/pages/contractor-growth/PageContractorAIGrowth.tsx` (pass `mode: "contractor"`)
- mount `AlexVoiceDiagnosticsPanel` once in `src/app/providers.tsx` behind `?alexdebug=true`

## Out of scope
- ElevenLabs dashboard config (overrides toggles must be enabled there by you — I'll surface a warning in diagnostics if voice_id override is silently ignored).
- Rebuilding the locked-store machine (it works; only the watchdog timing is adjusted).

## Success checks
- Reload `/contractor-ai-growth` 5×: voice starts every time within 2.5s, no fallback banner.
- Same `voice_id` logged in `alex_voice_logs` for intro and subsequent turns of one session.
- `?alexdebug=true` shows live state.
- Token slow (>2s) shows "Connexion d'Alex…" pulse, NOT the fallback box.
