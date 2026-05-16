# Alex Voice Health Contract

Alex voice is a protected production system. This document is the operator-facing
summary of the contract. Future agents and humans must respect it.

## Hard rules

- **Never modify voice code** unless the task is explicitly about voice.
- **Never change** voice IDs, ElevenLabs model, output format, mic/VAD wiring,
  audio context, orb trigger, Alex state machine, init order, or Alex mount routes.
- Every protected file carries `// PROTECTED FILE — ALEX VOICE CORE` at the top.
  Any edit requires `voice_smoke_test()` to pass before deploy.

## Sources of truth

- Primary voice + backup voice: `src/config/alexVoiceConfig.ts`
  - `ALEX_VOICE_BASE.voiceId`  = `YxrwjAKoUKULGd0g8K9Y` (Sophia)
  - `ALEX_VOICE_BACKUP.voiceId` = `XB0fDUnXU5powFXDhCwa` (Charlotte)
- Edge TTS pipeline: `supabase/functions/alex-tts/index.ts`
  - On primary failure it retries once against `FALLBACK_VOICE_ID`.
  - Response header `X-Alex-Fallback-Used` reports which path served audio.
  - Each attempt inserts a row in `voice_health_pings (kind, voice_id, ...)`.
- Health endpoint: `supabase/functions/alex-voice-health/index.ts`
- Test endpoint: `supabase/functions/alex-voice-test/index.ts`

## Runtime fallback

If primary TTS fails:

1. `alex-tts` automatically retries with the backup voice.
2. User keeps hearing Alex — no interruption.
3. `voice_reliability_events.event_type = 'tts_fallback_used'` is written.
4. `voice_health_pings.kind = 'success' | 'failure'` is written.
5. `/admin/voice-health` surfaces the warning.

## Smoke test (`voice_smoke_test()`)

Run from any browser tab (or from the admin page):

```ts
import { voice_smoke_test } from "@/lib/voiceSmokeTest";
const report = await voice_smoke_test();
```

Checks:

- `mic_permission_readable`
- `primary_tts_returns_audio`
- `primary_audio_playable`
- `fallback_tts_returns_audio`
- `edge_health_endpoint_ok`
- `orb_present` (when run in a tab that mounts Alex)
- `orb_click_starts_listening` (when run in a tab that mounts Alex)

## Pre-deploy guard

```bash
bun run voice:guard
# or
node scripts/pre-deploy-voice-guard.mjs
```

Exits non-zero (BLOCK DEPLOY) on any of:

- vitest failure
- `alex-voice-health` not `healthy`
- `alex-voice-test` primary fails / no audio
- `alex-voice-test` backup fails / no audio
- router not mounting `/admin/voice-health`
- Alex overlay component missing
- no AlexOrb carries `data-alex-orb="true"`
- any protected file missing `PROTECTED FILE — ALEX VOICE CORE` header

Required env for live checks:
`VITE_SUPABASE_URL` (or `SUPABASE_URL`),
`VITE_SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY`).

## Admin cockpit

- Route: `/admin/voice-health` (alias `/admin/system-health/alex-voice`)
- File: `src/pages/admin/PageVoiceHealth.tsx`
- Shows voice IDs, ElevenLabs endpoint status, mic permission, last successful
  TTS (from `voice_health_pings`), last failed TTS, smoke report.
- Buttons: Run smoke test, Test Speak (primary/backup), Test Listen,
  Reset Voice Session.

## Surfaces voice must work on

1. Homepage (`/`)
2. Contractor onboarding (`/contractor-landing/*`)
3. Homeowner flow (`/alex`, conversational lite)
4. Admin test page (`/admin/voice-health`)
5. Mobile browser (Safari iOS + Chrome Android)
