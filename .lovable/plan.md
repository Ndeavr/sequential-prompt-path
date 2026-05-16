# Voice Health Contract — Phase 2 (close the gaps)

Phase 1 (shipped last turn): `ALEX_VOICE_BACKUP` constant, `src/lib/voiceSmokeTest.ts`, admin page at `/admin/voice-health`, `PROTECTED FILE — ALEX VOICE CORE` headers on the 10 core files.

This plan implements the parts of the spec that aren't live yet, without touching any voice runtime behavior beyond what the spec explicitly requires.

## 1. Runtime auto-fallback (primary → backup)

Goal: if the primary ElevenLabs voice fails, Alex keeps speaking via `ALEX_VOICE_BACKUP` and the failure is logged. Today only the smoke test exercises the backup — real sessions don't fail over.

- Edit `supabase/functions/alex-tts/index.ts`:
  - On non-2xx ElevenLabs response (or fetch throw) for the primary voice, retry once against `ALEX_VOICE_BACKUP.voiceId` (hardcoded mirror of the client constant — same string).
  - Add response header `X-Voice-Fallback-Used: true` on the retry path.
  - Insert a row into `voice_reliability_events` with `event_type = 'tts_fallback_used'` and primary error detail (already used by `alex-voice-health`).
- Edit `src/features/alex/services/elevenlabsService.ts` (client-side TTS path) with the same retry-once-with-backup pattern for the direct-from-client code path.
- No change to voice IDs, model, format, mic, VAD, orb trigger, or state machine.

## 2. `pre_deploy_voice_guard` as a real deploy gate

Today `pre_deploy_voice_guard` is just an alias for `voice_smoke_test()`. Spec says: run npm test + smoke + route-mount + ElevenLabs + edge health, and **BLOCK DEPLOY** on failure.

- Add `scripts/pre-deploy-voice-guard.mjs` that:
  1. Runs `bunx vitest run --reporter=dot` (skips if no tests).
  2. Calls `alex-voice-health` edge function — fails if status !== `healthy`.
  3. Calls `alex-voice-test` with primary voice ID — fails if response is not audio.
  4. Calls `alex-voice-test` with backup voice ID — same check.
  5. Static route-mount check: `grep` for `/admin/voice-health`, mount of `GlobalAlexOverlay` in `App.tsx`, and `AlexOrb` import in the three reference surfaces (homepage, contractor onboarding landing, homeowner flow).
  6. Exits non-zero on any failure with a clear `[VOICE GUARD] FAIL: <reason>` line.
- Add `package.json` script: `"voice:guard": "node scripts/pre-deploy-voice-guard.mjs"`.
- README note (one paragraph in `docs/voice-health.md`) telling operators to run `bun run voice:guard` before any deploy.

## 3. Smoke test — DOM-level checks

Current `voice_smoke_test()` covers TTS/playback/fallback/health. Spec also asks for orb-exists + click-starts-listening checks.

- Extend `src/lib/voiceSmokeTest.ts` with two optional checks that run only in a browser context:
  - `orb_present`: `document.querySelector('[data-alex-orb="true"]')` returns an element.
  - `orb_click_starts_listening`: dispatches a synthetic click and observes the Alex store transitioning to `connecting`/`listening` within 2s.
- Add `data-alex-orb="true"` (purely additive attribute, no behavior change) to the existing `AlexOrb` render roots.

## 4. Persistent last-successful / last-failed TTS

Admin page currently shows last success/failure from component state only — resets on reload.

- Migration: `voice_health_pings` table (`id`, `kind` enum `'success'|'failure'`, `voice_id`, `surface`, `detail jsonb`, `created_at`). RLS: insert allowed to authenticated, select restricted to `has_role(auth.uid(),'admin')`.
- On every TTS attempt in `alex-tts` and `elevenlabsService.ts`, fire-and-forget insert (success or failure).
- `PageVoiceHealth` reads the two most recent rows for the cards "Last successful TTS" and "Last failed TTS".

## 5. Admin navigation entry

Add a sidebar link "System Health → Alex Voice" pointing to `/admin/voice-health` in the existing admin nav config (whichever file lists the admin items — wire it in beside the existing Alex admin links).

## 6. Memory + docs

- Update `mem://features/voice-health-contract` with the new fallback edge function behavior, deploy guard script path, and `voice_health_pings` table.
- Create `docs/voice-health.md` (one page) restating the contract for future agents.

## Out of scope (explicitly not touched)

- Voice IDs, model, output format, tuning values.
- Orb trigger, mic permission flow, VAD, AudioContext, state machine.
- Greeting logic, session state, alex auto-start behavior.
- Any non-voice files.

## Acceptance

- Force a 500 from the primary ElevenLabs call (temporarily) → user still hears Alex via backup; `voice_reliability_events` shows `tts_fallback_used`; admin page shows the warning.
- `bun run voice:guard` exits 0 when everything is green and non-zero when any check fails.
- `/admin/voice-health` shows persistent "Last successful TTS" and "Last failed TTS" rows after reload.
- Sidebar shows "System Health → Alex Voice" link.
- No change in user-visible Alex behavior on homepage, contractor onboarding, homeowner flow, or mobile.
