# Fix orb size, voice consistency, and UNPRO pronunciation

## Diagnosis

The previous round already shipped most of what was asked:
- `AlexFloatingOrb.tsx` is a layered 3D orb (rim, base glow, face, house icon). Confirmed in preview screenshot.
- `prepareAlexSpeechText()` exists with FR ("Un Pro") and EN ("Hun Pro") rules and passing tests.
- `alexVoiceConfig.ts` is locked at stability 0.48 / similarity 0.78 / style 0.38 / boost on.
- `elevenlabsService.speak()` sends one TTS request per call (no per-sentence chunking).

What is still wrong (verified in preview + code):

1. **Orb is too large on mobile** — fills ~90% of viewport width, no mouth visible, eyes slightly clipped against the rim. Reads as "giant circle" instead of "small premium orb floating above a base".
2. **Voice consistency on the homepage is NOT controlled by `elevenlabsService`.** The homepage uses the ElevenLabs Conversational AI agent (real-time WebRTC). Voice settings in `alexVoiceConfig` only reach the agent through `buildAlexAgentOverrides`, and overrides are silently ignored unless the agent dashboard has each override enabled. The "speed drops after sentence 1" behavior is the agent dashboard preset overriding our values.
3. **UNPRO pronunciation in the live agent** is only fixed for the first message (`firstMessage: "...d'Un Pro..."`). When the agent generates new sentences mid-conversation it will say "U-N-P-R-O" because the system prompt does not forbid it.

## Changes

### 1. Orb sizing + face polish (`src/components/home-orb/AlexFloatingOrb.tsx`)
- Drop `mobile` size from 260 → **200px**, `desktop` 340 → **300px**.
- Re-center face: eyes `cy={58}`, mouth always rendered (default `M42 72 Q50 75 58 72`) so the orb never looks "blank".
- Add a faint inner ring at 48% radius for depth, and a darker bottom contact shadow so the orb visibly floats above the base disc.
- Increase base disc opacity contrast vs orb (base width = orb × 0.85, blur 14px).

### 2. Hero layout (`src/components/home-orb/HeroOrbMockup.tsx`)
- Wrap orb in `max-w-[220px]` container so it never visually dominates.
- Reduce top padding `mt-8 → mt-4` on mobile to lift the orb above the fold.
- Move "ALEX · ONLINE" pill closer to the orb (`mt-3` instead of `mt-5`).

### 3. Voice consistency — force overrides + dashboard alignment
- In `buildAlexAgentOverrides`, also pass `tts.speed: 1.05` and `tts.model_id: "eleven_multilingual_v2"` so a single payload describes the full voice. Today `speed` and `model_id` are absent from the override, so the agent falls back to its dashboard preset on subsequent turns.
- Add an explicit prompt clause to `ALEX_CORE_PROMPT` (or via `promptAddendum`):  
  `"Garde un débit constant et énergique du début à la fin. Ne ralentis pas après la première phrase."`
- Document in `docs/architecture.md` (1 short note) the 3 toggles that MUST be ON in the ElevenLabs agent dashboard for these fixes to apply: Overrides → Voice (voice_id, stability, similarity, style, speed, speaker_boost), Overrides → First message, Overrides → Prompt. Without this, no client code change can stop the slowdown.

### 4. UNPRO pronunciation in the live agent
- Extend `ALEX_CORE_PROMPT` with a hard pronunciation rule:  
  ```
  PRONONCIATION OBLIGATOIRE
  - "UNPRO" se prononce TOUJOURS "Un Pro" en français et "Hun Pro" en anglais.
  - Ne jamais épeler U-N-P-R-O. Ne jamais dire "you en pro" ou "une pro".
  - À l'écrit garde la marque "UNPRO". À l'oral utilise la prononciation ci-dessus.
  ```
- Keep `firstMessage` using the pre-converted "Un Pro" form (already in place).
- For any TTS path that is NOT the conversational agent (`elevenlabsService.speak`), `prepareAlexSpeechText` already rewrites the string before sending — keep as-is.

### 5. Tests
- Existing `prepareAlexSpeechText.test.ts` already covers FR/EN cases. No new tests needed for that.
- Add a tiny render smoke test for `AlexFloatingOrb` (mounts at default size, has eyes + mouth + house icon nodes).

## Files touched
- `src/components/home-orb/AlexFloatingOrb.tsx` (size + face)
- `src/components/home-orb/HeroOrbMockup.tsx` (layout)
- `src/features/alex/voice/alexAgentOverrides.ts` (add `speed`, `model_id`)
- `src/features/alex/voice/alexCorePrompt.ts` (pronunciation + tempo clauses)
- `docs/architecture.md` (one paragraph: required agent-dashboard toggles)
- `src/components/home-orb/__tests__/AlexFloatingOrb.test.tsx` (new, smoke)

## Out of scope
- No DB / edge function / Stripe / auth changes.
- No new routes. Conversation stays inline on `/index`.
- No rebuild of `elevenlabsService` chunking — it already sends one request per turn.

## Required user action after deploy
Open the ElevenLabs agent dashboard and confirm:
1. Security → Overrides → enable Voice, First Message, Prompt.
2. Voice settings preset matches `stability 0.48 / similarity 0.78 / style 0.38 / speaker_boost on / speed 1.05`.

Without step 1, the agent ignores our settings and the slowdown returns.
