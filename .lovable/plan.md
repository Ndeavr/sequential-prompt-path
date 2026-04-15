

# Make /alex Live — Voice + Transcription + Mute

## Current State

- `/alex` uses **fully client-side mock logic** (`useAlexConversationLite`) with hardcoded keyword matching and mock contractors. No real AI.
- Voice exists as a **separate full-screen overlay** (`OverlayAlexVoiceFullScreen`) using ElevenLabs Conversational AI via `useLiveVoice` hook. It works but takes over the entire screen.
- The edge function `alex-process-turn` already handles real AI responses via `alexVoiceBrain`, signal extraction, intent scoring, and contractor matching.
- `alex-tts` edge function exists for text-to-speech via ElevenLabs.

## What We Build

### 1. Wire /alex to Real AI (alex-process-turn)

Replace the client-side mock response generation in `useAlexConversationLite.sendMessage` with a real call to the `alex-process-turn` edge function:

- On user message → call `supabase.functions.invoke("alex-process-turn", { body: { session_token, user_message, message_mode, ui_context } })`
- Display the `alex_response` in the thread
- Use `detected_intent`, `ui_actions`, and `primary_match` from the response to render inline cards
- Keep the client-side keyword matching as **fallback** if the edge function fails
- Create/resume an `alex_sessions` row on page load via `alex-voice-session-start`

**Modified file**: `src/hooks/useAlexConversationLite.ts`
- Add `supabase.functions.invoke` call in `sendMessage`
- Wrap in try/catch, fallback to existing mock logic on error
- Map edge function response fields to existing card types

### 2. Inline Voice Mode (No Full-Screen Takeover)

Instead of the full-screen overlay, integrate voice **directly into the /alex chat**:

- Use `useLiveVoice` hook directly in the page (already partially done via `handleMicToggle`)
- When mic is active, show real-time transcription in the chat thread as bubbles
- Alex's spoken responses appear as text bubbles (from `onTranscript` callback)
- User's speech appears as user bubbles (from `onUserTranscript` callback)
- Remove the redirect to `OverlayAlexVoiceFullScreen` — keep voice inline

**Modified files**:
- `src/pages/PageHomeAlexConversationalLite.tsx` — integrate `useLiveVoice` directly, feed transcripts into the message thread
- `src/components/alex-conversation/InputAlexDockExpanded.tsx` — add mute button

### 3. Mute Alex Voice Toggle

Add a mute/unmute button so users can silence Alex's voice while keeping text responses:

- New state `isVoiceMuted` in the page
- When muted: `conversation.setVolume({ volume: 0 })` 
- When unmuted: `conversation.setVolume({ volume: 1 })`
- Visual indicator: `VolumeX` / `Volume2` icon in the input dock or header
- Mute state persisted in localStorage

**New component**: `src/components/alex-conversation/ButtonAlexMuteToggle.tsx`
- Simple icon toggle button with tooltip
- Uses `conversation.setVolume` from `useLiveVoice`

### 4. Live Transcription Display

Show voice activity visually in the chat thread:

- When Alex speaks → bubble appears with text + small audio wave indicator
- When user speaks → user bubble appears with real-time partial text
- Typing indicator shows "Alex écoute..." or "Alex parle..." based on state

**Modified**: `BubbleAlexMessage.tsx` — add optional voice indicator  
**Modified**: `LoaderAlexThinking.tsx` — contextual label for voice states

## File Changes

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/hooks/useAlexConversationLite.ts` | Wire to `alex-process-turn` edge function with fallback |
| Modify | `src/pages/PageHomeAlexConversationalLite.tsx` | Integrate `useLiveVoice` inline, feed transcripts to thread, add mute |
| Modify | `src/components/alex-conversation/InputAlexDockExpanded.tsx` | Add mute toggle button |
| Create | `src/components/alex-conversation/ButtonAlexMuteToggle.tsx` | Volume mute/unmute toggle |
| Modify | `src/components/alex-conversation/HeroSectionAlexOrbLite.tsx` | Show voice status (speaking/listening) |

## Key Decisions

- **No new tables** — reuses existing `alex_sessions`, `alex_messages`, `alex_intents`
- **No new edge functions** — reuses `alex-process-turn` and `elevenlabs-conversation-token`
- **Graceful degradation** — if edge function fails, falls back to client-side mock logic
- **Volume control via ElevenLabs SDK** — `setVolume({ volume: 0 })` for mute, no custom audio pipeline needed

