
# Alex V7 Hotfix Plan — Make the Real Opening Work

## What is actually broken

The production opening the user sees is the homepage hero, not the standalone `src/features/alex/*` assistant route.

Current homepage path:
- `src/pages/Home.tsx`
- `src/components/home/HeroSection.tsx`
- `src/hooks/useLiveVoice.ts`
- backend functions:
  - `supabase/functions/voice-get-signed-url/index.ts`
  - `supabase/functions/alex-tts/index.ts`

Current Alex feature shell path:
- `src/features/alex/*`
- primarily affects `/alex`, not the current `/index` hero

So the fix needs to hit the real hero boot path first, then align the feature shell so both Alex surfaces behave the same.

## Root causes confirmed

1. Homepage hero still owns the first impression and uses a separate voice system.
2. `HeroSection.tsx` builds greetings from `user_metadata` directly and can speak stale/wrong names.
3. `HeroSection.tsx` can show speaking-style UI before real audio is confirmed.
4. `useLiveVoice.ts` still allows English-capable defaults and does not hard-lock the opening to French-only behavior.
5. The standalone Alex feature store lacks some debug/identity fields required to prove correctness.
6. Session restore logic in `src/features/alex/hooks/useAlexSessionRestore.ts` is still too heuristic and can contaminate identity.
7. There is conflicting project memory about Alex voice persona; code must be aligned to the approved female French voice.

## Implementation plan

### 1. Patch the real homepage opening first
Update `src/components/home/HeroSection.tsx` so the first 3 seconds are deterministic and honest:
- Replace random short greeting selection with a deterministic builder:
  - logged-in verified user: `Bonjour [FirstName].`
  - otherwise: `Bonjour.`
- Remove time-based greeting variants for startup.
- Force opening language to `fr-CA`.
- Keep the premium staged presence, but only show “Alex parle…”-style copy after confirmed first audio.
- If voice connection fails, keep the text surface alive and show a single retry/unlock path without drifting into English or wrong identity.
- Reinitialize aggressively before each new start:
  - clear runtime lock
  - stop active audio channel
  - reset local transcript/opening state
  - start a clean voice attempt

### 2. Harden the live voice hook used by the hero
Update `src/hooks/useLiveVoice.ts`:
- Treat each startup as a fresh session.
- Add a hard reinitialize path before `startSession()`:
  - end any old session
  - clear connection timeout
  - reset first-audio flags
  - reset language lock to `fr-CA`
- Lock opening context to French only.
- Prevent “speaking” semantics until real first audio/transcript is received.
- Keep `force` restart behavior, but bypass stale cooldown/ended-session traps cleanly.
- Fail fast to text mode if signed URL / session start / first audio never arrives.

### 3. Lock identity to verified live auth, not cached metadata guesses
Patch both hero and Alex feature bootstrap to use the same verified identity source:
- `src/components/home/HeroSection.tsx`
- `src/features/alex/hooks/useAlexBootstrap.ts`

Implementation:
- Resolve current authenticated user from live session.
- Query the current profile row matching that user id.
- Greeting name source priority:
  1. current auth session + matching current profile
  2. current auth session metadata only if clearly tied to that same user
  3. no name
- Never use previous session, local snapshot, demo/test name, or unrelated metadata.
- If verification is uncertain, say only `Bonjour.`

### 4. Lock female voice identity and French opening across both systems
Patch:
- `src/hooks/useLiveVoice.ts`
- `src/features/alex/services/elevenlabsService.ts`
- `supabase/functions/voice-get-signed-url/index.ts`
- `supabase/functions/alex-tts/index.ts`

Changes:
- Keep the approved female voice id as the only valid opening voice.
- Reject any browser/system speech fallback for the opening.
- Keep French-first opening context in both conversational voice and TTS.
- Ensure backend function responses expose enough info to debug which agent/voice actually answered.
- If the configured voice/agent is wrong or unavailable, degrade to text instead of using the wrong identity.

### 5. Make speaking state honest everywhere
Patch:
- `src/components/home/HeroSection.tsx`
- `src/features/alex/state/alexStore.ts`
- `src/features/alex/hooks/useAlexVoice.ts`
- `src/features/alex/AlexPanel.tsx`
- `src/features/alex/AlexAssistant.tsx`

Changes:
- Add/normalize explicit states:
  - `connecting_voice`
  - optional `audio_ready`
  - `speaking`
- Only enter `speaking` after actual playback start / first audio callback.
- Use honest labels:
  - `Chargement…`
  - `Alex en direct`
  - `Connexion…`
  - `Écrivez à Alex`
- Never show “Alex parle…” during request, connect, or pre-playback phases.

### 6. Fix session restore contamination in the Alex feature shell
Patch `src/features/alex/hooks/useAlexSessionRestore.ts`:
- stop restoring identity-sensitive fields from cached snapshot
- stop using session-id substring heuristics for identity validation
- compare restored context against current live auth user instead
- preserve only safe non-identity UI state when mismatch occurs
- never let restore override:
  - opening language
  - verified greeting name
  - locked voice identity

### 7. Expand debug visibility so failures are obvious
Patch:
- `src/features/alex/state/alexStore.ts`
- `src/features/alex/AlexDebugPanel.tsx`
- optionally add a small hero-only dev overlay if needed

Expose:
- `mode`
- `activeLanguage`
- `verifiedGreetingName`
- `authUserId`
- `profileUserId`
- `restoredUserId`
- `greetingText`
- `greetingInjected`
- `greetingSpoken`
- `selectedVoiceId`
- `approvedVoiceId`
- `voiceLockedValid`
- `playbackStarted`
- `voiceAvailable`
- `usedBrowserFallback`
- `isSessionRestored`
- `identityMismatchDetected`

### 8. Align both Alex surfaces after the homepage fix
After the hero path is stable, mirror the same locks into:
- `src/features/alex/hooks/useAlexBootstrap.ts`
- `src/features/alex/hooks/useAlexVoice.ts`
- `src/features/alex/AlexPanel.tsx`
- `src/features/alex/AlexAssistant.tsx`

So:
- home hero Alex
- `/alex` floating/store-based Alex

both share the same identity, language, and playback truth rules.

## Files to patch

### Priority 1 — real production opening
- `src/components/home/HeroSection.tsx`
- `src/hooks/useLiveVoice.ts`
- `supabase/functions/voice-get-signed-url/index.ts`
- `supabase/functions/alex-tts/index.ts`

### Priority 2 — feature-shell alignment
- `src/features/alex/hooks/useAlexBootstrap.ts`
- `src/features/alex/hooks/useAlexVoice.ts`
- `src/features/alex/state/alexStore.ts`
- `src/features/alex/AlexAssistant.tsx`
- `src/features/alex/AlexPanel.tsx`
- `src/features/alex/hooks/useAlexSessionRestore.ts`
- `src/features/alex/AlexDebugPanel.tsx`

## Expected result

On `/index`:
- UI visible immediately
- French opening only
- approved female voice only
- correct verified first name only
- no stale user name ever spoken
- no “Alex parle…” until real audio starts
- no browser male/system fallback
- clean reinitialize/restart behavior when the first startup path is stuck
