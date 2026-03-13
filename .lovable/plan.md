

## Plan: ElevenLabs Voice Conversation for Alex

### Problem
Alex currently uses browser `speechSynthesis` for a one-time greeting, then falls back to text. The user wants Alex to **speak all responses** using ElevenLabs TTS with voice `ZUrEGyu8GFMwnHbvLhv2`, creating a real voice conversation -- not just a greeting followed by text.

### Prerequisites
- Need `ELEVENLABS_API_KEY` secret added to the project (will prompt user).

### Changes

**1. New edge function: `supabase/functions/elevenlabs-tts/index.ts`**
- Accepts `{ text, voiceId }`, calls ElevenLabs TTS API (`eleven_multilingual_v2` model).
- Returns raw MP3 audio binary.
- Defaults voice to `ZUrEGyu8GFMwnHbvLhv2`.

**2. New hook: `src/hooks/useAlexVoice.ts`**
- `speak(text)` — fetches TTS from the edge function, plays audio via `Audio` API.
- `stop()` — stops current playback.
- `isSpeaking` state for UI feedback (orb animation sync).
- Queue system so responses play sequentially.

**3. Update `src/components/alex/AlexAssistantSheet.tsx`**
- Remove browser `speechSynthesis` logic entirely.
- Import and use `useAlexVoice`.
- **Voice mode flow**: When Alex streams a response, accumulate the full text, then call `speak()` to play it via ElevenLabs. The orb animates while `isSpeaking` is true.
- After TTS finishes, auto-start listening again (conversation loop).
- The greeting is also spoken via ElevenLabs (not browser TTS).
- Keep text fallback button working.

**4. Update `src/hooks/useAlex.ts`**
- Add an `onResponseComplete` callback so the sheet knows when a full response is ready to be spoken.

### Conversation Flow
```text
Sheet opens → Speak greeting via ElevenLabs → Auto-listen (STT)
→ User speaks → Send to alex-chat → Stream response (text)
→ Response complete → Speak via ElevenLabs → Auto-listen again
→ Loop continues...
```

### Technical Details
- ElevenLabs voice ID: `ZUrEGyu8GFMwnHbvLhv2`
- Model: `eleven_multilingual_v2` (best for French)
- Edge function returns raw binary MP3, client uses `fetch().blob()` for playback
- Orb color/animation syncs to `isSpeaking` vs `listening` states

