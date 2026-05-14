
# Homepage Alex — inline conversation, premium orb, voice fixes

The homepage currently calls `openAlex()` which opens `OverlayAlexVoiceFullScreen` (a route-level fullscreen takeover). It also still uses a flat CSS sphere via `AlexFloatingOrb` inside `HeroOrbMockup`. Voice slows down after sentence 1 and pronounces "UNPRO" letter-by-letter. This plan fixes all three in one pass.

## 1. Stay on the homepage — no overlay, no navigation

**File: `src/components/home-orb/HeroOrbMockup.tsx`**
- Remove `useAlexVoice().openAlex` usage. Replace orb / mic / "Parler à Alex" handlers with a new local controller `useHomeAlexInline()` that starts a voice + chat session directly inside the hero (no overlay, no route push).
- Add a new inline transcript region rendered conditionally below the orb (mobile) or in a right column (desktop ≥ md).
- Make the orb section `sticky top-0` once `isConversationActive` is true so the orb stays visible as transcript grows.

**New components:**
- `src/components/home-orb/AlexHomepageConversation.tsx` — the orchestrator: owns conversation state (messages, isListening, isSpeaking), wires mic + text input, renders `AlexInlineTranscript`. Reuses existing `useAlexVoice` hook from `src/features/alex/hooks/useAlexVoice.ts` for TTS and existing `elevenlabsService` for playback. No new edge functions.
- `src/components/home-orb/AlexInlineTranscript.tsx` — vertical list of message bubbles (user right, Alex left), markdown rendering, auto-scroll to bottom, expanding height. Includes inline text input + send button at the bottom.
- `src/components/home-orb/AlexConversationArrow.tsx` — small SVG arrow with a soft electric-blue pulse animation. Used at: mic→orb, orb→transcript, orb→quick actions. Hidden once user has sent a message.

**Layout rules:**
- Mobile (current viewport): orb stays at top, transcript card expands inline below greeting bubble; quick actions remain underneath; page scrolls naturally.
- Desktop (≥ md): switch hero to a 3-column grid `[left content] [center orb] [right transcript panel]`. Transcript panel is empty until conversation starts, then expands.

**Do NOT touch:**
- `OverlayAlexVoiceFullScreen.tsx` (kept for other entry points like contractor pages — only the homepage stops using it).
- Route table, contractor onboarding, Stripe, `/entrepreneur` link.

## 2. Premium floating 3D orb (replace flat circle)

**File: `src/components/home-orb/AlexFloatingOrb.tsx`** — full rewrite.
- Glossy black sphere (260px mobile, 320–380px desktop) using layered radial gradients: deep black core, blue rim light at 60–80% radius, white specular highlight top-left at 20%, soft inner shadow bottom-right.
- Floats above a separate base element (elliptical blue glow disc with blur + opacity) — orb has its own `transform: translateY(-12px)` float animation; base stays planted.
- Drop shadow under orb (dark, soft, offset down).
- Face mask: two pill LED eyes + small mouth arc, all rendered with SVG inside the sphere, slightly inset to read as on the curved surface (not flat).
- UNPRO house icon at forehead (existing SVG path), inset slightly with subtle shadow.
- States (`idle | listening | thinking | speaking`) only modulate rim color intensity, eye animation, and base glow pulse — never resize or flatten the sphere.

## 3. Voice consistency + UNPRO pronunciation

**File: `src/config/alexVoiceConfig.ts`**
- Update `BASE_TUNING` to `{ stability: 0.48, similarity_boost: 0.78, style: 0.38, use_speaker_boost: true, speed: 1.05 }` (style bumped 0.28 → 0.38 per spec).
- Confirm all modes (homeowner / contractor / condo) inherit identical tuning so no mid-response profile switching can occur.

**New file: `src/lib/prepareAlexSpeechText.ts`**
```ts
export function prepareAlexSpeechText(text: string, language: 'fr'|'en' = 'fr'): string
```
Rules:
- `fr`: replace `d'UNPRO` / `d’UNPRO` → `d'Un Pro`; `de UNPRO` → `d'Un Pro`; standalone `UNPRO` (word boundaries, case-insensitive) → `Un Pro`.
- `en`: standalone `UNPRO` → `Hun Pro`.
- Preserves surrounding punctuation. Never mutates display text.

**File: `src/features/alex/services/elevenlabsService.ts`**
- In `speak()`, run `text` through `prepareAlexSpeechText(text, currentLang)` before sending to the `alex-tts` edge function. Determine `currentLang` from `useAlexStore.getState().activeLanguage` (defaults to `fr`).
- Ensure single-request streaming: do not split text into per-sentence requests. Keep one POST per `speak()` call so ElevenLabs maintains prosody/speed across sentences (this also fixes "slows down after sentence 1").
- Remove any per-sentence fallback path if present.

**Test cases (added as a vitest in `src/lib/__tests__/prepareAlexSpeechText.test.ts`):**
- `"Bonjour. Je suis Alex d'UNPRO."` (fr) → `"Bonjour. Je suis Alex d'Un Pro."`
- `"UNPRO vous aide à trouver un pro."` (fr) → `"Un Pro vous aide à trouver un pro."`
- `"Welcome to UNPRO."` (en) → `"Welcome to Hun Pro."`

## 4. Verification

- Visual: load `/` on mobile viewport — confirm orb is 3D, floats above base, and tapping orb does NOT navigate or open the fullscreen overlay; transcript expands inline.
- Voice: tap orb, listen to greeting — sentence 2 must match sentence 1 in speed/tone; "UNPRO" sounds as "Un Pro" (fr).
- No regressions: `/entrepreneur`, contractor onboarding, Stripe checkout, `/pros/[slug]` untouched.
- `bun run vitest src/lib/__tests__/prepareAlexSpeechText.test.ts` passes.

## Files touched

- edit `src/components/home-orb/HeroOrbMockup.tsx`
- edit `src/components/home-orb/AlexFloatingOrb.tsx` (rewrite as true 3D orb)
- edit `src/config/alexVoiceConfig.ts` (style 0.28 → 0.38)
- edit `src/features/alex/services/elevenlabsService.ts` (single-request + pronunciation pre-process)
- create `src/components/home-orb/AlexHomepageConversation.tsx`
- create `src/components/home-orb/AlexInlineTranscript.tsx`
- create `src/components/home-orb/AlexConversationArrow.tsx`
- create `src/lib/prepareAlexSpeechText.ts`
- create `src/lib/__tests__/prepareAlexSpeechText.test.ts`

No DB migrations, no edge function changes, no route changes.
