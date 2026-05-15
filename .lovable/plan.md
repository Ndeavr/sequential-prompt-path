# Fix Alex Orb + Live Speech Text — Plan

UI/voice-only fix on the homepage hero. No backend, no schema, no Alex brain logic changes.

## Scope
- `src/components/home-orb/HeroOrbMockup.tsx`
- `src/components/home-orb/AlexHomepageConversation.tsx`
- `src/components/home-orb/AlexInlineTranscript.tsx`
- (delete usage of) `AlexConversationArrow`

## Changes

### 1. HeroOrbMockup.tsx
- Remove `<AlexConversationArrow … label="Parlez à Alex" />` block entirely.
- Remove the duplicate idle paragraph that splits the greeting into two `<p>` tags (lines 163–172).
- Remove the "Alex analyse votre situation en direct." line under the card (lines 182–186).
- Replace the idle card content with a single, minimal idle block rendered ONLY when `alexState === 'idle'`:
  - Line 1: `Bonjour.`
  - Line 2: `Touchez Alex pour commencer.`
- Pass an `alexState` prop derived from active/speaking/thinking down to `AlexHomepageConversation` so the transcript area knows what to show.
- Keep ALEX label + online badge. Online badge label: `Online` / `Écoute` / `Réfléchit` / `Parle`.
- Remove the secondary "Parler à Alex" button when not in contractor mode (orb is the CTA). Keep the contractor primary CTA as-is.

### 2. AlexHomepageConversation.tsx — state machine + progressive reveal
- Introduce an internal state: `idle | listening | thinking | speaking | error`. Expose via `onStateChange` callback (replaces `onActivityChange` + `onAssistantSpeakingChange`).
- Idle render: nothing in the transcript area (parent renders idle copy).
- Listening render: caption `Je vous écoute…`
- Thinking render: caption `Analyse en cours…`
- Speaking render: progressive transcript — split current assistant utterance into sentences and reveal one at a time, synced with TTS by speaking each sentence sequentially via the existing `speak(text)` call. Each `await speak(sentence)` resolves when audio of that chunk ends, so the next sentence appears right as the next chunk starts.
- After speech ends, collapse the live transcript back to a 1-line summary (last sentence) UNLESS conversation history is open (future flag — for now just collapse to last line after 1.2s).
- Greeting flow on orb tap:
  1. `unlockAudio()`
  2. set state `speaking`
  3. for each sentence in greeting → push to live transcript → `await speak(sentence)`
  4. set state `idle` (or `listening` if mic is wired) when done
- No more pre-pushing the full greeting message to the bubble list before speaking.
- Apply `prepareAlexSpeechText` (already imported elsewhere) so "UNPRO" → "Un Pro" in TTS only; display keeps "UNPRO".

### 3. AlexInlineTranscript.tsx
- Add a `liveCaption?: string` and `liveSpoken?: string[]` mode for the speaking state (single ephemeral assistant block that grows sentence-by-sentence with a fade-in per line).
- Keep the existing message-list rendering for past turns (after collapse).
- Idle state returns `null` (parent owns idle copy).

### 4. Orb states
`AlexFloatingOrb` already supports `idle | listening | speaking`. Add a thin mapping for `thinking` → reuse `listening` visual with reduced glow + `expression="focused"`. No new asset work.

## Technical notes (sync without word timestamps)
The ElevenLabs `speak()` call awaits until the audio finishes. Splitting the greeting on sentence boundaries (`. `, `?`, `!`) and calling `speak()` per sentence gives natural per-sentence sync: reveal sentence N → await speak(N) → reveal sentence N+1. No new TTS events needed.

## Out of scope
- Wiring continuous mic / live STT (kept as text input, as today).
- Any change to `alex-chat` edge function or pricing/booking logic.
- Conversation history drawer (left as future toggle — we just collapse).

## Success
- Orb tap is the only CTA; no arrow, no "Parlez à Alex", no duplicate intro text.
- Idle shows only `Bonjour.` + `Touchez Alex pour commencer.`
- Greeting text appears sentence-by-sentence as Alex speaks each.
- Listening / Thinking / Error captions match the spec.
- "UNPRO" is pronounced "Un Pro" in FR.
