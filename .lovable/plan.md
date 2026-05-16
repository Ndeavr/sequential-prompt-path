# FINAL FIX — Alex Orb + Voice (locked scope)

Touch only Alex orb UI, voice pipeline, overlay behavior, UNPRO pronunciation. No landing/Stripe/AIPP/auth/onboarding/outbound/schema changes.

## 1. Orb chrome — guarantee no visible square

`src/components/alex/AlexMorphingOrb.tsx`
- Add explicit `background: transparent !important; border: 0 !important; box-shadow: none !important; overflow: visible !important; border-radius: 9999px;` on the root `.alex-orb` button so no ancestor utility class (rounded-2xl, bg-white/5, border) can reintroduce a card.
- Keep the existing layered orb visuals (atmosphere, halo, nebula, sphere, rim, plasma, chroma, highlight) — already verified circular and unclipped.

`src/components/alex/AlexCompanionOrb.tsx`
- Strip any wrapper styling other than positional `fixed` + z-index. Confirm no `bg-*`, `border`, or `rounded-*` on the wrapper.

Quick audit pass (search-only, fix where found):
- `AlexLauncherHero.tsx`, `HeroOrbMockup.tsx`, `features/alex/AlexAssistant.tsx` — strip any leftover `bg-card`, `border`, `rounded-*`, `backdrop-blur`, `shadow-*` directly wrapping `<AlexMorphingOrb />`.

## 2. Voice config lock

`src/config/alexVoiceConfig.ts`
- Set BASE_TUNING to the spec exactly:
  - `stability: 0.50`
  - `similarity_boost: 0.75`
  - `style: 0.35`
  - `use_speaker_boost: true`
  - `speed: 1.00`
- Remove per-mode speed/style variation. All modes share BASE_TUNING; only `firstMessage` and optional `promptAddendum` differ.

`src/features/alex/voice/alexAgentOverrides.ts`
- Already reads from config; verify no caller passes dynamic `stability/similarity/style` overrides. If any do (search `buildAlexAgentOverrides`), drop those args so tuning never drifts mid-session.

`src/features/alex/services/elevenlabsService.ts`
- Audit for any code path that mutates voice settings between turns (emotional/contextual tuning). Remove. Settings must be set once at session start.

## 3. UNPRO pronunciation normalization (always-on)

`src/lib/prepareAlexSpeechText.ts` already exists and handles UNPRO→"Un Pro" (fr) / "Hun Pro" (en). Enforce it at every TTS entry point:
- `src/features/alex/services/elevenlabsService.ts` — wrap any `text` sent to ElevenLabs `text-to-speech` REST in `prepareAlexSpeechText(text, lang)`.
- `src/services/alexSingleAudioChannel.ts` and any `useLiveVoice` / `alex-tts` callers — same wrap.
- ElevenLabs ConvAI first message: build with `prepareAlexSpeechText(firstMessage, lang)` inside `buildAlexAgentOverrides`.
- Display strings remain "UNPRO" — only the TTS-bound copy is normalized.

Greeting copy (already aligned):
- FR: "Bonjour. Je suis Alex d'UNPRO. Expliquez-moi ce que vous voulez régler aujourd'hui."
- EN: "Hi. I'm Alex from UNPRO. Tell me what you want to fix today."

## 4. Overlay stays inline — never redirect

Audit and fix any place that calls `navigate('/alex')`, `navigate('/chat')`, or replaces page content when the orb is tapped:
- `src/contexts/AlexVoiceContext.tsx` — `openAlex()` must only open the inline overlay (`GlobalAlexOverlay` / `AlexVoiceMode`), never navigate.
- `AlexCompanionOrb`, `AlexLauncherHero`, `HeroOrbMockup` — tap handler = `openAlex()` only.
- Long-press → quick actions menu (existing `AlexGestureMenu`); swipe up = expand panel; swipe down = minimize; left/right = suggestion cycle (wire to existing store actions where available, no new pages).

## 5. Single greeting + one gentle follow-up max

`src/features/alex/services/alexWelcomeManager.ts` + `src/engines/alexReEngagementEngine.ts`
- Ensure greeting fires exactly once per session (guard already exists — verify).
- Cap auto re-prompts at 1 then go silent (memory: Alex Reengagement Control already says max 3 → tighten to 1 per this spec for the inline overlay surface).

## 6. Validation

After edits, run:
- `rg "speed:\s*[01]\." src/config src/features/alex` → only `1.0` survives.
- `rg "prepareAlexSpeechText" src` → wraps every TTS call.
- `rg "navigate\((.alex|.chat)" src/components/alex src/contexts/AlexVoiceContext.tsx src/features/alex` → empty.
- Visual: mobile preview 384px, orb on `/index` shows no square, glow unclipped, tap opens inline overlay.

## Technical notes

- No DB migrations.
- No new components or routes.
- Touched files (max): `AlexMorphingOrb.tsx`, `AlexCompanionOrb.tsx`, `alexVoiceConfig.ts`, `alexAgentOverrides.ts`, `elevenlabsService.ts`, `alexSingleAudioChannel.ts`, `useLiveVoice.ts`, `AlexVoiceContext.tsx`, `alexWelcomeManager.ts`, `alexReEngagementEngine.ts`, plus 1-2 hero wrappers if they still hold chrome around the orb.
- Memory updates: bump `mem://ai/alex/voice-config-active` to reflect new locked tuning (0.50 / 0.75 / 0.35 / boost on / 1.00).
